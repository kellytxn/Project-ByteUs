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
} from "react-native";
import { useModule } from "../../hooks/useModule";
import { useRouter } from "expo-router";
import { useState } from "react";
import { PieChart } from "react-native-chart-kit";

const screenWidth = Dimensions.get("window").width;

const Track = () => {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [credit, setCredit] = useState("");
  const [completed, setCompleted] = useState("");
  const [grade, setGrade] = useState("");
  const [loading, setLoading] = useState(false);
  const [showInputs, setShowInputs] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState(null);
  const [selectedModules, setSelectedModules] = useState([]);
  const [searchText, setSearchText] = useState("");

  const { module, createModule, editModule, deleteModule } = useModule();
  const router = useRouter();

  const clearForm = () => {
    setCode("");
    setName("");
    setCategory("");
    setCredit("");
    setCompleted("");
    setGrade("");
    setShowInputs(false);
    setEditingModuleId(null);
  };

  const handleSave = async () => {
    if (
      !code.trim() ||
      !name.trim() ||
      !category.trim() ||
      !credit.trim() ||
      !completed.trim() ||
      !grade.trim()
    )
      return;

    const creditNumber = parseInt(credit);
    const completedBool = completed.trim().toLowerCase() === "yes";
    const gradeNumber = parseFloat(grade);

    if (isNaN(creditNumber) || isNaN(gradeNumber)) return;

    setLoading(true);

    if (editingModuleId) {
      // Edit mode
      await editModule(editingModuleId, {
        code,
        name,
        category,
        credit: creditNumber,
        completed: completedBool,
        grade: gradeNumber,
      });
    } else {
      // Create mode
      await createModule({
        code,
        name,
        category,
        credit: creditNumber,
        completed: completedBool,
        grade: gradeNumber,
      });
    }

    clearForm();
    setLoading(false);
  };

  const onEditModule = (mod) => {
    setCode(mod.code);
    setName(mod.name);
    setCategory(mod.category);
    setCredit(String(mod.credit));
    setCompleted(mod.completed ? "Yes" : "No");
    setGrade(String(mod.grade));
    setShowInputs(true);
    setEditingModuleId(mod.$id);
  };

  const onDeleteModule = async () => {
    if (!editingModuleId) return;
    setLoading(true);
    await deleteModule(editingModuleId);
    clearForm();
    setLoading(false);
  };

  const totalCredits = module.reduce((sum, m) => sum + (m.credit || 0), 0);
  const completedCredits = module.reduce(
    (sum, m) => sum + ((m.completed && m.credit) || 0),
    0
  );

  const chartData = [
    {
      name: "",
      population: completedCredits,
      color: "#B2CBDB",
      legendFontColor: "transparent",
      legendFontSize: 0,
    },
    {
      name: "",
      population: totalCredits - completedCredits,
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
  const calculateGPA = () => {
    const totalMC = selectedModules.reduce((sum, m) => sum + m.credit, 0);
    const weightedSum = selectedModules.reduce(
      (sum, m) => sum + m.credit * m.grade,
      0
    );
    return totalMC === 0 ? 0 : (weightedSum / totalMC).toFixed(2);
  };
  const filteredModules = module.filter(
    (m) =>
      m.name.toLowerCase().includes(searchText.toLowerCase()) ||
      m.code.toLowerCase().includes(searchText.toLowerCase())
  );

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
          {totalCredits > 0 && (
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
                  {completedCredits}/{totalCredits} MCs
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
                placeholder="Enter the category in which your module falls under"
              />

              <Text style={styles.label}>Modular Credit</Text>
              <TextInput
                style={styles.input}
                value={credit}
                onChangeText={setCredit}
                placeholder="Enter the modular credit of your module"
                keyboardType="numeric"
              />

              <Text style={styles.label}>Have you completed this module?</Text>
              <TextInput
                style={styles.input}
                value={completed}
                onChangeText={setCompleted}
                placeholder="Yes / No"
              />

              <Text style={styles.label}>
                Final grade obtained if completed
              </Text>
              <TextInput
                style={styles.input}
                value={grade}
                onChangeText={setGrade}
                placeholder="Enter the numerical value of your grade, 0 otherwise"
                keyboardType="numeric"
              />

              <Pressable
                onPress={handleSave}
                disabled={loading}
                style={({ pressed }) => [
                  styles.button,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.buttonText}>
                  {loading
                    ? "Saving..."
                    : editingModuleId
                    ? "  Save  "
                    : "Create"}
                </Text>
              </Pressable>

              {editingModuleId && (
                <Pressable
                  onPress={onDeleteModule}
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.button,
                    { backgroundColor: "#D2D4DB" },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text style={styles.buttonText}>Delete</Text>
                </Pressable>
              )}
            </>
          )}

          <SectionList
            sections={groupedModules}
            keyExtractor={(item) => item.$id}
            contentContainerStyle={styles.listContainer}
            renderSectionHeader={({ section: { title } }) => (
              <Text style={styles.header}>{title}</Text>
            )}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.card,
                  {
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  },
                ]}
              >
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
                  onPress={() => onEditModule(item)}
                  style={({ pressed }) => [
                    {
                      backgroundColor: "#D2D4DB",
                      paddingVertical: 6,
                      paddingHorizontal: 12,
                      borderRadius: 8,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: "white", fontWeight: "600" }}>
                    Edit
                  </Text>
                </Pressable>
              </View>
            )}
          />
          <View style={{ marginTop: -25, width: "90.5%" }}>
            <Text style={styles.header}>GPA calculator</Text>

            <TextInput
              style={styles.input}
              placeholder="Search module name / code"
              value={searchText}
              onChangeText={setSearchText}
            />
            {searchText.trim().length > 0 && (
              <View style={{ marginTop: 10 }}>
                {filteredModules
                  .filter(
                    (m) => !selectedModules.some((sel) => sel.$id === m.$id)
                  )
                  .map((mod) => (
                    <Pressable
                      key={mod.$id}
                      onPress={() => {
                        setSelectedModules((prev) => [...prev, mod]);
                        setSearchText("");
                      }}
                      style={{
                        backgroundColor: "#fff",
                        padding: 12,
                        borderRadius: 8,
                        marginBottom: 8,
                        borderColor: "#ccc",
                        borderWidth: 1,
                      }}
                    >
                      <Text style={{ fontWeight: "bold" }}>
                        {mod.code} - {mod.name}
                      </Text>
                    </Pressable>
                  ))}
              </View>
            )}
            {selectedModules.length > 0 && (
              <View style={{ marginTop: 10, marginBottom: 10 }}>
                <Text style={styles.code}>Currently selected</Text>
                {selectedModules.map((mod) => (
                  <View
                    key={mod.$id}
                    style={{
                      backgroundColor: "#DFE7EC",
                      padding: 10,
                      borderRadius: 8,
                      marginBottom: 10,
                      borderColor: "#ccc",
                      borderWidth: 1,
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <View style={{ flexShrink: 1 }}>
                      <Text style={{ fontWeight: "bold" }}>
                        {mod.code} - {mod.name}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() =>
                        setSelectedModules((prev) =>
                          prev.filter((m) => m.$id !== mod.$id)
                        )
                      }
                      style={{
                        backgroundColor: "#D2D4DB",
                        paddingVertical: 6,
                        paddingHorizontal: 12,
                        borderRadius: 6,
                        marginLeft: 10,
                      }}
                    >
                      <Text style={{ color: "white", fontWeight: "600" }}>
                        Remove
                      </Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            {selectedModules.length > 0 && (
              <View style={{ marginTop: 20, alignItems: "center" }}>
                <Text style={{ fontWeight: "bold", fontSize: 18 }}>
                  GPA: {calculateGPA()}
                </Text>
              </View>
            )}
          </View>
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
    paddingTop: 40,
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
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    width: 350,
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
