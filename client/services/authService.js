import axios from "axios";
import { BACKEND_URL } from "../config";

export const login = async (email, password) => {
  const userData = { email, password };
  const response = await axios.post(`${BACKEND_URL}/login`, userData);
  return response.data;
};

export const registerUser = async ({
  name,
  course,
  year,
  semester,
  email,
  password,
}) => {
  const registerRes = await axios.post(`${BACKEND_URL}/register`, {
    name,
    course,
    year,
    semester,
    email,
    password,
  });

  return registerRes.data;
};
