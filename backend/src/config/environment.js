const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const env = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  jwt: {
    secret: process.env.JWT_SECRET || "default_access_secret_dev",
    expiresIn: process.env.JWT_EXPIRES_IN || "15m",
    refreshSecret:
      process.env.JWT_REFRESH_SECRET || "default_refresh_secret_dev",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },
  database: {
    url: process.env.DATABASE_URL || "mongodb://localhost:27017/kaindra",
  },
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || "",
  openWeatherApiKey: process.env.OPENWEATHER_API_KEY || "",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "",
  },
};

const validateProductionEnvironment = () => {
  if (process.env.NODE_ENV !== "production") return;

  const required = [
    "DATABASE_URL",
    "JWT_SECRET",
    "JWT_REFRESH_SECRET",
    "RAZORPAY_KEY_ID",
    "RAZORPAY_KEY_SECRET",
    "RAZORPAY_WEBHOOK_SECRET",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ];

  const placeholderPattern =
    /^(your_|replace_me|change_me|changeme|placeholder|default_)/i;

  const invalid = required.filter((name) => {
    const value = process.env[name]?.trim();
    return !value || placeholderPattern.test(value);
  });

  if (
    process.env.JWT_SECRET &&
    process.env.JWT_REFRESH_SECRET &&
    process.env.JWT_SECRET === process.env.JWT_REFRESH_SECRET
  ) {
    invalid.push("JWT_REFRESH_SECRET (must differ from JWT_SECRET)");
  }

  if (invalid.length) {
    throw new Error(
      `Invalid production environment variables: ${invalid.join(", ")}`
    );
  }
};

env.validateProductionEnvironment = validateProductionEnvironment;

module.exports = env;
