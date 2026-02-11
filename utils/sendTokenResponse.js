/**
 * Send JWT token response with HTTP-only cookie
 * @param {Object} user - User object from database
 * @param {Number} statusCode - HTTP status code
 * @param {Object} res - Express response object
 */
const sendTokenResponse = (user, statusCode, res) => {
  // Generate JWT token
  const token = user.generateJWT();

  // Cookie options
  const cookieOptions = {
    expires: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    ),
    httpOnly: true, // Prevents client-side JS from reading the cookie (XSS protection)
    secure: process.env.NODE_ENV === "production", // Use HTTPS in production
    sameSite: "strict", // CSRF protection
  };

  // Send response with cookie and user data
  res
    .status(statusCode)
    .cookie("token", token, cookieOptions)
    .json({
      success: true,
      token, // Also send in response body for mobile apps
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePhoto: user.profilePhoto,
        authProvider: user.authProvider,
      },
    });
};

export default sendTokenResponse;
