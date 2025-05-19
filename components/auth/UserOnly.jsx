import { useRouter } from "expo-router";
import { useUser } from "../../hooks/useUser";
import { useEffect } from "react";
import { StyleSheet, View, ActivityIndicator } from "react-native";

const UserOnly = ({ children }) => {
  const { user, authChecked } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (authChecked && user == null) {
      router.replace("/login");
    }
  }, [user, authChecked]);

  if (!authChecked || !user) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }
  return children;
};

export default UserOnly;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#EBE9E3",
    paddingHorizontal: 30,
  },
});
