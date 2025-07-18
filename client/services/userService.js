import { BACKEND_URL } from "../config";

export const fetchUserData = async (token) => {
  const response = await fetch(`${BACKEND_URL}/userData`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  return await response.json();
};
