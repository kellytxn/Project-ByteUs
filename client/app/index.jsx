import { StyleSheet, Text, View, Image, Pressable } from "react-native";
import { Link } from "expo-router";

const Home = () => {
  return (
    <View style={styles.container}>
      <Image source={require("../assets/Logo.png")} style={styles.logo} />

      <View style={styles.linkContainer}>
        <View style={styles.box}>
          <Link href="/login" asChild>
            <Pressable>
              <Text style={styles.linkText}>Login</Text>
            </Pressable>
          </Link>
        </View>

        <View style={styles.box}>
          <Link href="/register" asChild>
            <Pressable>
              <Text style={styles.linkText}>Register</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </View>
  );
};

export default Home;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#EBE9E3",
  },
  logo: {
    width: 250,
    height: 250,
    borderRadius: 125,
    marginBottom: 40,
  },
  linkContainer: {
    gap: 20,
    alignItems: "center",
  },
  box: {
    backgroundColor: "#F3F5F9",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 30,
    alignItems: "center",
    width: 200,
  },
  linkText: {
    fontSize: 18,
    color: "#333",
    fontWeight: "bold",
  },
});
