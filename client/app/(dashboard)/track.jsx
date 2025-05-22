import {
  SectionList,
  Dimensions,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  View,
  TextInput,
  Pressable,
  Alert,
  Switch,
} from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { PieChart } from "react-native-chart-kit";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import uuid from "react-native-uuid";

const screenWidth = Dimensions.get("window").width;

const Track = () => {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [units, setUnits] = useState("");
  const [completed, setCompleted] = useState(false);
  const [grade, setGrade] = useState("");
  const [loading, setLoading] = useState(false);
  const [showInputs, setShowInputs] = useState(false);
  const [module, setModule] = useState([]);

  const router = useRouter();

  const clearForm = () => {
    setCode("");
    setName("");
    setCategory("");
    setUnits("");
    setCompleted(false);
    setGrade("");
  };

  const handleSave = async () => {
    if (!code.trim() || !name.trim() || !category.trim() || !units.trim()) {
      Alert.alert("Incomplete form", "Please fill in all fields.");
      return;
    }

    const unitsNumber = parseInt(units);
    if (isNaN(unitsNumber)) {
      Alert.alert("Invalid input", "Units must be a number.");
      return;
    }

    const trimmedGrade = completed ? grade.trim() : "NA";

    const userData = {
      code: code.trim().toUpperCase(),
      name: name.trim(),
      category: category.trim(),
      units: unitsNumber,
      completed,
      grade: trimmedGrade,
    };

    setLoading(true);

    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        console.error("No token found in AsyncStorage");
        return;
      }
      const response = await axios.post(
        "http://192.168.1.109:5001/createModule",
        { token, userData }
      );

      setModule((prev) => [...prev, { ...userData, $id: uuid.v4() }]);
      clearForm();
    } catch (error) {
      console.error("Error saving module:", error);
    } finally {
      setLoading(false);
      setShowInputs(false);
    }
  };

  const totalUnits = module.reduce((sum, m) => sum + (m.units || 0), 0);
  const completedUnits = module.reduce(
    (sum, m) => sum + ((m.completed && m.units) || 0),
    0
  );

  const chartData = [
    {
      name: "",
      population: completedUnits,
      color: "#B2CBDB",
      legendFontColor: "transparent",
      legendFontSize: 0,
    },
    {
      name: "",
      population: totalUnits - completedUnits,
      color: "rgba(178, 203, 219, 0.2)",
      legendFontColor: "transparent",
      legendFontSize: 0,
    },
  ];

  const groupedModules = Object.entries(
    module.reduce((acc, mod) => {
      const category = mod.category;
      if (!acc[category]) acc[category] = [];
      acc[category].push(mod);
      return acc;
    }, {})
  ).map(([title, data]) => ({
    title,
    data: data.sort((a, b) => a.completed - b.completed),
  }));

  return (
    <ScrollView style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.content}>
          <Pressable
            onPress={() => setShowInputs((prev) => !prev)}
            style={({ pressed }) => [
              styles.button,
              pressed && styles.pressed,
              { alignSelf: "flex-end", marginTop: 20 },
            ]}
          >
            <Text style={styles.buttonText}>{showInputs ? "-" : "+"}</Text>
          </Pressable>

          {totalUnits > 0 && (
            <View
              style={{
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                height: 300,
              }}
            >
              <PieChart
                data={chartData}
                width={screenWidth}
                height={300}
                chartConfig={{
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                }}
                accessor={"population"}
                backgroundColor={"transparent"}
                center={[screenWidth / 2 - 110, 0]}
                hasLegend={false}
                absolute
              />
              <View
                style={{
                  position: "absolute",
                  width: 150,
                  height: 150,
                  borderRadius: 75,
                  backgroundColor: "#EBE9E3",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontWeight: "bold", fontSize: 16 }}>
                  {completedUnits}/{totalUnits} MCs
                </Text>
                <Text style={{ fontWeight: "bold", fontSize: 16 }}>
                  completed
                </Text>
              </View>
            </View>
          )}

          {showInputs && (
            <>
              <Text style={styles.label}>Module code</Text>
              <TextInput
                style={styles.input}
                value={code}
                onChangeText={setCode}
                placeholder="Enter your module code"
              />

              <Text style={styles.label}>Module name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter your module name"
              />

              <Text style={styles.label}>Category</Text>
              <TextInput
                style={styles.input}
                value={category}
                onChangeText={setCategory}
                placeholder="Enter the category of the module"
              />

              <Text style={styles.label}>Modular Credit</Text>
              <TextInput
                style={styles.input}
                value={units}
                onChangeText={setUnits}
                placeholder="Enter the MCs"
                keyboardType="numeric"
              />

              <Text style={styles.label}>Completed?</Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 20,
                  alignSelf: "flex-start",
                }}
              >
                <Switch
                  value={completed}
                  onValueChange={(val) => {
                    setCompleted(val);
                    if (!val) setGrade("NA");
                  }}
                  trackColor={{ false: "#ccc", true: "#DFB6CF" }}
                  thumbColor={"#f4f3f4"}
                />
                <Text style={{ marginLeft: 10, fontSize: 14 }}>
                  {completed ? "Yes" : "No"}
                </Text>
              </View>

              {completed && (
                <>
                  <Text style={styles.label}>Final Grade</Text>
                  <TextInput
                    style={styles.input}
                    value={grade}
                    onChangeText={setGrade}
                    placeholder="Enter your grade"
                  />
                </>
              )}

              <Pressable
                onPress={handleSave}
                disabled={loading}
                style={({ pressed }) => [
                  styles.button,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.buttonText}>
                  {loading ? "Saving…" : "Create"}
                </Text>
              </Pressable>
            </>
          )}

          {module.length > 0 && (
            <SectionList
              sections={groupedModules}
              keyExtractor={(item) => item.$id}
              contentContainerStyle={styles.listContainer}
              renderSectionHeader={({ section: { title } }) => (
                <Text style={styles.header}>{title}</Text>
              )}
              renderItem={({ item }) => (
                <View style={styles.cardRow}>
                  <View>
                    <Text
                      style={[
                        styles.code,
                        item.completed && styles.strikethroughText,
                      ]}
                    >
                      {item.code}
                    </Text>
                    <Text
                      style={[
                        styles.name,
                        item.completed && styles.strikethroughText,
                      ]}
                    >
                      {item.name}
                    </Text>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      </TouchableWithoutFeedback>
    </ScrollView>
  );
};

export default Track;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EBE9E3",
    paddingHorizontal: 30,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  label: {
    alignSelf: "flex-start",
    marginLeft: 10,
    marginBottom: 6,
    color: "#444",
    fontWeight: "600",
  },
  input: {
    width: "100%",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    fontSize: 14,
    borderColor: "#ccc",
    borderWidth: 1,
  },
  button: {
    backgroundColor: "#DFB6CF",
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 12,
    marginBottom: 8,
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
    textAlign: "center",
  },
  pressed: {
    opacity: 0.8,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  code: {
    fontSize: 16,
    fontWeight: "bold",
    color: "black",
    marginBottom: 4,
  },
  name: {
    fontSize: 14,
    color: "#555",
  },
  cardRow: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    width: 350,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 24,
    marginBottom: 8,
    color: "#333",
  },
  strikethroughText: {
    textDecorationLine: "line-through",
    color: "#999",
  },
});
