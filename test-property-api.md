# Property API Testing Script

## Test 1: Get All Properties (Empty)

GET http://localhost:5000/api/properties

Expected: 200 OK, empty array

## Test 2: Get Properties with Filters

GET http://localhost:5000/api/properties?city=Mumbai&minPrice=1000&maxPrice=5000

Expected: 200 OK, filtered results

## Test 3: Create Property (Without Auth)

POST http://localhost:5000/api/properties

Expected: 401 Unauthorized

## Test 4: Create Property (With Auth - need to login first)

First login, then:
POST http://localhost:5000/api/properties
Body:
{
"title": "Luxury Apartment in Mumbai",
"description": "Spacious 2BHK with sea view",
"pricePerNight": 3500,
"location": {
"address": "123 Carter Road",
"city": "Mumbai",
"state": "Maharashtra",
"country": "India"
},
"bedrooms": 2,
"bathrooms": 2,
"maxGuests": 4,
"amenities": ["WiFi", "Air Conditioning", "Kitchen"],
"images": ["https://example.com/img1.jpg"]
}

Expected: 201 Created, property object

## Test 5: Create Property with Low Price (Validation)

POST http://localhost:5000/api/properties
Body: { ...pricePerNight: 300 }

Expected: 400 Bad Request, "Price per night must be at least ₹500"

## Test 6: Get My Properties

GET http://localhost:5000/api/properties/my

Expected: 200 OK, array of user's properties

## Test 7: Get Single Property

GET http://localhost:5000/api/properties/:id

Expected: 200 OK, property object

## Test 8: Update Property

PUT http://localhost:5000/api/properties/:id
Body: { "pricePerNight": 4000 }

Expected: 200 OK, updated property

## Test 9: Delete Property

DELETE http://localhost:5000/api/properties/:id

Expected: 200 OK, success message

## All Endpoints Summary

✅ GET /api/properties - Get all (public)
✅ GET /api/properties?city=Mumbai - Filter by city
✅ GET /api/properties?minPrice=X&maxPrice=Y - Filter by price
✅ GET /api/properties/my - Get user's properties (protected)
✅ GET /api/properties/user/:userId - Get user's properties (public)
✅ GET /api/properties/:id - Get single property (public)
✅ POST /api/properties - Create property (protected, auto-upgrade)
✅ PUT /api/properties/:id - Update property (host only)
✅ DELETE /api/properties/:id - Delete property (host only)
