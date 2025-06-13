//generate 100 timetables randomly
const generatePopulation = ( modCodes, modsData, populationSize = 100 ) => {
    let population = [];

    for (let j = 0; j < populationSize; j++) {
        let timetable = [];

        //pick classes for each mod, and add to timetable
        for (let i = 0; i < modCodes.length; i++) {
            let modCode = modCodes[i];
            let allClasses = modsData[modCode];
            if (!allClasses || allClasses.length === 0) continue;
            
            //group classes by lesson type (eg lect, tut, rec)
            let classesByType = {};
            allClasses.forEach(lesson => {
                if (!classesByType[lesson.lessonType]) {
                    classesByType[lesson.lessonType] = [];
                }
                classesByType[lesson.lessonType].push(lesson);
            });

            //pick 1 class per lesson type
            for (const [lessonType, lessons] of Object.entries(classesByType)) {
                let pickedClass = lessons[Math.floor(Math.random() * lessons.length)];
                
                timetable.push({
                    modCode: modCode,
                    startTime: pickedClass.startTime,
                    endTime: pickedClass.endTime,
                    weeks: pickedClass.weeks,
                    day: pickedClass.day,
                    venue: pickedClass.venue,
                    lessonType: pickedClass.lessonType,
                });
            }
        }
        population.push(timetable);
    }
    return population;
}

//calculate score for each timetable (assign score to timetable as key-value in index.js)
const calcScore = ( prefs, timetable ) => {
    //lesson clash gives immediate neg infinity
    for (let i = 0; i < timetable.length; i++) {
        const lessonA = timetable[i];
        for (let j = i + 1; j < timetable.length; j++) {
            const lessonB = timetable[j];
            
            if (lessonA.day === lessonB.day) {
                const startA = Number(lessonA.startTime);
                const endA = Number(lessonA.endTime);
                const startB = Number(lessonB.startTime);
                const endB = Number(lessonB.endTime);
                
                if (startA < endB && endA > startB) {
                    return -Infinity;
                }
            }
        }
    }

    //preferences
    let score = 100;

    for (const lesson of timetable) {
        if (lesson.day === 'Monday' && prefs.some(pref => pref.id === 'noMon')) {
            let importance = 8 - prefs.find(pref => pref.id === 'noMon').rank;
            score -= importance;
        }

        if (lesson.day === 'Tuesday' && prefs.some(pref => pref.id === 'noTues')) {
            let importance = 8 - prefs.find(pref => pref.id === 'noTues').rank;
            score -= importance;
        }

        if (lesson.day === 'Wednesday' && prefs.some(pref => pref.id === 'noWed')) {
            let importance = 8 - prefs.find(pref => pref.id === 'noWed').rank;
            score -= importance;
        }

        if (lesson.day === 'Thursday' && prefs.some(pref => pref.id === 'noThurs')) {
            let importance = 8 - prefs.find(pref => pref.id === 'noThurs').rank;
            score -= importance;
        }

        if (lesson.day === 'Friday' && prefs.some(pref => pref.id === 'noFri')) {
            let importance = 8 - prefs.find(pref => pref.id === 'noFri').rank;
            score -= importance;
        }

        if (Number(lesson.startTime) < 1000 && prefs.some(pref => pref.id === 'lateStart')) {
            let importance = 8 - prefs.find(pref => pref.id === 'lateStart').rank;
            score -= importance;
        }

        if (Number(lesson.endTime) > 1400 && prefs.some(pref => pref.id === 'earlyEnd')) {
            let importance = 8 - prefs.find(pref => pref.id === 'earlyEnd').rank;
            score -= importance;
        }
    }
    return score;
}

//switch any class in timetable randomly
const mutate = ( timetable, modsData, mutationRate = 0.1 ) => {
    const newTimetable = [...timetable];

    for (let i = 0; i < newTimetable.length; i++) {
        if (Math.random() < mutationRate) {
            let lesson = newTimetable[i];
            let allClasses = modsData[lesson.modCode];
            if (!allClasses) continue;   

            //group classes by lesson type (eg lect, tut, rec)
            let classesByType = {};
            classesByType[lesson.lessonType] = [];
            allClasses.forEach(clas => {
                if (clas.lessonType === lesson.lessonType) {
                    classesByType[lesson.lessonType].push(clas);
                }
            });
            
            //pick 1 class of the same lesson type
            for (const [lessonType, lessons] of Object.entries(classesByType)) {
                let pickedClass = lessons[Math.floor(Math.random() * lessons.length)];
                
                newTimetable[i] = {
                    modCode: lesson.modCode,
                    startTime: pickedClass.startTime,
                    endTime: pickedClass.endTime,
                    weeks: pickedClass.weeks,
                    day: pickedClass.day,
                    venue: pickedClass.venue,
                    lessonType: pickedClass.lessonType,
                }
            }
        }
    }
    return newTimetable;
}

//create new timetable with some of A's lessons & some of B's lessons
const crossover = ( timetableA, timetableB ) => {
    const mapA = new Map();
    const mapB = new Map();
    
    //use modcode and lesson type to as key to get one of each lesson (if A and B have different orders)
    timetableA.forEach(lesson => {
        const key = `${lesson.modCode}_${lesson.lessonType}`;
        mapA.set(key, lesson);
    });
    
    timetableB.forEach(lesson => {
        const key = `${lesson.modCode}_${lesson.lessonType}`;
        mapB.set(key, lesson);
    });

    //get all unique keys from both timetables
    const allKeys = new Set([...mapA.keys(), ...mapB.keys()]);
    const finalTimetable = [];

    //pick some lessons from A and some from B (equal probability)
    for (const key of allKeys) {
        if (mapA.has(key) && mapB.has(key)) {
            finalTimetable.push(Math.random() < 0.5 ? mapA.get(key) : mapB.get(key));
        } else {
            finalTimetable.push(mapA.has(key) ? mapA.get(key) : mapB.get(key));
        }
    }
    return finalTimetable;
}

//select individuals for next generation
const select = ( population, prefs, populationSize = 100 ) => {
    let scores = population.map(timetable => calcScore(prefs, timetable));
    let totalScore = scores.reduce((a, b) => a + b, 0);
    
    if (totalScore <= 0 || !isFinite(totalScore)) {
        return population.slice(0, populationSize);
    }

    let probabilities = scores.map((score) => score / totalScore);
    let nextGen = [];

    for (let i = 0; i < populationSize; i++) {
        let individual1 = Math.random();
        let individual2 = Math.random();
        let cumulativeProb1 = 0;
        let cumulativeProb2 = 0;
        let index1 = 0;
        let index2 = 0;

        for (let j = 0; j < populationSize; j++) {
            cumulativeProb1 += probabilities[j];
            if (individual1 < cumulativeProb1) {
                index1 = j;
                break;
            }
        }

        for (let j = 0; j < populationSize; j++) {
            if (j === index1) continue;
            cumulativeProb2 += probabilities[j];
            if (individual2 < cumulativeProb2) {
                index2 = j;
                break;
            }
        }

        nextGen.push(calcScore(prefs, population[index1]) < calcScore(prefs, population[index2]) ? population[index1] : population[index2]);
    }
    return nextGen;
}

const evolve = ( population, prefs, modsData, populationSize = 100, crossoverRate = 0.7, mutationRate = 0.1 ) => {
    let nextGen = select(population, prefs, populationSize);

    // create next generation with crossover and mutation
    for (let i = 0; i < populationSize; i++) {
        if (Math.random() < crossoverRate) {
        let timetableA = nextGen[i];
        let timetableB = nextGen[Math.floor(Math.random() * populationSize)];
        nextGen[i] = crossover(timetableA, timetableB);
        }
        nextGen[i] = mutate(nextGen[i], modsData, mutationRate);
    }
    return nextGen;
}

export default {
    generatePopulation,
    calcScore,
    mutate,
    crossover,
    select,
    evolve
};