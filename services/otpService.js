import twilio from "twilio";

// Lazy initialize Twilio client to ensure env vars are loaded
let twilioClient = null;
const getTwilioClient = () => {
  if (!twilioClient) {
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
    );
  }
  return twilioClient;
};

// In-memory OTP storage (for production, consider Redis)
const otpStore = new Map();

// Rate limiting storage (phone number -> array of timestamps)
const rateLimitStore = new Map();

// Configuration
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const OTP_LENGTH = 4; // 4-digit OTP as requested
const MAX_OTP_ATTEMPTS = 3; // Maximum wrong attempts before blocking
const RATE_LIMIT_MAX_REQUESTS = 5; // Max OTP requests per hour
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RESEND_COOLDOWN_MS = 60 * 1000; // 1 minute cooldown between resends

/**
 * Generate random 4-digit OTP
 * @returns {string} 4-digit OTP code
 */
const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

/**
 * Check if phone number has exceeded rate limit
 * @param {string} phoneNumber - Phone number to check
 * @returns {object} { allowed: boolean, remainingTime: number }
 */
const checkRateLimit = (phoneNumber) => {
  const now = Date.now();
  const requests = rateLimitStore.get(phoneNumber) || [];

  // Remove requests older than the rate limit window
  const recentRequests = requests.filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS,
  );

  rateLimitStore.set(phoneNumber, recentRequests);

  if (recentRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    const oldestRequest = Math.min(...recentRequests);
    const remainingTime = Math.ceil(
      (RATE_LIMIT_WINDOW_MS - (now - oldestRequest)) / 1000,
    );
    return { allowed: false, remainingTime };
  }

  return { allowed: true, remainingTime: 0 };
};

/**
 * Check if resend cooldown is active
 * @param {string} phoneNumber - Phone number to check
 * @returns {object} { allowed: boolean, remainingTime: number }
 */
const checkResendCooldown = (phoneNumber) => {
  const otpData = otpStore.get(phoneNumber);
  if (!otpData) return { allowed: true, remainingTime: 0 };

  const now = Date.now();
  const timeSinceLastSend = now - otpData.createdAt;

  if (timeSinceLastSend < RESEND_COOLDOWN_MS) {
    const remainingTime = Math.ceil(
      (RESEND_COOLDOWN_MS - timeSinceLastSend) / 1000,
    );
    return { allowed: false, remainingTime };
  }

  return { allowed: true, remainingTime: 0 };
};

/**
 * Send OTP to phone number via Twilio
 * @param {string} phoneNumber - Phone number (must include +91 country code)
 * @returns {Promise<object>} { success: boolean, message: string, remainingTime?: number }
 */
export const sendOTP = async (phoneNumber) => {
  try {
    // Validate phone number format (India +91)
    if (!phoneNumber.startsWith("+91") || phoneNumber.length !== 13) {
      return {
        success: false,
        message:
          "Invalid phone number format. Must be +91 followed by 10 digits",
      };
    }

    // Check rate limit
    const rateLimit = checkRateLimit(phoneNumber);
    if (!rateLimit.allowed) {
      return {
        success: false,
        message: `Too many OTP requests. Please try again in ${Math.ceil(rateLimit.remainingTime / 60)} minutes`,
        remainingTime: rateLimit.remainingTime,
      };
    }

    // Check resend cooldown
    const cooldown = checkResendCooldown(phoneNumber);
    if (!cooldown.allowed) {
      return {
        success: false,
        message: `Please wait ${cooldown.remainingTime} seconds before requesting a new OTP`,
        remainingTime: cooldown.remainingTime,
      };
    }

    // Generate OTP
    const otp = generateOTP();
    const now = Date.now();

    // Store OTP with metadata
    otpStore.set(phoneNumber, {
      code: otp,
      createdAt: now,
      expiresAt: now + OTP_EXPIRY_MS,
      attempts: 0,
    });

    // Update rate limit
    const requests = rateLimitStore.get(phoneNumber) || [];
    requests.push(now);
    rateLimitStore.set(phoneNumber, requests);

    // Send SMS via Twilio
    const message = await getTwilioClient().messages.create({
      body: `Your UrbanStay verification code is: ${otp}. Valid for 10 minutes. Do not share this code with anyone.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });

    console.log(`OTP sent to ${phoneNumber}: ${message.sid}`);

    return {
      success: true,
      message: "OTP sent successfully",
      expiresIn: OTP_EXPIRY_MS / 1000, // in seconds
    };
  } catch (error) {
    console.error("Error sending OTP:", error);

    // Handle Twilio-specific errors
    if (error.code === 21211) {
      return {
        success: false,
        message: "Invalid phone number",
      };
    }

    return {
      success: false,
      message: "Failed to send OTP. Please try again later.",
    };
  }
};

/**
 * Verify OTP code
 * @param {string} phoneNumber - Phone number
 * @param {string} code - OTP code to verify
 * @returns {object} { verified: boolean, message: string, remainingAttempts?: number }
 */
export const verifyOTP = (phoneNumber, code) => {
  const otpData = otpStore.get(phoneNumber);

  // Check if OTP exists
  if (!otpData) {
    return {
      verified: false,
      message: "No OTP found. Please request a new one.",
    };
  }

  // Check if OTP has expired
  if (Date.now() > otpData.expiresAt) {
    otpStore.delete(phoneNumber);
    return {
      verified: false,
      message: "OTP has expired. Please request a new one.",
    };
  }

  // Check if max attempts exceeded
  if (otpData.attempts >= MAX_OTP_ATTEMPTS) {
    otpStore.delete(phoneNumber);
    return {
      verified: false,
      message:
        "Maximum verification attempts exceeded. Please request a new OTP.",
    };
  }

  // Verify OTP code
  if (otpData.code === code) {
    // Success - remove OTP from store
    otpStore.delete(phoneNumber);
    return {
      verified: true,
      message: "OTP verified successfully",
    };
  }

  // Incorrect OTP - increment attempts
  otpData.attempts += 1;
  otpStore.set(phoneNumber, otpData);

  const remainingAttempts = MAX_OTP_ATTEMPTS - otpData.attempts;

  return {
    verified: false,
    message: `Invalid OTP code. ${remainingAttempts} attempt${remainingAttempts !== 1 ? "s" : ""} remaining.`,
    remainingAttempts,
  };
};

/**
 * Cleanup expired OTPs (run periodically)
 * @returns {number} Number of OTPs cleaned up
 */
export const cleanupExpiredOTPs = () => {
  const now = Date.now();
  let cleanedCount = 0;

  for (const [phoneNumber, otpData] of otpStore.entries()) {
    if (now > otpData.expiresAt) {
      otpStore.delete(phoneNumber);
      cleanedCount++;
    }
  }

  // Also cleanup old rate limit entries
  for (const [phoneNumber, requests] of rateLimitStore.entries()) {
    const recentRequests = requests.filter(
      (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS,
    );

    if (recentRequests.length === 0) {
      rateLimitStore.delete(phoneNumber);
    } else {
      rateLimitStore.set(phoneNumber, recentRequests);
    }
  }

  return cleanedCount;
};

// Run cleanup every 5 minutes
setInterval(cleanupExpiredOTPs, 5 * 60 * 1000);

export default {
  sendOTP,
  verifyOTP,
  cleanupExpiredOTPs,
};
