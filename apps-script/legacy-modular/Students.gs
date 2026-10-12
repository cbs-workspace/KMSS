/** Student records: listing (scoped), create/update and delete. */

function api_listStudents(token, opts) {
  opts = opts || {};
  var user = requireUser_(token);
  var armsById = armsMap_(user);
  var students = readTable_('Students');
  var list = students.filter(function (s) { return armsById[s.classArmId]; });
  if (opts.classArmId) {
    list = list.filter(function (s) { return String(s.classArmId) === String(opts.classArmId); });
  }
  var q = String(opts.search || '').trim().toLowerCase();
  if (q) {
    list = list.filter(function (s) {
      var hay = [s.firstName, s.middleName, s.lastName, s.admissionNo].join(' ').toLowerCase();
      return hay.indexOf(q) !== -1;
    });
  }
  list.sort(function (a, b) {
    var an = String(a.lastName || '').toLowerCase();
    var bn = String(b.lastName || '').toLowerCase();
    if (an !== bn) return an < bn ? -1 : 1;
    return String(a.firstName || '').toLowerCase() < String(b.firstName || '').toLowerCase() ? -1 : 1;
  });
  return list.map(function (s) { return decorateStudent_(s, armsById); });
}

function api_getStudent(token, id) {
  var user = requireUser_(token);
  var student = findById_('Students', id);
  if (!student) throw new Error('Student not found.');
  assertArmAllowed_(user, student.classArmId);
  return decorateStudent_(student, armsMap_(user));
}

function api_saveStudent(token, payload) {
  var user = requireUser_(token);
  assertRole_(user, CFG.ENTRY_ROLES, 'You do not have permission to edit students.');
  if (!payload) throw new Error('Missing student data.');
  if (!payload.firstName || !payload.lastName) throw new Error('First and last name are required.');
  if (!payload.classArmId) throw new Error('Select a class for the student.');
  assertArmAllowed_(user, payload.classArmId);

  var fields = {
    firstName: String(payload.firstName).trim(),
    middleName: payload.middleName ? String(payload.middleName).trim() : '',
    lastName: String(payload.lastName).trim(),
    gender: payload.gender || '',
    dateOfBirth: payload.dateOfBirth || '',
    classArmId: payload.classArmId,
    guardianName: payload.guardianName || '',
    guardianPhone: payload.guardianPhone || '',
    address: payload.address || '',
    status: payload.status || 'ACTIVE'
  };

  if (payload.id) {
    var existing = findById_('Students', payload.id);
    if (!existing) throw new Error('Student not found.');
    assertArmAllowed_(user, existing.classArmId);
    fields.updatedAt = nowIso_();
    updateRow_('Students', payload.id, fields);
    return decorateStudent_(findById_('Students', payload.id), armsMap_(user));
  }

  fields.id = uuid_();
  fields.admissionNo = nextAdmissionNo_();
  fields.createdAt = nowIso_();
  fields.updatedAt = fields.createdAt;
  appendRow_('Students', fields);
  return decorateStudent_(findById_('Students', fields.id), armsMap_(user));
}

function api_deleteStudent(token, id) {
  var user = requireUser_(token);
  assertRole_(user, ['PRINCIPAL', 'HEADMASTER'], 'Only a principal or headmaster can remove a student.');
  var student = findById_('Students', id);
  if (!student) throw new Error('Student not found.');
  assertArmAllowed_(user, student.classArmId);
  deleteRow_('Students', id);
  return true;
}

function nextAdmissionNo_() {
  var year = new Date().getFullYear();
  var prefix = 'KMS/' + year + '/';
  var max = 0;
  readTable_('Students').forEach(function (s) {
    var value = String(s.admissionNo || '');
    if (value.indexOf(prefix) === 0) {
      var n = parseInt(value.slice(prefix.length), 10);
      if (!isNaN(n) && n > max) max = n;
    }
  });
  var next = String(max + 1);
  while (next.length < 4) next = '0' + next;
  return prefix + next;
}

/** Throws unless the user is allowed to touch the given class arm. */
function assertArmAllowed_(user, armId) {
  var allowed = userArmIds_(user);
  if (allowed.length && allowed.indexOf(String(armId)) === -1) {
    throw new Error('That class is outside your assigned classes.');
  }
  var sections = userSections_(user);
  if (sections.length) {
    var arm = getArmById_(armId);
    var level = arm ? findById_('ClassLevels', arm.classLevelId) : null;
    if (!level || sections.indexOf(level.section) === -1) {
      throw new Error('That class is outside your section.');
    }
  }
}
