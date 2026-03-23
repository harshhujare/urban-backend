import dotenv from "dotenv";
import mongoose from "mongoose";
import { User, Property, Booking, Review, Transaction } from "./Models/index.js";

dotenv.config();

const MONGO_URL = process.env.Mongo_Url;
const DB_NAME = "urbanstay";

// ── Indian Demo Data ────────────────────────────────────────

const indianCities = [
  "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai",
  "Kolkata", "Pune", "Jaipur", "Ahmedabad", "Goa",
];

const demoUsers = [
  { name: "Aarav Sharma", phone: "+919876543210", email: "aarav.sharma@gmail.com", city: "Mumbai", role: "host", accountType: "premium", authProvider: "phone" },
  { name: "Priya Patel", phone: "+919876543211", email: "priya.patel@gmail.com", city: "Delhi", role: "host", accountType: "free", authProvider: "phone" },
  { name: "Rohan Mehta", phone: "+919876543212", email: "rohan.mehta@gmail.com", city: "Bangalore", role: "guest", accountType: "free", authProvider: "google" },
  { name: "Ananya Singh", phone: "+919876543213", email: "ananya.singh@gmail.com", city: "Hyderabad", role: "guest", accountType: "premium", authProvider: "phone" },
  { name: "Vikram Reddy", phone: "+919876543214", email: "vikram.reddy@gmail.com", city: "Chennai", role: "host", accountType: "free", authProvider: "phone" },
  { name: "Sneha Iyer", phone: "+919876543215", email: "sneha.iyer@gmail.com", city: "Kolkata", role: "guest", accountType: "free", authProvider: "google" },
  { name: "Arjun Nair", phone: "+919876543216", email: "arjun.nair@gmail.com", city: "Pune", role: "host", accountType: "premium", authProvider: "phone" },
  { name: "Kavya Joshi", phone: "+919876543217", email: "kavya.joshi@gmail.com", city: "Jaipur", role: "guest", accountType: "free", authProvider: "phone" },
  { name: "Rahul Gupta", phone: "+919876543218", email: "rahul.gupta@gmail.com", city: "Ahmedabad", role: "guest", accountType: "free", authProvider: "google" },
  { name: "Meera Desai", phone: "+919876543219", email: "meera.desai@gmail.com", city: "Goa", role: "host", accountType: "premium", authProvider: "phone" },
];

const propertyTitles = [
  "Luxurious Sea-View Apartment in South Mumbai",
  "Cozy Studio near Connaught Place, New Delhi",
  "Modern Tech Park Villa in Whitefield Bangalore",
  "Heritage Haveli Stay in Old Hyderabad",
  "Beachfront Cottage in ECR Chennai",
  "Charming Colonial Home in Salt Lake Kolkata",
  "Hilltop Bungalow with Pool in Lonavala Pune",
  "Royal Palace Suite near Amer Fort Jaipur",
  "Riverside Farmhouse in Sabarmati Ahmedabad",
  "Tropical Beach House in Calangute Goa",
];

const propertyDescriptions = [
  "Experience luxury living with breathtaking sea views from this beautifully furnished apartment. Features modern amenities, fully equipped kitchen, and a stunning infinity pool on the rooftop. Perfect for couples and families looking for a premium getaway in the heart of Mumbai.",
  "A charming and cozy studio apartment located just minutes away from Connaught Place. Ideal for solo travelers and couples who want to explore the capital city. The space features modern decor, high-speed WiFi, and all essential amenities for a comfortable and memorable stay in Delhi.",
  "Modern villa located in the IT hub of Whitefield, Bangalore. Features spacious rooms, green garden area, workspace setup, and is close to major tech parks. Perfect for business travelers or anyone looking for a peaceful retreat away from the bustling city center.",
  "Step back in time at this beautifully restored heritage haveli in the heart of Old Hyderabad. Features traditional architecture, antique furniture, and modern comforts. Walking distance to Charminar and Laad Bazaar. Perfect for history lovers and culture enthusiasts alike.",
  "Wake up to the sound of waves at this beautiful beachfront cottage on East Coast Road. Features a private garden, hammock, and direct beach access. Perfect for a romantic getaway or a peaceful family vacation away from the chaos of the city life.",
  "This charming colonial-era home has been lovingly restored and offers a unique blend of heritage and modern comfort. Located in the green and peaceful Salt Lake area, it features spacious rooms, a beautiful courtyard, and easy access to Kolkata best restaurants and cultural sites.",
  "Escape to this stunning hilltop bungalow with a private infinity pool overlooking the lush Western Ghats. Features modern interiors, a fully equipped kitchen, outdoor barbecue area, and serene surroundings. Perfect for a weekend getaway from Pune or Mumbai city.",
  "Live like royalty in this palatial suite near the iconic Amer Fort. Features ornate Rajasthani decor, four-poster beds, a private terrace with fort views, and impeccable hospitality. An unforgettable experience that combines regal charm with modern luxury.",
  "A peaceful riverside farmhouse on the banks of the Sabarmati River. Features organic gardens, open-air dining, bonfire pit, and traditional Gujarati hospitality. Perfect for families and groups looking for a unique countryside experience near Ahmedabad city.",
  "Tropical paradise in the heart of Goa's most popular beach destination. This beach house features open-plan living, a tropical garden, outdoor shower, and is just a 2-minute walk from Calangute Beach. Perfect for groups, couples, and solo backpackers alike.",
];

const coordinates = [
  { latitude: 18.9220, longitude: 72.8347 },
  { latitude: 28.6315, longitude: 77.2167 },
  { latitude: 12.9716, longitude: 77.5946 },
  { latitude: 17.3850, longitude: 78.4867 },
  { latitude: 12.8406, longitude: 80.2536 },
  { latitude: 22.5726, longitude: 88.3639 },
  { latitude: 18.7557, longitude: 73.4091 },
  { latitude: 26.9855, longitude: 75.8513 },
  { latitude: 23.0225, longitude: 72.5714 },
  { latitude: 15.5449, longitude: 73.7554 },
];

const amenitySets = [
  ["WiFi", "TV", "Air Conditioning", "Kitchen", "Pool", "Security"],
  ["WiFi", "TV", "Air Conditioning", "Free Parking"],
  ["WiFi", "TV", "Air Conditioning", "Gym", "Free Parking", "Security"],
  ["WiFi", "TV", "Kitchen", "Security"],
  ["WiFi", "Pool", "Kitchen", "Free Parking"],
  ["WiFi", "TV", "Air Conditioning", "Kitchen"],
  ["WiFi", "TV", "Pool", "Kitchen", "Free Parking", "Gym"],
  ["WiFi", "TV", "Air Conditioning", "Security"],
  ["WiFi", "Kitchen", "Free Parking"],
  ["WiFi", "TV", "Pool", "Kitchen", "Free Parking"],
];

const sampleImages = [
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
];

const reviewComments = [
  "Amazing property! The views were breathtaking and the host was incredibly welcoming. Will definitely come back again.",
  "Very clean and well-maintained. The location was perfect for exploring the city. Highly recommended for families.",
  "Loved the traditional decor and the attention to detail. The neighborhood was quiet and peaceful. Great value for money.",
  "The amenities were top-notch and exactly as described. Had a wonderful weekend getaway with friends here.",
  "Beautiful place with great connectivity. The kitchen was fully equipped and we enjoyed cooking our own meals.",
  "Superb hospitality by the host. The property exceeded our expectations. Perfect for a couple's retreat.",
  "Clean, spacious, and well-located. The Wi-Fi was fast and reliable. Great for remote workers and digital nomads.",
  "The pool area was the highlight for our family trip! Kids had a blast. The rooms were very comfortable.",
  "Excellent stay! The sunset views from the balcony were unforgettable. Truly a hidden gem worth visiting.",
  "Good overall experience. Some minor maintenance issues but the host resolved them quickly and professionally.",
];

// ── Helper ──────────────────────────────────────────────────

const randomDate = (startDays, endDays) => {
  const now = new Date();
  const start = new Date(now.getTime() - startDays * 86400000);
  const end = new Date(now.getTime() - endDays * 86400000);
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// ── Seed Function ───────────────────────────────────────────

async function seed() {
  try {
    await mongoose.connect(MONGO_URL, { dbName: DB_NAME });
    console.log("✅ Connected to MongoDB");

    // Clear existing demo data (optional — only removes seeded data by phone pattern)
    console.log("🗑️  Clearing old demo data...");
    const existingDemoUsers = await User.find({ phone: { $regex: /^\+91987654321/ } });
    const demoUserIds = existingDemoUsers.map((u) => u._id);

    if (demoUserIds.length > 0) {
      await Promise.all([
        Property.deleteMany({ hostId: { $in: demoUserIds } }),
        Booking.deleteMany({ $or: [{ guestId: { $in: demoUserIds } }, { hostId: { $in: demoUserIds } }] }),
        Review.deleteMany({ userId: { $in: demoUserIds } }),
        Transaction.deleteMany({ userId: { $in: demoUserIds } }),
        User.deleteMany({ _id: { $in: demoUserIds } }),
      ]);
    }

    // 1. Create Users
    console.log("👤 Creating 10 users...");
    const users = await User.insertMany(
      demoUsers.map((u) => ({ ...u, phoneVerified: true }))
    );
    console.log(`   ✅ Created ${users.length} users`);

    // Separate hosts and guests
    const hosts = users.filter((u) => u.role === "host");
    const guests = users.filter((u) => u.role === "guest");

    // 2. Create Properties (one per host)
    console.log("🏠 Creating 10 properties...");
    const properties = await Property.insertMany(
      hosts.map((host, i) => ({
        title: propertyTitles[i] || `Beautiful Stay in ${host.city}`,
        description: propertyDescriptions[i],
        location: { city: host.city, address: `${100 + i} Main Street` },
        rentType: i % 2 === 0 ? "entire_property" : "per_person",
        rentAmount: [2500, 1800, 3500, 1200, 4000, 2200, 5500, 3000, 1500, 6000][i],
        coordinates: coordinates[i],
        maxGuests: [4, 2, 6, 3, 5, 4, 8, 2, 10, 6][i],
        images: sampleImages.slice(0, 3 + (i % 3)),
        amenities: amenitySets[i],
        hostId: host._id,
        isAvailable: true,
        adminStatus: "active",
        views: Math.floor(Math.random() * 500) + 50,
        likes: Math.floor(Math.random() * 100),
        createdAt: randomDate(90, 10),
      }))
    );

    // Also create properties for remaining indices using hosts cyclically
    const extraProperties = [];
    for (let i = hosts.length; i < 10; i++) {
      extraProperties.push({
        title: propertyTitles[i] || `Lovely Home in ${indianCities[i]}`,
        description: propertyDescriptions[i],
        location: { city: indianCities[i], address: `${200 + i} Park Avenue` },
        rentType: i % 2 === 0 ? "entire_property" : "per_person",
        rentAmount: [2500, 1800, 3500, 1200, 4000, 2200, 5500, 3000, 1500, 6000][i],
        coordinates: coordinates[i],
        maxGuests: [4, 2, 6, 3, 5, 4, 8, 2, 10, 6][i],
        images: sampleImages.slice(0, 3 + (i % 3)),
        amenities: amenitySets[i],
        hostId: hosts[i % hosts.length]._id,
        isAvailable: true,
        adminStatus: "active",
        views: Math.floor(Math.random() * 500) + 50,
        likes: Math.floor(Math.random() * 100),
        createdAt: randomDate(90, 10),
      });
    }
    const moreProps = extraProperties.length > 0 ? await Property.insertMany(extraProperties) : [];
    const allProperties = [...properties, ...moreProps];
    console.log(`   ✅ Created ${allProperties.length} properties`);

    // 3. Create Bookings (10)
    console.log("📅 Creating 10 bookings...");
    const statuses = ["pending", "confirmed", "confirmed", "confirmed", "rejected", "confirmed", "pending", "confirmed", "cancelled", "confirmed"];
    const bookings = await Booking.insertMany(
      Array.from({ length: 10 }, (_, i) => {
        const guest = guests[i % guests.length];
        const prop = allProperties[i % allProperties.length];
        const host = hosts.find((h) => h._id.equals(prop.hostId)) || hosts[0];
        const checkIn = randomDate(60, 5);
        const nights = Math.floor(Math.random() * 5) + 1;
        const checkOut = new Date(checkIn.getTime() + nights * 86400000);
        const guestCount = Math.floor(Math.random() * (prop.maxGuests || 3)) + 1;
        return {
          guestId: guest._id,
          propertyId: prop._id,
          hostId: host._id,
          checkIn,
          checkOut,
          guests: guestCount,
          totalPrice: prop.rentAmount * nights * (prop.rentType === "per_person" ? guestCount : 1),
          status: statuses[i],
          createdAt: checkIn,
        };
      })
    );
    console.log(`   ✅ Created ${bookings.length} bookings`);

    // 4. Create Transactions (10)
    console.log("💳 Creating 10 transactions...");
    const txStatuses = ["success", "success", "success", "failed", "success", "success", "success", "failed", "success", "success"];
    const transactions = await Transaction.insertMany(
      Array.from({ length: 10 }, (_, i) => ({
        userId: users[i]._id,
        razorpay_order_id: `order_demo_${Date.now()}_${i}`,
        razorpay_payment_id: `pay_demo_${Date.now()}_${i}`,
        amount: 100, // ₹1 in paise (testing amount)
        currency: "INR",
        purpose: "premium_upgrade",
        status: txStatuses[i],
        createdAt: randomDate(45, 1),
      }))
    );
    console.log(`   ✅ Created ${transactions.length} transactions`);

    // 5. Create Reviews (10 — each guest reviews a different property)
    console.log("⭐ Creating 10 reviews...");
    const reviewEntries = [];
    for (let i = 0; i < 10; i++) {
      const reviewer = users[i];
      const prop = allProperties[(i + 3) % allProperties.length]; // offset to avoid reviewing own property
      // Skip if this user is the host of this property
      if (reviewer._id.equals(prop.hostId)) continue;
      reviewEntries.push({
        propertyId: prop._id,
        userId: reviewer._id,
        rating: [5, 4, 4, 3, 5, 4, 5, 3, 4, 5][i],
        comment: reviewComments[i],
        createdAt: randomDate(30, 1),
      });
    }
    const reviews = await Review.insertMany(reviewEntries);
    console.log(`   ✅ Created ${reviews.length} reviews`);

    // Summary
    console.log("\n🎉 Seed complete! Summary:");
    console.log(`   Users:        ${users.length}`);
    console.log(`   Properties:   ${allProperties.length}`);
    console.log(`   Bookings:     ${bookings.length}`);
    console.log(`   Transactions: ${transactions.length}`);
    console.log(`   Reviews:      ${reviews.length}`);

    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  }
}

seed();
