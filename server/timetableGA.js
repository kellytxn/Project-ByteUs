//generate 100 timetables randomly
const generatePopulation = (modCodes, modsData, populationSize = 100) => {
  let population = [];

  for (let j = 0; j < populationSize; j++) {
    let timetable = [];

    //pick classes for each mod, and add to timetable
    for (const modCode of modCodes) {
      let allClasses = modsData[modCode];
      if (!allClasses || allClasses.length === 0) continue;

      //group classes by lesson type (eg lect, tut, rec)
      let classesByType = {};
      allClasses.forEach((lesson) => {
        if (!classesByType[lesson.lessonType]) {
          classesByType[lesson.lessonType] = [];
        }
        classesByType[lesson.lessonType].push(lesson);
      });

      //pick all classes of same class number per lesson type
      for (const [lessonType, lessons] of Object.entries(classesByType)) {
        let pickedClassNo = lessons[Math.floor(Math.random() * lessons.length)].classNo;
        for (const lesson of lessons) {
          if (lesson.classNo === pickedClassNo) {
            let pickedClass = lesson;

            timetable.push({
              modCode: modCode,
              startTime: pickedClass.startTime,
              endTime: pickedClass.endTime,
              weeks: pickedClass.weeks,
              day: pickedClass.day,
              venue: pickedClass.venue,
              lessonType: pickedClass.lessonType,
              classNo: pickedClass.classNo,
            });
          }
        }
      }
    }
    population.push(timetable);
  }
  return population;
};

//calculate score for each timetable (assign score to timetable as key-value in index.js)
const calcScore = (prefs, timetable) => {
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
    if (lesson.day === "Monday" && prefs.some((pref) => pref.id === "noMon")) {
      let importance = 8 - prefs.find((pref) => pref.id === "noMon").rank;
      score -= importance;
    }

    if (
      lesson.day === "Tuesday" &&
      prefs.some((pref) => pref.id === "noTues")
    ) {
      let importance = 8 - prefs.find((pref) => pref.id === "noTues").rank;
      score -= importance;
    }

    if (
      lesson.day === "Wednesday" &&
      prefs.some((pref) => pref.id === "noWed")
    ) {
      let importance = 8 - prefs.find((pref) => pref.id === "noWed").rank;
      score -= importance;
    }

    if (
      lesson.day === "Thursday" &&
      prefs.some((pref) => pref.id === "noThurs")
    ) {
      let importance = 8 - prefs.find((pref) => pref.id === "noThurs").rank;
      score -= importance;
    }

    if (lesson.day === "Friday" && prefs.some((pref) => pref.id === "noFri")) {
      let importance = 8 - prefs.find((pref) => pref.id === "noFri").rank;
      score -= importance;
    }

    if (
      Number(lesson.startTime) < 1000 &&
      prefs.some((pref) => pref.id === "lateStart")
    ) {
      let importance = 8 - prefs.find((pref) => pref.id === "lateStart").rank;
      score -= importance;
    }

    if (
      Number(lesson.endTime) > 1400 &&
      prefs.some((pref) => pref.id === "earlyEnd")
    ) {
      let importance = 8 - prefs.find((pref) => pref.id === "earlyEnd").rank;
      score -= importance;
    }
  }
  return score;
};

//switch any class in timetable randomly
const mutate = (timetable, modsData, mutationRate = 0.1) => {
  const newTimetable = [...timetable];

  for (let i = 0; i < newTimetable.length; i++) {
    if (Math.random() < mutationRate) {
      let lesson = newTimetable[i];
      let allClasses = modsData[lesson.modCode];
      if (!allClasses) continue;

      //remove all lessons of that mod & lesson type
      let newTimetable = newTimetable.filter(clas => 
        !(clas.modCode === lesson.modCode && 
          clas.lessonType === lesson.lessonType));

      //find all classes of that lesson type
      let classes = [];
      allClasses.forEach((clas) => {
        if (clas.lessonType === lesson.lessonType) {
          classes.push(clas);
        }
      });

      //pick all classes of same class number & that lesson type
      let pickedClassNo = classes[Math.floor(Math.random() * classes.length)].classNo;
      for (const clas of classes) {
        if (clas.classNo === pickedClassNo) {
          let pickedClass = clas;

          newTimetable.push({
            modCode: lesson.modCode,
            startTime: pickedClass.startTime,
            endTime: pickedClass.endTime,
            weeks: pickedClass.weeks,
            day: pickedClass.day,
            venue: pickedClass.venue,
            lessonType: pickedClass.lessonType,
            classNo: pickedClass.classNo,
          });
        }
      }
    }
  }
  return newTimetable;
};

//create new timetable with some of A's lessons & some of B's lessons
const crossover = (timetableA, timetableB, modsData) => {
  let finalTimetableA = [...timetableA];
  let finalTimetableB = [...timetableB];
    
  //remove all lessons of same mod & lesson type with >1 class per week from finalTimetableA
  let timetable1 = {};
  timetableA.forEach((lesson) => {
    if (!timetable1[lesson.modCode]) {
      timetable1[lesson.modCode] = {};
    }
    if (!timetable1[lesson.modCode][lesson.lessonType]) {
      timetable1[lesson.modCode][lesson.lessonType] = [];
    }
    timetable1[lesson.modCode][lesson.lessonType].push(lesson);
  })

  for (const [modCode, lessonType] of Object.entries(timetable1)) {
    for (const [type, lessons] of Object.entries(lessonType)) {
      if (lessons.length > 1) {
        finalTimetableA = finalTimetableA
        .filter(c => !(c.modCode === modCode && c.lessonType === type));
      }
    }
  }

  //remove all lessons of same mod & lesson type with >1 class per week from finalTimetableB
  let timetable2 = {};
  timetableB.forEach((lesson) => {
    if (!timetable2[lesson.modCode]) {
      timetable2[lesson.modCode] = {};
    }
    if (!timetable2[lesson.modCode][lesson.lessonType]) {
      timetable2[lesson.modCode][lesson.lessonType] = [];
    }
    timetable2[lesson.modCode][lesson.lessonType].push(lesson);
  })

  for (const [modCode, lessonType] of Object.entries(timetable2)) {
    for (const [type, lessons] of Object.entries(lessonType)) {
      if (lessons.length > 1) {
        finalTimetableB = finalTimetableB
        .filter(!(c => c.modCode === modCode && c.lessonType === type));
      } 
    }
  }
  
  let crossoverPoint = Math.floor(Math.random() * finalTimetableA.length);

  let finalTimetable = finalTimetableA.slice(0, crossoverPoint)
  .concat(finalTimetableB.slice(crossoverPoint));

  //add classes with repeat lessons each week back
  for (const [modCode, lessonType] of Object.entries(timetable1)) {
    for (const [type, lessons] of Object.entries(lessonType)) {
      if (lessons.length > 1) {
        let allClasses = modsData[modCode];
        if (!allClasses) continue;

        let classes = [];
        allClasses.forEach((clas) => {
          if (clas.lessonType === type) {
            classes.push(clas);
          }
        });

        let pickedClassNo = classes[Math.floor(Math.random() * classes.length)].classNo;
        for (const clas of classes) {
          if (clas.classNo === pickedClassNo) {
            let pickedClass = clas;

            finalTimetable.push({
              modCode: modCode,
              startTime: pickedClass.startTime,
              endTime: pickedClass.endTime,
              weeks: pickedClass.weeks,
              day: pickedClass.day,
              venue: pickedClass.venue,
              lessonType: pickedClass.lessonType,
              classNo: pickedClass.classNo,
            });
          }
        }
      }
    }
  }

  return finalTimetable;
};

//select individuals for next generation
const select = (population, prefs, populationSize = 100) => {
  let scores = population.map((timetable) => calcScore(prefs, timetable));
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

    nextGen.push(
      calcScore(prefs, population[index1]) <
        calcScore(prefs, population[index2])
        ? population[index1]
        : population[index2]
    );
  }
  return nextGen;
};

const evolve = (
  population,
  prefs,
  modsData,
  populationSize = 100,
  crossoverRate = 0.7,
  mutationRate = 0.1
) => {
  let nextGen = select(population, prefs, populationSize);

  //create next generation with crossover and mutation
  for (let i = 0; i < populationSize; i++) {
    if (Math.random() < crossoverRate) {
      let timetableA = nextGen[i];
      let timetableB = nextGen[Math.floor(Math.random() * populationSize)];
      nextGen[i] = crossover(timetableA, timetableB, modsData);
    }
    nextGen[i] = mutate(nextGen[i], modsData, mutationRate);
  }
  return nextGen;
};

module.exports = {
  generatePopulation,
  calcScore,
  mutate,
  crossover,
  select,
  evolve,
};
