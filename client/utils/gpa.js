export const calculateGpaMetrics = (modules, mcsToGrad) => {
  const gradePointMap = {
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
  };

  const completedUnits = modules
    .filter((mod) => mod.completed)
    .reduce((sum, mod) => sum + mod.units, 0);

  const total = mcsToGrad || modules.reduce((sum, mod) => sum + mod.units, 0);
  const unitsLeft = total - completedUnits;

  const completedModules = modules.filter(
    (mod) =>
      mod.completed && mod.grade !== "CS" && mod.grade !== "CU" && !mod.isSU
  );

  let totalUnits = 0;
  let weightedGpaSum = 0;

  completedModules.forEach((mod) => {
    const gradePoint = gradePointMap[mod.grade];
    if (gradePoint !== undefined) {
      totalUnits += mod.units;
      weightedGpaSum += gradePoint * mod.units;
    }
  });

  const cumulativeGpa =
    totalUnits > 0 ? (weightedGpaSum / totalUnits).toFixed(2) : "0.00";

  return { cumulativeGpa, totalUnits, unitsLeft };
};
