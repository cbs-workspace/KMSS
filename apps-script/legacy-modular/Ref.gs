/**
 * Reference-data helpers shared by the feature modules: class levels/arms,
 * subjects, terms and the grade scale — all read from the spreadsheet.
 */

function getClassLevels_(includeInactive) {
  var levels = readTable_('ClassLevels');
  if (!includeInactive) levels = levels.filter(function (l) { return toBool_(l.active); });
  return levels.sort(function (a, b) {
    if (a.section !== b.section) return CFG.SECTIONS.indexOf(a.section) - CFG.SECTIONS.indexOf(b.section);
    return Number(a.orderIndex) - Number(b.orderIndex);
  });
}

/** Class arms (joined with their level), scoped to what the user may access. */
function getClassArms_(user) {
  var levelsById = indexById_(readTable_('ClassLevels'));
  var arms = readTable_('ClassArms').filter(function (a) { return toBool_(a.active); });
  var list = arms.map(function (a) {
    var level = levelsById[a.classLevelId];
    return {
      id: a.id,
      name: a.name,
      classLevelId: a.classLevelId,
      classLevel: level ? { id: level.id, name: level.name, section: level.section } : null
    };
  });
  if (user) {
    var sections = userSections_(user);
    if (sections.length) {
      list = list.filter(function (a) { return a.classLevel && sections.indexOf(a.classLevel.section) !== -1; });
    }
    var allowedArms = userArmIds_(user);
    if (allowedArms.length) {
      list = list.filter(function (a) { return allowedArms.indexOf(a.id) !== -1; });
    }
  }
  return list;
}

function getArmById_(armId) {
  return findById_('ClassArms', armId);
}

/** Subjects attached to a class level via the SubjectClass mapping. */
function getSubjectsForArm_(armId) {
  var arm = getArmById_(armId);
  if (!arm) return [];
  var map = readTable_('SubjectClass').filter(function (sc) { return String(sc.classLevelId) === String(arm.classLevelId); });
  var subjectIds = map.map(function (sc) { return sc.subjectId; });
  var subjects = readTable_('Subjects').filter(function (s) {
    return toBool_(s.active) && subjectIds.indexOf(s.id) !== -1;
  });
  return subjects.sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
}

function getGradeScale_(section) {
  var scale = readTable_('GradeScale').filter(function (g) { return String(g.section) === String(section); });
  return scale.sort(function (a, b) { return Number(a.orderIndex) - Number(b.orderIndex); });
}

function gradeForScore_(section, score) {
  if (score === null || score === undefined || score === '') return { grade: '', remark: '' };
  var scale = getGradeScale_(section);
  var n = Number(score);
  for (var i = 0; i < scale.length; i++) {
    if (n >= Number(scale[i].minScore) && n <= Number(scale[i].maxScore)) {
      return { grade: scale[i].grade, remark: scale[i].remark };
    }
  }
  return { grade: '', remark: '' };
}

function getTerms_() {
  var terms = readTable_('Terms').filter(function (t) { return toBool_(t.active); });
  return terms.sort(function (a, b) {
    if (a.sessionName !== b.sessionName) return String(b.sessionName).localeCompare(String(a.sessionName));
    return CFG.TERM_NAMES.indexOf(a.termName) - CFG.TERM_NAMES.indexOf(b.termName);
  });
}

function getCurrentTerm_() {
  var terms = getTerms_();
  for (var i = 0; i < terms.length; i++) {
    if (toBool_(terms[i].isCurrent)) return terms[i];
  }
  return terms.length ? terms[0] : null;
}

var TERM_LABELS = { FIRST: 'First Term', SECOND: 'Second Term', THIRD: 'Third Term' };

function termLabel_(term) {
  if (!term) return '';
  return (TERM_LABELS[term.termName] || term.termName) + ' · ' + term.sessionName;
}

/** Builds a client-friendly view of a student, including class info. */
function decorateStudent_(student, armsById) {
  if (!student) return null;
  var arm = armsById[student.classArmId];
  return {
    id: student.id,
    admissionNo: student.admissionNo,
    firstName: student.firstName,
    middleName: student.middleName,
    lastName: student.lastName,
    gender: student.gender,
    dateOfBirth: student.dateOfBirth,
    classArmId: student.classArmId,
    classArm: arm ? { id: arm.id, name: arm.name, classLevel: arm.classLevel } : null,
    guardianName: student.guardianName,
    guardianPhone: student.guardianPhone,
    address: student.address,
    status: student.status
  };
}

function armsMap_(user) {
  var map = {};
  getClassArms_(user).forEach(function (a) { map[a.id] = a; });
  return map;
}
