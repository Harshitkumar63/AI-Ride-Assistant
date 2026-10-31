const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/core/authRoutes");
const rideRoutes = require("./routes/mototribe/rideRoutes");
const placesRoutes = require("./routes/mototribe/placesRoutes");
const directionsRoutes = require("./routes/mototribe/directionsRoutes");
const sosRoutes = require("./routes/mototribe/sosRoutes");
const weatherRoutes = require("./routes/mototribe/weatherRoutes");
const passportRoutes = require("./routes/mototribe/passportRoutes");
const journalRoutes = require("./routes/mototribe/journalRoutes");
const routeMatchRoutes = require("./routes/mototribe/routeMatchRoutes");
const chatRoutes = require("./routes/mototribe/chatRoutes");
const fuelPriceRoutes = require("./routes/mototribe/fuelPriceRoutes");
const agoraRoutes = require("./routes/mototribe/agoraRoutes");
const vehicleRoutes = require("./routes/mototribe/vehicleRoutes");
const expenseRoutes = require("./routes/mototribe/expenseRoutes");
const routeReportRoutes = require("./routes/mototribe/routeReportRoutes");
const presenceRoutes = require("./routes/mototribe/presenceRoutes");
const aiAssistantRoutes = require("./routes/mototribe/aiAssistantRoutes");
const connectionRoutes = require("./routes/core/connectionRoutes");
const notificationRoutes = require("./routes/core/notificationRoutes");
const careerRoutes = require("./routes/core/careerRoutes");
const applicationRoutes = require("./routes/core/applicationRoutes");
const communityRoutes = require("./routes/core/communityRoutes");
const adminRoutes = require("./routes/core/adminRoutes");
const talesRoutes = require("./routes/modasphere/talesRoutes");
const academyRoutes = require("./routes/modasphere/academyRoutes");
const influenceRoutes = require("./routes/modasphere/modainfluence/influenceRoutes");
const productRoutes = require("./routes/modasphere/productRoutes");
const discountCodeRoutes = require("./routes/modasphere/discountCodeRoutes");
const shipmentRoutes = require("./routes/modasphere/shipmentRoutes");
const cartRoutes = require("./routes/modasphere/cartRoutes");
const modasphereOrderRoutes = require("./routes/modasphere/orderRoutes");
const wishlistRoutes = require("./routes/modasphere/wishlistRoutes");
const reviewRoutes = require("./routes/modasphere/reviewRoutes");
const insightsRoutes = require("./routes/modasphere/insightsRoutes");
const dropRoutes = require("./routes/modasphere/dropRoutes");
const designRoutes = require("./routes/modasphere/designRoutes");
const manufacturerRoutes = require("./routes/modasphere/manufacturerRoutes");
const productionRequestRoutes = require("./routes/modasphere/productionRequestRoutes");
const sellerRoutes = require("./routes/modasphere/sellerRoutes");
const webhookRoutes = require("./routes/modasphere/webhookRoutes");
const errorHandler = require("./middleware/errorHandler");

const app = express();

// CORS Middleware (allow requests from frontend app)
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// Body parser with raw body buffer capture for webhook signature verification
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

// Cookie parser
app.use(cookieParser());

// Root health check endpoint
app.get("/", (req, res) => {
  res.json({ status: "success", message: "Kaindra API is running" });
});

// Backend health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "backend",
  });
});

app.get("/ready", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
      return res.status(503).json({
        status: "not_ready",
        service: "backend",
        database: "disconnected",
      });
    }

    await mongoose.connection.db.admin().ping();

    return res.status(200).json({
      status: "ready",
      service: "backend",
      database: "connected",
    });
  } catch {
    return res.status(503).json({
      status: "not_ready",
      service: "backend",
      database: "unavailable",
    });
  }
});

// API Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/auth", authRoutes);

// Core Connection & Operations Routes
app.use("/api/v1/core/notifications", notificationRoutes);
app.use("/api/core/notifications", notificationRoutes);

app.use("/api/v1/core", connectionRoutes);
app.use("/api/core", connectionRoutes);

app.use("/api/v1/careers", careerRoutes);
app.use("/api/careers", careerRoutes);

app.use("/api/v1/applications", applicationRoutes);
app.use("/api/applications", applicationRoutes);

app.use("/api/v1/community", communityRoutes);
app.use("/api/community", communityRoutes);

app.use("/api/v1/admin", adminRoutes);
app.use("/api/admin", adminRoutes);

app.use("/api/v1/orders", modasphereOrderRoutes);
app.use("/api/orders", modasphereOrderRoutes);

// ModaSphere Routes
app.use("/api/modasphere/tales", talesRoutes);
app.use("/api/v1/modasphere/tales", talesRoutes);

app.use("/api/modasphere/academy", academyRoutes);
app.use("/api/v1/modasphere/academy", academyRoutes);

app.use("/api/modasphere/influence", influenceRoutes);
app.use("/api/v1/modasphere/influence", influenceRoutes);

app.use("/api/modasphere/products", productRoutes);
app.use("/api/v1/modasphere/products", productRoutes);

app.use("/api/modasphere/shipments", shipmentRoutes);
app.use("/api/v1/modasphere/shipments", shipmentRoutes);

app.use("/api/modasphere/discount-codes", discountCodeRoutes);
app.use("/api/v1/modasphere/discount-codes", discountCodeRoutes);

app.use("/api/modasphere/cart", cartRoutes);
app.use("/api/v1/modasphere/cart", cartRoutes);

app.use("/api/modasphere/orders", modasphereOrderRoutes);
app.use("/api/v1/modasphere/orders", modasphereOrderRoutes);

app.use("/api/modasphere/webhooks", webhookRoutes);
app.use("/api/v1/modasphere/webhooks", webhookRoutes);

app.use("/api/modasphere/wishlist", wishlistRoutes);
app.use("/api/v1/modasphere/wishlist", wishlistRoutes);

app.use("/api/modasphere/drops", dropRoutes);
app.use("/api/v1/modasphere/drops", dropRoutes);

app.use("/api/modasphere/insights", insightsRoutes);
app.use("/api/v1/modasphere/insights", insightsRoutes);

app.use("/api/modasphere", reviewRoutes);
app.use("/api/v1/modasphere", reviewRoutes);

app.use("/api/modasphere", designRoutes);
app.use("/api/v1/modasphere", designRoutes);

app.use("/api/modasphere", manufacturerRoutes);
app.use("/api/v1/modasphere", manufacturerRoutes);

app.use("/api/modasphere", productionRequestRoutes);
app.use("/api/v1/modasphere", productionRequestRoutes);

app.use("/api/modasphere", sellerRoutes);
app.use("/api/v1/modasphere", sellerRoutes);

// MotoTribe Routes (supports both /api/mototribe and /api/v1/mototribe)
app.use("/api/v1/mototribe", directionsRoutes);
app.use("/api/mototribe", directionsRoutes);

app.use("/api/v1/mototribe", placesRoutes);
app.use("/api/mototribe", placesRoutes);

app.use("/api/v1/mototribe", routeMatchRoutes);
app.use("/api/mototribe", routeMatchRoutes);

app.use("/api/v1/mototribe", rideRoutes);
app.use("/api/mototribe", rideRoutes);

app.use("/api/v1/mototribe", sosRoutes);
app.use("/api/mototribe", sosRoutes);

app.use("/api/v1/mototribe", weatherRoutes);
app.use("/api/mototribe", weatherRoutes);

app.use("/api/v1/mototribe", passportRoutes);
app.use("/api/mototribe", passportRoutes);

app.use("/api/v1/mototribe", journalRoutes);
app.use("/api/mototribe", journalRoutes);

app.use("/api/v1/mototribe", aiAssistantRoutes);
app.use("/api/mototribe", aiAssistantRoutes);

app.use("/api/v1/mototribe", chatRoutes);
app.use("/api/mototribe", chatRoutes);


app.use("/api/v1/mototribe", fuelPriceRoutes);
app.use("/api/mototribe", fuelPriceRoutes);

app.use("/api/v1/mototribe", agoraRoutes);
app.use("/api/mototribe", agoraRoutes);

app.use("/api/v1/mototribe", vehicleRoutes);
app.use("/api/mototribe", vehicleRoutes);

app.use("/api/v1/mototribe", expenseRoutes);
app.use("/api/mototribe", expenseRoutes);

app.use("/api/v1/mototribe", routeReportRoutes);
app.use("/api/mototribe", routeReportRoutes);

app.use("/api/v1/mototribe", presenceRoutes);
app.use("/api/mototribe", presenceRoutes);


// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    status: "fail",
    message: `Cannot find ${req.originalUrl} on this server!`,
  });
});

// Global Centralized Error Handler
app.use(errorHandler);

module.exports = app;
