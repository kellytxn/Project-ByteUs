const User = require("../models/UserDetails");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

exports.register = async (req, res) => {
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
};

exports.login = async (req, res) => {
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
      .json({ status: "error", data: "Invalid password" });
  }

  const token = jwt.sign({ email: user.email }, JWT_SECRET);

  return res.status(200).json({ status: "ok", data: token });
};

exports.userData = async (req, res) => {
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
    return res.status(401).json({ status: "error", data: "Invalid token" });
  }
};

exports.updateUserData = async (req, res) => {
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
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ status: "error", data: "Invalid token" });
    }
    return res.status(500).json({
      status: "error",
      data: "Failed to update user data",
    });
  }
};

exports.uploadProfilePic = async (req, res) => {
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
};
