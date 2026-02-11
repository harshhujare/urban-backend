import mongoose from "mongoose";

const ConnectDb = async (url) => {
  try {
    const options = {
      dbName: "urbanstay", // Specify database name
    };

    await mongoose.connect(url, options);

    console.log(`✅ MongoDB Connected: ${mongoose.connection.host}`);

    // Connection event handlers
    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️ MongoDB disconnected");
    });
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    throw error;
  }
};

export default ConnectDb;
