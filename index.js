import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import ConnectDb from "./Connection/Connection.js";
import errorHandler from "./middleware/errorHandler.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ==================== MIDDLEWARE ====================

// CORS - Allow frontend to make requests
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173", // Vite default port
    credentials: true, // Allow cookies
  }),
);

// Body parsers
app.use(express.json({ limit: "10mb" })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true, limit: "10mb" })); // Parse URL-encoded bodies

// Cookie parser
app.use(cookieParser());

// Request logger (development only)
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// ==================== ROUTES ====================

// Health check route
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "UrbanStay API is running",
    timestamp: new Date().toISOString(),
  });
});

// ==================== API ROUTES ====================

import authRoutes from "./Routes/authRoutes.js";
import propertyRoutes from "./Routes/propertyRoutes.js";
import uploadRoutes from "./Routes/uploadRoutes.js";

// Auth routes
app.use("/api/auth", authRoutes);

// Property routes
app.use("/api/properties", propertyRoutes);

// Upload routes
app.use("/api/upload", uploadRoutes);

// Future routes
// app.use("/api/bookings", bookingRoutes);

// ==================== ERROR HANDLER ====================

// 404 Handler - Must be after all routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.originalUrl} not found`,
  });
});

// Global Error Handler
app.use(errorHandler);

// ==================== SERVER START ====================

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await ConnectDb(process.env.Mongo_Url);
    console.log("✅ MongoDB connected successfully");

    // Start listening
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
      console.log(`frontend url : ${process.env.CLIENT_URL}`);
    });
  } catch (error) {
    console.error("❌ Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();
