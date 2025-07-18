const User = require("../models/UserDetails");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;
const nusmods = require("../utils/nusmods");
const ga = require("../utils/timetable");

exports.timetableGen = async (req, res) => {
  const { token, modCodes, semester, acadYear, preferences } = req.body;

  if (!token) {
    return res.status(400).json({ status: "error", data: "Token is required" });
  }

  try {
    jwt.verify(token, JWT_SECRET);

    const modsData = {};
    for (const mod of modCodes) {
      modsData[mod] = await nusmods.fetchModTimetable(acadYear, mod, semester);
    }

    let population = ga.generatePopulation(modCodes, modsData);

    let generations = 100;
    for (let gen = 0; gen < generations; gen++) {
      population = ga.evolve(population, preferences, modsData);
    }

    let bestTimetable = null;
    let bestScore = -Infinity;
    for (const timetable of population) {
      const score = ga.calcScore(preferences, timetable);
      if (score > bestScore) {
        bestTimetable = timetable;
        bestScore = score;
      }
    }

    if (!bestTimetable || bestScore === -Infinity) {
      return res.status(404).json({
        status: "error",
        data: "No valid timetable found with given constraints",
      });
    }

    return res.status(200).json({
      status: "ok",
      data: bestTimetable,
    });
  } catch (error) {
    console.error("Timetable generation error:", error);
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ status: "error", data: "Invalid token" });
    }
    return res.status(500).json({
      status: "error",
      data: "Failed to generate timetable",
    });
  }
};

exports.timetableSnapshot = async (req, res) => {
  const { token, timetable } = req.body;

  if (!token) {
    return res.status(400).json({ status: "error", data: "Token is required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findOne({ email: decoded.email });

    if (!user) {
      return res.status(404).json({ status: "error", data: "User not found" });
    }

    user.timetable = timetable;
    await user.save();

    res.status(200).json({
      status: "success",
      data: "Timetable snapshot saved successfully",
    });
  } catch (error) {
    console.error("Timetable snapshot save error:", error);
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ status: "error", data: "Invalid token" });
    }
    return res.status(500).json({
      status: "error",
      data: "Failed to save timetable snapshot",
    });
  }
};
