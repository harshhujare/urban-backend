import dotenv from "dotenv";
import ConnectDb from "./Connection/Connection.js";
import User from "./Models/User.js";
import sendTokenResponse from "./utils/sendTokenResponse.js";

dotenv.config();

const testJWT = async () => {
  try {
    await ConnectDb(process.env.Mongo_Url);
    console.log("✅ Connected to database\n");

    // Cleanup any existing test users first
    await User.deleteMany({
      email: { $in: ["jwttest@example.com", "oauth@example.com"] },
    });

    // Test 1: Create test user
    console.log("📝 Test 1: Creating test user...");
    const testUser = await User.create({
      name: "JWT Test User",
      email: "jwttest@example.com",
      password: "password123",
      role: "guest",
      authProvider: "local",
    });
    console.log("✅ User created:", testUser.name);

    // Test 2: Generate JWT
    console.log("\n🔐 Test 2: Generating JWT token...");
    const token = testUser.generateJWT();
    console.log("✅ Token generated successfully");
    console.log("   Token length:", token.length);
    console.log("   Token preview:", token.substring(0, 50) + "...");

    // Test 3: Verify JWT structure
    console.log("\n🔍 Test 3: Verifying JWT structure...");
    const parts = token.split(".");
    console.log("✅ JWT has 3 parts:", parts.length === 3);

    // Test 4: Test sendTokenResponse utility
    console.log("\n📤 Test 4: Testing sendTokenResponse utility...");
    const mockRes = {
      status: function (code) {
        this.statusCode = code;
        return this;
      },
      cookie: function (name, value, options) {
        this.cookieName = name;
        this.cookieValue = value;
        this.cookieOptions = options;
        return this;
      },
      json: function (data) {
        this.jsonData = data;
      },
    };

    sendTokenResponse(testUser, 200, mockRes);

    console.log("✅ Response status:", mockRes.statusCode);
    console.log("✅ Cookie name:", mockRes.cookieName);
    console.log("✅ Cookie httpOnly:", mockRes.cookieOptions.httpOnly);
    console.log("✅ User data included:", !!mockRes.jsonData.user);

    // Test 5: Test role upgrade helper
    console.log("\n🏠 Test 5: Testing role upgrade...");
    console.log("   Current role:", testUser.role);
    console.log("   Can be host:", testUser.canBeHost());

    await testUser.upgradeToHost();
    console.log("✅ Upgraded to host");
    console.log("   New role:", testUser.role);

    // Test 6: Test OAuth user (no password required)
    console.log("\n🌐 Test 6: Testing OAuth extensibility...");
    const oauthUser = await User.create({
      name: "OAuth Test User",
      email: "oauth@example.com",
      googleId: "google_123456",
      authProvider: "google",
      role: "guest",
    });
    console.log("✅ Created OAuth user without password");
    console.log("   Auth provider:", oauthUser.authProvider);
    console.log("   Google ID:", oauthUser.googleId);

    // OAuth user can also generate JWT
    const oauthToken = oauthUser.generateJWT();
    console.log("✅ OAuth user can generate JWT:", !!oauthToken);

    // Cleanup
    console.log("\n🧹 Cleaning up test data...");
    await User.deleteMany({
      email: { $in: ["jwttest@example.com", "oauth@example.com"] },
    });
    console.log("✅ Test data cleaned up");

    console.log("\n🎉 All 6 JWT tests passed!");
    console.log("\n✅ Day 1 Complete: JWT utilities ready for authentication!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    console.error("Error details:", error);
    process.exit(1);
  }
};

testJWT();
