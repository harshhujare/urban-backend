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

// @desc    Upload single profile picture (with old image cleanup)
// @route   POST /api/upload/profile-picture
// @access  Private
export const uploadProfilePicture = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new ErrorResponse("Please upload an image", 400));
  }

  try {
    // Get user to check for existing profile photo
    const { User } = await import("../Models/index.js");
    const user = await User.findById(req.user.id);

    // Delete old profile picture from Cloudinary if exists
    if (user && user.profilePhoto) {
      try {
        // Extract public_id from Cloudinary URL
        // URL format: https://res.cloudinary.com/{cloud_name}/image/upload/{transformations}/{public_id}.{format}
        const urlParts = user.profilePhoto.split("/");
        const uploadIndex = urlParts.indexOf("upload");

        if (uploadIndex !== -1 && uploadIndex < urlParts.length - 1) {
          // Get everything after 'upload/' and before the file extension
          const publicIdWithExt = urlParts.slice(uploadIndex + 1).join("/");
          const publicId = publicIdWithExt.substring(
            0,
            publicIdWithExt.lastIndexOf("."),
          );

          // Delete old image from Cloudinary
          await cloudinary.uploader.destroy(publicId);
        }
      } catch (deleteError) {
        // Log error but don't fail the upload if old image deletion fails
        console.error("Failed to delete old profile picture:", deleteError);
      }
    }

    // Upload new profile picture
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "urbanstay/profiles",
      transformation: [
        { width: 400, height: 400, crop: "fill", gravity: "face" }, // Square crop focusing on face
        { quality: "auto" },
        { fetch_format: "auto" },
      ],
    });

    console.log("=== CLOUDINARY UPLOAD RESULT ===");
    console.log("Full result object:", JSON.stringify(result, null, 2));
    console.log("secure_url:", result.secure_url);
    console.log("url:", result.url);
    console.log("public_id:", result.public_id);
    console.log("===============================");

    // Delete temporary file
    fs.unlinkSync(req.file.path);

    const responseData = {
      success: true,
      image: result.secure_url,
      publicId: result.public_id,
    };

    console.log("=== SENDING RESPONSE ===");
    console.log(JSON.stringify(responseData, null, 2));
    console.log("=======================");

    res.status(200).json(responseData);
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
