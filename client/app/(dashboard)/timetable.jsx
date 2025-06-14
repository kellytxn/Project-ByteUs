import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useState, useEffect } from "react";
import axios from "axios";
import Icon from "react-native-vector-icons/FontAwesome";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BACKEND_URL } from "../../config";

const Timetable = () => {
  const [allMods, setAllMods] = useState([]);
  const [filteredMods, setFilteredMods] = useState([]); //mods displayed in dropdown box
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMods, setSelectedMods] = useState([]); //all picked mods
  const [showDropdown, setShowDropdown] = useState(false);
  const [academicYear, setAcademicYear] = useState("2023-2024"); //use ay2023-2024 for now
  const [userData, setUserData] = useState(null);
  const [userDataLoading, setUserDataLoading] = useState(true);
  const [userPassedMods, setUserPassedMods] = useState([]);
  const [preferences, setPreferences] = useState([
    { id: "noMon", label: "No classes on Monday", selected: false, rank: null },
    {
      id: "noTues",
      label: "No classes on Tuesday",
      selected: false,
      rank: null,
    },
    {
      id: "noWed",
      label: "No classes on Wednesday",
      selected: false,
      rank: null,
    },
    {
      id: "noThurs",
      label: "No classes on Thursday",
      selected: false,
      rank: null,
    },
    { id: "noFri", label: "No classes on Friday", selected: false, rank: null },
    {
      id: "earlyEnd",
      label: "Prefer classes ending before 2pm",
      selected: false,
      rank: null,
    },
    {
      id: "lateStart",
      label: "Prefer classes starting after 10am",
      selected: false,
      rank: null,
    },
  ]);
  const [generatedTimetable, setGeneratedTimetable] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timetableView, setTimetableView] = useState(false);
  const { width, height } = Dimensions.get("window");

  async function getModsData() {
    try {
      const response = await axios.get(
        `https://api.nusmods.com/v2/${academicYear}/moduleList.json`
      );

      if (response.data) {
        const allModsData = response.data;
        setAllMods(allModsData);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load modules");
      console.error("Module fetch error:", error);
    }
  }

  //fetch user data
  async function getUserData() {
    try {
      setUserDataLoading(true);
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        setError("No token found.");
        return;
      }

      const res = await axios.post(`${BACKEND_URL}/userData`, {
        token,
      });
      const userInfo = res.data.data;
      setUserData(userInfo);

      const passedMods = userInfo.modules
        .filter((mod) => mod.completed && !["F", "CU"].includes(mod.grade))
        .map((mod) => mod.code);
      setUserPassedMods(passedMods);
    } catch (err) {
      console.error("Failed to fetch user data:", err);
    } finally {
      setUserDataLoading(false);
    }
  }

  //display mods in dropdown box
  const shownMods = (query) => {
    if (!userData) return;

    setSearchQuery(query);
    setShowDropdown(true);

    const filtered = allMods.filter((modData) => {
      const matchQuery =
        modData.moduleCode.toUpperCase().includes(query.toUpperCase()) ||
        modData.title.toUpperCase().includes(query.toUpperCase());

      const matchSem = modData.semesters
        .toString()
        .includes(userData.semester.toString());

      //check if completed prereqs & not completed preclusions
      const checkPastMods = async () => {
        try {
          const response = await axios.get(
            `https://api.nusmods.com/v2/${academicYear}/modules/${modData.moduleCode.toUpperCase()}.json`
          );

          if (response.data) {
            const modInfo = response.data;
            if (modInfo.prerequisite && modInfo.preclusion) {
              return (
                userPassedMods.some((passedMod) =>
                  modInfo.prerequisite.includes(passedMod)
                ) &&
                userPassedMods.some(
                  (passedMod) => !modInfo.preclusion.includes(passedMod)
                )
              );
            } else if (modInfo.preclusion) {
              return userPassedMods.some(
                (passedMod) => !modInfo.preclusion.includes(passedMod)
              );
            }
            if (modInfo.prerequisite) {
              return userPassedMods.some((passedMod) =>
                modInfo.prerequisite.includes(passedMod)
              );
            } else {
              return true;
            }
          }
        } catch (error) {
          Alert.alert("Error", "Failed to load modules");
          console.error("Module fetch error:", error);
        }
      };

      return matchQuery && matchSem && checkPastMods;
    });

    setFilteredMods(filtered);
  };

  //edit list of picked mods
  const toggleModSelection = (mod) => {
    setSelectedMods((prev) => {
      const modExists = prev.some((pMod) => pMod.moduleCode === mod.moduleCode);

      if (modExists) {
        return prev.filter((pMod) => pMod.moduleCode !== mod.moduleCode);
      } else {
        return [...prev, mod];
      }
    });
    setSearchQuery("");
    setShowDropdown(false);
  };

  const togglePrefs = (id) => {
    setPreferences((prevPrefs) => {
      // Toggle the selected state of the clicked preference
      const updatedPrefs = prevPrefs.map((pref) =>
        pref.id === id
          ? {
              ...pref,
              selected: !pref.selected,
              // Don't set rank here yet - we'll calculate it below
            }
          : pref
      );

      // Calculate new ranks based on selection order
      let currentRank = 1;
      return updatedPrefs.map((pref) => {
        if (!pref.selected) {
          return { ...pref, rank: null }; // Reset rank if deselected
        }
        // Assign incrementing ranks to selected preferences
        return { ...pref, rank: currentRank++ };
      });
    });
  };

  const updateRank = (id, value) => {
    setPreferences((prevPrefs) => {
      const newRank = Number(value);
      if (isNaN(newRank)) return prevPrefs;

      return prevPrefs.map((pref) => {
        if (pref.id === id) return { ...pref, rank: newRank };

        return pref;
      });
    });
  };

  const fetchTimetable = async () => {
    try {
      if (!userData) {
        Alert.alert("Please wait", "User data is still loading");
        return;
      }

      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("No token found");

      const selectedPreferences = preferences
        .filter((p) => p.selected)
        .map((p) => ({ id: p.id, rank: p.rank }));

      if (selectedMods.length === 0) {
        Alert.alert("No modules selected", "Please select at least one module");
        return;
      }
      const selectedModCodes = selectedMods.map((mod) => mod.moduleCode);

      const response = await axios.post(`${BACKEND_URL}/timetableGen`, {
        token,
        modCodes: selectedModCodes, //array of module codes
        semester: userData.semester.toString(),
        acadYear: academicYear,
        preferences: selectedPreferences, //array of prefs with id & rank
      });

      setGeneratedTimetable(response.data.data);
      setTimetableView(true);
    } catch (error) {
      console.error("Error fetching timetable:", error);
      Alert.alert("Error", "Failed to fetch timetable data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getModsData();
  }, []);

  useEffect(() => {
    getUserData();
  }, []);

  const DropdownMods = ({ item }) => (
    <TouchableOpacity
      style={styles.dropdownItem}
      onPress={() => toggleModSelection(item)}
      activeOpacity={0.7}
    >
      <Text style={styles.dropdownCode}>{item.moduleCode}</Text>
      <Text style={styles.dropdownTitle} numberOfLines={1}>
        {item.title}
      </Text>
    </TouchableOpacity>
  );
  /*
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>
          Selected Modules: {selectedMods.length}
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <View style={styles.searchIcon}>
            <Icon name="search" size={18} color="#707070" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search module code or name"
              placeholderTextColor={"#707070"}
              value={searchQuery}
              onChangeText={shownMods}
              onFocus={() => searchQuery.length > 0 && setShowDropdown(true)}
            />
          </View>
        </View>

        {showDropdown && (
          <View style={styles.dropdown}>
            {filteredMods.length > 0 ? (
              <FlatList
                data={filteredMods}
                keyExtractor={(item) => item.moduleCode}
                renderItem={({ item }) => <DropdownMods item={item} />}
                keyboardShouldPersistTaps="always"
                style={styles.dropdownList}
              />
            ) : (
              <View style={styles.dropdownEmpty}>
                <Text style={styles.dropdownEmptyText}>No modules found</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {selectedMods.length > 0 && (
        <View style={styles.selectedContainer}>
          <Text style={styles.selectedTitle}>Selected Modules:</Text>
          <View style={styles.selectedList}>
            {selectedMods.map((mod) => (
              <View key={mod.moduleCode} style={styles.selectedItem}>
                <Text style={styles.selectedItemText}>{mod.moduleCode}</Text>
                <TouchableOpacity
                  onPress={() => toggleModSelection(mod)}
                  style={styles.removeButton}
                >
                  <Icon name="times" size={16} color="#F44336" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.preferencesContainer}>
        <View style={styles.preferencesHeader}>
          <Text style={styles.preferencesTitle}>Preferences (optional):</Text>
          <Text style={styles.rankTitle}>Rank:</Text>
        </View>
        
        {preferences.map((pref) => (
          <View key={pref.id} style={styles.preferenceItem}>
            <TouchableOpacity 
              onPress={() => togglePrefs(pref.id)}
              style={styles.checkbox}
            >
              <Icon 
                name={pref.selected ? "check-square" : "square-o"} 
                size={24} 
                color="#4F8EF7" 
              />
            </TouchableOpacity>
            
            <Text style={styles.preferenceLabel}>{pref.label}</Text>
            
            {pref.selected && (
              <TextInput
                style={styles.rankInput}
                keyboardType="numeric"
                placeholder="Rank"
                value={pref.rank ? pref.rank.toString() : ""}
                onChangeText={(text) => updateRank(pref.id, text)}
              />
            )}
          </View>
        ))}
      </View>

      {generatedTimetable ? (
        <TimetableView 
        timetable={generatedTimetable} 
        onBack={resetTimetable}
        screenWidth={width}
        />
      ) : loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#B2CBDB" />
          <Text style={styles.loadingText}>Generating timetable...</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={styles.generateButton}
        onPress={fetchTimetable}
        disabled={selectedMods.length === 0}
      >
        <Text style={styles.generateButtonText}>Generate Timetable</Text>
      </TouchableOpacity>
    </View>
  );
};

*/

  const formatTime = (timeStr) => {
    const time = timeStr.toString().padStart(4, "0");
    const hours = parseInt(time.substring(0, 2));
    const minutes = time.substring(2);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes} ${period}`;
  };

  // Group lessons by day
  const groupLessonsByDay = () => {
    const grouped = {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
    };

    generatedTimetable?.forEach((lesson) => {
      if (grouped[lesson.day]) {
        grouped[lesson.day].push(lesson);
      }
    });

    // Sort lessons by start time
    Object.keys(grouped).forEach((day) => {
      grouped[day].sort((a, b) => {
        return parseInt(a.startTime) - parseInt(b.startTime);
      });
    });

    return grouped;
  };

  const groupedLessons = groupLessonsByDay();

  // Render lesson card
  const renderLessonCard = (lesson) => (
    <View
      key={`${lesson.modCode}-${lesson.lessonType}`}
      style={styles.lessonCard}
    >
      <Text style={styles.moduleCode}>{lesson.modCode}</Text>
      <Text style={styles.lessonType}>{lesson.lessonType}</Text>
      <Text style={styles.timeSlot}>
        {formatTime(lesson.startTime)} - {formatTime(lesson.endTime)}
      </Text>
      <Text style={styles.venue}>{lesson.venue}</Text>
    </View>
  );

  // Render day column
  const renderDayColumn = (day) => (
    <View key={day} style={styles.dayColumn}>
      <Text style={styles.dayHeader}>{day}</Text>
      {groupedLessons[day].length > 0 ? (
        groupedLessons[day].map(renderLessonCard)
      ) : (
        <Text style={styles.noClassesText}>No classes</Text>
      )}
    </View>
  );

  // Render timetable view
  const renderTimetableView = () => (
    <View style={styles.timetableContainer}>
      <TouchableOpacity
        onPress={() => setTimetableView(false)}
        style={styles.backButton}
      >
        <Icon name="arrow-left" size={20} color="#2C3E50" />
        <Text style={styles.backText}>Back to Generator</Text>
      </TouchableOpacity>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.daysContainer}>
          {Object.keys(groupedLessons).map(renderDayColumn)}
        </View>
      </ScrollView>
    </View>
  );

  // Render generator view
  const renderGeneratorView = () => (
    <ScrollView contentContainerStyle={styles.generatorContainer}>
      <View style={styles.header}>
        <Text style={styles.headerText}>
          Selected Modules: {selectedMods.length}
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <View style={styles.searchIcon}>
            <Icon name="search" size={18} color="#707070" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search module code or name"
              placeholderTextColor={"#707070"}
              value={searchQuery}
              onChangeText={shownMods}
              onFocus={() => searchQuery.length > 0 && setShowDropdown(true)}
            />
          </View>
        </View>

        {showDropdown && (
          <View style={styles.dropdown}>
            {filteredMods.length > 0 ? (
              <FlatList
                data={filteredMods}
                keyExtractor={(item) => item.moduleCode}
                renderItem={({ item }) => <DropdownMods item={item} />}
                keyboardShouldPersistTaps="always"
                style={styles.dropdownList}
              />
            ) : (
              <View style={styles.dropdownEmpty}>
                <Text style={styles.dropdownEmptyText}>No modules found</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {selectedMods.length > 0 && (
        <View style={styles.selectedContainer}>
          <Text style={styles.selectedTitle}>Selected Modules:</Text>
          <View style={styles.selectedList}>
            {selectedMods.map((mod) => (
              <View key={mod.moduleCode} style={styles.selectedItem}>
                <Text style={styles.selectedItemText}>{mod.moduleCode}</Text>
                <TouchableOpacity
                  onPress={() => toggleModSelection(mod)}
                  style={styles.removeButton}
                >
                  <Icon name="times" size={16} color="#F44336" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.preferencesContainer}>
        <View style={styles.preferencesHeader}>
          <Text style={styles.preferencesTitle}>Preferences (optional):</Text>
          <Text style={styles.rankTitle}>Rank:</Text>
        </View>

        {preferences.map((pref) => (
          <View key={pref.id} style={styles.preferenceItem}>
            <TouchableOpacity
              onPress={() => togglePrefs(pref.id)}
              style={styles.checkbox}
            >
              <Icon
                name={pref.selected ? "check-square" : "square-o"}
                size={24}
                color="#4F8EF7"
              />
            </TouchableOpacity>

            <Text style={styles.preferenceLabel}>{pref.label}</Text>

            {pref.selected && (
              <TextInput
                style={styles.rankInput}
                keyboardType="numeric"
                placeholder="Rank"
                value={pref.rank ? pref.rank.toString() : ""}
                onChangeText={(text) => updateRank(pref.id, text)}
              />
            )}
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.generateButton}
        onPress={fetchTimetable}
        disabled={selectedMods.length === 0 || loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.generateButtonText}>Generate Timetable</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {userDataLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#AE96C7" />
          <Text style={{ marginTop: 10, color: "#555" }}>Loading...</Text>
        </View>
      ) : timetableView ? (
        renderTimetableView()
      ) : (
        renderGeneratorView()
      )}
    </View>
  );
};

export default Timetable;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EBE9E3",
  },
  header: {
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  headerText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2C3E50",
  },
  searchContainer: {
    zIndex: 10,
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: 15,
    borderRadius: 10,
    height: 50,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: "#707070",
    fontSize: 16,
    paddingVertical: 12,
    paddingLeft: 10,
  },
  dropdown: {
    position: "absolute",
    top: 55,
    left: 0,
    right: 0,
    maxHeight: 300,
    backgroundColor: "white",
    borderRadius: 10,
    marginTop: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    zIndex: 100,
  },
  dropdownList: {
    borderRadius: 10,
  },
  dropdownItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  dropdownCode: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2C3E50",
    marginBottom: 3,
  },
  dropdownTitle: {
    fontSize: 14,
    color: "#7F8C8D",
  },
  dropdownEmpty: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  dropdownEmptyText: {
    fontSize: 16,
    color: "#95a5a6",
    fontStyle: "italic",
  },
  selectedContainer: {
    marginTop: 15,
    padding: 15,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderTopWidth: 2,
    borderTopColor: "#4CAF50",
  },
  selectedTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2C3E50",
    marginBottom: 10,
  },
  selectedList: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  selectedItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  selectedItemText: {
    fontSize: 16,
    color: "#2E7D32",
    marginRight: 8,
    fontWeight: "500",
  },
  removeButton: {
    padding: 3,
  },
  generateButton: {
    backgroundColor: "#B2CBDB",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  generateButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  preferencesContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 15,
    marginTop: 15,
  },
  preferencesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  preferencesTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2C3E50",
  },
  rankTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2C3E50",
    marginRight: 10,
  },
  preferenceItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  checkbox: {
    marginRight: 12,
  },
  preferenceLabel: {
    flex: 1,
    fontSize: 16,
    color: "#34495E",
  },
  rankInput: {
    width: 60,
    height: 40,
    borderWidth: 1,
    borderColor: "#BDC3C7",
    borderRadius: 8,
    padding: 10,
    textAlign: "center",
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 50,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: "#2C3E50",
  },
  generatorContainer: {
    paddingHorizontal: 20,
    paddingTop: 65,
    paddingBottom: 20,
  },
  timetableContainer: {
    flex: 1,
    padding: 15,
    paddingTop: 65,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    padding: 10,
  },
  backText: {
    marginLeft: 10,
    fontSize: 16,
    color: "#2C3E50",
    fontWeight: "500",
  },
  daysContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayColumn: {
    width: Dimensions.get("window").width * 0.9, // 90% of screen width
    marginRight: 15,
    backgroundColor: "white",
    borderRadius: 10,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dayHeader: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2C3E50",
    marginBottom: 15,
    textAlign: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    paddingBottom: 10,
  },
  lessonCard: {
    backgroundColor: "#B2CBDB",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  moduleCode: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#2C3E50",
  },
  lessonType: {
    fontSize: 14,
    color: "#2C3E50",
    marginTop: 4,
  },
  timeSlot: {
    fontSize: 14,
    color: "#34495e",
    marginTop: 4,
  },
  venue: {
    fontSize: 14,
    color: "#7f8c8d",
    marginTop: 4,
  },
  noClassesText: {
    textAlign: "center",
    color: "#95a5a6",
    fontStyle: "italic",
    marginVertical: 20,
  },
});
