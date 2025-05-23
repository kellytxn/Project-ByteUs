const mongoose = require("mongoose");

const ModuleSchema = new mongoose.Schema(
  {
    code: String,
    name: String,
    category: String,
    units: Number,
    completed: Boolean,
    grade: String,
  },
  { _id: true }
);

const UserDetailsSchema = new mongoose.Schema({
  name: { type: String, required: true },
  course: { type: String, required: true },
  year: { type: Number, required: true },
  semester: { type: Number, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true, select: false },
  modules: {
    type: [ModuleSchema],
    default: [],
    required: false,
  },
});

mongoose.model("UserInfo", UserDetailsSchema);
