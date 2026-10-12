/** Bootstrap payload, reference-data CRUD and user management. */

function api_bootstrap(token) {
  var user = requireUser_(token);
  var currentTerm = getCurrentTerm_();
  return {
    user: publicUser_(user),
    classLevels: getClassLevels_(),
    classArms: getClassArms_(user),
    subjects: readTable_('Subjects').filter(function (s) { return toBool_(s.active); }),
    subjectClass: readTable_('SubjectClass'),
    terms: getTerms_(),
    gradeScale: readTable_('GradeScale'),
    roles: CFG.ROLES,
    sections: CFG.SECTIONS,
    attendanceStatuses: CFG.ATTENDANCE_STATUSES,
    audiences: ANNOUNCE_AUDIENCES,
    currentTermId: currentTerm ? currentTerm.id : '',
    classLevelsAll: getClassLevels_(true)
  };
}

function stripRow_(obj) {
  var copy = {};
  Object.keys(obj).forEach(function (k) { if (k !== '_row') copy[k] = obj[k]; });
  return copy;
}

function sanitizeUser_(user) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    fullName: user.fullName,
    email: user.email,
    sectionScope: user.sectionScope,
    classArmScope: user.classArmScope,
    active: toBool_(user.active),
    createdAt: user.createdAt
  };
}

function pick_(payload, keys) {
  var out = {};
  keys.forEach(function (k) {
    if (k === 'id') return;
    if (Object.prototype.hasOwnProperty.call(payload, k)) out[k] = payload[k];
  });
  return out;
}

var REF_WRITE_ROLES = ['PRINCIPAL', 'HEADMASTER', 'BURSAR'];

function api_listRef(token, name) {
  requireUser_(token);
  if (!HEADERS[name]) throw new Error('Unknown table: ' + name);
  if (name === 'Users') return readTable_('Users').map(sanitizeUser_);
  return readTable_(name).map(stripRow_);
}

function api_saveRef(token, name, payload) {
  var user = requireUser_(token);
  if (!HEADERS[name]) throw new Error('Unknown table: ' + name);
  payload = payload || {};
  if (name === 'Users') return saveUser_(user, payload);

  assertRole_(user, REF_WRITE_ROLES, 'You cannot modify reference data.');
  var fields = pick_(payload, HEADERS[name]);

  if (name === 'ClassLevels') {
    if (!fields.section || !fields.name) throw new Error('Section and name are required.');
    fields.orderIndex = toNum_(fields.orderIndex) || 0;
    if (!('active' in fields)) fields.active = true;
  } else if (name === 'ClassArms') {
    if (!fields.classLevelId || !fields.name) throw new Error('Class level and name are required.');
    if (!('active' in fields)) fields.active = true;
  } else if (name === 'Subjects') {
    if (!fields.section || !fields.name) throw new Error('Section and name are required.');
    if (!('active' in fields)) fields.active = true;
  } else if (name === 'SubjectClass') {
    if (!fields.subjectId || !fields.classLevelId) throw new Error('Subject and class level are required.');
  } else if (name === 'Terms') {
    if (!fields.sessionName || !fields.termName) throw new Error('Session and term name are required.');
    fields.isCurrent = toBool_(fields.isCurrent);
    if (!('active' in fields)) fields.active = true;
  } else if (name === 'GradeScale') {
    if (!fields.section || !fields.grade) throw new Error('Section and grade are required.');
    fields.minScore = toNum_(fields.minScore) || 0;
    fields.maxScore = toNum_(fields.maxScore) || 0;
    fields.orderIndex = toNum_(fields.orderIndex) || 0;
  }

  if (fields.isCurrent) setOnlyCurrentTerm_(fields.termName, fields.sessionName, payload.id);

  if (payload.id) {
    if (!findById_(name, payload.id)) throw new Error('Record not found.');
    updateRow_(name, payload.id, fields);
    return stripRow_(findById_(name, payload.id));
  }
  fields.id = uuid_();
  appendRow_(name, fields);
  return stripRow_(findById_(name, fields.id));
}

/** Ensures only one term across the whole spreadsheet is flagged current. */
function setOnlyCurrentTerm_(termName, sessionName, keepId) {
  readTable_('Terms').forEach(function (t) {
    if (keepId && String(t.id) === String(keepId)) return;
    if (toBool_(t.isCurrent)) updateRow_('Terms', t.id, { isCurrent: false });
  });
}

function api_deleteRef(token, name, id) {
  var user = requireUser_(token);
  if (!HEADERS[name]) throw new Error('Unknown table: ' + name);
  if (name === 'Users') {
    assertAdmin_(user);
    if (String(id) === String(user.id)) throw new Error('You cannot delete your own account.');
    deleteRow_('Users', id);
    return true;
  }
  assertRole_(user, ['PRINCIPAL', 'HEADMASTER'], 'You cannot delete reference data.');
  deleteRow_(name, id);
  return true;
}

function assertAdmin_(user) {
  if (user.role !== 'ADMIN') throw new Error('Administrator access is required.');
}

function saveUser_(caller, payload) {
  assertAdmin_(caller);
  if (!payload.username || !payload.role || CFG.ROLES.indexOf(payload.role) === -1) {
    throw new Error('A valid username and role are required.');
  }
  var fields = {
    username: String(payload.username).trim(),
    role: payload.role,
    fullName: payload.fullName || payload.username,
    email: payload.email || '',
    sectionScope: payload.sectionScope || '',
    classArmScope: payload.classArmScope || '',
    active: toBool_(payload.active)
  };

  if (payload.id) {
    var existing = findById_('Users', payload.id);
    if (!existing) throw new Error('User not found.');
    if (payload.password) {
      fields.salt = makeSalt_();
      fields.passwordHash = hashPassword_(payload.password, fields.salt);
    }
    updateRow_('Users', payload.id, fields);
    return sanitizeUser_(findById_('Users', payload.id));
  }

  var dupe = findWhere_('Users', function (u) {
    return String(u.username).toLowerCase() === fields.username.toLowerCase();
  });
  if (dupe) throw new Error('That username is already taken.');
  if (!payload.password) throw new Error('A password is required for a new user.');

  fields.id = uuid_();
  fields.salt = makeSalt_();
  fields.passwordHash = hashPassword_(payload.password, fields.salt);
  fields.createdAt = nowIso_();
  appendRow_('Users', fields);
  return sanitizeUser_(findById_('Users', fields.id));
}
