import { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;
});

const addComment = asyncHandler(async (req, res) => {
  try {
    // TODO: add a comment to a video
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
      throw new ApiError(400, "Invalid Video ID");
    }

    const { content } = req.body;
    if (!content || typeof content !== "string") {
      throw new ApiError(
        400,
        "Content field must be provided and of type string."
      );
    }

    const comment = await Comment.create({
      content,
      video: videoId,
      owner: req.user?._id,
    });
    return res
      .status(200)
      .json(new ApiResponse(200, comment, "Comment added successfully."));
  } catch (error) {
    throw new ApiError(500, error.message || "Some Error Occurred.");
  }
});

const updateComment = asyncHandler(async (req, res) => {
  // TODO: update a comment
});

const deleteComment = asyncHandler(async (req, res) => {
  // TODO: delete a comment
});

export { getVideoComments, addComment, updateComment, deleteComment };
