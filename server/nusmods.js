// get all info about specific module in specific AY
async function fetchModTimetable(academicYear, moduleCode, semester) {
    try {
        //const academicYear = `${firstYear}-${secondYear}`;
        const url = `https://api.nusmods.com/v2/${academicYear}/modules/${moduleCode.toUpperCase()}.json`;
        const res = await fetch(url);
        if (!res.ok) {
            throw new Error(`HTTP Error: ${res.status}`);
        }
        const moduleData = await res.json();
        const timetableData = moduleData.semesterData.filter(info => info.semester.toString() === semester);
        //console.log(timetableData[0].timetable);
        return timetableData[0].timetable;
    } catch (error) {
        console.error("Could not fetch module info: ", error);
        throw error;
    }
}

//fetchModTimetable('2023-2024', 'cs2030', '2');

// get summaries of all modules in specific AY
async function fetchAvailMods(firstYear, secondYear) {
    try {
        const academicYear = `${firstYear}-${secondYear}`;
        const url = `https://api.nusmods.com/v2/${academicYear}/moduleList.json`;
        const res = await fetch(url);
        if (!res.ok) {
            throw new Error(`HTTP Error: ${res.status}`);
        }
        const moduleData = await res.json();
        console.log(moduleData);
        return moduleData;
    } catch (error) {
        console.error("Could not fetch modules: ", error);
        throw error;
    }
}