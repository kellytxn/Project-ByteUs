const user = require("../models/UserDetails");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

exports.getModules = async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ status: "error", data: "Token is required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const email = decoded.email;

    const user = await user.findOne({ email });
    if (!user) {
      return res.status(404).json({ status: "error", data: "user not found" });
    }

    return res.status(200).json({ status: "ok", data: user.modules });
  } catch (error) {
    console.error("Error fetching modules:", error);
    return res
      .status(500)
      .json({ status: "error", data: "Failed to fetch modules" });
  }
};

exports.createModule = async (req, res) => {
  const { token, module } = req.body;
  if (!token || !module) {
    return res
      .status(400)
      .json({ status: "error", data: "Token and module data required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await user.findOne({ email: decoded.email });

    if (!user) {
      return res.status(404).json({ status: "error", data: "user not found" });
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
};

exports.updateModule = async (req, res) => {
  const { token, moduleId, updatedData } = req.body;
  if (!token || !moduleId || !updatedData) {
    return res.status(400).json({
      status: "error",
      data: "Token, moduleId and updatedData required",
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await user.findOne({ email: decoded.email });

    if (!user) {
      return res.status(404).json({ status: "error", data: "user not found" });
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
};

exports.deleteModule = async (req, res) => {
  const { token, moduleId } = req.body;

  if (!token || !moduleId) {
    return res
      .status(400)
      .json({ status: "error", message: "Token and moduleId required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await user.findOne({ email: decoded.email });

    if (!user)
      return res
        .status(404)
        .json({ status: "error", message: "user not found" });

    user.modules = user.modules.filter((m) => m._id.toString() !== moduleId);
    await user.save();

    return res.status(200).json({ status: "ok", message: "Module deleted" });
  } catch (error) {
    console.error("Delete error:", error);
    return res
      .status(500)
      .json({ status: "error", message: "Failed to delete module" });
  }
};
