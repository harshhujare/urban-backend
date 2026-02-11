# Image Upload API Testing Guide

## Prerequisites

1. Login first to get authentication token (cookie)
2. Use a tool like Postman, Thunder Client, or Insomnia
3. Set request type to `multipart/form-data`

## Endpoint 1: Upload Property Images

**POST** `http://localhost:5000/api/upload/property-images`

**Headers:**

- Cookie: `token=your_jwt_token` (auto-set if logged in)

**Body** (multipart/form-data):

- Field name: `images` (file upload, multiple files allowed, max 10)
- Select 1-10 image files (jpg, jpeg, png, webp)
- Max 5MB per file

**Expected Response (200 OK):**

```json
{
  "success": true,
  "count": 3,
  "images": [
    "https://res.cloudinary.com/root/image/upload/v1234/urbanstay/properties/abc123.jpg",
    "https://res.cloudinary.com/root/image/upload/v1234/urbanstay/properties/def456.jpg",
    "https://res.cloudinary.com/root/image/upload/v1234/urbanstay/properties/ghi789.jpg"
  ],
  "imageData": [
    {
      "url": "https://res.cloudinary.com/...",
      "publicId": "urbanstay/properties/abc123"
    }
  ]
}
```

**Cloudinary Features:**

- Auto-resized to max 1200x800px
- Auto-optimized quality
- Auto-format (converts to WebP when supported)
- Stored in `urbanstay/properties/` folder

---

## Endpoint 2: Upload Profile Picture

**POST** `http://localhost:5000/api/upload/profile-picture`

**Headers:**

- Cookie: `token=your_jwt_token`

**Body** (multipart/form-data):

- Field name: `image` (single file)
- Select 1 image file (jpg, jpeg, png, webp)
- Max 5MB

**Expected Response (200 OK):**

```json
{
  "success": true,
  "image": "https://res.cloudinary.com/root/image/upload/v1234/urbanstay/profiles/user123.jpg",
  "publicId": "urbanstay/profiles/user123"
}
```

**Cloudinary Features:**

- Cropped to 400x400px square
- Face-detection cropping
- Auto-optimized
- Stored in `urbanstay/profiles/` folder

---

## Endpoint 3: Delete Image

**DELETE** `http://localhost:5000/api/upload/image`

**Headers:**

- Cookie: `token=your_jwt_token`
- Content-Type: `application/json`

**Body** (JSON):

```json
{
  "publicId": "urbanstay/properties/abc123"
}
```

**Expected Response (200 OK):**

```json
{
  "success": true,
  "message": "Image deleted successfully"
}
```

---

## Testing with cURL (Windows PowerShell)

### Upload Property Images

```powershell
$response = Invoke-WebRequest -Uri "http://localhost:5000/api/upload/property-images" `
  -Method POST `
  -Form @{
    images = Get-Item "C:\path\to\image1.jpg"
    images = Get-Item "C:\path\to\image2.jpg"
  } `
  -WebSession $session

$response.Content | ConvertFrom-Json
```

### Upload Profile Picture

```powershell
$response = Invoke-WebRequest -Uri "http://localhost:5000/api/upload/profile-picture" `
  -Method POST `
  -Form @{
    image = Get-Item "C:\path\to\profile.jpg"
  } `
  -WebSession $session

$response.Content | ConvertFrom-Json
```

---

## Error Responses

### 400 - No Files Uploaded

```json
{
  "success": false,
  "error": "Please upload at least one image"
}
```

### 400 - Invalid File Type

```json
{
  "success": false,
  "error": "Only image files are allowed (jpeg, jpg, png, webp)"
}
```

### 400 - File Too Large

```json
{
  "success": false,
  "error": "File too large. Max size is 5MB"
}
```

### 401 - Not Authenticated

```json
{
  "success": false,
  "error": "Not authorized to access this route"
}
```

### 500 - Upload Failed

```json
{
  "success": false,
  "error": "Image upload failed: [cloudinary error]"
}
```

---

## Complete Property Creation Flow

1. **Login**

```
POST /api/auth/login
Body: { email, password }
→ Receive cookie with JWT token
```

2. **Upload Images**

```
POST /api/upload/property-images
Body: images (multipart)
→ Receive array of image URLs
```

3. **Create Property**

```
POST /api/properties
Body: {
  title: "...",
  images: ["url1", "url2", "url3"], // URLs from step 2
  ...other fields
}
→ Property created with images
```

---

## File Structure

```
backend/
├── config/
│   └── cloudinary.js          ← Cloudinary config
├── middleware/
│   └── upload.js              ← Multer middleware
├── Controllers/
│   └── uploadController.js    ← Upload handlers
├── Routes/
│   └── uploadRoutes.js        ← Upload routes
└── uploads/                   ← Temporary storage (auto-cleanup)
```

---

## Important Notes

1. **Temporary Files**: Uploaded files are temporarily saved to `uploads/` folder, then uploaded to Cloudinary, then deleted from server
2. **Cleanup**: Even if upload fails, temporary files are cleaned up
3. **Authentication**: All upload endpoints require login
4. **Authorization**: Only hosts can delete images
5. **Limits**: Max 10 images for properties, 1 for profile pictures
6. **Size**: Max 5MB per file
7. **Formats**: jpeg, jpg, png, webp only

---

## Troubleshooting

### Cloudinary Connection Failed

- Check .env variables: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- Verify credentials are correct in Cloudinary dashboard
- Check internet connection

### Upload Fails

- Check file size (max 5MB)
- Check file type (images only)
- Ensure `uploads/` directory exists
- Check Cloudinary quota (free tier has limits)

### Images Not Showing

- Check Cloudinary URLs are accessible
- Verify CORS settings in Cloudinary
- Check network connectivity
