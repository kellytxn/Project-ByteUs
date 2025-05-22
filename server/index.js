const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const app = express();
app.use(express.json());
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

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
  const oldUser = await User.findOne({ email: email });
  if (oldUser) {
    return res.send({ data: "User already exists" });
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
    res.send({ status: "ok", data: "User created" });
  } catch (error) {
    res.send({ status: "error", data: "error" });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
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
  try {
    const user = jwt.verify(token, JWT_SECRET);
    const useremail = user.email;

    User.findOne({ email: useremail }).then((data) => {
      return res.send({ status: "ok", data: data });
    });
  } catch (error) {}
});

app.post("/createModule", async (req, res) => {
  const { token, module } = req.body;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const email = decoded.email;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send({ status: "error", data: "User not found" });
    }

    user.modules.push(module);
    await user.save();

    return res
      .status(200)
      .send({ status: "ok", data: "Module added successfully" });
  } catch (error) {
    console.error("Error adding module:", error);
    return res
      .status(500)
      .send({ status: "error", data: "Failed to add module" });
  }
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on port ${PORT}`);
});
