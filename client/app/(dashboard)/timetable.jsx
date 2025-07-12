import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Pressable,
} from "react-native";
import { useRef, useState, useEffect } from "react";
import axios from "axios";
import { captureRef } from "react-native-view-shot";
import Icon from "react-native-vector-icons/FontAwesome";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BACKEND_URL } from "../../config";
import { FlatList, GestureHandlerRootView } from 'react-native-gesture-handler';

const Timetable = () => {
  const [allMods, setAllMods] = useState([]);
  const [filteredMods, setFilteredMods] = useState([]); //mods displayed in dropdown box
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMods, setSelectedMods] = useState([]); //all picked mods
  const [totalMCs, setTotalMCs] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [academicYear, setAcademicYear] = useState("2025-2026"); //use ay2025-2026
  const [userData, setUserData] = useState(null);
  const [userDataLoading, setUserDataLoading] = useState(true);
  const [userPassedMods, setUserPassedMods] = useState([]);
  const [generatedTimetable, setGeneratedTimetable] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timetableView, setTimetableView] = useState(false);
  const [allClassByType, setAllClassByType] = useState({});
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [examInfo, setExamInfo] = useState([]);
  const [examClash, setExamClash] = useState([]);
  const [sameDayExam, setSameDayExam] = useState([]);
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
  const timetableSnapshot = useRef();

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

      return matchQuery && matchSem;
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

  const saveTimetable = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("No token found");

      if (timetableSnapshot.current) {
        const result = await captureRef(timetableSnapshot, { result: 'base64'});
        //console.log(result);
        const response = await axios.post(`${BACKEND_URL}/timetableSnapshot`, {
          token, timetable: result,
        });
      }
    } catch (error) {
      console.error("Error saving timetable:", error);
      Alert.alert("Error", "Failed to save timetable");
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
          let allSemClasses = response.data.semesterData
            .filter((info) => info.semester.toString() === userData.semester.toString());
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

  useEffect(() => {
    const sortExams = async () => {
      if (!userData) return;

      let allExamInfo = [];
      for (const mod of selectedMods) {
        try {
          const response = await axios.get(
            `https://api.nusmods.com/v2/${academicYear}/modules/${mod.moduleCode}.json`
          );
          let semInfo = response.data.semesterData
            .find(info => info.semester.toString() === userData.semester.toString());
          
            if (semInfo && semInfo.examDate) {
            let examDate = semInfo.examDate;
            let examDuration = semInfo.examDuration; //in mins
            
            let startTime = new Date(examDate);
            let endTime = new Date(startTime.getTime() + examDuration * 60 * 1000); //convert mins to ms
          
            allExamInfo.push({
              modCode: mod.moduleCode,
              examDate: startTime.toISOString().slice(0, 10),
              startTime: startTime,
              endTime: endTime,
            });
          }
        } catch (error) {
          console.error("Error fetching exam info:", error);
        }
      }
      setExamInfo(allExamInfo);
    };

    if (selectedMods.length > 0) {
      sortExams();
    } else {
      setExamInfo([]);
    }
  }, [selectedMods, academicYear]);

  useEffect(() => {
    if (examInfo.length > 0) {
      let examsByDate = {};
      examInfo.forEach((exam) => {
        let examDate = exam.examDate;
        if (!examsByDate[examDate]) {
          examsByDate[examDate] = [];
        }
        examsByDate[examDate].push(exam);
      });

      let clashes = [];
      let sameDay = [];

      Object.keys(examsByDate).forEach((date) => {
        const exams = examsByDate[date];
        if (exams.length > 1) {
          sameDay.push(exams);
          exams.sort((a, b) => a.startTime - b.startTime);

          for (let i = 0; i < exams.length - 1; i++) {
            if (exams[i].startTime < exams[i + 1].endTime && 
              exams[i].endTime > exams[i + 1].startTime) {
                clashes.push([exams[i], exams[i + 1]]);
            }
          }
        }
      });
      setExamClash(clashes);
      setSameDayExam(sameDay);
    }
  }, [examInfo]);

  useEffect(() => {
    if (examClash.length > 0) {
      Alert.alert(
        "Exam Clash Detected!",
        "You have exams scheduled at the same time. Please review your selected modules.",
        [{ text: "OK" }]
      );
    }
  }, [examClash]);

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

  const generateExamGridData = () => {
    if (examInfo.length === 0) return [];
    
    const examDates = [...new Set(examInfo.map(e => e.examDate))].sort();
    const startDate = new Date(examDates[0]);
    const endDate = new Date(examDates[examDates.length - 1]);
    
    const firstMonday = new Date(startDate);
    firstMonday.setDate(startDate.getDate() - (startDate.getDay() + 6) % 7);
    
    const gridData = [];
    const current = new Date(firstMonday);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const displayedMonths = {};

    while (current <= endDate) {
      const week = [];

      for (let i = 0; i < 7; i++) {
        const date = current.toISOString().slice(0, 10);
        const exams = examInfo.filter(e => e.examDate === date);
        const dayOfMonth = current.getDate();
        const month = current.getMonth();

        let displayDate = '';
        if (dayOfMonth === 1 || !displayedMonths[month]) {
          displayDate = `${dayOfMonth < 10 ? '0' : ''}${dayOfMonth}-${months[month]}`;
          displayedMonths[month] = true;
        } else {
          displayDate = `${dayOfMonth < 10 ? '0' : ''}${dayOfMonth}`;
        }

        week.push({
          date: date,
          display: displayDate,
          exams: exams.sort((a, b) => a.startTime - b.startTime)
        });
        
        current.setDate(current.getDate() + 1);
      }
      
      gridData.push(week);
    }
    
    return gridData;
  };

  const formatTime = (timeStr) => {
    const time = timeStr.toString().padStart(4, "0");
    const hours = parseInt(time.substring(0, 2));
    const minutes = time.substring(2);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes} ${period}`;
  };

  const formatExamTime = (date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes} ${period}`;
  };

  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const padded = timeStr.toString().padStart(4, '0');
    const hours = parseInt(padded.substring(0, 2));
    const minutes = parseInt(padded.substring(2));
    return hours * 60 + minutes;
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
                //sort by day
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
    //return color if exists
    if (colorCache[moduleCode]) return colorCache[moduleCode];

    //generate new color
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

    //cache the color
    colorCache[moduleCode] = color;
    return color;
  };

  const timetableViewer = () => {
    const { width } = Dimensions.get('window');
    const dayWidth = (width - 70) / 5;
    const timetableStart = 8; //8am
    const timetableEnd = 17; //6pm
    const hourHeight = 60;
    const totalHours = timetableEnd - timetableStart;
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

    return (
      <View style={styles.timetableContainer}>
        <View style={styles.headerContainer}>
          <TouchableOpacity
            onPress={() => setTimetableView(false)}
            style={styles.backButton}
          >
            <Icon name="arrow-left" size={20} color="#2C3E50" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => saveTimetable()}
            style={styles.saveButton}
          >
            <Icon name="save" size={20} color="#000" />
          </TouchableOpacity>
        </View>

        <View ref={timetableSnapshot} style={styles.gridContainer}>
          <View style={styles.timeLabelsColumn}>
            <View style={[styles.timeLabel, styles.cornerSpace]} />
              {Array.from({ length: totalHours + 1 }).map((_, i) => {
                const hour = timetableStart + i;
                const period = hour >= 12 ? "PM" : "AM";
                const displayHour = hour % 12 || 12;
            
                return (
                  <View 
                    key={`time-${hour}`} 
                    style={[styles.timeLabel, { height: hourHeight }]}
                  >
                    <Text style={styles.timeLabelText}>{`${displayHour}:00 ${period}`}</Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.daysSection}>
              <View style={styles.dayHeadersRow}>
                {days.map(day => (
                  <View 
                    key={day} 
                    style={[styles.dayHeaderCell, { width: dayWidth }]}
                  >
                    <Text style={styles.dayHeaderText}>{shortformDay(day)}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.hourLinesContainer}>
                {Array.from({ length: totalHours + 2 }).map((_, i) => (
                  <View
                    key={`line-${i}`}
                    style={[
                      styles.hourLine,
                      { top: i * hourHeight }
                    ]}
                  />
                ))}
              </View>

              <View style={[styles.dayColumns, { height: (totalHours + 1) * hourHeight }]}>
                {days.map(day => (
                  <View 
                    key={day} 
                    style={[styles.dayColumn, { width: dayWidth }]}
                  >
                    {groupedLessons[day].map(lesson => {
                      const startMinutes = timeToMinutes(lesson.startTime);
                      const endMinutes = timeToMinutes(lesson.endTime);
                      const top = ((startMinutes - timetableStart * 60) / 60) * hourHeight;
                      const height = ((endMinutes - startMinutes) / 60) * hourHeight;
                      
                      return (
                        <TouchableOpacity
                          key={`${lesson.modCode}-${lesson.lessonType}`}
                          style={[
                            styles.timetableLessonCard,
                            { 
                              top,
                              height,
                              backgroundColor: getModuleColor(lesson.modCode)
                            }
                          ]}
                          onPress={() => handleLessonPress(lesson)}
                        >
                          <Text style={styles.timetableLessonCode}>{lesson.modCode}</Text>
                          <Text style={styles.timetableLessonType}>{lesson.lessonType}</Text>
                          <Text style={styles.timetableLessonVenue}>{lesson.venue}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>
        </View>
      </View>
    );
  };

  const generatorView = () => (
    <GestureHandlerRootView>
      <FlatList
        style={styles.generatorContainer}
        data={[]}
        renderItem={null}
        keyExtractor={() => "static-content"}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <>    
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
                        <Icon name="times" size={16} color="#A9A9A9" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.examContainer}>
              <Text style={styles.examTitle}>Total Exams: {examInfo.length}</Text>

              {examClash.length > 0 && (
                <View style={styles.examClashAlert}>
                  {examClash.map((clash, index) => (
                    <Text key={index} style={styles.examClashAlertMessage}>
                      {clash[0].modCode} and {clash[1].modCode} clash on {clash[0].examDate} {formatExamTime(clash[0].startTime)}
                    </Text>
                  ))}
                </View>
              )}

              {sameDayExam.length > 0 && (
                <View style={styles.sameDayAlert}>
                  {sameDayExam.map((exams, index) => (
                    <Text key={index} style={styles.sameDayAlertMessage}>
                      Multiple exams on {exams[0].examDate}: {exams.map(e => e.modCode).join(', ')}
                    </Text>
                  ))}
                </View>
              )}

              {examInfo.length > 0 && (
                <View style={styles.examGrid}>
                  <View style={styles.examGridRow}>
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                      <View key={day} style={[styles.examGridCell, styles.examGridHeaderCell]}>
                        <Text style={styles.examGridHeaderText}>{day}</Text>
                      </View>
                    ))}
                  </View>

                  {generateExamGridData().map((week, weekIndex) => (
                    <View key={`week-${weekIndex}`} style={styles.examGridRow}>               
                      {week.map((dayData, dayIndex) => (
                        <View 
                          key={`${weekIndex}-${dayIndex}`} 
                          style={[styles.examGridCell, styles.examGridDateCell]}
                        >
                          <Text style={styles.dateText}>{dayData.display}</Text>
                          
                          {dayData.exams.map((exam) => (
                            <View 
                              key={`${exam.modCode}-${exam.startTime}`} 
                              style={[
                                styles.examCard,
                                {
                                  backgroundColor: getModuleColor(exam.modCode),
                                  borderColor: getModuleColor(exam.modCode),
                                },
                              ]}
                            >
                              <Text style={styles.examModule}>{exam.modCode}</Text>
                              <Text style={styles.examTime}>
                                {formatExamTime(exam.startTime)} - {formatExamTime(exam.endTime)}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              )}
            </View>

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
          </>
        }
      />
    </GestureHandlerRootView>
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
    shadowColor: "black",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    zIndex: 2,
    overflow: "hidden",
  },
  dropdownList: {
    flex: 1,
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
    backgroundColor: "#9DBDCE",
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
  examContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    flex: 1,
    padding: 5,
    marginTop: 15,
    borderTopWidth: 2,
    borderTopColor: "#B2CBDB",
  },
  examTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2C3E50",
    padding: 10,
  },
  examClashAlert: {
    backgroundColor: '#FFEBEE',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  examClashAlertMessage: {
    color: '#B71C1C',
    fontSize: 13,
  },
  sameDayAlert: {
    backgroundColor: '#FFF3E0',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  sameDayAlertMessage: {
    color: '#E65100',
    fontSize: 13,
  },
  examGrid: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: 5,
  },
  examGridRow: {
    flexDirection: 'row',
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  examGridCell: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
    padding: 1,
    backgroundColor: '#FFF',
    justifyContent: 'flex-start', 
  },
  examGridHeaderCell: {
    backgroundColor: '#F8F9FA',
  },
  examGridDateCell: {
    minHeight: 60, 
    justifyContent: 'flex-start',
  },
  examGridHeaderText: {
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 5,
  },
  dateText: {
    textAlign: 'left',
    marginBottom: 5,
    fontSize: 12,
  },
  examCard: {
    width: '100%', 
    backgroundColor: '#F8F9FA',
    padding: 4,
    borderRadius: 4,
    marginBottom: 4,
  },
  examModule: {
    fontWeight: '600',
    fontSize: 10,
  },
  examTime: {
    fontSize: 8,
  },
  preferencesContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 15,
    marginTop: 15,
    borderTopWidth: 2,
    borderTopColor: "#B2CBDB",
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
    paddingTop: 65,
    backgroundColor: "#EBE9E3",
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  backButton: {
    paddingLeft: 15,
    paddingBottom: 15,
  },
  saveButton: {
    paddingRight: 15,
    paddingBottom: 15,
  },
  gridContainer: {
    flexDirection: 'row',
    flex: 1,
    overflow: 'hidden',
    backgroundColor: "#EBE9E3",
  },
  timeLabelsColumn: {
    width: 70,
    zIndex: 2,
    borderRightWidth: 1,
    borderRightColor: '#CCC',
  },
  cornerSpace: {
    height: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#CCC',
  },
  timeLabel: {
    justifyContent: 'flex-start',
    paddingTop: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#CCC',
  },
  timeLabelText: {
    fontSize: 12,
    color: '#707070',
    textAlign: 'right',
    paddingRight: 5,
  },
  daysSection: {
    flex: 1,
    position: 'relative',
  },
  dayHeadersRow: {
    flexDirection: 'row',
    height: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#CCC',
  },
  dayHeaderCell: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#CCC',
    backgroundColor: "#rgba(97, 96, 96, 0.1)",
  },
  dayHeaderText: {
    fontWeight: 'bold',
    fontSize: 12,
    color: '#2C3E50',
  },
  dayColumns: {
    flexDirection: 'row',
    position: 'relative',
  },
  dayColumn: {
    position: 'relative',
    borderRightWidth: 1,
    borderRightColor: '#CCC',
  },
  hourLinesContainer: {
    position: 'absolute',
    top: 40, 
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1, 
  },
  hourLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#E0E0E0',
    borderBottomWidth: 1,
    borderBottomColor: '#CCC',
  },
  timetableLessonCard: {
    position: 'absolute',
    left: 2,
    right: 2,
    padding: 4,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    zIndex: 3,
  },
  timetableLessonCode: {
    fontWeight: '700',
    fontSize: 11,
  },
  timetableLessonType: {
    fontSize: 10,
    marginVertical: 2,
    colour: '#C0C0C0',
  },
  timetableLessonVenue: {
    fontSize: 9,
    color: '#707070',
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
