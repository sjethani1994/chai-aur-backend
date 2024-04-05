import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      throw new ApiError(400, "content is required");
    }

    const tweet = await Tweet.create({
      content,
      owner: req.user?._id,
    });

    if (!tweet) {
      throw new ApiError(500, "failed to create tweet please try again");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, tweet, "Tweet created successfully"));
  } catch (error) {
    throw new ApiError(
      500,
      error.message || "Something went wrong while adding tweet."
    );
  }
});

const getUserTweets = asyncHandler(async (req, res) => {
  // TODO: get user tweets
  const { userId } = req.params;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid userId");
  }

  try {
    const tweets = Tweet.aggregate([
      {
        $match: {
          owner: new mongoose.Types.ObjectId(userId),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "ownerDetails",
          pipeline: [
            {
              $project: {
                username: 1,
                "avatar.url": 1,
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "likes",
          localField: "owner",
          foreignField: "likedBy",
          as: "likeDetails",
          pipeline: [
            {
              $project: {
                likedBy: 1,
              },
            },
          ],
        },
      },
      {
        $addFields: {
          likesCount: {
            $size: "$likeDetails",
          },
          ownerDetails: {
            $first: "$ownerDetails",
          },
          isLiked: {
            $cond: {
              if: { $in: [req.user?._id, "$likeDetails.likedBy"] },
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
          ownerDetails: 1,
          likesCount: 1,
          createdAt: 1,
          isLiked: 1,
        },
      },
    ]);

    return res
      .status(200)
      .json(new ApiResponse(200, tweets, "Tweets fetched successfully"));
  } catch (error) {
    throw new ApiError(
      500,
      error.message || "Something went wrong while fetching tweets."
    );
  }
});

const updateTweet = asyncHandler(async (req, res) => {
  try {
    //TODO: update tweet
    const { content } = req.body;
    const { tweetId } = req.params;

    const tweet = Tweet.findById(tweetId);

    if (!tweet) {
      throw new ApiError(400, "Tweet not found.");
    }

    if (tweet?.owner.toString() !== req.user?._id.toString()) {
      throw new ApiError(400, "only owner can edit thier tweet");
    }

    const newTweet = await Tweet.findByIdAndUpdate(
      tweetId,
      {
        $set: {
          content,
        },
      },
      { new: true }
    );

    if (!newTweet) {
      throw new ApiError(500, "Failed to edit tweet please try again");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, newTweet, "Tweet updated successfully"));
  } catch (error) {
    throw new ApiError(
      500,
      error.message || "Something went wrong while updating tweet."
    );
  }
});

const deleteTweet = asyncHandler(async (req, res) => {
  try {
    //TODO: delete tweet
    const { content } = req.body;
    const { tweetId } = req.params;

    const tweet = Tweet.findById(tweetId);

    if (!tweet) {
      throw new ApiError(400, "Tweet not found.");
    }

    if (tweet?.owner.toString() !== req.user?._id.toString()) {
      throw new ApiError(400, "only owner can delete thier tweet");
    }

    const deletedTweet = await Tweet.findByIdAndDelete(tweetId);

    if (!deletedTweet) {
      throw new ApiError(500, "Failed to delete tweet please try again");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, deletedTweet, "Tweet deleted successfully"));
  } catch (error) {
    throw new ApiError(
      500,
      error.message || "Something went wrong while deleting tweet."
    );
  }
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
