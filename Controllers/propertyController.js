import Property from "../Models/Property.js";
import User from "../Models/User.js";
import asyncHandler from "../utils/asyncHandler.js";
import ErrorResponse from "../utils/ErrorResponse.js";
import cloudinary from "../config/cloudinary.js";

// @desc    Get all properties
// @route   GET /api/properties
// @access  Public
export const getProperties = asyncHandler(async (req, res, next) => {
  const { city, minPrice, maxPrice, amenities, bedrooms, q, guests, sortBy } =
    req.query;

  // Build query
  let query = {};

  // Text search across title and description
  if (q) {
    query.$text = { $search: q };
  }

  // Filter by city (case-insensitive, partial match)
  if (city) {
    query["location.city"] = { $regex: city, $options: "i" };
  }

  // Filter by price range (INR)
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  // Filter by amenities
  if (amenities) {
    const amenitiesArray = amenities.split(",");
    query.amenities = { $in: amenitiesArray };
  }

  // Filter by bedrooms
  if (bedrooms) {
    query.bedrooms = Number(bedrooms);
  }

  // Filter by guest capacity
  if (guests) {
    query.maxGuests = { $gte: Number(guests) };
  }

  // Build sort criteria
  let sortCriteria = "-createdAt"; // Default: newest first
  if (sortBy === "price_asc") sortCriteria = "price";
  if (sortBy === "price_desc") sortCriteria = "-price";
  if (q) sortCriteria = { score: { $meta: "textScore" }, ...sortCriteria }; // Text search relevance

  const properties = await Property.find(query)
    .populate("hostId", "name email profilePicture")
    .sort(sortCriteria)
    .select(q ? { score: { $meta: "textScore" } } : {});

  res.status(200).json({
    success: true,
    count: properties.length,
    data: properties,
  });
});

// @desc    Get single property
// @route   GET /api/properties/:id
// @access  Public
export const getProperty = asyncHandler(async (req, res, next) => {
  const property = await Property.findById(req.params.id).populate(
    "hostId",
    "name email profilePicture",
  );

  if (!property) {
    return next(new ErrorResponse("Property not found", 404));
  }

  // Track view (fire-and-forget, don't block response)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  Property.findOneAndUpdate(
    { _id: property._id, "viewHistory.date": today },
    { $inc: { views: 1, "viewHistory.$.count": 1 } },
  ).then((result) => {
    if (!result) {
      // No entry for today yet, push a new one
      Property.findByIdAndUpdate(property._id, {
        $inc: { views: 1 },
        $push: { viewHistory: { date: today, count: 1 } },
      }).exec();
    }
  });

  res.status(200).json({
    success: true,
    data: property,
  });
});

// @desc    Create new property
// @route   POST /api/properties
// @access  Private (Guest can create, will auto-upgrade to Host)
export const createProperty = asyncHandler(async (req, res, next) => {
  // Reset monthly counters if needed
  await req.user.resetMonthlyCountersIfNeeded();

  // Check property listing limit
  const limits = req.user.getAccountLimits();
  if (req.user.propertiesListedThisMonth >= limits.propertyListings) {
    return next(
      new ErrorResponse(
        `You have reached your monthly listing limit (${limits.propertyListings} for ${req.user.accountType} accounts). Upgrade to Premium for more listings.`,
        403,
      ),
    );
  }

  // Upgrade user to host if they're a guest
  if (req.user.role === "guest") {
    await req.user.upgradeToHost();
  }

  // Validate rent type
  if (
    !req.body.rentType ||
    !["per_person", "entire_property"].includes(req.body.rentType)
  ) {
    return next(
      new ErrorResponse(
        "Rent type must be either 'per_person' or 'entire_property'",
        400,
      ),
    );
  }

  // Validate rent amount (minimum ₹500/month)
  if (!req.body.rentAmount || req.body.rentAmount < 500) {
    return next(
      new ErrorResponse("Rent amount must be at least ₹500 per month", 400),
    );
  }

  // Validate coordinates
  if (
    !req.body.coordinates ||
    !req.body.coordinates.latitude ||
    !req.body.coordinates.longitude
  ) {
    return next(
      new ErrorResponse(
        "Location coordinates (latitude and longitude) are required",
        400,
      ),
    );
  }

  const { latitude, longitude } = req.body.coordinates;
  if (latitude < -90 || latitude > 90) {
    return next(new ErrorResponse("Latitude must be between -90 and 90", 400));
  }
  if (longitude < -180 || longitude > 180) {
    return next(
      new ErrorResponse("Longitude must be between -180 and 180", 400),
    );
  }

  // Build property data
  const propertyData = {
    ...req.body,
    hostId: req.user.id, // Set hostId correctly
  };

  const property = await Property.create(propertyData);

  // Increment monthly listing counter
  req.user.propertiesListedThisMonth += 1;
  await req.user.save({ validateBeforeSave: false });

  res.status(201).json({
    success: true,
    data: property,
  });
});

// @desc    Update property
// @route   PUT /api/properties/:id
// @access  Private/Host (Only owner can update)
export const updateProperty = asyncHandler(async (req, res, next) => {
  let property = await Property.findById(req.params.id);

  if (!property) {
    return next(new ErrorResponse("Property not found", 404));
  }

  // Make sure user is property owner
  if (property.hostId.toString() !== req.user.id && req.user.role !== "admin") {
    return next(
      new ErrorResponse("Not authorized to update this property", 403),
    );
  }

  // Validate rent type if updating
  if (
    req.body.rentType &&
    !["per_person", "entire_property"].includes(req.body.rentType)
  ) {
    return next(
      new ErrorResponse(
        "Rent type must be either 'per_person' or 'entire_property'",
        400,
      ),
    );
  }

  // Validate rent amount if updating
  if (req.body.rentAmount && req.body.rentAmount < 500) {
    return next(
      new ErrorResponse("Rent amount must be at least ₹500 per month", 400),
    );
  }

  // Validate coordinates if updating
  if (req.body.coordinates) {
    const { latitude, longitude } = req.body.coordinates;
    if (latitude && (latitude < -90 || latitude > 90)) {
      return next(
        new ErrorResponse("Latitude must be between -90 and 90", 400),
      );
    }
    if (longitude && (longitude < -180 || longitude > 180)) {
      return next(
        new ErrorResponse("Longitude must be between -180 and 180", 400),
      );
    }
  }

  property = await Property.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: property,
  });
});

// @desc    Delete property
// @route   DELETE /api/properties/:id
// @access  Private/Host (Only owner can delete)
export const deleteProperty = asyncHandler(async (req, res, next) => {
  const property = await Property.findById(req.params.id);

  if (!property) {
    return next(new ErrorResponse("Property not found", 404));
  }

  // Make sure user is property owner
  if (property.hostId.toString() !== req.user.id && req.user.role !== "admin") {
    return next(
      new ErrorResponse("Not authorized to delete this property", 403),
    );
  }

  // Delete images from Cloudinary before deleting property
  if (property.images && property.images.length > 0) {
    try {
      // Extract public IDs from Cloudinary URLs
      const deletePromises = property.images.map((imageUrl) => {
        // Extract public ID from Cloudinary URL
        // Example URL: https://res.cloudinary.com/your-cloud/image/upload/v1234567890/urbanstay/properties/xyz.jpg
        // Public ID: urbanstay/properties/xyz
        const urlParts = imageUrl.split("/");
        const uploadIndex = urlParts.indexOf("upload");
        if (uploadIndex !== -1 && uploadIndex + 2 < urlParts.length) {
          // Get everything after /upload/vXXXXXX/ or /upload/
          const publicIdParts = urlParts.slice(uploadIndex + 2);
          // Remove file extension from last part
          const lastPart = publicIdParts[publicIdParts.length - 1];
          publicIdParts[publicIdParts.length - 1] = lastPart.split(".")[0];
          const publicId = publicIdParts.join("/");
          return cloudinary.uploader.destroy(publicId);
        }
        return Promise.resolve();
      });

      await Promise.all(deletePromises);
      console.log(
        `✅ Deleted ${property.images.length} images from Cloudinary for property ${property._id}`,
      );
    } catch (error) {
      console.error("⚠️ Error deleting images from Cloudinary:", error.message);
      // Continue with property deletion even if image deletion fails
    }
  }

  await property.deleteOne();

  res.status(200).json({
    success: true,
    data: {},
  });
});

// @desc    Get current user's properties
// @route   GET /api/properties/my
// @access  Private
export const getMyProperties = asyncHandler(async (req, res, next) => {
  const properties = await Property.find({ hostId: req.user.id }).sort(
    "-createdAt",
  );

  res.status(200).json({
    success: true,
    count: properties.length,
    data: properties,
  });
});

// @desc    Get properties by user ID
// @route   GET /api/properties/user/:userId
// @access  Public
export const getUserProperties = asyncHandler(async (req, res, next) => {
  const properties = await Property.find({ hostId: req.params.userId })
    .populate("hostId", "name email profilePicture")
    .sort("-createdAt");

  res.status(200).json({
    success: true,
    count: properties.length,
    data: properties,
  });
});

// @desc    Get owner contact details
// @route   GET /api/properties/:id/contact
// @access  Private
export const getOwnerContact = asyncHandler(async (req, res, next) => {
  // Find the property and populate host phone
  const property = await Property.findById(req.params.id).populate(
    "hostId",
    "name phone",
  );

  if (!property) {
    return next(new ErrorResponse("Property not found", 404));
  }

  if (!property.hostId) {
    return next(new ErrorResponse("Owner information not available", 404));
  }

  // Reset monthly counters if needed
  await req.user.resetMonthlyCountersIfNeeded();

  // Check contact view limit
  const limits = req.user.getAccountLimits();
  const remaining = limits.contactViews - req.user.contactViewsUsed;

  if (remaining <= 0) {
    return res.status(403).json({
      success: false,
      error: `You have reached your monthly contact view limit (${limits.contactViews} for ${req.user.accountType} accounts). Upgrade to Premium for more contact views.`,
      limitReached: true,
      accountType: req.user.accountType,
      limit: limits.contactViews,
      used: req.user.contactViewsUsed,
    });
  }

  // Increment contact views counter
  req.user.contactViewsUsed += 1;
  await req.user.save({ validateBeforeSave: false });

  // Increment contactRequests on property
  Property.findByIdAndUpdate(req.params.id, {
    $inc: { contactRequests: 1 },
  }).exec();

  res.status(200).json({
    success: true,
    data: {
      ownerName: property.hostId.name,
      ownerPhone: property.hostId.phone,
    },
    remaining: limits.contactViews - req.user.contactViewsUsed,
    limit: limits.contactViews,
    used: req.user.contactViewsUsed,
    accountType: req.user.accountType,
  });
});

// @desc    Get property analytics/stats (for host dashboard)
// @route   GET /api/properties/:id/stats
// @access  Private (Owner only)
export const getPropertyStats = asyncHandler(async (req, res, next) => {
  const property = await Property.findById(req.params.id).select(
    "views likes contactRequests viewHistory hostId title",
  );

  if (!property) {
    return next(new ErrorResponse("Property not found", 404));
  }

  // Only owner can see stats
  if (property.hostId.toString() !== req.user.id && req.user.role !== "admin") {
    return next(
      new ErrorResponse("Not authorized to view stats for this property", 403),
    );
  }

  // Get last 30 days of view history
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const recentHistory = (property.viewHistory || [])
    .filter((entry) => new Date(entry.date) >= thirtyDaysAgo)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  res.status(200).json({
    success: true,
    data: {
      title: property.title,
      views: property.views || 0,
      likes: property.likes || 0,
      contactRequests: property.contactRequests || 0,
      viewHistory: recentHistory,
    },
  });
});
