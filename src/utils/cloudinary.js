import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    //upload the file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    // file has been uploaded successfull
    //console.log("file is uploaded on cloudinary ", response.url);
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); // remove the locally saved temporary file as the upload operation got failed
    return null;
  }
};

const deleteOnCloudinary = async (fileUrl) => {
  try {
    // Extract the public ID from the Cloudinary URL
    const type = await detectFileType(fileUrl);
    const publicId = fileUrl.split("/").pop().split(".")[0];
    // Initiate the deletion request
    const response = await cloudinary.uploader.destroy(publicId, {
      resource_type: type,
    });
    // Check if deletion was successful
    return response;
  } catch (err) {
    // Handle errors
    console.error("Error deleting image from Cloudinary:", err);
    return {
      success: false,
      message: "Failed to delete image from Cloudinary",
    };
  }
};

const detectFileType = async (url) => {
  // Extract the file extension from the URL
  const extension = url.split(".").pop().toLowerCase();

  // Check if the extension corresponds to a video format
  if (["mp4", "mov", "avi", "mkv", "webm"].includes(extension)) {
    return "video";
  }

  // Check if the extension corresponds to an image format
  if (["jpg", "jpeg", "png", "gif", "bmp"].includes(extension)) {
    return "image";
  }

  // If the extension doesn't match any known formats, classify as unknown
  return "unknown";
};

export { uploadOnCloudinary, deleteOnCloudinary };
