import { OAuth2Client } from "google-auth-library";

// Initialize Google OAuth client
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Verify Google ID token and extract user information
 * @param {string} token - Google ID token from frontend
 * @returns {Promise<object>} User information { email, name, googleId, profilePhoto }
 */
export const verifyGoogleToken = async (token) => {
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    // Extract user information
    return {
      googleId: payload.sub, // Google user ID
      email: payload.email,
      name: payload.name,
      profilePhoto: payload.picture,
      emailVerified: payload.email_verified,
    };
  } catch (error) {
    console.error("Error verifying Google token:", error);
    throw new Error("Invalid Google token");
  }
};

/**
 * Validate that the token is from the correct Google OAuth client
 * @param {string} token - Google ID token
 * @returns {Promise<boolean>} True if valid, false otherwise
 */
export const isValidGoogleToken = async (token) => {
  try {
    await verifyGoogleToken(token);
    return true;
  } catch (error) {
    return false;
  }
};

export default {
  verifyGoogleToken,
  isValidGoogleToken,
};
