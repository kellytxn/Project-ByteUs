import AsyncStorage from "@react-native-async-storage/async-storage";

export const getToken = async () => {
  return await AsyncStorage.getItem("token");
};

export const getMcsToGraduate = async (email) => {
  const saved = await AsyncStorage.getItem(`mcsToGraduate_${email}`);
  const savedNumber = Number(saved);
  return saved && !isNaN(savedNumber) ? savedNumber : null;
};
