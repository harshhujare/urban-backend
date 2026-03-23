import asyncHandler from "../utils/asyncHandler.js";
import ErrorResponse from "../utils/ErrorResponse.js";
import { User, Property, Booking, Review, Transaction } from "../Models/index.js";

// ==================== DASHBOARD STATS ====================

/**
 * GET /api/admin/stats
 * Returns platform-wide counts and revenue summary.
 */
export const getStats = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalHosts,
    totalProperties,
    totalBookings,
    bookingStatusBreakdown,
    revenueData,
    recentUsers,
    monthlyBookings,
  ] = await Promise.all([
    User.countDocuments({ role: { $ne: "admin" } }),
    User.countDocuments({ role: "host" }),
    Property.countDocuments(),
    Booking.countDocuments(),

    // Booking status breakdown
    Booking.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),

    // Total revenue from confirmed bookings
    Booking.aggregate([
      { $match: { status: "confirmed" } },
      { $group: { _id: null, total: { $sum: "$totalPrice" } } },
    ]),

    // Last 5 signups
    User.find({ role: { $ne: "admin" } })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name email phone role accountType createdAt"),

    // Bookings per month for last 6 months
    Booking.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)),
          },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
          revenue: { $sum: "$totalPrice" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),
  ]);

  const totalRevenue = revenueData[0]?.total || 0;

  // Normalize status breakdown into a map
  const statusMap = {};
  bookingStatusBreakdown.forEach((s) => {
    statusMap[s._id] = s.count;
  });

  res.status(200).json({
    success: true,
    data: {
      totalUsers,
      totalHosts,
      totalGuests: totalUsers - totalHosts,
      totalProperties,
      totalBookings,
      totalRevenue,
      bookingStatusBreakdown: statusMap,
      recentUsers,
      monthlyBookings,
    },
  });
});

// ==================== USER MANAGEMENT ====================

/**
 * GET /api/admin/users
 * Paginated user list with role/accountType/city filters.
 */
export const getUsers = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    role,
    accountType,
    city,
    search,
  } = req.query;

  const query = { role: { $ne: "admin" } };
  if (role) query.role = role;
  if (accountType) query.accountType = accountType;
  if (city) query.city = { $regex: city, $options: "i" };
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [users, total] = await Promise.all([
    User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .select("-password"),
    User.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    data: users,
    pagination: {
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      limit: Number(limit),
    },
  });
});

/**
 * GET /api/admin/users/:id
 * Single user detail with their properties and recent bookings.
 */
export const getUserById = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id).select("-password");
  if (!user) return next(new ErrorResponse("User not found", 404));

  const [properties, bookings] = await Promise.all([
    Property.find({ hostId: req.params.id }).select(
      "title location rentAmount rentType isAvailable createdAt"
    ),
    Booking.find({ $or: [{ guestId: req.params.id }, { hostId: req.params.id }] })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("propertyId", "title")
      .populate("guestId", "name phone")
      .populate("hostId", "name phone"),
  ]);

  res.status(200).json({
    success: true,
    data: { user, properties, bookings },
  });
});

/**
 * PATCH /api/admin/users/:id
 * Update role or accountType of a user.
 */
export const updateUser = asyncHandler(async (req, res, next) => {
  const allowed = ["role", "accountType"];
  const updates = {};
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  });

  const user = await User.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  }).select("-password");

  if (!user) return next(new ErrorResponse("User not found", 404));

  res.status(200).json({ success: true, data: user });
});

/**
 * DELETE /api/admin/users/:id
 * Delete a user and cascade-remove their properties and bookings.
 */
export const deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new ErrorResponse("User not found", 404));

  const propertyIds = await Property.find({ hostId: user._id }).distinct("_id");
  await Promise.all([
    Property.deleteMany({ hostId: user._id }),
    Booking.deleteMany({
      $or: [
        { guestId: user._id },
        { hostId: user._id },
        { propertyId: { $in: propertyIds } },
      ],
    }),
    user.deleteOne(),
  ]);

  res.status(200).json({ success: true, message: "User and related data deleted." });
});

// ==================== PROPERTY MANAGEMENT ====================

/**
 * GET /api/admin/properties
 * Paginated property list with filters.
 */
export const getProperties = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, city, adminStatus, rentType, search } = req.query;

  const query = {};
  if (city) query["location.city"] = { $regex: city, $options: "i" };
  if (adminStatus) query.adminStatus = adminStatus;
  if (rentType) query.rentType = rentType;
  if (search) query.$or = [{ title: { $regex: search, $options: "i" } }];

  const skip = (Number(page) - 1) * Number(limit);
  const [properties, total] = await Promise.all([
    Property.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("hostId", "name phone email"),
    Property.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    data: properties,
    pagination: {
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      limit: Number(limit),
    },
  });
});

/**
 * PATCH /api/admin/properties/:id
 * Set adminStatus of a property.
 */
export const updatePropertyStatus = asyncHandler(async (req, res, next) => {
  const { adminStatus } = req.body;

  const property = await Property.findByIdAndUpdate(
    req.params.id,
    { adminStatus },
    { new: true, runValidators: true }
  ).populate("hostId", "name phone");

  if (!property) return next(new ErrorResponse("Property not found", 404));

  res.status(200).json({ success: true, data: property });
});

/**
 * DELETE /api/admin/properties/:id
 * Delete a property and cancel its pending/confirmed bookings.
 */
export const deleteProperty = asyncHandler(async (req, res, next) => {
  const property = await Property.findById(req.params.id);
  if (!property) return next(new ErrorResponse("Property not found", 404));

  await Promise.all([
    Booking.updateMany(
      { propertyId: property._id, status: { $in: ["pending", "confirmed"] } },
      { status: "cancelled" }
    ),
    property.deleteOne(),
  ]);

  res.status(200).json({ success: true, message: "Property deleted and related bookings cancelled." });
});

// ==================== BOOKING MANAGEMENT ====================

/**
 * GET /api/admin/bookings
 * Paginated booking list with filters.
 */
export const getBookings = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, from, to } = req.query;

  const query = {};
  if (status) query.status = status;
  if (from || to) {
    query.checkIn = {};
    if (from) query.checkIn.$gte = new Date(from);
    if (to) query.checkIn.$lte = new Date(to);
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [bookings, total] = await Promise.all([
    Booking.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("guestId", "name phone")
      .populate("hostId", "name phone")
      .populate("propertyId", "title location"),
    Booking.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    data: bookings,
    pagination: {
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      limit: Number(limit),
    },
  });
});

/**
 * PATCH /api/admin/bookings/:id
 * Override booking status.
 */
export const updateBookingStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;
  const booking = await Booking.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true, runValidators: true }
  )
    .populate("guestId", "name phone")
    .populate("hostId", "name phone")
    .populate("propertyId", "title");

  if (!booking) return next(new ErrorResponse("Booking not found", 404));

  res.status(200).json({ success: true, data: booking });
});

// ==================== CSV EXPORTS ====================

const sendCSV = (res, filename, headers, rows) => {
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  const lines = [headers.join(",")];
  rows.forEach((row) => {
    lines.push(row.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
  });
  res.send(lines.join("\n"));
};

/** GET /api/admin/export/users */
export const exportUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ role: { $ne: "admin" } }).select("-password");
  const headers = ["ID", "Name", "Email", "Phone", "Role", "AccountType", "City", "AuthProvider", "CreatedAt"];
  const rows = users.map((u) => [
    u._id, u.name, u.email, u.phone, u.role, u.accountType, u.city, u.authProvider, u.createdAt,
  ]);
  sendCSV(res, "users.csv", headers, rows);
});

/** GET /api/admin/export/properties */
export const exportProperties = asyncHandler(async (req, res) => {
  const properties = await Property.find().populate("hostId", "name phone");
  const headers = ["ID", "Title", "City", "Address", "RentType", "RentAmount", "MaxGuests", "AdminStatus", "HostName", "HostPhone", "Views", "Likes", "CreatedAt"];
  const rows = properties.map((p) => [
    p._id, p.title, p.location?.city, p.location?.address, p.rentType,
    p.rentAmount, p.maxGuests, p.adminStatus || "active",
    p.hostId?.name, p.hostId?.phone, p.views, p.likes, p.createdAt,
  ]);
  sendCSV(res, "properties.csv", headers, rows);
});

/** GET /api/admin/export/bookings */
export const exportBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find()
    .populate("guestId", "name phone")
    .populate("hostId", "name phone")
    .populate("propertyId", "title");
  const headers = ["ID", "PropertyTitle", "GuestName", "GuestPhone", "HostName", "HostPhone", "CheckIn", "CheckOut", "Guests", "TotalPrice", "Status", "CreatedAt"];
  const rows = bookings.map((b) => [
    b._id, b.propertyId?.title, b.guestId?.name, b.guestId?.phone,
    b.hostId?.name, b.hostId?.phone, b.checkIn, b.checkOut,
    b.guests, b.totalPrice, b.status, b.createdAt,
  ]);
  sendCSV(res, "bookings.csv", headers, rows);
});

// ==================== TRANSACTION MANAGEMENT ====================

/**
 * GET /api/admin/transactions
 * Paginated transaction list with filters.
 */
export const getTransactions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, search } = req.query;

  const query = {};
  if (status) query.status = status;
  if (search) {
    query.$or = [
      { razorpay_order_id: { $regex: search, $options: "i" } },
      { razorpay_payment_id: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [transactions, total] = await Promise.all([
    Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("userId", "name email phone"),
    Transaction.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    data: transactions,
    pagination: {
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      limit: Number(limit),
    },
  });
});

/** GET /api/admin/export/transactions */
export const exportTransactions = asyncHandler(async (req, res) => {
  const transactions = await Transaction.find()
    .sort({ createdAt: -1 })
    .populate("userId", "name email phone");
  const headers = ["ID", "UserName", "Email", "Phone", "OrderID", "PaymentID", "Amount(paise)", "Currency", "Purpose", "Status", "CreatedAt"];
  const rows = transactions.map((t) => [
    t._id, t.userId?.name, t.userId?.email, t.userId?.phone,
    t.razorpay_order_id, t.razorpay_payment_id, t.amount,
    t.currency, t.purpose, t.status, t.createdAt,
  ]);
  sendCSV(res, "transactions.csv", headers, rows);
});

// ==================== REVIEW MANAGEMENT ====================

/**
 * GET /api/admin/reviews
 * Paginated review list.
 */
export const getAdminReviews = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;

  const query = {};

  const skip = (Number(page) - 1) * Number(limit);
  const [reviews, total] = await Promise.all([
    Review.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("userId", "name email phone profilePhoto")
      .populate("propertyId", "title location"),
    Review.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    data: reviews,
    pagination: {
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      limit: Number(limit),
    },
  });
});

/**
 * DELETE /api/admin/reviews/:id
 * Admin can delete any review.
 */
export const deleteAdminReview = asyncHandler(async (req, res, next) => {
  const review = await Review.findById(req.params.id);
  if (!review) return next(new ErrorResponse("Review not found", 404));
  await review.deleteOne();
  res.status(200).json({ success: true, message: "Review deleted." });
});

/** GET /api/admin/export/reviews */
export const exportReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find()
    .sort({ createdAt: -1 })
    .populate("userId", "name email phone")
    .populate("propertyId", "title location");
  const headers = ["ID", "Reviewer", "Email", "Phone", "PropertyTitle", "City", "Rating", "Comment", "CreatedAt"];
  const rows = reviews.map((r) => [
    r._id, r.userId?.name, r.userId?.email, r.userId?.phone,
    r.propertyId?.title, r.propertyId?.location?.city,
    r.rating, r.comment, r.createdAt,
  ]);
  sendCSV(res, "reviews.csv", headers, rows);
});
