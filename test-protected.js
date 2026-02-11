import dotenv from "dotenv";

dotenv.config();

const API_BASE = "http://localhost:5000/api/auth";

const testProtectedRoutes = async () => {
  console.log("🧪 Testing Protected Routes\n");
  console.log("=".repeat(50));

  const testEmail = `test${Date.now()}@example.com`;
  let authToken = null;

  try {
    // Step 1: Register a user to get a token
    console.log("\n1️⃣ Registering user...");
    const registerRes = await fetch(`${API_BASE}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Protected Test User",
        email: testEmail,
        password: "password123",
      }),
    });

    const registerData = await registerRes.json();
    authToken = registerData.token;
    console.log("✅ User registered, token received");

    // Test 2: Access /me WITHOUT token (should fail)
    console.log("\n2️⃣ Test: Access /me without token");
    const noAuthRes = await fetch(`${API_BASE}/me`, {
      method: "GET",
    });

    const noAuthData = await noAuthRes.json();
    console.log("   Status:", noAuthRes.status);
    console.log("   Error:", noAuthData.error);

    if (noAuthRes.status === 401) {
      console.log("✅ Unauthorized request properly rejected");
    } else {
      throw new Error("Should have returned 401 without token");
    }

    // Test 3: Access /me WITH token (should succeed)
    console.log("\n3️⃣ Test: Access /me with valid token");
    const authRes = await fetch(`${API_BASE}/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    const authData = await authRes.json();
    console.log("   Status:", authRes.status);
    console.log("   User:", authData.user?.name);
    console.log("   Email:", authData.user?.email);
    console.log("   Role:", authData.user?.role);

    if (authRes.status === 200) {
      console.log("✅ Protected route accessible with valid token");
    } else {
      throw new Error("Should have returned 200 with valid token");
    }

    // Test 4: Access /me with INVALID token (should fail)
    console.log("\n4️⃣ Test: Access /me with invalid token");
    const badTokenRes = await fetch(`${API_BASE}/me`, {
      method: "GET",
      headers: {
        Authorization: "Bearer invalid.token.here",
      },
    });

    const badTokenData = await badTokenRes.json();
    console.log("   Status:", badTokenRes.status);
    console.log("   Error:", badTokenData.error);

    if (badTokenRes.status === 401) {
      console.log("✅ Invalid token properly rejected");
    } else {
      throw new Error("Should have returned 401 with invalid token");
    }

    // Test 5: Logout (should work with token)
    console.log("\n5️⃣ Test: Logout with valid token");
    const logoutRes = await fetch(`${API_BASE}/logout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    const logoutData = await logoutRes.json();
    console.log("   Status:", logoutRes.status);
    console.log("   Message:", logoutData.message);

    if (logoutRes.status === 200) {
      console.log("✅ Logout successful");
    } else {
      throw new Error("Logout should have succeeded");
    }

    console.log("\n" + "=".repeat(50));
    console.log("🎉 All protected route tests passed!");
    console.log("\n✅ Day 3 Complete:");
    console.log("   - Protect middleware working");
    console.log("   - JWT verification working");
    console.log("   - Unauthorized requests blocked");
    console.log("   - Valid tokens accepted");
    console.log("   - /me endpoint protected");
    console.log("   - /logout endpoint protected");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    process.exit(1);
  }
};

testProtectedRoutes();
