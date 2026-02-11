import cloudinary from "../config/cloudinary.js";
import asyncHandler from "../utils/asyncHandler.js";
import ErrorResponse from "../utils/ErrorResponse.js";
import fs from "fs";

// @desc    Upload property images to Cloudinary
// @route   POST /api/upload/property-images
// @access  Private/Host
export const uploadPropertyImages = asyncHandler(async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next(new ErrorResponse("Please upload at least one image", 400));
  }

  try {
    // Upload all images to Cloudinary
    const uploadPromises = req.files.map((file) => {
      return cloudinary.uploader.upload(file.path, {
        folder: "urbanstay/properties",
        transformation: [
          { width: 1200, height: 800, crop: "limit" }, // Limit max dimensions
          { quality: "auto" }, // Auto-optimize quality
          { fetch_format: "auto" }, // Auto-select best format (webp, etc.)
        ],
      });
    });

    const results = await Promise.all(uploadPromises);

    // Delete temporary files from server
    req.files.forEach((file) => {
      fs.unlinkSync(file.path);
    });

    // Extract secure URLs and public IDs
    const images = results.map((result) => ({
      url: result.secure_url,
      publicId: result.public_id,
    }));

    res.status(200).json({
      success: true,
      count: images.length,
      images: images.map((img) => img.url), // Return just URLs for simplicity
      imageData: images, // Full data including public IDs for deletion
    });
  } catch (error) {
    // Clean up files if upload fails
    if (req.files) {
      req.files.forEach((file) => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    return next(
      new ErrorResponse("Image upload failed: " + error.message, 500),
    );
  }
});

// @desc    Delete image from Cloudinary
// @route   DELETE /api/upload/image
// @access  Private/Host
export const deleteImage = asyncHandler(async (req, res, next) => {
  const { publicId } = req.body;

  if (!publicId) {
    return next(new ErrorResponse("Please provide image public ID", 400));
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === "ok") {
      res.status(200).json({
        success: true,
        message: "Image deleted successfully",
      });
    } else {
      return next(new ErrorResponse("Image deletion failed", 500));
    }
  } catch (error) {
    return next(
      new ErrorResponse("Image deletion failed: " + error.message, 500),
    );
  }
});

// @desc    Upload single profile picture
// @route   POST /api/upload/profile-picture
// @access  Private
export const uploadProfilePicture = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new ErrorResponse("Please upload an image", 400));
  }

  try {
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "urbanstay/profiles",
      transformation: [
        { width: 400, height: 400, crop: "fill", gravity: "face" }, // Square crop focusing on face
        { quality: "auto" },
        { fetch_format: "auto" },
      ],
    });

    // Delete temporary file
    fs.unlinkSync(req.file.path);

    res.status(200).json({
      success: true,
      image: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error) {
    // Clean up file if upload fails
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return next(
      new ErrorResponse("Image upload failed: " + error.message, 500),
    );
  }
});
