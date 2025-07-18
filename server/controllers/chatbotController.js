const fetch = require("node-fetch");
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

exports.generateGemini = async (req, res) => {
  const { prompt } = req.body;

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await geminiRes.json();

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response";

    res.json({ response: reply });
  } catch (error) {
    console.error("Gemini backend error:", error);
    res.status(500).json({ error: "Failed to generate response" });
  }
};
