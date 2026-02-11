import dotenv from "dotenv";

dotenv.config();

const API_BASE = "http://localhost:5000/api/auth";

const testAuth = async () => {
  console.log("🧪 Testing Authentication Endpoints\n");
  console.log("=".repeat(50));

  const testEmail = `test${Date.now()}@example.com`; // Unique email

  try {
    // Test 1: Register
    console.log("\n📝 Test 1: Register new user");
    const registerResponse = await fetch(`${API_BASE}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test User",
        email: testEmail,
        password: "password123",
        role: "guest",
      }),
    });

    const registerData = await registerResponse.json();
    console.log("   Status:", registerResponse.status);
    console.log("   Success:", registerData.success);
    console.log("   User created:", registerData.user?.name);
    console.log("   Token received:", !!registerData.token);

    if (registerResponse.status !== 201) {
      throw new Error(`Register failed: ${registerData.error}`);
    }
    console.log("✅ Registration successful");

    // Test 2: Login
    console.log("\n🔑 Test 2: Login with credentials");
    const loginResponse = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: "password123",
      }),
    });

    const loginData = await loginResponse.json();
    console.log("   Status:", loginResponse.status);
    console.log("   Success:", loginData.success);
    console.log("   User:", loginData.user?.name);
    console.log("   Token received:", !!loginData.token);

    if (loginResponse.status !== 200) {
      throw new Error(`Login failed: ${loginData.error}`);
    }
    console.log("✅ Login successful");

    // Test 3: Invalid credentials
    console.log("\n❌ Test 3: Login with wrong password");
    const wrongPassResponse = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: "wrongpassword",
      }),
    });

    const wrongPassData = await wrongPassResponse.json();
    console.log("   Status:", wrongPassResponse.status);
    console.log("   Error message:", wrongPassData.error);

    if (wrongPassResponse.status === 401) {
      console.log("✅ Invalid credentials properly rejected");
    } else {
      throw new Error("Should have returned 401 for wrong password");
    }

    // Test 4: Duplicate registration
    console.log("\n🔄 Test 4: Try to register same email again");
    const dupRegResponse = await fetch(`${API_BASE}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Another User",
        email: testEmail,
        password: "password123",
      }),
    });

    const dupRegData = await dupRegResponse.json();
    console.log("   Status:", dupRegResponse.status);
    console.log("   Error message:", dupRegData.error);

    if (
      dupRegResponse.status === 400 &&
      dupRegData.error.includes("already exists")
    ) {
      console.log("✅ Duplicate email properly rejected");
    } else {
      throw new Error("Should have rejected duplicate email");
    }

    console.log("\n" + "=".repeat(50));
    console.log("🎉 All authentication tests passed!");
    console.log("\n✅ Day 2 Complete:");
    console.log("   - Register endpoint working");
    console.log("   - Login endpoint working");
    console.log("   - Password validation working");
    console.log("   - Duplicate email check working");
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    if (error.cause) {
      console.error("   Cause:", error.cause);
    }
    process.exit(1);
  }
};

testAuth();
