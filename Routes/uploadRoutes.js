import express from "express";
import {
  uploadPropertyImages,
  deleteImage,
  uploadProfilePicture,
} from "../Controllers/uploadController.js";
import { protect, authorize } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

// Upload multiple property images (max 10)
router.post(
  "/property-images",
  protect,
  authorize("host", "guest"), // Guest can upload (will become host when creating property)
  upload.array("images", 10), // Field name: 'images', max 10 files
  uploadPropertyImages,
);

// Upload single profile picture
router.post(
  "/profile-picture",
  protect,
  upload.single("image"), // Field name: 'image'
  uploadProfilePicture,
);

// Delete image from Cloudinary
router.delete("/image", protect, authorize("host"), deleteImage);

export default router;
