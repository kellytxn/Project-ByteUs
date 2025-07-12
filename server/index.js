require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nusmods = require("./nusmods");
const ga = require("./timetableGA");

const app = express();

const mongoUrl = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;

mongoose.connect(mongoUrl).then(() => {
  console.log("Database connected");
});

require("./UserDetails");

const User = mongoose.model("UserInfo");
const FriendRequest = mongoose.model("FriendRequest");

app.use(cors());
app.use(helmet());
app.use(cookieParser());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

app.get("/", (req, res) => {
  res.json({ message: "Hello from the server" });
});

app.post("/register", async (req, res) => {
  const { name, course, year, semester, email, password } = req.body;

  if (!name || !course || !year || !semester || !email || !password) {
    return res.status(400).json({
      status: "error",
      data: "All fields except modules are required",
    });
  }

  const oldUser = await User.findOne({ email: email });
  if (oldUser) {
    return res
      .status(400)
      .json({ status: "error", data: "User already exists" });
  }

  const encryptedPassword = await bcrypt.hash(password, 10);

  try {
    await User.create({
      name,
      course,
      year,
      semester,
      email,
      password: encryptedPassword,
    });
    res.status(201).json({ status: "ok", data: "User created" });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ status: "error", data: "Internal server error" });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ status: "error", data: "Email and password are required" });
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    return res
      .status(400)
      .json({ status: "error", data: "User doesn't exist" });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res
      .status(400)
      .json({ status: "error", data: "Invalid email or password" });
  }

  const token = jwt.sign({ email: user.email }, JWT_SECRET);

  return res.status(200).json({ status: "ok", data: token });
});

app.post("/userData", async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ status: "error", data: "Token is required" });
  }
  try {
    const user = jwt.verify(token, JWT_SECRET);
    const useremail = user.email;

    const data = await User.findOne({ email: useremail }).select(
      "-password -__v"
    );
    if (!data) {
      return res.status(404).json({ status: "error", data: "User not found" });
    }

    return res.status(200).json({ status: "ok", data });
  } catch (error) {
    console.error("User data fetch error:", error);
    return res.status(401).json({ status: "error", data: "Invalid token" });
  }
});

app.post("/createModule", async (req, res) => {
  const { token, module } = req.body;
  if (!token || !module) {
    return res
      .status(400)
      .json({ status: "error", data: "Token and module data required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findOne({ email: decoded.email });

    if (!user) {
      return res.status(404).json({ status: "error", data: "User not found" });
    }

    const duplicateModule = user.modules.find(
      (m) => m.code === module.code || m.name === module.name
    );

    if (duplicateModule) {
      return res.status(409).json({
        status: "error",
        data: "Module with this code or name already exists",
      });
    }

    user.modules.push(module);
    await user.save();

    const newModule = user.modules[user.modules.length - 1];

    return res.status(200).json({
      status: "ok",
      data: "Module added successfully",
      id: newModule._id,
    });
  } catch (error) {
    console.error("Error adding module:", error);
    return res
      .status(500)
      .json({ status: "error", data: "Failed to add module" });
  }
});

app.post("/getModules", async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ status: "error", data: "Token is required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const email = decoded.email;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ status: "error", data: "User not found" });
    }

    return res.status(200).json({ status: "ok", data: user.modules });
  } catch (error) {
    console.error("Error fetching modules:", error);
    return res
      .status(500)
      .json({ status: "error", data: "Failed to fetch modules" });
  }
});

app.post("/updateModule", async (req, res) => {
  const { token, moduleId, updatedData } = req.body;
  if (!token || !moduleId || !updatedData) {
    return res.status(400).json({
      status: "error",
      data: "Token, moduleId and updatedData required",
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findOne({ email: decoded.email });

    if (!user) {
      return res.status(404).json({ status: "error", data: "User not found" });
    }

    const duplicateModule = user.modules.find(
      (mod) =>
        (mod.code === updatedData.code || mod.name === updatedData.name) &&
        mod._id.toString() !== moduleId
    );

    if (duplicateModule) {
      return res.status(409).json({
        status: "error",
        data: "Another module with this code or name exists",
      });
    }

    const moduleIndex = user.modules.findIndex(
      (mod) => mod._id.toString() === moduleId
    );

    if (moduleIndex === -1) {
      return res
        .status(404)
        .json({ status: "error", data: "Module not found" });
    }

    user.modules[moduleIndex] = {
      ...user.modules[moduleIndex]._doc,
      ...updatedData,
    };

    await user.save();

    return res
      .status(200)
      .json({ status: "ok", data: "Module updated successfully" });
  } catch (error) {
    console.error("Error updating module:", error);
    return res
      .status(500)
      .json({ status: "error", data: "Failed to update module" });
  }
});

app.post("/deleteModule", async (req, res) => {
  const { token, moduleId } = req.body;

  if (!token || !moduleId) {
    return res
      .status(400)
      .json({ status: "error", message: "Token and moduleId required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findOne({ email: decoded.email });

    if (!user)
      return res
        .status(404)
        .json({ status: "error", message: "User not found" });

    user.modules = user.modules.filter((m) => m._id.toString() !== moduleId);
    await user.save();

    return res.status(200).json({ status: "ok", message: "Module deleted" });
  } catch (error) {
    console.error("Delete error:", error);
    return res
      .status(500)
      .json({ status: "error", message: "Failed to delete module" });
  }
});

app.post("/updateUserData", async (req, res) => {
  const { token, name, course, year, semester } = req.body;

  if (!token) {
    return res.status(400).json({ status: "error", data: "Token is required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userEmail = decoded.email;

    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({ status: "error", data: "User not found" });
    }

    if (name) user.name = name;
    if (course) user.course = course;
    if (year) user.year = year;
    if (semester) user.semester = semester;

    await user.save();

    const updatedUser = {
      name: user.name,
      email: user.email,
      course: user.course,
      year: user.year,
      semester: user.semester,
      modules: user.modules,
    };

    return res.status(200).json({
      status: "ok",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Update user error:", error);
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ status: "error", data: "Invalid token" });
    }
    return res.status(500).json({
      status: "error",
      data: "Failed to update user data",
    });
  }
});

app.post("/timetableGen", async (req, res) => {
  const { token, modCodes, semester, acadYear, preferences } = req.body;

  if (!token) {
    return res.status(400).json({ status: "error", data: "Token is required" });
  }

  try {
    jwt.verify(token, JWT_SECRET);

    const modsData = {};
    for (const mod of modCodes) {
      modsData[mod] = await nusmods.fetchModTimetable(acadYear, mod, semester);
    }

    let population = ga.generatePopulation(modCodes, modsData);

    let generations = 100;
    for (let gen = 0; gen < generations; gen++) {
      population = ga.evolve(population, preferences, modsData);
    }

    let bestTimetable = null;
    let bestScore = -Infinity;
    for (const timetable of population) {
      const score = ga.calcScore(preferences, timetable);
      if (score > bestScore) {
        bestTimetable = timetable;
        bestScore = score;
      }
    }

    if (!bestTimetable || bestScore === -Infinity) {
      return res.status(404).json({
        status: "error",
        data: "No valid timetable found with given constraints",
      });
    }

    return res.status(200).json({
      status: "ok",
      data: bestTimetable,
    });
  } catch (error) {
    console.error("Timetable generation error:", error);
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ status: "error", data: "Invalid token" });
    }
    return res.status(500).json({
      status: "error",
      data: "Failed to generate timetable",
    });
  }
});

app.post("/timetableSnapshot", async (req, res) => {
  const { token, timetable } = req.body;

  if (!token) {
    return res.status(400).json({ status: "error", data: "Token is required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findOne({ email: decoded.email });

    if (!user) {
      return res.status(404).json({ status: "error", data: "User not found" });
    }

    user.timetable = timetable;
    await user.save();

    res.status(200).json({
      status: "success",
      data: "Timetable snapshot saved successfully",
    });
  } catch (error) {
    console.error("Timetable snapshot save error:", error);
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ status: "error", data: "Invalid token" });
    }
    return res.status(500).json({
      status: "error",
      data: "Failed to save timetable snapshot",
    });
  }
});

app.post("/uploadProfilePic", async (req, res) => {
  const { token, image } = req.body;
  if (!token || !image) {
    return res.status(400).json({ status: "error", message: "Missing data" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findOne({ email: decoded.email });

    if (!user) {
      return res
        .status(404)
        .json({ status: "error", message: "User not found" });
    }

    user.profilePic = image;
    await user.save();

    res
      .status(200)
      .json({ status: "success", message: "Profile picture updated" });
  } catch (err) {
    console.error("Upload profile pic error:", err);
    res.status(500).json({ status: "error", message: "Server error" });
  }
});

app.post("/sendFriendRequest", async (req, res) => {
  try {
    const { fromEmail, toEmail } = req.body;
    const token = req.headers.authorization?.split(" ")[1];

    // Validate input
    if (!fromEmail || !toEmail) {
      return res.status(400).json({ message: "Both emails are required" });
    }

    // Verify token and get user info
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const requestUser = await User.findOne({ email: decoded.email });

    if (!requestUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Check if users exist
    const [fromUser, toUser] = await Promise.all([
      User.findOne({ email: fromEmail }),
      User.findOne({ email: toEmail }),
    ]);

    if (!fromUser || !toUser) {
      return res
        .status(404)
        .json({ message: "User not found. Please check the email address" });
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
});

app.post("/acceptFriendRequest", async (req, res) => {
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
      User.findById(request.from),
      User.findById(request.to),
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
});

app.post("/rejectFriendRequest", async (req, res) => {
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
});

app.get("/pendingFriendRequests/:userId", async (req, res) => {
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
});

app.post("/getFriendsDetails", async (req, res) => {
  try {
    const { friendIds } = req.body;

    if (!friendIds || !Array.isArray(friendIds)) {
      return res.status(400).json({ message: "Invalid friend IDs provided" });
    }

    const friends = await User.find({
      _id: { $in: friendIds },
    }).select("_id name email timetable profilePic");

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
});

app.post("/deleteFriend", async (req, res) => {
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
    const requestingUser = await User.findOne({ email: decoded.email });

    if (!requestingUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!requestingUser._id.equals(userId)) {
      return res
        .status(403)
        .json({ message: "Not authorized to perform this action" });
    }

    const [user, friend] = await Promise.all([
      User.findById(userId),
      User.findById(friendId),
    ]);

    if (!user || !friend) {
      return res.status(404).json({ message: "User or friend not found" });
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
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on port ${PORT}`);
});
