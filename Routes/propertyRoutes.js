import express from "express";
import {
  getProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
  getMyProperties,
  getUserProperties,
  getOwnerContact,
  getPropertyStats,
  toggleLike,
  getLikeStatus,
} from "../Controllers/propertyController.js";

import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

// Public routes
router.get("/", getProperties);

// Protected routes - must come before /:id to avoid conflicts
router.get("/my", protect, getMyProperties);
router.get("/user/:userId", getUserProperties);

// Create property (guest can create, will auto-upgrade to host)
router.post("/", protect, createProperty);

// Get owner contact details (protected, checks account limits)
router.get("/:id/contact", protect, getOwnerContact);

// Get property analytics/stats (owner only)
router.get("/:id/stats", protect, getPropertyStats);

// Like/Unlike a property (authenticated users)
router.post("/:id/like", protect, toggleLike);
router.get("/:id/like-status", protect, getLikeStatus);

// Single property route (must be after /my and /:id/contact and /:id/stats)
router.get("/:id", getProperty);

// Update/Delete property (only host/owner)
router.put("/:id", protect, authorize("host"), updateProperty);
router.delete("/:id", protect, authorize("host"), deleteProperty);

export default router;
