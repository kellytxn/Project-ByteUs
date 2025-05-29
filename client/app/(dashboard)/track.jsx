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
import { useState, useEffect, useRef, useCallback } from "react";
import { PieChart, LineChart } from "react-native-chart-kit";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import uuid from "react-native-uuid";
import { BACKEND_URL } from "../../config";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import debounce from "lodash.debounce";
import { Circle } from "react-native-progress";

const screenWidth = Dimensions.get("window").width;
const screenHeight = Dimensions.get("window").height;

const Track = () => {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [units, setUnits] = useState("");
  const [completed, setCompleted] = useState(false);
  const [grade, setGrade] = useState("");
  const [year, setYear] = useState("");
  const [semester, setSemester] = useState("");
  const [isSU, setIsSU] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showInputs, setShowInputs] = useState(false);
  const [module, setModule] = useState([]);
  const [editingModuleId, setEditingModuleId] = useState(null);
  const [isFetching, setIsFetching] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedModules, setSelectedModules] = useState([]);
  const [isSearchingNUSMods, setIsSearchingNUSMods] = useState(false);
  const [ghostCategory, setGhostCategory] = useState("");
  const [availableCategories, setAvailableCategories] = useState([]);
  const [isCategoryFocused, setIsCategoryFocused] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});

  const toggleCategory = (category) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const getCategoryStats = () => {
    return groupedModules.map(({ title, data }) => {
      const total = data.length;
      const completed = data.filter((m) => m.completed).length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        title,
        total,
        completed,
        percentage,
      };
    });
  };

  const handleCategoryChange = (text) => {
    setCategory(text);

    if (text.trim()) {
      const match = availableCategories.find((cat) =>
        cat.toLowerCase().startsWith(text.toLowerCase())
      );
      setGhostCategory(match || "");
    } else {
      setGhostCategory("");
    }
  };

  const handleCategorySubmit = () => {
    if (ghostCategory) {
      setCategory(ghostCategory);
      setGhostCategory("");
    }
  };

  useEffect(() => {
    const categories = [
      ...new Set(module.map((m) => m.category).filter(Boolean)),
    ];
    setAvailableCategories(categories);
  }, [module]);

  const searchNUSMods = useCallback(
    debounce(async (searchTerm) => {
      if (!searchTerm.trim()) return;

      setIsSearchingNUSMods(true);
      try {
        const response = await axios.get(
          `https://api.nusmods.com/v2/2023-2024/modules/${searchTerm
            .trim()
            .toUpperCase()}.json`
        );

        if (response.data) {
          const modData = response.data;
          setCode(modData.moduleCode);
          setName(modData.title);
          setUnits(modData.moduleCredit.toString());
        }
      } catch (error) {
        console.log("Module not found in NUS Mods API");
      } finally {
        setIsSearchingNUSMods(false);
      }
    }, 500),
    []
  );

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
          console.log("Fetched modules:", modulesWithId);

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
    setYear("");
    setSemester("");
    setIsSU(false);
  };

  const handleEdit = (module) => {
    setCode(module.code);
    setName(module.name);
    setCategory(module.category);
    setUnits(module.units.toString());
    setCompleted(module.completed);
    setGrade(module.completed ? module.grade : "");
    setYear(module.completed ? module.year : "");
    setSemester(module.completed ? module.semester : "");
    setIsSU(module.completed ? module.isSU : false);
    setEditingModuleId(module._id);
    setShowInputs(true);

    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: 250,
        animated: true,
      });
    }, 100);
  };

  const validGrades = [
    "A+",
    "A",
    "A-",
    "B+",
    "B",
    "B-",
    "C+",
    "C",
    "D+",
    "D",
    "F",
    "CS",
    "CU",
  ];

  const validateGrade = (grade) => {
    const upperGrade = grade.toUpperCase();
    return validGrades.includes(upperGrade);
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
    if (completed) {
      if (!grade) {
        Alert.alert("Please enter the final grade for completed module");
        return;
      }
      if (!year) {
        Alert.alert("Please enter the year you completed the module");
        return;
      }
      if (!semester) {
        Alert.alert("Please enter the semester you completed the module");
        return;
      }

      if (!validateGrade(grade)) {
        Alert.alert(
          "Invalid Grade",
          `Please enter one of the following grades: ${validGrades.join(", ")}`
        );
        return;
      }
    } else {
      setSelectedModules((prev) =>
        prev.filter((mod) => mod._id !== editingModuleId)
      );
    }
    const isDuplicate = module.some(
      (mod) =>
        (mod.code === code || mod.name === name) && mod._id !== editingModuleId
    );
    if (isDuplicate) {
      Alert.alert(
        "Duplicate module",
        "A module with this code already exists."
      );
      return;
    }
    const newModule = {
      code,
      name,
      category,
      units: unitsNum,
      completed,
      grade: completed ? grade : "",
      year: completed ? year : "",
      semester: completed ? semester : "",
      isSU: completed ? isSU : false,
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
      setEditingModuleId(null);
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

  const calculateGPABySemester = (modules) => {
    const semesters = {};

    const validModules = modules.filter(
      (mod) =>
        mod.completed && mod.grade && !mod.isSU && mod.year && mod.semester
    );

    validModules.forEach((mod) => {
      const key = `${mod.year}-${mod.semester}`;
      if (!semesters[key]) semesters[key] = [];
      semesters[key].push(mod);
    });

    return Object.entries(semesters)
      .map(([key, mods]) => {
        const [year, semester] = key.split("-");
        const { gpa, totalUnits } = calculateSemesterGPA(mods);

        return {
          year,
          semester,
          gpa,
          totalUnits,
          modules: mods,
        };
      })
      .sort((a, b) => a.year - b.year || a.semester - b.semester);
  };

  const calculateSemesterGPA = (modules) => {
    let totalPoints = 0;
    let totalUnits = 0;

    modules.forEach((mod) => {
      const gradePoints =
        {
          "A+": 5.0,
          A: 5.0,
          "A-": 4.5,
          "B+": 4.0,
          B: 3.5,
          "B-": 3.0,
          "C+": 2.5,
          C: 2.0,
          "D+": 1.5,
          D: 1.0,
          F: 0.0,
        }[mod.grade.toUpperCase()] || 0;

      totalPoints += gradePoints * mod.units;
      totalUnits += mod.units;
    });

    return {
      gpa:
        totalUnits > 0 ? parseFloat((totalPoints / totalUnits).toFixed(2)) : 0,
      totalUnits,
    };
  };

  const semData = calculateGPABySemester(module);

  const lineChartData = {
    labels: semData.map((sem) => `Y${sem.year}S${sem.semester}`),
    datasets: [
      {
        data: semData.map((sem) => sem.gpa),
      },
    ],
  };

  const scrollViewRef = useRef(null);
  const formStartRef = useRef(null);

  return (
    <KeyboardAwareScrollView
      extraScrollHeight={100}
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
        <TouchableWithoutFeedback
          onPress={() => {
            Keyboard.dismiss();
            setIsCategoryFocused(false);
            setGhostCategory("");
          }}
        >
          <View style={styles.content}>
            {isFetching ? (
              <>
                <View
                  style={{
                    flex: 1,
                    marginTop: screenHeight / 2.45,
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
                  onPress={() => {
                    if (!showInputs) {
                      clearForm();
                      setEditingModuleId(null);
                    }
                    setShowInputs((prev) => !prev);
                  }}
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
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        value={code}
                        onChangeText={(text) => {
                          setCode(text);
                          searchNUSMods(text);
                        }}
                        placeholder="Enter module code"
                      />
                    </View>

                    <Text style={styles.label}>Module name</Text>
                    <TextInput
                      style={styles.input}
                      value={name}
                      onChangeText={setName}
                      placeholder="Enter module name"
                    />
                    <Text style={styles.label}>Category</Text>
                    <View style={{ position: "relative", width: "100%" }}>
                      <TextInput
                        style={styles.input}
                        value={category}
                        onChangeText={handleCategoryChange}
                        onSubmitEditing={handleCategorySubmit}
                        onFocus={() => {
                          setIsCategoryFocused(true);
                          if (category) {
                            const match = availableCategories.find((cat) =>
                              cat
                                .toLowerCase()
                                .startsWith(category.toLowerCase())
                            );
                            setGhostCategory(match || "");
                          }
                        }}
                        onBlur={() => {
                          setIsCategoryFocused(false);
                          setGhostCategory("");
                        }}
                        blurOnSubmit={false}
                        placeholder="Enter category"
                      />
                      {isCategoryFocused && ghostCategory && (
                        <Text style={styles.ghostText}>
                          {category}
                          <Text style={{ color: "#999" }}>
                            {ghostCategory.slice(category.length)}
                          </Text>
                        </Text>
                      )}
                    </View>
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
                          if (!val) {
                            setGrade("");
                            setYear("");
                            setSemester("");
                            setIsSU(false);
                          }
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
                        <Text style={styles.label}>Year Taken</Text>
                        <TextInput
                          style={styles.input}
                          value={year}
                          onChangeText={setYear}
                          placeholder="Enter the academic year (e.g., 1 for Year 1)"
                          keyboardType="numeric"
                        />

                        <Text style={styles.label}>Semester Taken</Text>
                        <TextInput
                          style={styles.input}
                          value={semester}
                          onChangeText={setSemester}
                          placeholder="Enter the semester (e.g., 1 for Semester 1)"
                          keyboardType="numeric"
                        />

                        <Text style={styles.label}>S/U?</Text>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            marginBottom: 20,
                            alignSelf: "flex-start",
                          }}
                        >
                          <Switch
                            value={isSU}
                            onValueChange={setIsSU}
                            trackColor={{ false: "#ccc", true: "#DFB6CF" }}
                            thumbColor={"#f4f3f4"}
                          />
                          <Text style={{ marginLeft: 10, fontSize: 14 }}>
                            {isSU ? "Yes" : "No"}
                          </Text>
                        </View>
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
                    renderSectionHeader={({ section: { title } }) => {
                      const stats = getCategoryStats().find(
                        (s) => s.title === title
                      );

                      return (
                        <Pressable
                          onPress={() => toggleCategory(title)}
                          style={({ pressed }) => [
                            styles.categoryHeader,
                            pressed && styles.pressed,
                          ]}
                        >
                          <View style={styles.categoryHeaderContent}>
                            {/* Category Title */}
                            <View>
                              <Text
                                style={styles.header}
                                numberOfLines={2}
                                ellipsizeMode="tail"
                              >
                                {title}
                              </Text>
                              <Text style={styles.arrow}>
                                {expandedCategories[title] ? "▼" : "▶"}
                              </Text>
                            </View>

                            {/* Stats & Progress Bar */}
                            <View style={styles.progressBarContainer}>
                              <View
                                style={[
                                  styles.progressBar,
                                  {
                                    width: `${stats.percentage}%`,
                                    backgroundColor: "rgb(178, 203, 219)",
                                  },
                                ]}
                              />
                            </View>
                          </View>
                        </Pressable>
                      );
                    }}
                    renderItem={({ item, section }) => {
                      if (!expandedCategories[section.title]) return null;

                      return (
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
                                { maxWidth: 240 },
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
                      );
                    }}
                  />
                )}
                {semData.length > 0 && (
                  <View style={styles.progressionBox}>
                    <Text style={[styles.header, { marginTop: 0 }]}>
                      GPA Progression
                    </Text>

                    {semData.length === 1 && (
                      <View style={{ alignItems: "center", marginBottom: 15 }}>
                        <Circle
                          size={200}
                          progress={semData[0].gpa / 5}
                          showsText
                          formatText={() =>
                            `${semData[0].gpa.toFixed(2)} / 5.00`
                          }
                          color="#DFB6CF"
                          unfilledColor="#F5E6F0"
                          thickness={30}
                          borderWidth={0}
                          textStyle={{
                            fontWeight: "bold",
                            color: "black",
                            fontSize: 20,
                          }}
                        />
                        <Text style={{ color: "black", marginTop: 8 }}>
                          Y{semData[0].year}S{semData[0].semester}
                        </Text>
                      </View>
                    )}

                    {semData.length !== 1 && (
                      <LineChart
                        data={lineChartData}
                        width={screenWidth - 50}
                        height={250}
                        chartConfig={{
                          backgroundGradientFrom: "#EBE9E3",
                          backgroundGradientTo: "#EBE9E3",
                          decimalPlaces: 2,
                          color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                          labelColor: (opacity = 1) =>
                            `rgba(0, 0, 0, ${opacity})`,
                          propsForDots: {
                            r: "5",
                            strokeWidth: "2",
                            stroke: "#7B7878",
                            fill: "#7B7878",
                          },
                          propsForBackgroundLines: {
                            stroke: "#BFBFBF",
                            strokeDasharray: "6",
                          },
                          style: {
                            borderRadius: 4,
                          },
                        }}
                        style={{
                          marginVertical: 5,
                          borderRadius: 16,
                        }}
                        fromZero
                        yAxisInterval={1}
                      />
                    )}
                  </View>
                )}

                {module.length > 0 && (
                  <View style={[styles.gpaBox]}>
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
                      <ScrollView
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
                      </ScrollView>
                    ) : null}

                    {selectedModules.length > 0 && (
                      <>
                        <Text style={[styles.header, { marginTop: 5 }]}>
                          Selected:
                        </Text>
                        <View
                          style={{
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
                                marginBottom: 5,
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
                                    paddingVertical: 3,
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

                    <View style={{ marginTop: 10, alignItems: "center" }}>
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
    paddingBottom: 20,
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
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressionBox: {
    width: "89.5%",
  },
  ghostText: {
    position: "absolute",
    left: 15,
    top: 15,
    color: "transparent",
    pointerEvents: "none",
    includeFontPadding: false,
    marginTop: 1,
  },
  categoryHeader: {
    backgroundColor: "white",
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginBottom: 10,
    width: "100%",
  },
  categoryHeaderContent: {
    flexDirection: "column",
    paddingHorizontal: 16,
  },
  categoryInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    flexWrap: "wrap",
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: "#E0E0E0",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressBar: {
    height: "100%",
    borderRadius: 3,
  },
  arrow: {
    alignSelf: "flex-end",
    fontSize: 16,
    color: "#E0E0E0",
    marginBottom: 8,
  },
});
