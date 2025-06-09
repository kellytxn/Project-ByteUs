import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  SafeAreaView,
} from "react-native";
import { useState, useEffect } from "react";
import axios from "axios";
import Icon from "react-native-vector-icons/FontAwesome";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BACKEND_URL } from "../../config";

const Timetable = () => {
  const [allMods, setAllMods] = useState([]);
  const [filteredMod, setFilteredMod] = useState([]); //pick 1 mod
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMods, setSelectedMods] = useState([]); //all picked mods
  const [showDropdown, setShowDropdown] = useState(false);
  const [academicYear, setAcademicYear] = useState("2023-2024"); //use ay2023-2024 for now

  async function getAllMods() {
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

  //pick 1 mod
  const pickMod = (query) => {
    setSearchQuery(query);
    setShowDropdown(true);

    const filtered = allMods.filter(
      (modData) =>
        modData.moduleCode.toUpperCase().includes(query.toUpperCase()) ||
        modData.title.toUpperCase().includes(query.toUpperCase())
    );
    setFilteredMod(filtered);
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

  const fetchTimetable = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("No token found");

      if (selectedMods.length !== 0) {
        await axios.post(`${BACKEND_URL}/timetableGen`, {
          token,
          modules: selectedMods,
          academicYear: academicYear,
        });
      } else {
        Alert.alert("No modules selected", "Please select at least one module");
      }
    } catch (error) {
      console.error("Error fetching timetable:", error);
      Alert.alert("Error", "Failed to fetch timetable data");
    }
  };

  useEffect(() => {
    getAllMods();
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
              onChangeText={pickMod}
              onFocus={() => searchQuery.length > 0 && setShowDropdown(true)}
            />
          </View>
        </View>

        {showDropdown && (
          <View style={styles.dropdown}>
            {filteredMod.length > 0 ? (
              <FlatList
                data={filteredMod}
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

export default Timetable;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EBE9E3",
    paddingHorizontal: 20,
    paddingTop: 65,
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
});
