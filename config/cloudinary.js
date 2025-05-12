const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const dotenv = require("dotenv");
dotenv.config();
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
const uploadToCloudinary = (ImageBuffer) => {
  console.log("Cloudinary config:", cloudinary.config());
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: "events" }, // Add a folder option
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url); // Resolve with secure_url instead of entire result
      }
    );
    streamifier.createReadStream(ImageBuffer).pipe(uploadStream);
  });
};

// const uploadToCloudinary = (fileBuffer, folder = "events") => {
//   return new Promise((resolve, reject) => {
//     const stream = cloudinary.uploader.upload_stream(
//       { folder },
//       (error, result) => {
//         if (error) return reject(error);
//         resolve(result);
//       }
//     );
//     streamifier.createReadStream(fileBuffer).pipe(stream);
//   });
// };

// Utility to delete from Cloudinary using public_id
const deleteFromCloudinary = async (imageUrl) => {
  try {
    const urlParts = imageUrl.split("/");
    const publicIdWithExtension = urlParts.slice(-2).join("/"); // e.g. events/abc123.jpg
    const publicId = publicIdWithExtension.replace(/\.[^/.]+$/, ""); // Remove extension
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.warn("Could not delete image from Cloudinary:", err);
  }
};

module.exports = {uploadToCloudinary, deleteFromCloudinary};
