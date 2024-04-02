import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";

// Controller to get all comments for a video
const getVideoComments = asyncHandler(async (req, res) => {
  try {
    // Extract videoId from request parameters
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Find the video by its ID
    const video = await Video.findById(videoId);

    // Check if the video exists
    if (!video) {
      throw new ApiError(404, "Video not found");
    }

    // Aggregation pipeline to fetch comments for the given video with additional details
    const commentsAggregate = Comment.aggregate([
      {
        $match: {
          video: new mongoose.Types.ObjectId(videoId),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "owner",
        },
      },
      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "comment",
          as: "likes",
        },
      },
      {
        $addFields: {
          likesCount: {
            $size: "$likes",
          },
          owner: {
            $first: "$owner",
          },
          isLiked: {
            $cond: {
              if: { $in: [req.user?._id, "$likes.likedBy"] },
              then: true,
              else: false,
            },
          },
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $project: {
          content: 1,
          createdAt: 1,
          likesCount: 1,
          owner: {
            username: 1,
            fullName: 1,
            "avatar.url": 1,
          },
          isLiked: 1,
        },
      },
    ]);

    // Pagination options
    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    };

    // Execute aggregation with pagination
    const comments = await Comment.aggregatePaginate(
      commentsAggregate,
      options
    );

    return res
      .status(200)
      .json(new ApiResponse(200, comments, "Comments fetched successfully"));
  } catch (error) {
    throw new ApiError(500, error.message || "Interval Server Error");
  }
});

// Controller to add a comment to a video
const addComment = asyncHandler(async (req, res) => {
  try {
    // Extract videoId from request parameters
    const { videoId } = req.params;

    // Validate videoId
    if (!isValidObjectId(videoId)) {
      throw new ApiError(400, "Invalid Video ID");
    }

    // Extract content from request body
    const { content } = req.body;

    // Ensure content is provided and is of type string
    if (!content || typeof content !== "string") {
      throw new ApiError(
        400,
        "Content field must be provided and of type string."
      );
    }

    // Create a new comment
    const comment = await Comment.create({
      content,
      video: videoId,
      owner: req.user?._id,
    });

    // Return success response with added comment
    return res
      .status(200)
      .json(new ApiResponse(200, comment, "Comment added successfully."));
  } catch (error) {
    // Handle errors
    throw new ApiError(500, error.message || "Some Error Occurred.");
  }
});

// Controller to update a comment
const updateComment = asyncHandler(async (req, res) => {
  try {
    // Extract commentId from request parameters
    const { commentId } = req.params;

    // Validate commentId
    if (!isValidObjectId(commentId)) {
      throw new ApiError(400, "Invalid Comment ID");
    }

    // Extract content from request body
    const { content } = req.body;

    // Ensure content is provided
    if (!content) {
      throw new ApiError(400, "Content is required");
    }

    // Find the comment by its ID and owner
    const comment = await Comment.findOne({
      _id: commentId,
      owner: req.user?._id,
    });

    // Check if the comment exists
    if (!comment) {
      throw new ApiError(404, "Comment not found");
    }

    // Update the comment
    const updatedComment = await Comment.findByIdAndUpdate(
      comment?._id,
      {
        $set: {
          content,
        },
      },
      { new: true }
    );

    // Return success response with updated comment
    return res
      .status(200)
      .json(
        new ApiResponse(200, updatedComment, "Comment updated successfully.")
      );
  } catch (error) {
    // Handle errors
    throw new ApiError(500, error.message || "Some Error Occurred.");
  }
});

// Controller to delete a comment
const deleteComment = asyncHandler(async (req, res) => {
  try {
    // Extract commentId from request parameters
    const { commentId } = req.params;

    // Validate commentId
    if (!isValidObjectId(commentId)) {
      throw new ApiError(400, "Invalid Comment ID");
    }

    // Find the comment by its ID and owner
    const comment = await Comment.findOne({
      _id: commentId,
      owner: req.user?._id,
    });

    // Check if the comment exists
    if (!comment) {
      throw new ApiError(404, "Comment not found");
    }

    // Delete the comment
    const deletedComment = await Comment.findByIdAndDelete(comment?._id);

    // Return success response with deleted comment
    return res
      .status(200)
      .json(
        new ApiResponse(200, deletedComment, "Comment deleted successfully.")
      );
  } catch (error) {
    // Handle errors
    throw new ApiError(500, error.message || "Some Error Occurred.");
  }
});

export { getVideoComments, addComment, updateComment, deleteComment };
