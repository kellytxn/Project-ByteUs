const mongoose = require("mongoose");

const UserDetailsSchema = new mongoose.Schema(
  {
    name: String,
    course: String,
    year: Number,
    semester: Number,
    email: { type: String, unique: true },
    password: String,
    modules: {
      type: [
        {
          code: String,
          name: String,
          category: String,
          units: Number,
          completed: Boolean,
          grade: String,
        },
      ],
      required: false,
      default: [],
    },
  },
  {}
);

mongoose.model("UserInfo", UserDetailsSchema);
