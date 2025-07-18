const mongoose = require("mongoose");

const FriendRequestSchema = new mongoose.Schema(
  {
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserInfo",
      required: true,
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserInfo",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("FriendRequest", FriendRequestSchema);
