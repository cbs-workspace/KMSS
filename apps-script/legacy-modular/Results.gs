/**
 * Results: per-subject score entry, class result computation (totals,
 * averages, positions), remarks, publishing and the report-card payload.
 *
 * Marking scheme: CA1–CA3 max 10 each, Exam max 70, total out of 100.
 */

var CA_MAX = 10;
var EXAM_MAX = 70;

function clampScore_(value, max) {
  if (value === '' || value === null || value === undefined) return '';
  var n = Number(value);
  if (isNaN(n)) return '';
  if (n < 0) n = 0;
  if (n > max) n = max;
  return n;
}

function round2_(n) {
  return Math.round(Number(n) * 100) / 100;
}

function totalFor_(score) {
  var ca1 = score.ca1 === '' ? 0 : Number(score.ca1);
  var ca2 = score.ca2 === '' ? 0 : Number(score.ca2);
  var ca3 = score.ca3 === '' ? 0 : Number(score.ca3);
  var exam = score.exam === '' ? 0 : Number(score.exam);
  return ca1 + ca2 + ca3 + exam;
}

function studentSection_(classArmId) {
  var arm = getArmById_(classArmId);
  if (!arm) return '';
  var level = findById_('ClassLevels', arm.classLevelId);
  return level ? level.section : '';
}

function api_getScoreSheet(token, classArmId, termId, subjectId) {
  var user = requireUser_(token);
  assertArmAllowed_(user, classArmId);
  var armsById = armsMap_(user);
  var students = readTable_('Students').filter(function (s) {
    return String(s.classArmId) === String(classArmId) && String(s.status) !== 'INACTIVE';
  });
  students.sort(function (a, b) { return String(a.lastName).localeCompare(String(b.lastName)); });

  var existing = {};
  readTable_('Scores').forEach(function (s) {
    if (String(s.termId) === String(termId) && String(s.subjectId) === String(subjectId)) {
      existing[s.studentId] = s;
    }
  });

  var subject = subjectId ? findById_('Subjects', subjectId) : null;
  return {
    subject: subject ? { id: subject.id, name: subject.name } : null,
    classArm: armsById[classArmId] || null,
    rows: students.map(function (s) {
      var rec = existing[s.id];
      return {
        studentId: s.id,
        student: decorateStudent_(s, armsById),
        ca1: rec ? rec.ca1 : '',
        ca2: rec ? rec.ca2 : '',
        ca3: rec ? rec.ca3 : '',
        exam: rec ? rec.exam : '',
        total: rec ? rec.total : '',
        grade: rec ? rec.grade : ''
      };
    })
  };
}

function api_saveScores(token, termId, classArmId, subjectId, records) {
  var user = requireUser_(token);
  assertRole_(user, CFG.ENTRY_ROLES, 'You do not have permission to enter scores.');
  assertArmAllowed_(user, classArmId);
  if (!termId || !subjectId) throw new Error('Select a term and subject.');
  records = records || [];
  var section = studentSection_(classArmId);

  var existing = {};
  readTable_('Scores').forEach(function (s) {
    if (String(s.termId) === String(termId) && String(s.subjectId) === String(subjectId)) {
      existing[s.studentId] = s;
    }
  });

  var saved = 0;
  records.forEach(function (rec) {
    if (!rec.studentId) return;
    var ca1 = clampScore_(rec.ca1, CA_MAX);
    var ca2 = clampScore_(rec.ca2, CA_MAX);
    var ca3 = clampScore_(rec.ca3, CA_MAX);
    var exam = clampScore_(rec.exam, EXAM_MAX);
    var total = totalFor_({ ca1: ca1, ca2: ca2, ca3: ca3, exam: exam });
    var graded = gradeForScore_(section, total);
    var fields = {
      termId: termId, classArmId: classArmId, subjectId: subjectId, studentId: rec.studentId,
      ca1: ca1, ca2: ca2, ca3: ca3, exam: exam, total: total,
      grade: graded.grade, remark: graded.remark, recordedBy: user.id, updatedAt: nowIso_()
    };
    var current = existing[rec.studentId];
    if (current) {
      updateRow_('Scores', current.id, fields);
    } else {
      fields.id = uuid_();
      appendRow_('Scores', fields);
    }
    saved++;
  });
  return { saved: saved };
}

/** Aggregates all subjects for a class/term and ranks the students. */
function computeClassResults_(classArmId, termId) {
  var students = readTable_('Students').filter(function (s) {
    return String(s.classArmId) === String(classArmId) && String(s.status) !== 'INACTIVE';
  });
  var agg = {};
  students.forEach(function (s) { agg[s.id] = { total: 0, count: 0 }; });

  readTable_('Scores').forEach(function (s) {
    if (String(s.termId) !== String(termId) || String(s.classArmId) !== String(classArmId)) return;
    if (!agg[s.studentId]) return;
    if (s.total === '' || s.total === null || s.total === undefined) return;
    agg[s.studentId].total += Number(s.total);
    agg[s.studentId].count++;
  });

  var rows = students.map(function (s) {
    var a = agg[s.id];
    return {
      studentId: s.id,
      totalScore: round2_(a.total),
      average: a.count ? round2_(a.total / a.count) : 0,
      subjectCount: a.count
    };
  });

  var sorted = rows.slice().sort(function (x, y) { return y.totalScore - x.totalScore; });
  var rank = 0, lastTotal = null, seen = 0;
  sorted.forEach(function (r) {
    seen++;
    if (lastTotal === null || r.totalScore !== lastTotal) { rank = seen; lastTotal = r.totalScore; }
    r.position = r.subjectCount > 0 ? rank : '';
  });

  var byId = {};
  rows.forEach(function (r) {
    var match = null;
    for (var i = 0; i < sorted.length; i++) {
      if (sorted[i].studentId === r.studentId) { match = sorted[i]; break; }
    }
    byId[r.studentId] = { totalScore: r.totalScore, average: r.average, subjectCount: r.subjectCount, position: match ? match.position : '' };
  });
  return byId;
}

function api_computeResults(token, classArmId, termId) {
  var user = requireUser_(token);
  assertRole_(user, CFG.ENTRY_ROLES, 'You do not have permission to compute results.');
  assertArmAllowed_(user, classArmId);
  var computed = computeClassResults_(classArmId, termId);

  var existing = {};
  readTable_('ResultSheets').forEach(function (r) {
    if (String(r.termId) === String(termId)) existing[r.studentId] = r;
  });

  Object.keys(computed).forEach(function (studentId) {
    var c = computed[studentId];
    var fields = {
      termId: termId, studentId: studentId, position: c.position,
      totalScore: c.totalScore, average: c.average, updatedAt: nowIso_()
    };
    if (existing[studentId]) {
      updateRow_('ResultSheets', existing[studentId].id, fields);
    } else {
      fields.id = uuid_();
      fields.teacherRemark = '';
      fields.principalRemark = '';
      fields.status = 'DRAFT';
      appendRow_('ResultSheets', fields);
    }
  });
  return { students: Object.keys(computed).length };
}

function api_listResultSheets(token, classArmId, termId) {
  var user = requireUser_(token);
  assertArmAllowed_(user, classArmId);
  var armsById = armsMap_(user);
  var computed = computeClassResults_(classArmId, termId);
  var sheets = {};
  readTable_('ResultSheets').forEach(function (r) {
    if (String(r.termId) === String(termId)) sheets[r.studentId] = r;
  });
  var students = readTable_('Students').filter(function (s) { return String(s.classArmId) === String(classArmId); });

  return students.map(function (s) {
    var c = computed[s.id] || { totalScore: 0, average: 0, position: '' };
    var sheet = sheets[s.id];
    return {
      student: decorateStudent_(s, armsById),
      totalScore: c.totalScore,
      average: c.average,
      position: c.position,
      status: sheet ? sheet.status : '',
      sheetId: sheet ? sheet.id : ''
    };
  });
}

function api_getReportCard(token, studentId, termId) {
  var user = requireUser_(token);
  var student = findById_('Students', studentId);
  if (!student) throw new Error('Student not found.');
  assertArmAllowed_(user, student.classArmId);

  var term = termId ? findById_('Terms', termId) : getCurrentTerm_();
  if (!term) throw new Error('No term is available.');
  var armsById = armsMap_(user);
  var scores = readTable_('Scores').filter(function (s) {
    return String(s.studentId) === String(studentId) && String(s.termId) === String(term.id);
  }).map(function (s) {
    var subject = findById_('Subjects', s.subjectId);
    return {
      id: s.id,
      subject: subject ? { id: subject.id, name: subject.name } : { id: s.subjectId, name: '—' },
      ca1: s.ca1, ca2: s.ca2, ca3: s.ca3, exam: s.exam, total: s.total, grade: s.grade, remark: s.remark
    };
  });
  scores.sort(function (a, b) { return String(a.subject.name).localeCompare(String(b.subject.name)); });

  var computed = computeClassResults_(student.classArmId, term.id)[studentId] || { totalScore: 0, average: 0, position: '' };
  var sheet = findWhere_('ResultSheets', function (r) {
    return String(r.termId) === String(term.id) && String(r.studentId) === String(studentId);
  });
  var section = studentSection_(student.classArmId);

  return {
    student: decorateStudent_(student, armsById),
    term: { id: term.id, termName: term.termName, sessionName: term.sessionName, label: termLabel_(term) },
    scores: scores,
    computed: { totalScore: computed.totalScore, average: computed.average, subjectCount: computed.subjectCount, position: computed.position },
    gradeScale: getGradeScale_(section),
    sheet: sheet ? { teacherRemark: sheet.teacherRemark, principalRemark: sheet.principalRemark, status: sheet.status } : { teacherRemark: '', principalRemark: '', status: 'DRAFT' }
  };
}

function api_saveRemarks(token, studentId, termId, remarks) {
  var user = requireUser_(token);
  assertRole_(user, CFG.ENTRY_ROLES, 'You do not have permission to save remarks.');
  var student = findById_('Students', studentId);
  if (!student) throw new Error('Student not found.');
  assertArmAllowed_(user, student.classArmId);

  var sheet = findWhere_('ResultSheets', function (r) {
    return String(r.termId) === String(termId) && String(r.studentId) === String(studentId);
  });
  var fields = { updatedAt: nowIso_() };
  if (remarks && Object.prototype.hasOwnProperty.call(remarks, 'teacherRemark')) {
    fields.teacherRemark = remarks.teacherRemark || '';
  }
  if (remarks && Object.prototype.hasOwnProperty.call(remarks, 'principalRemark')) {
    fields.principalRemark = remarks.principalRemark || '';
  }
  if (sheet) {
    updateRow_('ResultSheets', sheet.id, fields);
  } else {
    fields.id = uuid_();
    fields.termId = termId;
    fields.studentId = studentId;
    fields.position = '';
    fields.totalScore = 0;
    fields.average = 0;
    fields.teacherRemark = fields.teacherRemark || '';
    fields.principalRemark = fields.principalRemark || '';
    fields.status = 'DRAFT';
    appendRow_('ResultSheets', fields);
  }
  return true;
}

function api_publishResults(token, classArmId, termId, publish) {
  var user = requireUser_(token);
  assertRole_(user, ['ADMIN', 'PRINCIPAL', 'HEADMASTER'], 'Only leadership can publish results.');
  assertArmAllowed_(user, classArmId);
  var status = publish ? 'PUBLISHED' : 'DRAFT';
  var count = 0;
  readTable_('ResultSheets').forEach(function (r) {
    var student = findById_('Students', r.studentId);
    if (student && String(student.classArmId) === String(classArmId) && String(r.termId) === String(termId)) {
      updateRow_('ResultSheets', r.id, { status: status, updatedAt: nowIso_() });
      count++;
    }
  });
  return { updated: count, status: status };
}
