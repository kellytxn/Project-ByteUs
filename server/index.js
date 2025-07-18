require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");

const app = express();

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Database connected"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

app.use(cors());
app.use(helmet());
app.use(cookieParser());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

app.get("/", (req, res) => {
  res.json({ message: "Hello from the server" });
});

const userRoute = require("./routes/userRoute");
const moduleRoute = require("./routes/moduleRoute");
const timetableRoute = require("./routes/timetableRoute");
const friendRoute = require("./routes/friendRoute");
const chatbotRoute = require("./routes/chatbotRoute");

app.use("/", userRoute);
app.use("/", moduleRoute);
app.use("/", timetableRoute);
app.use("/", friendRoute);
app.use("/", chatbotRoute);

const PORT = process.env.PORT || 8000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on port ${PORT}`);
});
