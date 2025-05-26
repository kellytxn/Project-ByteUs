const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();

const mongoUrl =
  "mongodb+srv://kellytttan:T0513663b@cluster0.2vbexus.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const JWT_SECRET = "234tychsbdc76euwy3456uytfvbnjjgfe45t6yujhj";

mongoose.connect(mongoUrl).then(() => {
  console.log("Database connected");
});

require("./UserDetails");

const User = mongoose.model("UserInfo");

app.use(cors());
app.use(helmet());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

    const duplicate = user.modules.find(
      (mod) => mod.code === updatedData.code && mod._id.toString() !== moduleId
    );

    if (duplicate) {
      return res
        .status(409)
        .json({
          status: "error",
          data: "Another module with this code exists",
        });
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

    return res
      .status(200)
      .json({ status: "ok", data: "Module added successfully" });
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
      message: "Token, moduleId and updatedData are required",
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findOne({ email: decoded.email });

    if (!user)
      return res
        .status(404)
        .json({ status: "error", message: "User not found" });

    const duplicate = user.modules.find(
      (mod) => mod.code === updatedData.code && mod._id.toString() !== moduleId
    );

    if (duplicate) {
      return res
        .status(409)
        .json({
          status: "error",
          data: "Another module with this code exists",
        });
    }

    const moduleIndex = user.modules.findIndex(
      (m) => m._id.toString() === moduleId
    );
    if (moduleIndex === -1)
      return res
        .status(404)
        .json({ status: "error", message: "Module not found" });

    user.modules[moduleIndex] = {
      ...user.modules[moduleIndex].toObject(),
      ...updatedData,
    };
    await user.save();

    return res.status(200).json({ status: "ok", message: "Module updated" });
  } catch (error) {
    console.error("Update error:", error);
    return res
      .status(500)
      .json({ status: "error", message: "Failed to update module" });
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

const PORT = process.env.PORT || 5001;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on port ${PORT}`);
});
