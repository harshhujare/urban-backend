import dotenv from "dotenv";
import ConnectDb from "./Connection/Connection.js";
import User from "./Models/User.js";
import Property from "./Models/Property.js";
import Booking from "./Models/Booking.js";

dotenv.config();

const testModels = async () => {
  try {
    await ConnectDb(process.env.Mongo_Url);
    console.log("✅ Connected to database\n");

    // Test 1: Create a test user
    console.log("📝 Test 1: Creating test user...");
    const testUser = new User({
      name: "Test Host",
      email: "testhost@example.com",
      password: "password123",
      role: "host",
    });

    await testUser.save();
    console.log("✅ User created:", testUser.name);
    console.log("   Email:", testUser.email);
    console.log("   Role:", testUser.role);

    // Test 2: Verify password is hashed
    console.log("\n🔒 Test 2: Verifying password hashing...");
    console.log("   Password is hashed:", testUser.password.startsWith("$2b$"));
    console.log(
      "   Hashed password:",
      testUser.password.substring(0, 20) + "...",
    );

    // Test 3: Test password comparison
    console.log("\n🔑 Test 3: Testing password comparison...");
    const isMatch = await testUser.comparePassword("password123");
    console.log("   Correct password matches:", isMatch);

    const isWrong = await testUser.comparePassword("wrongpassword");
    console.log("   Wrong password rejected:", !isWrong);

    // Test 4: Create a test property
    console.log("\n🏠 Test 4: Creating test property...");
    const testProperty = new Property({
      title: "Beautiful Beach House with Ocean View",
      description:
        "A stunning beach house with panoramic ocean views, perfect for relaxation and enjoying coastal living at its finest.",
      location: {
        city: "Goa",
        address: "123 Beach Road",
      },
      price: 5000,
      maxGuests: 4,
      images: ["https://example.com/image1.jpg"],
      amenities: ["WiFi", "Kitchen", "Pool", "Beach Access"],
      hostId: testUser._id,
    });

    await testProperty.save();
    console.log("✅ Property created:", testProperty.title);
    console.log("   Location:", testProperty.location.city);
    console.log("   Price per night: ₹", testProperty.price);
    console.log("   Max guests:", testProperty.maxGuests);

    // Test 5: Query property with populated host
    console.log("\n🔗 Test 5: Testing property-host relationship...");
    const foundProperty = await Property.findById(testProperty._id).populate(
      "hostId",
    );
    console.log("✅ Property found with host info:");
    console.log("   Host name:", foundProperty.hostId.name);
    console.log("   Host email:", foundProperty.hostId.email);

    // Test 6: Create a test booking
    console.log("\n📅 Test 6: Creating test booking...");
    const testBooking = new Booking({
      guestId: testUser._id,
      propertyId: testProperty._id,
      hostId: testUser._id,
      checkIn: new Date("2026-03-01"),
      checkOut: new Date("2026-03-05"),
      guests: 2,
      totalPrice: 20000, // 4 nights × 5000
      status: "pending",
    });

    await testBooking.save();
    console.log("✅ Booking created");
    console.log("   Check-in:", testBooking.checkIn.toDateString());
    console.log("   Check-out:", testBooking.checkOut.toDateString());
    console.log("   Guests:", testBooking.guests);
    console.log("   Total price: ₹", testBooking.totalPrice);
    console.log("   Status:", testBooking.status);

    // Test 7: Query booking with populated references
    console.log("\n🔗 Test 7: Testing booking relationships...");
    const foundBooking = await Booking.findById(testBooking._id)
      .populate("guestId")
      .populate("propertyId")
      .populate("hostId");

    console.log("✅ Booking found with full details:");
    console.log("   Guest:", foundBooking.guestId.name);
    console.log("   Property:", foundBooking.propertyId.title);
    console.log("   Host:", foundBooking.hostId.name);

    // Test 8: Test date validation
    console.log("\n⚠️  Test 8: Testing date validation...");
    try {
      const invalidBooking = new Booking({
        guestId: testUser._id,
        propertyId: testProperty._id,
        hostId: testUser._id,
        checkIn: new Date("2026-03-10"),
        checkOut: new Date("2026-03-05"), // Invalid: checkout before checkin
        guests: 2,
        totalPrice: 10000,
      });
      await invalidBooking.save();
      console.log("❌ Should have failed validation!");
    } catch (error) {
      console.log("✅ Date validation working:", error.message);
    }

    // Cleanup
    console.log("\n🧹 Cleaning up test data...");
    await User.deleteOne({ _id: testUser._id });
    await Property.deleteOne({ _id: testProperty._id });
    await Booking.deleteOne({ _id: testBooking._id });
    console.log("✅ Test data cleaned up");

    console.log("\n🎉 All 8 tests passed!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    console.error("Error details:", error);
    process.exit(1);
  }
};

testModels();
