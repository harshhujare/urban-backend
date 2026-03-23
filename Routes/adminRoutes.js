import express from "express";
import { protect, authorize } from "../middleware/auth.js";
import {
  getStats,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getProperties,
  updatePropertyStatus,
  deleteProperty,
  getBookings,
  updateBookingStatus,
  exportUsers,
  exportProperties,
  exportBookings,
  getTransactions,
  exportTransactions,
  getAdminReviews,
  deleteAdminReview,
  exportReviews,
} from "../Controllers/adminController.js";

const router = express.Router();

// All routes require authentication + admin role
router.use(protect, authorize("admin"));

// Dashboard
router.get("/stats", getStats);

// User management
router.get("/users", getUsers);
router.get("/users/:id", getUserById);
router.patch("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);

// Property management
router.get("/properties", getProperties);
router.patch("/properties/:id", updatePropertyStatus);
router.delete("/properties/:id", deleteProperty);

// Booking management
router.get("/bookings", getBookings);
router.patch("/bookings/:id", updateBookingStatus);

// Transaction management
router.get("/transactions", getTransactions);

// Review management
router.get("/reviews", getAdminReviews);
router.delete("/reviews/:id", deleteAdminReview);

// CSV exports
router.get("/export/users", exportUsers);
router.get("/export/properties", exportProperties);
router.get("/export/bookings", exportBookings);
router.get("/export/transactions", exportTransactions);
router.get("/export/reviews", exportReviews);

export default router;
