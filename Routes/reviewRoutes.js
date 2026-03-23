import express from "express";
import { protect } from "../middleware/auth.js";
import {
  createReview,
  getReviews,
  deleteReview,
} from "../Controllers/reviewController.js";

const router = express.Router();

// Get reviews for a property (public)
router.get("/:propertyId", getReviews);

// Create a review (protected)
router.post("/:propertyId", protect, createReview);

// Delete a review (protected - own review or admin)
router.delete("/:id", protect, deleteReview);

export default router;
