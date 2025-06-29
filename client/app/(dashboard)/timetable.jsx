import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Pressable,
} from "react-native";
import { useState, useEffect } from "react";
import axios from "axios";
import Icon from "react-native-vector-icons/FontAwesome";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BACKEND_URL } from "../../config";

const Timetable = () => {
  const [allMods, setAllMods] = useState([]);
  const [filteredMods, setFilteredMods] = useState([]); //mods displayed in dropdown box
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMods, setSelectedMods] = useState([]); //all picked mods
  const [totalMCs, setTotalMCs] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [academicYear, setAcademicYear] = useState("2024-2025"); //use ay2024-2025
  const [userData, setUserData] = useState(null);
  const [userDataLoading, setUserDataLoading] = useState(true);
  const [userPassedMods, setUserPassedMods] = useState([]);
  const [generatedTimetable, setGeneratedTimetable] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timetableView, setTimetableView] = useState(false);
  const [allClassByType, setAllClassByType] = useState({});
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [showLessonModal, setShowLessonModal] = useState(false);
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
    if (!userData) {
      Alert.alert("Please wait", "User data is still loading");
      return;
    }

    if (!userData.semester || typeof userData.semester === "undefined") {
      Alert.alert("Please enter your current semester");
      return;
    }

    setSearchQuery(query);
    setShowDropdown(true);

    const filtered = allMods.filter((modData) => {
      const matchQuery =
        modData.moduleCode.toUpperCase().includes(query.toUpperCase()) ||
        modData.title.toUpperCase().includes(query.toUpperCase());

      const matchSem = modData.semesters
        ? modData.semesters.toString().includes(userData.semester.toString())
        : false;

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
      const updatedPrefs = prevPrefs.map((pref) =>
        pref.id === id ? { ...pref, selected: !pref.selected } : pref
      );

      const selectedPrefs = updatedPrefs
        .filter((p) => p.selected)
        .sort((a, b) => (a.rank || Infinity) - (b.rank || Infinity));

      return updatedPrefs.map((pref) => {
        if (!pref.selected) return { ...pref, rank: null };

        const newRank = selectedPrefs.findIndex((p) => p.id === pref.id) + 1;
        return { ...pref, rank: newRank };
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
      if (!userData || !userData.semester) {
        Alert.alert("Please wait", "User data is still loading");
        return;
      }

      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("No token found");

      const selectedPreferences = preferences
        .filter((p) => p.selected)
        .map((p) => ({ id: p.id, rank: p.rank }));

      const selectedModCodes = selectedMods.map((mod) => mod.moduleCode);
      console.log(userData.semester);
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

  const handlePress = () => {
    if (loading) {
      Alert.alert("Please Wait", "Timetable is being generated...");
      return;
    }

    if (selectedMods.length === 0) {
      Alert.alert(
        "No Modules Selected",
        "Please select at least one module to generate a timetable."
      );
      return;
    }

    fetchTimetable();
  };

  const handleLessonPress = (lesson) => {
    setSelectedLesson(lesson);
    setShowLessonModal(true);
  };

  const replaceLesson = (newLesson) => {
    setGeneratedTimetable((prevTimetable) =>
      prevTimetable.map((prevLesson) =>
        prevLesson.modCode === newLesson.modCode &&
        prevLesson.lessonType === newLesson.lessonType
          ? newLesson
          : prevLesson
      )
    );
    setShowLessonModal(false);
  };

  useEffect(() => {
    getModsData();
  }, []);

  useEffect(() => {
    getUserData();
  }, []);

  useEffect(() => {
    const calculateMCs = async () => {
      let total = 0;
      for (const mod of selectedMods) {
        try {
          const response = await axios.get(
            `https://api.nusmods.com/v2/${academicYear}/modules/${mod.moduleCode}.json`
          );
          total += Number(response.data.moduleCredit);
        } catch (error) {
          console.error("Error fetching module credits:", error);
        }
      }
      setTotalMCs(total);
    };

    if (selectedMods.length > 0) {
      calculateMCs();
    } else {
      setTotalMCs(0);
    }
  }, [selectedMods, academicYear]);

  useEffect(() => {
    const sortAllClassesByType = async () => {
      if (!userData) return;

      let allClassesByType = {};
      for (const mod of selectedMods) {
        try {
          let response = await axios.get(
            `https://api.nusmods.com/v2/${academicYear}/modules/${mod.moduleCode}.json`
          );
          let allSemClasses = response.data.semesterData.filter((info) =>
            info.semester
              ? info.semester.toString() === userData.semester.toString()
              : false
          );
          let allClasses = allSemClasses[0].timetable;
          let classesByType = {};

          allClasses.forEach((lesson) => {
            if (!classesByType[lesson.lessonType]) {
              classesByType[lesson.lessonType] = [];
            }
            classesByType[lesson.lessonType].push({
              modCode: mod.moduleCode,
              startTime: lesson.startTime,
              endTime: lesson.endTime,
              weeks: lesson.weeks,
              day: lesson.day,
              venue: lesson.venue,
              lessonType: lesson.lessonType,
            });
          });

          allClassesByType[mod.moduleCode] = classesByType;
        } catch (error) {
          console.error("Error fetching module credits:", error);
        }
      }
      setAllClassByType(allClassesByType);
    };

    if (selectedMods.length > 0) {
      sortAllClassesByType();
    } else {
      setAllClassByType({});
    }
  }, [selectedMods, academicYear]);

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

  const formatTime = (timeStr) => {
    const time = timeStr.toString().padStart(4, "0");
    const hours = parseInt(time.substring(0, 2));
    const minutes = time.substring(2);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes} ${period}`;
  };

  const groupLessonsByDay = () => {
    const grouped = {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
    };

    if (generatedTimetable) {
      generatedTimetable.forEach((lesson) => {
        if (grouped[lesson.day]) {
          grouped[lesson.day].push(lesson);
        }
      });
    }

    //sort each day's lessons by start time
    Object.keys(grouped).forEach((day) => {
      grouped[day].sort((a, b) => {
        return parseInt(a.startTime) - parseInt(b.startTime);
      });
    });

    return grouped;
  };

  const groupedLessons = groupLessonsByDay();

  const shortformDay = (day) => {
    if (day === "Monday") return "Mon";
    if (day === "Tuesday") return "Tue";
    if (day === "Wednesday") return "Wed";
    if (day === "Thursday") return "Thu";
    if (day === "Friday") return "Fri";
  };

  const LessonSelectionModal = () => {
    if (!selectedLesson) return;

    const alternativeLessons =
      allClassByType[selectedLesson.modCode][selectedLesson.lessonType];

    return (
      <Modal
        visible={showLessonModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLessonModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Pressable onPress={() => setShowLessonModal(false)}>
              <Ionicons name="close" size={22} color="#AE96C7" />
            </Pressable>
            <Text style={styles.modalTitle}>
              Select {selectedLesson.lessonType} for {selectedLesson.modCode}
            </Text>

            <FlatList
              data={alternativeLessons
                // Sort by day
                .sort((a, b) => {
                  const daysOrder = [
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                  ];
                  return daysOrder.indexOf(a.day) - daysOrder.indexOf(b.day);
                })
                // Sort by time
                .sort((a, b) => {
                  if (a.day === b.day) {
                    return a.startTime - b.startTime;
                  }
                  return 0;
                })}
              keyExtractor={(item, index) =>
                `${item.modCode}-${item.lessonType}-${index}`
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.altLessonItem}
                  onPress={() => replaceLesson(item)}
                >
                  <View style={styles.altLessonHeader}>
                    <Text style={styles.altDay}>{item.day}</Text>
                  </View>
                  <Text style={styles.altTime}>
                    {formatTime(item.startTime)} - {formatTime(item.endTime)}
                  </Text>
                  <Text style={styles.altVenue}>{item.venue}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    );
  };

  const colorCache = {};

  const getModuleColor = (moduleCode) => {
    // Return color if exists
    if (colorCache[moduleCode]) return colorCache[moduleCode];

    // Generate new color
    let hash = 0;
    for (let i = 0; i < moduleCode.length; i++) {
      hash = moduleCode.charCodeAt(i) + ((hash << 7) - hash);
      hash = hash & hash;
    }

    const baseHue = 180;
    const hueRange = 120;
    const h = baseHue + (Math.abs(hash) % hueRange);
    const s = 25 + (Math.abs(hash) % 31);
    const l = 85 + (Math.abs(hash) % 11);

    const color = `hsl(${h}, ${s}%, ${l}%)`;

    // Cache the color
    colorCache[moduleCode] = color;
    return color;
  };

  const LessonCard = ({ lesson }) => {
    return (
      <TouchableOpacity
        onPress={() => handleLessonPress(lesson)}
        activeOpacity={0.7}
        key={`${lesson.modCode}-${lesson.lessonType}`}
      >
        <View
          style={[
            styles.lessonCard,
            { backgroundColor: getModuleColor(lesson.modCode) },
          ]}
        >
          <View style={styles.lessonHeader}>
            <Text style={styles.moduleCode}>
              {lesson?.modCode ?? "Unknown Module"}
            </Text>
            <Text style={styles.lessonType}>
              {lesson?.lessonType ?? "Unknown Type"}
            </Text>
          </View>
          <Text style={styles.timeSlot}>
            {lesson?.startTime && lesson?.endTime
              ? `${formatTime(lesson.startTime)} - ${formatTime(
                  lesson.endTime
                )}`
              : "Time Unavailable"}
          </Text>
          <Text style={styles.venue}>{lesson.venue}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const dayColumn = (day) => (
    <View key={day} style={styles.dayColumn}>
      <Text style={styles.dayHeader}>{shortformDay(day)}</Text>
      {groupedLessons[day].length > 0 ? (
        groupedLessons[day].map((lesson, index) => (
          <LessonCard
            key={`${lesson.modCode}-${lesson.lessonType}-${index}`}
            lesson={lesson}
          />
        ))
      ) : (
        <Text style={styles.noClassesText}>No classes</Text>
      )}
    </View>
  );

  const timetableViewer = () => (
    <View style={styles.timetableContainer}>
      <TouchableOpacity
        onPress={() => setTimetableView(false)}
        style={styles.backButton}
      >
        <Icon name="arrow-left" size={20} color="#2C3E50" />
      </TouchableOpacity>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.daysContainer}>
          {Object.keys(groupedLessons).map(dayColumn)}
        </View>
      </ScrollView>
    </View>
  );

  const generatorView = () => (
    <ScrollView
      showsVerticalScrollIndicator={true}
      nestedScrollEnabled={true}
      contentContainerStyle={styles.generatorContainer}
    >
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
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={true}
                removeClippedSubviews={false}
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={10}
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
          <Text style={styles.selectedTitle}>Module Credits: {totalMCs}</Text>
          <View style={styles.selectedList}>
            {selectedMods.map((mod) => (
              <View
                key={mod.moduleCode}
                style={[
                  styles.selectedItem,
                  {
                    backgroundColor: getModuleColor(mod.moduleCode),
                    borderColor: getModuleColor(mod.moduleCode),
                  },
                ]}
              >
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
        style={[
          styles.generateButton,
          (selectedMods.length === 0 || loading) && styles.disabledButton,
        ]}
        onPress={handlePress}
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
        <>
          {timetableViewer()}
          <LessonSelectionModal />
        </>
      ) : (
        generatorView()
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
    borderTopColor: "#B2CBDB",
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
    color: "#36454F",
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
  disabledButton: {
    backgroundColor: "#A0A0A0",
    opacity: 0.7,
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
    paddingTop: 20,
  },
  loadingText: {
    marginTop: 10,
    color: "#555",
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
    width: Dimensions.get("window").width * 0.7,
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
    fontWeight: "700",
    fontSize: 16,
    color: "#2D3748",
  },
  lessonType: {
    fontSize: 14,
    color: "#4A5568",
    paddingVertical: 2,
    borderRadius: 50,
  },
  timeSlot: {
    fontSize: 15,
    color: "#2D3748",
    marginBottom: 4,
    fontWeight: "500",
  },
  venue: {
    fontSize: 14,
    color: "#4A5568",
    fontWeight: "500",
  },
  noClassesText: {
    textAlign: "center",
    color: "#95a5a6",
    fontStyle: "italic",
    marginVertical: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    width: "90%",
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#2C3E50",
    textAlign: "center",
  },
  altLessonItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  altLessonHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  altClassNo: {
    fontWeight: "bold",
    color: "#2C3E50",
  },
  altDay: {
    color: "#7F8C8D",
    fontWeight: "500",
  },
  altTime: {
    color: "#34495E",
    marginBottom: 3,
  },
  altVenue: {
    color: "#7F8C8D",
  },
});
