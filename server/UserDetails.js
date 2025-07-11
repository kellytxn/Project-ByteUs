const mongoose = require("mongoose");

const ModuleSchema = new mongoose.Schema(
  {
    code: String,
    name: String,
    category: String,
    units: Number,
    completed: Boolean,
    grade: String,
    year: String,
    semester: String,
    isSU: Boolean,
  },
  { _id: true }
);

const FriendRequestSchema = new mongoose.Schema(
  {
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserInfo",
      required: true,
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserInfo",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const UserDetailsSchema = new mongoose.Schema({
  name: { type: String, required: true },
  course: { type: String, required: true },
  year: { type: Number, required: true },
  semester: { type: Number, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true, select: false },
  timetable: { type: Buffer, required: false },
  profilePic: { type: String, required: false },
  modules: {
    type: [ModuleSchema],
    default: [],
    required: false,
  },
  friends: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "UserInfo",
    default: [],
    required: false,
  },
});

mongoose.model("UserInfo", UserDetailsSchema);
mongoose.model("FriendRequest", FriendRequestSchema);
