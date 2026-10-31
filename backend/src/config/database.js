const mongoose = require("mongoose");
const env = require("./environment");

const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      return;
    }
    if (process.env.NODE_ENV === "test" && !process.env.DATABASE_URL) {
      return;
    }
    let dbUrl = process.env.DATABASE_URL || env.database.url;
    if (!dbUrl) {
      throw new Error("DATABASE_URL is not configured.");
    }
    let conn;
    try {
      conn = await mongoose.connect(dbUrl, { serverSelectionTimeoutMS: 3000 });
      console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (connErr) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          `Could not connect to ${dbUrl}. Starting in-memory MongoDB for development...`
        );
        const { MongoMemoryServer } = require("mongodb-memory-server");
        const mongod = await MongoMemoryServer.create();
        const memUri = mongod.getUri();
        conn = await mongoose.connect(memUri);
        console.log(`MongoDB Connected (in-memory): ${memUri}`);
      } else {
        throw connErr;
      }
    }

    // Clean up users collection: remove phoneNumber and password fields, and drop old phone index
    if (process.env.NODE_ENV !== "test") {
      try {
        const User = require("../models/core/User");
        const indexes = await User.collection.indexes();
        const phoneIndex = indexes.find((idx) => idx.name === "phoneNumber_1");
        if (phoneIndex) {
          await User.collection.dropIndex("phoneNumber_1");
          console.log("Successfully dropped legacy phoneNumber_1 index from users collection.");
        }

        // Unset phoneNumber, password, and isPhoneVerified from all existing user documents
        await User.updateMany(
          {},
          { $unset: { phoneNumber: "", password: "", isPhoneVerified: "" } }
        );
        console.log("Cleaned up users collection: removed phoneNumber and password fields.");
      } catch (idxErr) {
        console.warn("User collection cleanup notice:", idxErr.message);
      }

      try {
        const FuelPrice = require("../models/mototribe/FuelPrice");
        const count = await FuelPrice.countDocuments();
        if (count === 0) {
          const { syncIOCLFuelPrices } = require("../services/mototribe/ioclFuelPriceService");
          await syncIOCLFuelPrices();
          console.log("Auto-seeded 33 IOCL state-wise fuel price records into DB.");
        }
      } catch (seedErr) {
        console.warn("Auto-seed fuel prices skipped:", seedErr.message);
      }

      // Ensure legacy "orders" collection is dropped in favor of "modasphereorders"
      try {
        const collections = await mongoose.connection.db.listCollections({ name: "orders" }).toArray();
        if (collections.length > 0) {
          await mongoose.connection.db.dropCollection("orders");
          console.log("Cleaned up database: dropped legacy 'orders' collection in favor of 'modasphereorders'.");
        }
      } catch (dropErr) {
        console.warn("Legacy orders collection check notice:", dropErr.message);
      }

      // Ensure default admin user exists in the "admins" collection
      try {
        const Admin = require("../models/core/Admin");
        const adminEmail = "admin@kaindra.com";
        const adminPassword = "admin123";
        let defaultAdmin = await Admin.findOne({ email: adminEmail }).select("+password");

        if (!defaultAdmin) {
          await Admin.create({
            name: "Admin",
            email: adminEmail,
            password: adminPassword,
            role: "admin",
          });
          console.log("Default admin account created in admins collection.");
        } else {
          const isMatch = await defaultAdmin.comparePassword(adminPassword);
          if (!isMatch) {
            defaultAdmin.password = adminPassword;
            await defaultAdmin.save();
            console.log("Updated default admin password in admins collection.");
          }
        }
      } catch (adminErr) {
        console.warn("Admin auto-seed notice:", adminErr.message);
      }

      // Ensure admin is NOT present in regular users collection (admins must live in 'admins' collection only)
      try {
        const User = require("../models/core/User");
        await User.deleteMany({ email: "admin@kaindra.com" });
      } catch (userCleanErr) {
        // ignore
      }
    }
  } catch (error) {
    console.error(`Database connection error: ${error.message}`);
    throw error;
  }
};

module.exports = connectDB;
