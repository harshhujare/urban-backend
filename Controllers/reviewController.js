import asyncHandler from "../utils/asyncHandler.js";
import ErrorResponse from "../utils/ErrorResponse.js";
import Review from "../Models/Review.js";

// @desc    Create a review for a property
// @route   POST /api/reviews/:propertyId
// @access  Private
export const createReview = asyncHandler(async (req, res, next) => {
  const { propertyId } = req.params;
  const { rating, comment } = req.body;

  if (!rating || !comment) {
    return next(new ErrorResponse("Rating and comment are required", 400));
  }

  // Check if user already reviewed this property
  const existing = await Review.findOne({
    propertyId,
    userId: req.user._id,
  });

  if (existing) {
    return next(
      new ErrorResponse("You have already reviewed this property", 400)
    );
  }

  const review = await Review.create({
    propertyId,
    userId: req.user._id,
    rating,
    comment,
  });

  // Populate user info before returning
  await review.populate("userId", "name profilePhoto");

  res.status(201).json({
    success: true,
    data: review,
  });
});

// @desc    Get all reviews for a property
// @route   GET /api/reviews/:propertyId
// @access  Public
export const getReviews = asyncHandler(async (req, res) => {
  const { propertyId } = req.params;

  const reviews = await Review.find({ propertyId })
    .sort({ createdAt: -1 })
    .populate("userId", "name profilePhoto");

  // Calculate average rating
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  res.status(200).json({
    success: true,
    data: reviews,
    meta: {
      total: reviews.length,
      avgRating: Math.round(avgRating * 10) / 10,
    },
  });
});

// @desc    Delete a review (own review or admin)
// @route   DELETE /api/reviews/:id
// @access  Private
export const deleteReview = asyncHandler(async (req, res, next) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    return next(new ErrorResponse("Review not found", 404));
  }

  // Only the author or an admin can delete
  if (
    review.userId.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    return next(
      new ErrorResponse("Not authorized to delete this review", 403)
    );
  }

  await review.deleteOne();

  res.status(200).json({
    success: true,
    message: "Review deleted successfully",
  });
});
