import { BACKEND_URL } from "../config";

export const fetchGeminiResponse = async (prompt) => {
  const response = await fetch(`${BACKEND_URL}/generate-gemini`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  const data = await response.json();
  return data.response || "No response";
};
