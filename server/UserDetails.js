const mongoose = require("mongoose");

const UserDetailSchema = new mongoose.Schema(
  {
    name: String,
    course: String,
    year: Number,
    semester: Number,
    email: { type: String, unique: true },
    password: String,
  },
  {}
);

mongoose.model("UserInfo", UserDetailSchema);
