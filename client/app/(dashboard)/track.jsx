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
  ActivityIndicator,
  Platform,
} from "react-native";
import { useState, useEffect, useRef } from "react";
import { PieChart } from "react-native-chart-kit";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import uuid from "react-native-uuid";
import { BACKEND_URL } from "../../config";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

const screenWidth = Dimensions.get("window").width;
const screenHeight = Dimensions.get("window").height;

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
  const [editingModuleId, setEditingModuleId] = useState(null);
  const [isFetching, setIsFetching] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedModules, setSelectedModules] = useState([]);

  useEffect(() => {
    const fetchModules = async () => {
      setIsFetching(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        console.error("No token found");
        setIsFetching(false);
        return;
      }

      try {
        const res = await axios.post(`${BACKEND_URL}/getModules`, {
          token,
        });
        if (res.data.status === "ok") {
          const modulesWithId = res.data.data.map((m) => ({
            ...m,
            $id: uuid.v4(),
            _id: m._id,
          }));

          setModule(modulesWithId);
        } else {
          console.error("Failed to fetch modules:", res.data.data);
        }
      } catch (err) {
        console.error("Error fetching modules:", err);
      } finally {
        setIsFetching(false);
      }
    };

    fetchModules();
  }, []);

  const clearForm = () => {
    setCode("");
    setName("");
    setCategory("");
    setUnits("");
    setCompleted(false);
    setGrade("");
    setEditingModuleId(null);
  };

  const handleEdit = (module) => {
    setCode(module.code);
    setName(module.name);
    setCategory(module.category);
    setUnits(module.units.toString());
    setCompleted(module.completed);
    setGrade(module.completed ? module.grade : "NA");
    setEditingModuleId(module._id);
    setShowInputs(true);

    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: 250,
        animated: true,
      });
    }, 100);
  };

  const handleSave = async () => {
    if (!code || !name || !category || !units) {
      Alert.alert("Please fill all fields");
      return;
    }
    const unitsNum = Number(units);
    if (isNaN(unitsNum)) {
      Alert.alert("Units must be a number");
      return;
    }
    const newModule = {
      code,
      name,
      category,
      units: unitsNum,
      completed,
      grade: completed ? grade : "NA",
    };

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("No token found");

      if (editingModuleId) {
        await axios.post(`${BACKEND_URL}/updateModule`, {
          token,
          moduleId: editingModuleId,
          updatedData: newModule,
        });
        setModule((prev) =>
          prev.map((m) =>
            m._id === editingModuleId ? { ...m, ...newModule } : m
          )
        );
      } else {
        const res = await axios.post(`${BACKEND_URL}/createModule`, {
          token,
          module: newModule,
        });
        setModule((prev) => [
          ...prev,
          { ...newModule, _id: res.data.id, $id: uuid.v4() },
        ]);
      }
      clearForm();
      setShowInputs(false);
    } catch (error) {
      Alert.alert("Error saving module", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!editingModuleId) return;
    Alert.alert(
      "Delete module?",
      "Are you sure you want to delete this module?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem("token");
              if (!token) throw new Error("No token found");
              await axios.post(`${BACKEND_URL}/deleteModule`, {
                token,
                moduleId: editingModuleId,
              });
              setModule((prev) =>
                prev.filter((m) => m._id !== editingModuleId)
              );
              setSelectedModules((prev) =>
                prev.filter((m) => m._id !== editingModuleId)
              );
              clearForm();
              setShowInputs(false);
            } catch (error) {
              Alert.alert("Error deleting module", error.message);
            }
          },
        },
      ]
    );
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

  const availableModules = module.filter(
    (m) =>
      m.completed &&
      m.grade &&
      m.grade.toUpperCase() !== "CS" &&
      m.grade.toUpperCase() !== "CU"
  );

  const filteredModules = availableModules.filter(
    (m) =>
      (m.code.toLowerCase().includes(searchText.toLowerCase()) ||
        m.name.toLowerCase().includes(searchText.toLowerCase())) &&
      !selectedModules.some((selected) => selected._id === m._id)
  );

  const gradePointsMap = {
    "A+": 5,
    A: 5,
    "A-": 4.5,
    "B+": 4,
    B: 3.5,
    "B-": 3,
    "C+": 2.5,
    C: 2,
    "D+": 1.5,
    D: 1,
    F: 0,
  };

  const calculateGPA = () => {
    if (selectedModules.length === 0) return 0;
    let totalPoints = 0;
    let totalUnits = 0;

    selectedModules.forEach((mod) => {
      const points = gradePointsMap[mod.grade.toUpperCase()] ?? 0;
      totalPoints += points * mod.units;
      totalUnits += mod.units;
    });

    return totalUnits === 0 ? 0 : (totalPoints / totalUnits).toFixed(2);
  };

  const toggleModuleSelection = (mod) => {
    if (selectedModules.some((m) => m._id === mod._id)) {
      setSelectedModules((prev) => prev.filter((m) => m._id !== mod._id));
    } else {
      setSelectedModules((prev) => [...prev, mod]);
      setSearchText("");
    }
  };

  const removeSelectedModule = (moduleId) => {
    setSelectedModules((prev) => prev.filter((mod) => mod._id !== moduleId));
  };

  const scrollViewRef = useRef(null);
  const formStartRef = useRef(null);

  return (
    <KeyboardAwareScrollView
      extraScrollHeight={20}
      enableOnAndroid={Platform.OS === "android"}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.container}
      style={{ backgroundColor: "#EBE9E3" }}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.container}
        nestedScrollEnabled={true}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.content}>
            {isFetching ? (
              <>
                <View
                  style={{
                    flex: 1,
                    marginTop: screenHeight / 2.5,
                  }}
                >
                  <ActivityIndicator size="large" color="#AE96C7" />
                  <Text style={{ marginTop: 10, color: "#555" }}>
                    Loading...
                  </Text>
                </View>
              </>
            ) : (
              <>
                <Pressable
                  onPress={() => setShowInputs((prev) => !prev)}
                  style={({ pressed }) => [
                    styles.button,
                    pressed && styles.pressed,
                    { alignSelf: "flex-end", marginTop: 20 },
                  ]}
                >
                  <Text style={styles.buttonText}>
                    {showInputs ? "-" : "+"}
                  </Text>
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
                      center={[screenWidth / 2 - screenWidth / 4, 0]}
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
                  <View
                    ref={formStartRef}
                    style={[
                      styles.input,
                      {
                        backgroundColor: "transparent",
                        borderColor: "transparent",
                      },
                    ]}
                  >
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

                    <View style={styles.buttonRow}>
                      <Pressable
                        onPress={handleSave}
                        disabled={loading}
                        style={({ pressed }) => [
                          styles.button,
                          pressed && styles.pressed,
                          { flex: 1, marginRight: 10 },
                        ]}
                      >
                        <Text style={styles.buttonText}>
                          {loading
                            ? "Saving..."
                            : editingModuleId
                            ? "Save"
                            : "Create"}
                        </Text>
                      </Pressable>

                      {editingModuleId && (
                        <Pressable
                          onPress={handleDelete}
                          style={({ pressed }) => [
                            styles.deleteButton,
                            pressed && styles.pressed,
                            { flex: 1 },
                          ]}
                        >
                          <Text style={styles.buttonText}>Delete</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                )}

                {module.length > 0 && (
                  <SectionList
                    scrollEnabled={false}
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
                        <Pressable
                          onPress={() => handleEdit(item)}
                          style={({ pressed }) => [
                            styles.editButton,
                            pressed && styles.pressed,
                          ]}
                        >
                          <Text style={styles.editButtonText}>Edit</Text>
                        </Pressable>
                      </View>
                    )}
                  />
                )}

                {filteredModules.length > 0 && (
                  <View style={styles.gpaBox}>
                    <Text style={[styles.header, { marginTop: 0 }]}>
                      GPA Calculator
                    </Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Search by module code or name"
                      value={searchText}
                      onChangeText={setSearchText}
                    />

                    {searchText.trim() !== "" && filteredModules.length > 0 ? (
                      <View
                        style={{
                          maxHeight: 150,
                          marginTop: 0,
                        }}
                      >
                        {filteredModules.length > 0 &&
                          filteredModules.map((mod) => {
                            const selected = selectedModules.some(
                              (m) => m._id === mod._id
                            );
                            return (
                              <Pressable
                                key={mod._id}
                                onPress={() => toggleModuleSelection(mod)}
                                style={{
                                  marginVertical: 6,
                                  padding: 12,
                                  backgroundColor: "white",
                                  borderRadius: 12,
                                  borderWidth: 1,
                                  borderColor: "#e0e0e0",
                                  shadowColor: "#000",
                                  shadowOffset: { width: 0, height: 1 },
                                  shadowOpacity: 0.1,
                                  shadowRadius: 3,
                                  elevation: 2,
                                }}
                              >
                                <Text style={{ fontWeight: "bold" }}>
                                  {mod.code} - {mod.name}
                                </Text>
                              </Pressable>
                            );
                          })}
                      </View>
                    ) : null}

                    {selectedModules.length > 0 && (
                      <>
                        <Text
                          style={[
                            styles.header,
                            { marginTop: 0, marginBottom: 0 },
                          ]}
                        >
                          Selected:
                        </Text>
                        <View
                          style={{
                            maxHeight: 150,
                            borderWidth: 1,
                            borderColor: "#C9BDD6",
                            borderRadius: 12,
                            backgroundColor: "#C9BDD6",
                            marginTop: 5,
                            paddingVertical: 5,
                          }}
                        >
                          {selectedModules.map((mod) => (
                            <View
                              key={mod._id}
                              style={{
                                padding: 10,
                                backgroundColor: "rgba(178, 203, 219, 0.6)",
                                flexDirection: "row",
                                justifyContent: "space-between",
                                alignItems: "center",
                                borderRadius: 8,
                                marginBottom: 15,
                              }}
                            >
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontWeight: "bold" }}>
                                  {mod.code} - {mod.name}
                                </Text>
                                <Text>
                                  Grade: {mod.grade} | MCs: {mod.units}
                                </Text>
                              </View>
                              <Pressable
                                onPress={() => removeSelectedModule(mod._id)}
                                style={({ pressed }) => [
                                  {
                                    backgroundColor: "#D3D4D8",
                                    paddingVertical: 6,
                                    paddingHorizontal: 12,
                                    borderRadius: 8,
                                  },
                                  pressed && { opacity: 0.8 },
                                ]}
                              >
                                <Text
                                  style={{ color: "white", fontWeight: "bold" }}
                                >
                                  Remove
                                </Text>
                              </Pressable>
                            </View>
                          ))}
                        </View>
                      </>
                    )}

                    <View style={{ marginTop: 15, alignItems: "center" }}>
                      {selectedModules.length > 0 && (
                        <Text style={{ fontWeight: "bold", fontSize: 16 }}>
                          GPA: {calculateGPA()}
                        </Text>
                      )}
                    </View>
                  </View>
                )}
              </>
            )}
          </View>
        </TouchableWithoutFeedback>
      </ScrollView>
    </KeyboardAwareScrollView>
  );
};

export default Track;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EBE9E3",
    paddingHorizontal: 0,
  },
  content: {
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
    marginRight: 5,
  },
  deleteButton: {
    backgroundColor: "#D3D4D8",
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
  editButton: {
    backgroundColor: "#D3D4D8",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  editButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  gpaBox: {
    width: "89.5%",
    backgroundColor: "#C9BDD6",
    borderColor: "#C9BDD6",
    borderRadius: 16,
    padding: 16,
    marginTop: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});
