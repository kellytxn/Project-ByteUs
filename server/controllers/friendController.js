const user = require("../models/UserDetails");
const jwt = require("jsonwebtoken");
const FriendRequest = require("../models/FriendRequest");

exports.getFriendsDetails = async (req, res) => {
  try {
    const { friendIds } = req.body;

    if (!friendIds || !Array.isArray(friendIds)) {
      return res.status(400).json({ message: "Invalid friend IDs provided" });
    }

    const friends = await user
      .find({
        _id: { $in: friendIds },
      })
      .select("_id name email timetable profilePic");

    const friendsWithTimetable = friends.map((friend) => {
      const friendObj = friend.toObject();

      // Since timetable is already stored as a base64 string, use it directly
      friendObj.timetable =
        typeof friendObj.timetable === "string" ? friendObj.timetable : null;

      return friendObj;
    });

    res.json({ friends: friendsWithTimetable });
  } catch (err) {
    console.error("Error fetching friends:", err);
    res.status(500).json({ message: "Server error fetching friends" });
  }
};

exports.sendFriendRequest = async (req, res) => {
  try {
    const { fromEmail, toEmail } = req.body;
    const token = req.headers.authorization?.split(" ")[1];

    // Validate input
    if (!fromEmail || !toEmail) {
      return res.status(400).json({ message: "Both emails are required" });
    }

    // Verify token and get user info
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const requestUser = await user.findOne({ email: decoded.email });

    if (!requestUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Check if users exist
    const [fromUser, toUser] = await Promise.all([
      user.findOne({ email: fromEmail }),
      user.findOne({ email: toEmail }),
    ]);

    if (!fromUser || !toUser) {
      return res
        .status(404)
        .json({ message: "user not found. Please check the email address" });
    }

    // Prevent self-friending
    if (fromUser._id.equals(toUser._id)) {
      return res
        .status(400)
        .json({ message: "Cannot send friend request to yourself" });
    }

    // Check if already friends
    if (fromUser.friends.includes(toUser._id)) {
      return res
        .status(400)
        .json({ message: "You are already friends with this user" });
    }

    // Check for existing requests
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { from: fromUser._id, to: toUser._id },
        { from: toUser._id, to: fromUser._id },
      ],
      status: { $ne: "rejected" },
    });

    if (existingRequest) {
      const message =
        existingRequest.status === "pending"
          ? "Friend request already pending"
          : "Friend request was previously handled";
      return res.status(400).json({ message });
    }

    const newRequest = await FriendRequest.create({
      from: fromUser._id,
      to: toUser._id,
    });

    res.status(201).json({
      message: "Friend request sent successfully",
      request: newRequest,
    });
  } catch (err) {
    console.error("Error sending friend request:", err);
    res.status(500).json({
      message: "Failed to send friend request",
      error: err.message,
    });
  }
};

exports.acceptFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({ message: "Request ID is required" });
    }

    const request = await FriendRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: "Friend request not found" });
    }
    if (request.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Friend request has already been processed" });
    }

    const [fromUser, toUser] = await Promise.all([
      user.findById(request.from),
      user.findById(request.to),
    ]);

    if (!fromUser || !toUser) {
      return res.status(404).json({ message: "One or both users not found" });
    }

    // Update friend lists if not already friends
    if (!fromUser.friends.includes(toUser._id)) {
      fromUser.friends.push(toUser._id);
      await fromUser.save();
    }

    if (!toUser.friends.includes(fromUser._id)) {
      toUser.friends.push(fromUser._id);
      await toUser.save();
    }

    // Update request status
    request.status = "accepted";
    await request.save();

    res.json({
      message: "Friend request accepted successfully",
      updatedRequest: request,
      fromUser: { _id: fromUser._id, name: fromUser.name },
      toUser: { _id: toUser._id, name: toUser.name },
    });
  } catch (err) {
    console.error("Error accepting friend request:", err);
    res.status(500).json({
      message: "Failed to accept friend request",
      error: err.message,
    });
  }
};

exports.rejectFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({ message: "Request ID is required" });
    }

    // Update request status
    const request = await FriendRequest.findByIdAndUpdate(
      requestId,
      { status: "rejected" },
      { new: true }
    );

    if (!request) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    res.json({
      message: "Friend request rejected successfully",
      updatedRequest: request,
    });
  } catch (err) {
    console.error("Error rejecting friend request:", err);
    res.status(500).json({
      message: "Failed to reject friend request",
      error: err.message,
    });
  }
};

exports.pendingFriendRequests = async (req, res) => {
  try {
    const { userId } = req.params;

    const requests = await FriendRequest.find({
      to: userId,
      status: "pending",
    }).populate("from", "name email profilePic");

    res.json({
      message: "Pending friend requests retrieved",
      requests,
    });
  } catch (err) {
    console.error("Error fetching pending requests:", err);
    res.status(500).json({
      message: "Failed to fetch pending requests",
      error: err.message,
    });
  }
};

exports.deleteFriend = async (req, res) => {
  try {
    const { userId, friendId } = req.body;
    const token = req.headers.authorization?.split(" ")[1];

    // Validate input
    if (!userId || !friendId) {
      return res
        .status(400)
        .json({ message: "Both user ID and friend ID are required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const requestingUser = await user.findOne({ email: decoded.email });

    if (!requestingUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!requestingUser._id.equals(userId)) {
      return res
        .status(403)
        .json({ message: "Not authorized to perform this action" });
    }

    const [user, friend] = await Promise.all([
      user.findById(userId),
      user.findById(friendId),
    ]);

    if (!user || !friend) {
      return res.status(404).json({ message: "user or friend not found" });
    }

    // Remove friend from both users' friend lists
    user.friends = user.friends.filter((id) => !id.equals(friendId));
    friend.friends = friend.friends.filter((id) => !id.equals(userId));

    await Promise.all([user.save(), friend.save()]);

    // Delete any pending friend requests between them
    await FriendRequest.deleteMany({
      $or: [
        { from: userId, to: friendId },
        { from: friendId, to: userId },
      ],
    });

    res.json({
      message: "Friend removed successfully",
      updatedUser: {
        _id: user._id,
        name: user.name,
        friends: user.friends,
      },
    });
  } catch (err) {
    console.error("Error deleting friend:", err);
    res.status(500).json({
      message: "Failed to remove friend",
      error: err.message,
    });
  }
};
