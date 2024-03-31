import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary, deleteOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page, limit, query, sortType } = req.query;
  try {
    // Build the match query dynamically based on the 'query' parameter
    const matchQuery = query ? { $text: { $search: query } } : {};

    const pipeline = [
      {
        $match: matchQuery,
      },
      {
        $sort: {
          duration: sortType === "desc" ? -1 : 1,
        },
      },
      {
        $skip: (parseInt(page) - 1) * parseInt(limit),
      },
      {
        $limit: parseInt(limit),
      },
    ];

    // Execute the aggregation pipeline against your MongoDB collection
    const videos = await Video.aggregate(pipeline);

    return res
      .status(200)
      .json(
        new ApiResponse(200, { data: videos }, "Videos  fetched successfully")
      );
  } catch (error) {
    console.log("VideoController -> getAllVideos error", error);
    // Returning an error response in case of failure
    throw new ApiError(500, error?.message || "Internal server error");
  }
});

const publishAVideo = asyncHandler(async (req, res) => {
  try {
    // Extracting title and description from the request body
    const { title, description } = req.body;

    // Checking if title and description are provided
    if (!title || !description) {
      throw new ApiError(400, "Title and Description are required fields!");
    }

    // Retrieving file paths for video and thumbnail from the request files
    const videoFilePath = req.files?.videoFile[0]?.path;
    const thumbnailFilePath = req.files?.thumbnail[0]?.path;

    // Checking if video file is missing
    if (!videoFilePath) {
      throw new ApiError(400, "Video file is missing");
    }

    // Checking if thumbnail file is missing
    if (!thumbnailFilePath) {
      throw new ApiError(400, "Thumbnail file is missing");
    }

    // Uploading video and thumbnail to Cloudinary

    const uploadedThumbnail = await uploadOnCloudinary(thumbnailFilePath);
    const uploadedVideo = await uploadOnCloudinary(videoFilePath);
    // Checking if video upload was successful
    if (!uploadedVideo.url) {
      throw new ApiError(400, "Error while uploading the video");
    }

    // Checking if thumbnail upload was successful
    if (!uploadedThumbnail.url) {
      throw new ApiError(400, "Error while uploading the thumbnail");
    }
    // Creating a new video document in the database
    const video = await Video.create({
      title,
      description,
      duration: uploadedVideo?.duration,
      videoFile: uploadedVideo.url,
      thumbnail: uploadedThumbnail.url,
      owner: req.user._id, // Assuming req.user._id contains the ID of the authenticated user
    });

    // Sending success response with the created video document
    return res
      .status(201)
      .json(
        new ApiResponse(200, { data: video }, "Video uploaded successfully")
      );
  } catch (err) {
    console.log("publishAVideo Error", err);
    // Throwing an error response if any error occurs during video publishing
    throw new ApiError(
      409,
      err.message || "Conflict while publishing the video"
    );
  }
});

const getVideoById = asyncHandler(async (req, res) => {
  try {
    const { videoId } = req.params;

    // Fetch the video from the database using its ID
    const video = await Video.findById(videoId);

    // Check if the video exists
    if (!video) {
      // If the video does not exist, return a 404 Not Found error
      throw new ApiError(404, "Video not found");
    }

    // If the video exists, return it in the response
    return res
      .status(201)
      .json(
        new ApiResponse(
          200,
          { data: video },
          `Video ${videoId} fetched successfully`
        )
      );
  } catch (error) {
    // If an error occurs during the database operation, return a 500 Internal Server Error
    console.log("getVideoById Error:", error);
    throw new ApiError(500, error.message || "Internal server error");
  }
});

const updateVideo = asyncHandler(async (req, res) => {
  try {
    const { videoId } = req.params;

    // Extracting title and description from the request body
    const { title, description } = req.body;

    // Retrieving file path for thumbnail from the request files
    const thumbnailFilePath = req.file?.path;

    // Checking if thumbnail file is missing
    if (!thumbnailFilePath) {
      throw new ApiError(400, "Thumbnail file is missing");
    }

    // Checking if video exists before updating
    const existingVideo = await Video.findOne({
      _id: new mongoose.Types.ObjectId(videoId), // Correct usage of mongoose.Types.ObjectId()
      owner: new mongoose.Types.ObjectId(req?.user?._id),
    });

    if (!existingVideo) {
      throw new ApiError(404, "Video not found");
    }

    // Uploading thumbnail to Cloudinary
    const uploadedThumbnail = await uploadOnCloudinary(thumbnailFilePath);

    // Checking if thumbnail upload was successful
    if (!uploadedThumbnail.url) {
      throw new ApiError(400, "Error while uploading the thumbnail");
    }

    // Updating video details in the database
    const updatedVideo = await Video.findByIdAndUpdate(
      videoId,
      {
        title,
        description,
        thumbnail: uploadedThumbnail.url,
      },
      { new: true }
    );

    return res
      .status(200)
      .json(new ApiResponse(200, updatedVideo, `Video updated successfully`)); // Use updatedVideo instead of updateVideo
  } catch (error) {
    throw new ApiError(500, error.message || "Internal server error");
  }
});

const deleteVideo = asyncHandler(async (req, res) => {
  try {
    const { videoId } = req.params;

    // Checking if video exists before updating
    const existingVideo = await Video.findOne({
      _id: new mongoose.Types.ObjectId(videoId),
      owner: new mongoose.Types.ObjectId(req?.user?._id),
    });

    // Check if the video exists
    if (!existingVideo) {
      // If the video does not exist, return a 404 Not Found error
      throw new ApiError(404, "Video not found");
    }

    // Delete the video and thumbnail files from Cloudinary
    const deletedVideoFile = await deleteOnCloudinary(existingVideo.videoFile); // Assuming videoFile is the Cloudinary URL of the video
    const deletedThumbnail = await deleteOnCloudinary(existingVideo.thumbnail); // Assuming thumbnail is the Cloudinary URL of the thumbnail image file

    if (deletedVideoFile.result !== "ok") {
      throw new ApiError(400, "Error while deleting the video");
    }

    if (deletedThumbnail.result !== "ok") {
      throw new ApiError(400, "Error while deleting the thumbnail");
    }

    const deletedVideo = await Video.findByIdAndDelete(videoId);

    if (!deletedVideo) {
      throw new ApiError(400, "Error while deleting the video in database");
    }
    // If the video is successfully deleted, return a success response
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { data: deletedVideo },
          `Video deleted successfully`
        )
      );
  } catch (error) {
    // If an error occurs during the database operation, return a 500 Internal Server Error
    console.log("deleteVideo Error:", error);
    throw new ApiError(500, error.message || "Internal server error");
  }
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  try {
    const { videoId } = req.params;

    // Checking if video exists before updating
    const video = await Video.findOne({
      _id: new mongoose.Types.ObjectId(videoId),
      owner: new mongoose.Types.ObjectId(req?.user?._id),
    });

    // Check if the video exists
    if (!video) {
      // If the video does not exist, return a 404 Not Found error
      throw new ApiError(404, "Video not found");
    }

    // Toggle the publish status directly on the video object
    video.isPublished = !video.isPublished;
    await video.save({ validateBeforeSave: false });

    return res
      .status(200)
      .json(new ApiResponse(200, video, "Publish flag updated successfully."));
  } catch (error) {
    // If an error occurs during the database operation, return a 500 Internal Server Error
    console.error("togglePublishStatus Error:", error);
    throw new ApiError(500, error.message || "Internal server error");
  }
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
