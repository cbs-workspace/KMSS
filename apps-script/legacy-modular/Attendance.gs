/** Daily attendance: roster view, saving a day's register, and summaries. */

function api_getRoster(token, classArmId, date) {
  var user = requireUser_(token);
  assertArmAllowed_(user, classArmId);
  var armsById = armsMap_(user);
  var students = readTable_('Students').filter(function (s) {
    return String(s.classArmId) === String(classArmId) && toBool_(s.status === '' ? true : s.status !== 'INACTIVE');
  });
  students.sort(function (a, b) { return String(a.lastName).localeCompare(String(b.lastName)); });

  var existing = {};
  if (date) {
    readTable_('Attendance').forEach(function (a) {
      if (String(a.classArmId) === String(classArmId) && String(a.date) === String(date)) {
        existing[a.studentId] = a;
      }
    });
  }

  return {
    date: date || '',
    classArm: armsById[classArmId] || null,
    students: students.map(function (s) {
      var rec = existing[s.id];
      return {
        studentId: s.id,
        student: decorateStudent_(s, armsById),
        status: rec ? rec.status : 'PRESENT',
        note: rec ? rec.note : ''
      };
    })
  };
}

function api_saveAttendance(token, classArmId, date, records) {
  var user = requireUser_(token);
  assertRole_(user, CFG.ENTRY_ROLES, 'You do not have permission to record attendance.');
  assertArmAllowed_(user, classArmId);
  if (!date) throw new Error('Select a date.');
  records = records || [];

  var existing = {};
  readTable_('Attendance').forEach(function (a) {
    if (String(a.classArmId) === String(classArmId) && String(a.date) === String(date)) {
      existing[a.studentId] = a;
    }
  });

  var saved = 0;
  records.forEach(function (rec) {
    if (!rec.studentId) return;
    var status = rec.status || 'PRESENT';
    if (CFG.ATTENDANCE_STATUSES.indexOf(status) === -1) status = 'PRESENT';
    var current = existing[rec.studentId];
    if (current) {
      updateRow_('Attendance', current.id, { status: status, note: rec.note || '' });
    } else {
      appendRow_('Attendance', {
        id: uuid_(), date: date, classArmId: classArmId, studentId: rec.studentId,
        status: status, note: rec.note || '', recordedBy: user.id, createdAt: nowIso_()
      });
    }
    saved++;
  });
  return { saved: saved };
}

function api_attendanceSummary(token, classArmId, from, to) {
  var user = requireUser_(token);
  assertArmAllowed_(user, classArmId);
  var students = readTable_('Students').filter(function (s) { return String(s.classArmId) === String(classArmId); });
  var counts = {};
  students.forEach(function (s) { counts[s.id] = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0, total: 0 }; });

  readTable_('Attendance').forEach(function (a) {
    if (String(a.classArmId) !== String(classArmId)) return;
    if (from && String(a.date) < String(from)) return;
    if (to && String(a.date) > String(to)) return;
    var bucket = counts[a.studentId];
    if (!bucket) return;
    if (bucket[a.status] === undefined) bucket[a.status] = 0;
    bucket[a.status]++;
    bucket.total++;
  });

  var armsById = armsMap_(user);
  return students.map(function (s) {
    return { student: decorateStudent_(s, armsById), counts: counts[s.id] };
  });
}
