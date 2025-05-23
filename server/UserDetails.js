const mongoose = require("mongoose");

// Define the subschema for a single module
const ModuleSchema = new mongoose.Schema(
  {
    code: String,
    name: String,
    category: String,
    units: Number,
    completed: Boolean,
    grade: String,
  },
  { _id: true } // Ensures each module gets its own _id
);

// Define the main user schema with all fields required except modules
const UserDetailsSchema = new mongoose.Schema({
  name: { type: String, required: true },
  course: { type: String, required: true },
  year: { type: Number, required: true },
  semester: { type: Number, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  modules: {
    type: [ModuleSchema],
    default: [],
    required: false, // explicitly not required
  },
});

mongoose.model("UserInfo", UserDetailsSchema);
