import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

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
  const { title, description } = req.body;
  // TODO: get video, upload to cloudinary, create video
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: get video by id
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: update video details like title, description, thumbnail
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
