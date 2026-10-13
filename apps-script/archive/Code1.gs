/**
 * Kings Metro School — Management Portal
 * Google Apps Script web app (single file). Backed by one Google Spreadsheet
 * (tabs = fields) with all uploads stored in a Google Drive folder.
 *
 * DEPLOY
 *   1. Create the tabs and seed data: run setUp() once (creates/uses the Sheet).
 *   2. Project Settings → Script Properties:
 *        SPREADSHEET_ID   = <your Google Sheet id>      (optional; else set below)
 *        DRIVE_FOLDER_ID  = <your Drive folder id>      (optional; else created)
 *        SCHOOL_NAME, SCHOOL_LOGO_URL, CBS_LOGO_URL, FOOTER_TEXT   (optional branding)
 *   3. Deploy → New deployment → Web app → Execute as: Me → Access: Anyone.
 *
 * You may also paste the two ids into DEFAULT_SPREADSHEET_ID / DEFAULT_DRIVE_FOLDER_ID.
 */

/* =========================== 1. CONFIG =========================== */

var DEFAULT_SPREADSHEET_ID = '1LYulfTSNfV2rnXdiZem_nWU_7kBHi1NjvHEK5llzuR4'; // Kings Metro School — Data
var DEFAULT_DRIVE_FOLDER_ID = '1AztVRdRQJ_FdcLE2Eyk9XDlP93PWYKUP'; // uploaded files / logos folder
var PROP_SHEET_ID = 'SPREADSHEET_ID';
var PROP_DRIVE_ID = 'DRIVE_FOLDER_ID';
var OWNER_ADMIN_USERNAME = 'cbs4u4me@gmail.com'; // primary/only default admin (replaces the old 'admin')
var OWNER_ADMIN_EMAIL = 'cbs4u4me@gmail.com';
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
var DEMO_PASSWORD = 'Demo@1234'; // shared password for the demo accounts (see createDemoUsers); disable accounts before go-live

var CFG = {
  APP_NAME: 'Kings Metro School Sokoto',
  APP_SUBTITLE: 'KG · Primary · Secondary',
  DEFAULT_FOOTER_TEXT: '© 2026 Capacity Building and Support (CBS). All rights reserved.',
  SESSION_TTL_SECONDS: 21600, // 6 hours
  LOGIN_MAX_FAILURES: 5,
  LOGIN_LOCKOUT_SECONDS: 900, // 15 minutes
  SHEETS: {
    USERS: 'Users', CLASS_LEVELS: 'ClassLevels', CLASS_ARMS: 'ClassArms', SUBJECTS: 'Subjects',
    SUBJECT_CLASS: 'SubjectClass', TERMS: 'Terms', GRADE_SCALE: 'GradeScale', STUDENTS: 'Students',
    STAFF: 'Staff', PARENT_STUDENTS: 'ParentStudents', ATTENDANCE: 'Attendance', SCORES: 'Scores',
    RESULT_SHEETS: 'ResultSheets', PAYMENTS: 'Payments', FILES: 'Files', ANNOUNCEMENTS: 'Announcements',
    APPLICATIONS: 'Applications', FEES: 'Fees', FEE_SELECTIONS: 'FeeSelections', FEE_PLANS: 'FeePlans',
    STAFF_ATTENDANCE: 'StaffAttendance', TIMETABLE: 'Timetable',
    SETTINGS: 'Settings', AUDIT_LOG: 'AuditLog'
  },
  ROLES: ['ADMIN', 'PRINCIPAL', 'HEADMASTER', 'BURSAR', 'ACCOUNT_OFFICER', 'TEACHER', 'PARENT'],
  SECTIONS: ['KG', 'PRIMARY', 'SECONDARY'],
  TERM_NAMES: ['FIRST', 'SECOND', 'THIRD'],
  ATTENDANCE_STATUSES: ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'],
  FEE_CATEGORIES: ['TUITION', 'FEES', 'BOOKS', 'UNIFORM', 'SPORT', 'PRACTICAL', 'LABORATORY', 'TRANSPORT', 'ICT', 'EXCURSION', 'DEVELOPMENT', 'OTHER'],
  PAYMENT_CATEGORIES: ['TUITION', 'FEES', 'BOOKS', 'UNIFORM', 'SPORT', 'PRACTICAL', 'LABORATORY', 'TRANSPORT', 'ICT', 'EXCURSION', 'DEVELOPMENT', 'OTHER'],
  PAYMENT_STATUSES: ['PENDING', 'VERIFIED', 'REJECTED'],
  ENTRY_ROLES: ['PRINCIPAL', 'HEADMASTER', 'TEACHER'],
  FINANCE_ROLES: ['PRINCIPAL', 'HEADMASTER', 'BURSAR', 'ACCOUNT_OFFICER']
};

/** Sheet tabs and their column order (fields). Order is authoritative. */
var HEADERS = {
  Users: ['id', 'username', 'passwordHash', 'salt', 'role', 'fullName', 'email', 'sectionScope', 'classArmScope', 'active', 'createdAt'],
  ClassLevels: ['id', 'section', 'name', 'orderIndex', 'active'],
  ClassArms: ['id', 'classLevelId', 'name', 'active'],
  Subjects: ['id', 'section', 'name', 'active'],
  SubjectClass: ['id', 'subjectId', 'classLevelId'],
  Terms: ['id', 'sessionName', 'termName', 'startDate', 'endDate', 'isCurrent', 'active'],
  GradeScale: ['id', 'section', 'grade', 'minScore', 'maxScore', 'remark', 'orderIndex'],
  Students: ['id', 'admissionNo', 'firstName', 'middleName', 'lastName', 'gender', 'dateOfBirth', 'classArmId', 'guardianName', 'guardianPhone', 'address', 'status', 'photoFileId', 'createdAt', 'updatedAt'],
  Staff: ['id', 'staffNo', 'firstName', 'middleName', 'lastName', 'gender', 'dateOfBirth', 'email', 'phone', 'address', 'designation', 'section', 'dateJoined', 'status', 'photoFileId', 'createdAt', 'updatedAt'],
  ParentStudents: ['id', 'parentUserId', 'studentId', 'relationship', 'createdAt'],
  Attendance: ['id', 'date', 'classArmId', 'studentId', 'status', 'note', 'recordedBy', 'createdAt'],
  Scores: ['id', 'termId', 'classArmId', 'studentId', 'subjectId', 'ca1', 'ca2', 'ca3', 'exam', 'total', 'grade', 'remark', 'recordedBy', 'updatedAt'],
  ResultSheets: ['id', 'termId', 'studentId', 'position', 'totalScore', 'average', 'teacherRemark', 'principalRemark', 'status', 'updatedAt'],
  Payments: ['id', 'studentId', 'parentUserId', 'termId', 'category', 'amount', 'method', 'reference', 'note', 'status', 'evidenceFileId', 'evidenceUrl', 'verifiedBy', 'verifiedAt', 'createdAt', 'updatedAt', 'feePlanId', 'installmentNo', 'amountPaid', 'balanceAfter', 'receiptNo', 'viewfile', 'items'],
  Files: ['id', 'ownerType', 'ownerId', 'name', 'mimeType', 'size', 'driveFileId', 'url', 'uploadedBy', 'createdAt'],
  Announcements: ['id', 'title', 'body', 'audience', 'createdBy', 'createdAt', 'active', 'category', 'link'],
  Applications: ['id', 'ref', 'childFirstName', 'childMiddleName', 'childLastName', 'gender', 'dateOfBirth', 'classLevelId', 'guardianName', 'guardianPhone', 'guardianEmail', 'address', 'previousSchool', 'notes', 'photoFileId', 'documentFileId', 'status', 'submittedAt', 'reviewedAt', 'reviewedBy', 'remarks'],
  Fees: ['id', 'name', 'category', 'section', 'classLevelId', 'sessionName', 'termName', 'amount', 'mandatory', 'active', 'orderIndex', 'note', 'updatedAt'],
  FeeSelections: ['id', 'studentId', 'parentUserId', 'termId', 'feeId', 'category', 'name', 'amount', 'mandatory', 'selected', 'createdAt', 'updatedAt'],
  FeePlans: ['id', 'studentId', 'parentUserId', 'termId', 'installments', 'createdAt', 'updatedAt'],
  StaffAttendance: ['id', 'date', 'staffId', 'status', 'note', 'recordedBy', 'createdAt'],
  Timetable: ['id', 'termId', 'classArmId', 'dayOfWeek', 'startTime', 'endTime', 'subjectId', 'title', 'teacher', 'room', 'kind', 'note', 'createdBy', 'createdAt', 'updatedAt'],
  Settings: ['key', 'value', 'updatedAt'],
  AuditLog: ['id', 'at', 'actorId', 'actorUsername', 'action', 'target', 'detail']
};

function brand_() {
  var p = PropertiesService.getScriptProperties();
  return {
    schoolName: p.getProperty('SCHOOL_NAME') || CFG.APP_NAME,
    subtitle: CFG.APP_SUBTITLE,
    footerText: p.getProperty('FOOTER_TEXT') || CFG.DEFAULT_FOOTER_TEXT,
    logoUrl: p.getProperty('SCHOOL_LOGO_URL') || '',
    cbsLogoUrl: p.getProperty('CBS_LOGO_URL') || ''
  };
}

/* =========================== 2. UTILITIES =========================== */

function uuid_() { return Utilities.getUuid(); }
function nowIso_() { return new Date().toISOString(); }
function todayIso_() { try { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'); } catch (e) { return new Date().toISOString().slice(0, 10); } }
function toBool_(value) {
  if (value === true || value === false) return value;
  var s = String(value).toLowerCase();
  return !(s === '' || s === 'false' || s === '0' || s === 'no');
}
function toNum_(value) {
  if (value === '' || value === null || value === undefined) return null;
  var n = Number(value); return isNaN(n) ? null : n;
}
function round2_(n) { return Math.round(Number(n) * 100) / 100; }
function indexById_(rows) { var m = {}; rows.forEach(function (r) { m[r.id] = r; }); return m; }
function parseCsv_(value) {
  if (!value) return [];
  return String(value).split(',').map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 0; });
}
function fullNameOf_(rec) { return [rec.lastName, rec.firstName, rec.middleName].filter(Boolean).join(' '); }

/* =========================== 3. DATABASE =========================== */

function getSpreadsheetId_() {
  var id = PropertiesService.getScriptProperties().getProperty(PROP_SHEET_ID);
  if (!id) id = DEFAULT_SPREADSHEET_ID;
  if (!id) throw new Error('Set ' + PROP_SHEET_ID + ' in Script Properties or DEFAULT_SPREADSHEET_ID in Code.gs, or run setUp().');
  return id;
}
function getDriveFolderId_() {
  var id = PropertiesService.getScriptProperties().getProperty(PROP_DRIVE_ID);
  if (!id) id = DEFAULT_DRIVE_FOLDER_ID;
  if (!id) throw new Error('Set ' + PROP_DRIVE_ID + ' in Script Properties or DEFAULT_DRIVE_FOLDER_ID in Code.gs, or run setUp().');
  return id;
}
function tryFolder_(id) { try { return id ? DriveApp.getFolderById(id) : null; } catch (e) { return null; } }
/**
 * Returns the Drive folder that holds uploads, creating it when needed.
 * Resilient: if the configured id is not a folder (e.g. it is the Sheet's id),
 * it falls back to the parent folder of that file, then to a new folder.
 */
function resolveRootFolder_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(PROP_DRIVE_ID) || DEFAULT_DRIVE_FOLDER_ID;
  var folder = tryFolder_(id);
  if (!folder && id) {
    try { var it = DriveApp.getFileById(id).getParents(); if (it.hasNext()) folder = it.next(); } catch (e) { /* not a file either */ }
  }
  if (!folder) {
    try { var it2 = DriveApp.getFileById(getSpreadsheetId_()).getParents(); if (it2.hasNext()) folder = it2.next(); } catch (e2) { /* ignore */ }
  }
  if (!folder) folder = DriveApp.createFolder('Kings Metro School Files');
  if (folder.getId() !== id) props.setProperty(PROP_DRIVE_ID, folder.getId());
  return folder;
}
function getSpreadsheet_() { return SpreadsheetApp.openById(getSpreadsheetId_()); }
function getSheet_(name) {
  var sheet = getSpreadsheet_().getSheetByName(name);
  if (!sheet) throw new Error('Missing sheet tab: ' + name);
  return sheet;
}
function readTable_(name) {
  var values = getSheet_(name).getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0], rows = [];
  for (var i = 1; i < values.length; i++) {
    if (values[i].join('').toString().trim() === '') continue;
    var obj = {};
    for (var c = 0; c < headers.length; c++) obj[headers[c]] = values[i][c];
    obj._row = i + 1;
    rows.push(obj);
  }
  return rows;
}
function readTableSafe_(name) { try { return readTable_(name); } catch (e) { return []; } }
function findById_(name, id) {
  var rows = readTable_(name);
  for (var i = 0; i < rows.length; i++) if (String(rows[i].id) === String(id)) return rows[i];
  return null;
}
function findWhere_(name, predicate) { var rows = readTable_(name); for (var i = 0; i < rows.length; i++) if (predicate(rows[i])) return rows[i]; return null; }
function filterWhere_(name, predicate) { return readTable_(name).filter(predicate); }
function appendRow_(name, obj) {
  var headers = HEADERS[name];
  getSheet_(name).appendRow(headers.map(function (h) { return obj[h] === undefined || obj[h] === null ? '' : obj[h]; }));
  return obj;
}
function bulkAppend_(name, rows) {
  if (!rows.length) return;
  var sheet = getSheet_(name), headers = HEADERS[name];
  var out = rows.map(function (r) { return headers.map(function (h) { return r[h] === undefined || r[h] === null ? '' : r[h]; }); });
  sheet.getRange(sheet.getLastRow() + 1, 1, out.length, headers.length).setValues(out);
}
function updateRow_(name, id, patch) {
  var sheet = getSheet_(name), headers = HEADERS[name], values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(id)) {
      for (var c = 0; c < headers.length; c++) {
        if (Object.prototype.hasOwnProperty.call(patch, headers[c])) {
          sheet.getRange(i + 1, c + 1).setValue(patch[headers[c]] === null ? '' : patch[headers[c]]);
        }
      }
      return true;
    }
  }
  return false;
}
function deleteRow_(name, id) {
  var sheet = getSheet_(name), values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) if (String(values[i][0]) === String(id)) { sheet.deleteRow(i + 1); return true; }
  return false;
}
function stripRow_(obj) { var c = {}; Object.keys(obj).forEach(function (k) { if (k !== '_row') c[k] = obj[k]; }); return c; }

/* =========================== 4. AUTH =========================== */

function makeSalt_() { return Utilities.getUuid().replace(/-/g, ''); }
function makePassword_() {
  var chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$%&*';
  var out = '';
  for (var i = 0; i < 12; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
  return out;
}
function sendCredentials_(to, username, password, subject) {
  if (!to) return false;
  try {
    MailApp.sendEmail(to, subject || 'Your ' + CFG.APP_NAME + ' portal login', [
      'Your portal sign-in details:',
      '',
      'Username: ' + username,
      'Password: ' + password,
      '',
      'After signing in, use Change password (top right) to set your own password.',
      '',
      CFG.APP_NAME + ' · Portal'
    ].join('\n'));
    return true;
  } catch (e) {
    Logger.log('sendCredentials_ failed for ' + to + ': ' + (e && e.message ? e.message : e));
    return false;
  }
}
/**
 * Editor helper: check why credential emails are not arriving.
 * Run from the editor and read View → Logs / Execution log.
 */
function diagnoseMail() {
  var quota = -1;
  try { quota = MailApp.getRemainingDailyQuota(); } catch (e) { Logger.log('getRemainingDailyQuota failed: ' + e); }
  Logger.log('Signed-in account: ' + Session.getActiveUser().getEmail());
  Logger.log('Remaining email quota today: ' + quota + (quota === 0 ? '  (EXHAUSTED — wait ~24h or use a paid Workspace account)' : ''));
  try {
    MailApp.sendEmail(OWNER_ADMIN_EMAIL, 'Kings Metro test email', 'If you can read this, MailApp works.');
    Logger.log('Test email sent to ' + OWNER_ADMIN_EMAIL + '.');
  } catch (e) {
    Logger.log('Test email FAILED: ' + (e && e.message ? e.message : e));
  }
}
function hashPassword_(password, salt) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(password) + ':' + String(salt), Utilities.Charset.UTF_8);
  var out = '';
  for (var i = 0; i < bytes.length; i++) { var h = (bytes[i] & 0xff).toString(16); out += h.length === 1 ? '0' + h : h; }
  return out;
}
function publicUser_(u) {
  return { id: u.id, username: u.username, role: u.role, fullName: u.fullName, email: u.email, sectionScope: u.sectionScope, classArmScope: u.classArmScope };
}
function api_login(username, password) {
  if (!username || !password) throw new Error('Enter your username and password.');
  var key = String(username).trim().toLowerCase();
  if (isLoginLocked_(key)) throw new Error('Too many failed attempts. Please try again in 15 minutes.');
  var user = findWhere_('Users', function (u) { return String(u.username).toLowerCase() === key; });
  if (!user || !toBool_(user.active)) { recordLoginFailure_(key); throw new Error('Invalid username or password.'); }
  if (hashPassword_(password, user.salt) !== String(user.passwordHash)) { recordLoginFailure_(key); throw new Error('Invalid username or password.'); }
  clearLoginFailures_(key);
  var token = Utilities.getUuid();
  CacheService.getScriptCache().put('sess_' + token, JSON.stringify({ id: user.id, epoch: sessionEpoch_(user.id) }), CFG.SESSION_TTL_SECONDS);
  return { token: token, user: publicUser_(user) };
}
function api_logout(token) { if (token) CacheService.getScriptCache().remove('sess_' + token); return true; }
function api_me(token) { return publicUser_(requireUser_(token)); }
function sessionEpoch_(userId) {
  var v = CacheService.getScriptCache().get('ue_' + userId);
  return v ? String(v) : '0';
}
function bumpSessionEpoch_(userId) {
  CacheService.getScriptCache().put('ue_' + userId, String(new Date().getTime()), CFG.SESSION_TTL_SECONDS * 2);
}
function isLoginLocked_(key) {
  var v = CacheService.getScriptCache().get('lck_' + key);
  return v !== null && parseInt(v, 10) >= CFG.LOGIN_MAX_FAILURES;
}
function recordLoginFailure_(key) {
  var k = 'lck_' + key;
  var n = parseInt(CacheService.getScriptCache().get(k) || '0', 10) + 1;
  CacheService.getScriptCache().put(k, String(n), CFG.LOGIN_LOCKOUT_SECONDS);
}
function clearLoginFailures_(key) {
  CacheService.getScriptCache().remove('lck_' + key);
}
function requireUser_(token) {
  if (!token) throw new Error('Please sign in to continue.');
  var raw = CacheService.getScriptCache().get('sess_' + token);
  if (!raw) throw new Error('Your session has expired. Please sign in again.');
  var sess = {};
  try { sess = JSON.parse(raw); } catch (e) { sess = { id: raw }; }
  var user = findById_('Users', sess.id);
  if (!user || !toBool_(user.active)) throw new Error('Please sign in again.');
  if (sess.epoch && String(sess.epoch) !== String(sessionEpoch_(user.id))) throw new Error('Your session has expired. Please sign in again.');
  return user;
}
function hasRole_(user, roles) { if (!user) return false; if (user.role === 'ADMIN') return true; return roles.indexOf(user.role) !== -1; }
function assertRole_(user, roles, message) { if (!hasRole_(user, roles)) throw new Error(message || 'You do not have permission to do that.'); }
function assertAdmin_(user) { if (user.role !== 'ADMIN') throw new Error('Administrator access is required.'); }
function userArmIds_(user) { return user ? parseCsv_(user.classArmScope) : []; }
function userSections_(user) { return user ? parseCsv_(user.sectionScope) : []; }

/* =========================== 5. SETUP / SEED =========================== */

/**
 * Creates any missing tabs, then CLEARS every tab and re-seeds the full
 * reference data set and the default admin. This is destructive by design
 * (Run setup / re-seed from the editor or the sheet menu).
 */
function setUp() {
  var props = PropertiesService.getScriptProperties();
  var sheetId = props.getProperty(PROP_SHEET_ID) || DEFAULT_SPREADSHEET_ID;
  var ss;
  if (sheetId) {
    ss = SpreadsheetApp.openById(sheetId);
  } else {
    ss = SpreadsheetApp.create('Kings Metro School — Data');
    props.setProperty(PROP_SHEET_ID, ss.getId());
  }
  Object.keys(CFG.SHEETS).forEach(function (name) { ensureSheet_(ss, CFG.SHEETS[name]); });
  Object.keys(CFG.SHEETS).forEach(function (name) { clearSheet_(ss, CFG.SHEETS[name]); });

  var folder = resolveRootFolder_();
  seedReferenceData_();
  seedAdmin_();
  Logger.log('Setup complete (reset & re-seeded). Sheet: ' + ss.getUrl() + '  Drive folder id: ' + folder.getId());
  return ss.getUrl();
}
function clearSheet_(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) return;
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, sheet.getMaxColumns()).clearContent();
}
function ensureSheet_(ss, name) {
  var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  var headers = HEADERS[name];
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}
function seedAdmin_() {
  if (findWhere_('Users', function (u) { return String(u.username).toLowerCase() === String(OWNER_ADMIN_USERNAME).toLowerCase(); })) return;
  var password = makePassword_();
  var salt = makeSalt_();
  appendRow_('Users', {
    id: uuid_(), username: OWNER_ADMIN_USERNAME, passwordHash: hashPassword_(password, salt), salt: salt,
    role: 'ADMIN', fullName: 'Administrator', email: OWNER_ADMIN_EMAIL,
    sectionScope: '', classArmScope: '', active: true, createdAt: nowIso_()
  });
  if (sendCredentials_(OWNER_ADMIN_EMAIL, OWNER_ADMIN_USERNAME, password, 'Your ' + CFG.APP_NAME + ' portal login')) {
    Logger.log('Owner admin created — credentials emailed to ' + OWNER_ADMIN_EMAIL + '.');
  } else {
    Logger.log('Owner admin created — credentials NOT emailed (' + OWNER_ADMIN_EMAIL + '). Temporary password: ' + password);
  }
}
function seedReferenceData_() {
  if (readTable_('ClassLevels').length === 0) seedClassLevels_();
  if (readTable_('ClassArms').length === 0) seedClassArms_();
  if (readTable_('Subjects').length === 0) seedSubjects_();
  if (readTable_('Terms').length === 0) seedTerms_();
  if (readTable_('GradeScale').length === 0) seedGradeScale_();
  if (readTable_('Fees').length === 0) seedFees_();
}
function seedClassLevels_() {
  var levels = [
    { section: 'KG', name: 'Creche', orderIndex: 0 },
    { section: 'KG', name: 'Pre-Nursery', orderIndex: 1 }, { section: 'KG', name: 'Nursery 1', orderIndex: 2 },
    { section: 'KG', name: 'Nursery 2', orderIndex: 3 }, { section: 'KG', name: 'KG', orderIndex: 4 }
  ];
  for (var i = 1; i <= 6; i++) levels.push({ section: 'PRIMARY', name: 'Primary ' + i, orderIndex: i });
  ['JSS 1', 'JSS 2', 'JSS 3', 'SSS 1', 'SSS 2', 'SSS 3'].forEach(function (n, idx) { levels.push({ section: 'SECONDARY', name: n, orderIndex: idx + 1 }); });
  levels.forEach(function (l) { appendRow_('ClassLevels', { id: uuid_(), section: l.section, name: l.name, orderIndex: l.orderIndex, active: true }); });
}
function seedClassArms_() { readTable_('ClassLevels').forEach(function (l) { appendRow_('ClassArms', { id: uuid_(), classLevelId: l.id, name: 'A', active: true }); }); }
function seedSubjects_() {
  var bySection = {
    KG: ['Numeracy', 'Literacy', 'Rhymes'],
    PRIMARY: ['Mathematics', 'English Studies', 'Basic Science and Technology', 'National Values', 'Cultural & Creative Arts'],
    SECONDARY: ['Mathematics', 'English Language', 'Basic Science', 'Social Studies', 'Biology', 'Chemistry', 'Physics', 'Economics', 'Government']
  };
  var levels = readTable_('ClassLevels');
  Object.keys(bySection).forEach(function (section) {
    var sectionLevels = levels.filter(function (l) { return l.section === section; });
    bySection[section].forEach(function (name) {
      var subjectId = uuid_();
      appendRow_('Subjects', { id: subjectId, section: section, name: name, active: true });
      sectionLevels.forEach(function (l) { appendRow_('SubjectClass', { id: uuid_(), subjectId: subjectId, classLevelId: l.id }); });
    });
  });
}
function seedTerms_() {
  var y = new Date().getFullYear(), session = y + '/' + (y + 1);
  ['FIRST', 'SECOND', 'THIRD'].forEach(function (t, i) {
    appendRow_('Terms', { id: uuid_(), sessionName: session, termName: t, startDate: '', endDate: '', isCurrent: i === 0, active: true });
  });
}
function seedGradeScale_() {
  var defs = [
    { grade: 'A', minScore: 70, maxScore: 100, remark: 'Excellent', orderIndex: 1 },
    { grade: 'B', minScore: 60, maxScore: 69, remark: 'Very Good', orderIndex: 2 },
    { grade: 'C', minScore: 50, maxScore: 59, remark: 'Good', orderIndex: 3 },
    { grade: 'D', minScore: 40, maxScore: 49, remark: 'Fair', orderIndex: 4 },
    { grade: 'F', minScore: 0, maxScore: 39, remark: 'Fail', orderIndex: 5 }
  ];
  CFG.SECTIONS.forEach(function (section) {
    defs.forEach(function (d) { appendRow_('GradeScale', { id: uuid_(), section: section, grade: d.grade, minScore: d.minScore, maxScore: d.maxScore, remark: d.remark, orderIndex: d.orderIndex }); });
  });
}
/**
 * Sample fee catalogue so new school fee schedules are non-empty.
 * All amounts are placeholders — edit them in the sheet or the Fees page.
 * A blank section/level/term means "applies to every section/level/term".
 */
function seedFees_() {
  var definitions = [
    { name: 'School fees', category: 'TUITION', amount: 60000, mandatory: true, orderIndex: 1 },
    { name: 'Tuition', category: 'TUITION', amount: 120000, section: 'SECONDARY', mandatory: true, orderIndex: 1 },
    { name: 'Tuition', category: 'TUITION', amount: 90000, section: 'PRIMARY', mandatory: true, orderIndex: 1 },
    { name: 'Tuition', category: 'TUITION', amount: 70000, section: 'KG', mandatory: true, orderIndex: 1 },
    { name: 'Books & stationery', category: 'BOOKS', amount: 25000, mandatory: false, orderIndex: 2 },
    { name: 'Uniform (pair)', category: 'UNIFORM', amount: 15000, mandatory: false, orderIndex: 3 },
    { name: 'Sports', category: 'SPORT', amount: 8000, mandatory: false, orderIndex: 4 },
    { name: 'Practical materials', category: 'PRACTICAL', amount: 6000, mandatory: false, orderIndex: 5 },
    { name: 'Laboratory', category: 'LABORATORY', amount: 10000, section: 'SECONDARY', mandatory: false, orderIndex: 6 },
    { name: 'Transport', category: 'TRANSPORT', amount: 18000, mandatory: false, orderIndex: 7 },
    { name: 'ICT', category: 'ICT', amount: 7000, mandatory: false, orderIndex: 8 },
    { name: 'Excursion', category: 'EXCURSION', amount: 5000, mandatory: false, orderIndex: 9 }
  ];
  definitions.forEach(function (d) {
    appendRow_('Fees', { id: uuid_(), name: d.name, category: d.category, section: d.section || '', classLevelId: '', sessionName: '', termName: '', amount: d.amount, mandatory: d.mandatory, active: true, orderIndex: d.orderIndex, note: '', updatedAt: nowIso_() });
  });
}
/** Editor helper: create a user quickly. */
function createUser(username, password, role, fullName, sectionScope, classArmScope) {
  var salt = makeSalt_();
  if (findWhere_('Users', function (u) { return String(u.username) === String(username); })) throw new Error('Username exists: ' + username);
  appendRow_('Users', { id: uuid_(), username: username, passwordHash: hashPassword_(password, salt), salt: salt, role: role, fullName: fullName || username, email: '', sectionScope: sectionScope || '', classArmScope: classArmScope || '', active: true, createdAt: nowIso_() });
  Logger.log('Created user ' + username);
}
/**
 * Editor helper: reset the owner admin's password (use if you are locked out).
 * Generates a new password, emails it to OWNER_ADMIN_EMAIL, ends open sessions,
 * and prints it to the log as a fallback.
 */
function resetOwnerAdminPassword() {
  var admin = findWhere_('Users', function (u) { return String(u.username).toLowerCase() === String(OWNER_ADMIN_USERNAME).toLowerCase(); });
  var password = makePassword_(), salt = makeSalt_();
  if (admin) {
    updateRow_('Users', admin.id, { passwordHash: hashPassword_(password, salt), salt: salt, active: true, role: 'ADMIN' });
    bumpSessionEpoch_(admin.id);
    try { CacheService.getScriptCache().remove('lck_' + OWNER_ADMIN_USERNAME); } catch (e) {}
  } else {
    appendRow_('Users', { id: uuid_(), username: OWNER_ADMIN_USERNAME, passwordHash: hashPassword_(password, salt), salt: salt, role: 'ADMIN', fullName: 'Administrator', email: OWNER_ADMIN_EMAIL, sectionScope: '', classArmScope: '', active: true, createdAt: nowIso_() });
  }
  var emailed = sendCredentials_(OWNER_ADMIN_EMAIL, OWNER_ADMIN_USERNAME, password, 'Your ' + CFG.APP_NAME + ' admin password has been reset');
  Logger.log('=== Kings Metro admin reset ===');
  Logger.log('Username: ' + OWNER_ADMIN_USERNAME);
  Logger.log('Temporary password: ' + password);
  Logger.log('Emailed to ' + OWNER_ADMIN_EMAIL + ': ' + emailed);
  Logger.log('Sign in, then use "Change password" (top right).');
  return { username: OWNER_ADMIN_USERNAME, password: password, emailed: emailed };
}

/**
 * Demo data — idempotent seeds you can run from the editor.
 *   createDemoStudents()  → 100 students per class arm (all fields filled).
 *   createDemoStaff()     → teaching + admin + non-teaching staff (cleaner, security,
 *                           cook, librarian, etc.) with emails; a login for every staff
 *                           member with a portal role (non-teaching staff are records only).
 *   createDemoUsers()     → logins for the teaching/admin roster (shared DEMO_PASSWORD).
 *   createDemoParents()   → ~10 parent logins (demo.parent1..10) linked to wards.
 *   createDemoData()      → ALL of the above plus attendance, staff attendance, scores +
 *                           auto result sheets, fee plans/payments/receipts, timetable,
 *                           announcements and admission applications — a full test dataset.
 * Demo accounts use a known password — deactivate them before go-live.
 */

var DEMO_STUDENTS_PER_CLASS = 100;

var DEMO_FIRST_MALE = ['Musa', 'Ibrahim', 'Abdullahi', 'Sani', 'Umar', 'Yusuf', 'Suleiman', 'Bello', 'Abubakar', 'Kabiru', 'Muhammad', 'Hamza', 'Ismail', 'Nura', 'Ahmad', 'Usman', 'Sadiq', 'Bashir', 'Aliyu', 'Faruk', 'Garba', 'Hassan', 'Isah', 'Jibril', 'Khalid', 'Lawal', 'Mansur', 'Nafiu', 'Chinedu', 'Emeka', 'Tochukwu', 'Oluwaseun', 'Ayodeji', 'Temitope', 'Femi', 'Kunle', 'Damilola', 'David', 'Samuel', 'Joshua', 'Daniel', 'Emmanuel', 'Michael', 'Peter', 'Godwin', 'Shedrack', 'Chisom', 'Divine', 'Favour'];
var DEMO_FIRST_FEMALE = ['Aisha', 'Fatima', 'Zainab', 'Amina', 'Maryam', 'Hafsat', 'Khadija', 'Safiya', 'Aminatu', 'Rahmat', 'Halima', 'Asabe', 'Nafisa', 'Bilkisu', 'Saudatu', 'Hauwa', 'Lubabatu', 'Maimuna', 'Rukayya', 'Sadiya', 'Abibat', 'Adaeze', 'Chidinma', 'Ngozi', 'Chioma', 'Amara', 'Ifeoma', 'Blessing', 'Esther', 'Deborah', 'Grace', 'Faith', 'Peace', 'Queen', 'Precious', 'Gift', 'Joy', 'Sandra', 'Vera', 'Tina', 'Omolara', 'Funmilayo', 'Yetunde', 'Kemi', 'Lola', 'Hajarat', 'Kulsum', 'Najibah', 'Rabi'];
var DEMO_LAST_NAMES = ['Abubakar', 'Bello', 'Danladi', 'Garba', 'Hassan', 'Ibrahim', 'Jibril', 'Lawal', 'Musa', 'Nuhu', 'Umar', 'Gusau', 'Sokoto', 'Yakubu', 'Bala', 'Shuaibu', 'Muhammadu', 'Yarima', 'Aminu', 'Dogo', 'Malami', 'Sanko', 'Okafor', 'Obi', 'Okeke', 'Eze', 'Nwosu', 'Adeyemi', 'Olawale', 'Balogun', 'Adekunle', 'Ogundipe', 'Akande', 'Oyelaran', 'Ajayi', 'Ogunleye', 'Afolabi'];
var DEMO_STREETS = ['1 Sultan Abubakar Road', '15 Emir Yahaya Road', '22 Kambarawa Road', '4 Gwaram Road', '10 Abdullahi Fodio Road', '18 Adis Bali Road', '33 Airport Road', '7 Marafa Road', '12 Bello Road', '25 Kofar Kware', '9 Aliyu Jedo Road', '16 Rumi Road', '3 Old Airport Road', '28 Race Course Road', '6 Kuyanbana', '30 Dama Road', '14 Ahmadu Bello Way', '21 Sokoto South', '8 Kofar Rini', '19 Gidan Dare Road'];
var DEMO_PHONE_PREFIXES = ['0803', '0805', '0806', '0807', '0809', '0810', '0811', '0812', '0813', '0814', '0815', '0816', '0817', '0818', '0819', '0701', '0703', '0704', '0705', '0706', '0708', '0709', '0901', '0902', '0903', '0905', '0906', '0908', '0909'];
var DEMO_KG_AGES = { 'Creche': 2, 'Pre-Nursery': 3, 'Nursery 1': 4, 'Nursery 2': 5, 'KG': 6 };

function demoPick_(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function demoPhone_() { var p = demoPick_(DEMO_PHONE_PREFIXES); var rest = String(Math.floor(4000000 + Math.random() * 5999999)); while (rest.length < 7) rest = '0' + rest; return '+234 ' + p.slice(1) + ' ' + rest.slice(0, 4) + ' ' + rest.slice(4); }
function demoDob_(age) { var d = new Date(); d.setFullYear(d.getFullYear() - age); d.setTime(d.getTime() + (Math.floor(Math.random() * 700) - 350) * 86400000); var m = String(d.getMonth() + 1); if (m.length < 2) m = '0' + m; var day = String(d.getDate()); if (day.length < 2) day = '0' + day; return d.getFullYear() + '-' + m + '-' + day; }
function demoAgeFor_(level) {
  var nm = String(level.name || '');
  if (DEMO_KG_AGES[nm] != null) return DEMO_KG_AGES[nm];
  if (String(level.section) === 'PRIMARY') return 5 + (Number(level.orderIndex) || 1);
  if (String(level.section) === 'SECONDARY') return 10 + (Number(level.orderIndex) || 1);
  return 6 + Math.floor(Math.random() * 6);
}

var DEMO_EMAIL_DOMAIN = 'kingsmetro.example';
function demoPad_(n, width) { var s = String(n); var w = width || 2; while (s.length < w) s = '0' + s; return s; }
function demoIsoDate_(d) { return d.getFullYear() + '-' + demoPad_(d.getMonth() + 1) + '-' + demoPad_(d.getDate()); }
/** Unique demo email: first.last<seq>@kingsmetro.example (never a real inbox). */
function demoEmail_(first, last, seq) {
  var f = String(first || 'user').toLowerCase().replace(/[^a-z]/g, '') || 'user';
  var l = String(last || '').toLowerCase().replace(/[^a-z]/g, '');
  return f + (l ? '.' + l : '') + seq + '@' + DEMO_EMAIL_DOMAIN;
}
function demoJoined_(seq) { return (2014 + (seq % 10)) + '-' + demoPad_(1 + (seq % 8)) + '-' + demoPad_(1 + (seq % 27)); }
/** Last `count` weekday dates (yyyy-MM-dd), oldest first, ending today. */
function demoRecentSchoolDays_(count) {
  var days = [], d = new Date(), guard = 0;
  while (days.length < count && guard < 60) {
    var dow = d.getDay();
    if (dow !== 0 && dow !== 6) days.push(demoIsoDate_(d));
    d = new Date(d.getTime() - 86400000);
    guard++;
  }
  return days.reverse();
}
function demoRemarkFor_(average) {
  var n = Number(average) || 0;
  if (n >= 70) return 'An excellent result. Keep it up.';
  if (n >= 60) return 'A very good result. Well done.';
  if (n >= 50) return 'A good result; there is room to do better.';
  if (n >= 40) return 'A fair result. More effort is needed.';
  return 'Needs improvement. Please work harder next term.';
}
/** Active admin user id (for seeded recordedBy/createdBy fields), or ''. */
function demoAdminId_() { var u = findWhere_('Users', function (x) { return x.role === 'ADMIN'; }); return u ? u.id : ''; }
/** Map classArmId -> first TEACHER user id assigned to it (fallback: admin). */
function demoTeacherByArm_() {
  var map = {}, adminId = '';
  readTable_('Users').forEach(function (u) {
    if (u.role === 'ADMIN' && !adminId) adminId = u.id;
    if (u.role !== 'TEACHER') return;
    parseCsv_(u.classArmScope).forEach(function (a) { if (!map[a]) map[a] = u.id; });
  });
  map._admin = adminId;
  return map;
}

/** All active class-arm ids per section, sorted by level order then arm name. */
function armIdsBySectionAll_() {
  var levelById = indexById_(readTable_('ClassLevels')), order = {};
  Object.keys(levelById).forEach(function (id) { order[id] = Number(levelById[id].orderIndex) || 0; });
  var bySec = {};
  readTable_('ClassArms').forEach(function (a) {
    if (!toBool_(a.active)) return;
    var level = levelById[a.classLevelId];
    if (!level) return;
    (bySec[level.section] = bySec[level.section] || []).push({ id: a.id, order: order[a.classLevelId], name: String(a.name) });
  });
  Object.keys(bySec).forEach(function (k) { bySec[k].sort(function (x, y) { return x.order !== y.order ? x.order - y.order : (x.name < y.name ? -1 : (x.name > y.name ? 1 : 0)); }); });
  var out = {};
  Object.keys(bySec).forEach(function (k) { out[k] = bySec[k].map(function (x) { return x.id; }); });
  return out;
}

/** Deterministic roster of people who each get a Staff record and a login. */
function demoPeople_() {
  var people = [], n = 0;
  function firstName(male) { var arr = male ? DEMO_FIRST_MALE : DEMO_FIRST_FEMALE; return arr[(n * 7 + 3) % arr.length]; }
  function lastName() { return DEMO_LAST_NAMES[(n * 5 + 1) % DEMO_LAST_NAMES.length]; }
  function phone() { var p = DEMO_PHONE_PREFIXES[(n * 3) % DEMO_PHONE_PREFIXES.length]; var rest = String(4000000 + ((n * 13) % 5999999)); while (rest.length < 7) rest = '0' + rest; return '+234 ' + p.slice(1) + ' ' + rest.slice(0, 4) + ' ' + rest.slice(4); }
  function address() { return DEMO_STREETS[(n * 11) % DEMO_STREETS.length] + ', Sokoto'; }
  function add(username, role, designation, section, sectionScope, age, male, armIds) {
    var m = male === undefined ? true : male;
    var nm = { first: firstName(m), last: lastName() };
    n++;
    people.push({
      username: username, role: role, designation: designation, section: section, sectionScope: sectionScope,
      age: age, male: m, firstName: nm.first, middleName: '', lastName: nm.last,
      phone: phone(), address: address(), email: demoEmail_(nm.first, nm.last, n), armIds: armIds || []
    });
  }
  add('demo.admin', 'ADMIN', 'Administrator', '', '', 47, true);
  add('demo.principal', 'PRINCIPAL', 'Principal', 'SECONDARY', 'SECONDARY', 46, true);
  add('demo.headmaster', 'HEADMASTER', 'Headmaster', 'PRIMARY', 'PRIMARY,KG', 43, true);
  add('demo.bursar', 'BURSAR', 'Bursar', '', '', 40, true);
  add('demo.account', 'ACCOUNT_OFFICER', 'Account Officer', '', '', 34, false);
  var bySec = armIdsBySectionAll_();
  ['KG', 'PRIMARY', 'SECONDARY'].forEach(function (sec) {
    var arms = bySec[sec] || [];
    add('demo.t.' + sec.toLowerCase() + '.hod', 'TEACHER', 'Head of Department', sec, sec, 39, false, arms.slice());
    for (var k = 1; k <= arms.length; k++) add('demo.t.' + sec.toLowerCase() + '.' + k, 'TEACHER', 'Class Teacher', sec, sec, 26 + (k % 7), k % 2 === 0, arms[k - 1] ? [arms[k - 1]] : []);
  });
  return people;
}
/** Non-teaching support staff — Staff records only (no portal login; no matching role). */
function demoSupportStaff_() {
  var defs = [
    'Cleaner', 'Cleaner', 'Security Officer', 'Security Officer', 'Cook', 'Librarian',
    'Laboratory Attendant', 'Driver', 'Receptionist', 'Storekeeper', 'School Nurse',
    'ICT Support Officer', 'Examinations Officer', 'Guidance Counsellor', 'Administrative Secretary'
  ];
  var out = [];
  defs.forEach(function (designation, i) {
    var male = i % 2 === 0;
    var firstList = male ? DEMO_FIRST_MALE : DEMO_FIRST_FEMALE;
    var first = firstList[(i * 5 + 2) % firstList.length];
    var last = DEMO_LAST_NAMES[(i * 3 + 4) % DEMO_LAST_NAMES.length];
    var p = DEMO_PHONE_PREFIXES[(i * 3 + 1) % DEMO_PHONE_PREFIXES.length];
    var rest = String(5000000 + ((i * 17) % 4999999)); while (rest.length < 7) rest = '0' + rest;
    out.push({
      firstName: first, middleName: '', lastName: last, male: male, age: 24 + (i % 16),
      designation: designation, section: '',
      phone: '+234 ' + p.slice(1) + ' ' + rest.slice(0, 4) + ' ' + rest.slice(4),
      address: DEMO_STREETS[(i * 7) % DEMO_STREETS.length] + ', Sokoto',
      email: demoEmail_(first, last, 100 + i), dateJoined: demoJoined_(i + 3)
    });
  });
  return out;
}
function ensureDemoLogin_(p) {
  if (findWhere_('Users', function (u) { return String(u.username).toLowerCase() === p.username.toLowerCase(); })) return false;
  var salt = makeSalt_();
  appendRow_('Users', {
    id: uuid_(), username: p.username, passwordHash: hashPassword_(DEMO_PASSWORD, salt), salt: salt,
    role: p.role, fullName: ([p.firstName, p.middleName, p.lastName].join(' ')).trim(), email: p.email || '',
    sectionScope: p.sectionScope, classArmScope: p.armIds.join(','), active: true, createdAt: nowIso_()
  });
  return true;
}
function createDemoUsers() {
  var created = [];
  demoPeople_().forEach(function (p) { if (ensureDemoLogin_(p)) created.push(p.username); });
  var msg = 'Demo users ready (' + created.length + ' new). Shared password: ' + DEMO_PASSWORD;
  Logger.log(msg);
  return { created: created, message: msg };
}
function createDemoStaff() {
  var teaching = demoPeople_();
  var support = demoSupportStaff_();
  var existing = readTable_('Staff');
  var rows = [], newLogins = 0;
  function isDup(p) { return existing.some(function (s) { return String(s.lastName).toLowerCase() === String(p.lastName).toLowerCase() && String(s.firstName).toLowerCase() === String(p.firstName).toLowerCase(); }); }
  function staffRow(p, dateJoined) {
    return {
      id: uuid_(), staffNo: '', firstName: p.firstName, middleName: p.middleName, lastName: p.lastName,
      gender: p.male ? 'Male' : 'Female', dateOfBirth: demoDob_(p.age), email: p.email || '', phone: p.phone,
      address: p.address, designation: p.designation, section: p.section, dateJoined: dateJoined, status: 'ACTIVE',
      photoFileId: '', createdAt: nowIso_(), updatedAt: nowIso_()
    };
  }
  teaching.forEach(function (p) {
    if (isDup(p)) return;
    if (ensureDemoLogin_(p)) newLogins++;
    rows.push(staffRow(p, demoJoined_(p.age % 8)));
  });
  support.forEach(function (p) {
    if (isDup(p)) return;
    rows.push(staffRow(p, p.dateJoined));
  });
  var prefix = 'KMS/STF/', max = 0;
  existing.forEach(function (s) { var v = String(s.staffNo || ''); if (v.indexOf(prefix) === 0) { var nn = parseInt(v.slice(prefix.length), 10); if (!isNaN(nn) && nn > max) max = nn; } });
  rows.forEach(function (r) { max++; r.staffNo = prefix + demoPad_(max, 4); });
  bulkAppend_('Staff', rows);
  var msg = 'Demo staff ready: ' + rows.length + ' new record(s), ' + newLogins + ' new login(s).';
  Logger.log(msg);
  return { created: rows.length, message: msg };
}
function createDemoStudents() {
  var students = readTable_('Students');
  var existingByArm = {};
  students.forEach(function (s) { existingByArm[s.classArmId] = (existingByArm[s.classArmId] || 0) + 1; });
  var prefix = 'KMS/' + new Date().getFullYear() + '/', max = 0;
  students.forEach(function (s) { var v = String(s.admissionNo || ''); if (v.indexOf(prefix) === 0) { var nn = parseInt(v.slice(prefix.length), 10); if (!isNaN(nn) && nn > max) max = nn; } });
  var levelsById = indexById_(readTable_('ClassLevels'));
  var arms = readTable_('ClassArms').filter(function (a) { return toBool_(a.active); });
  var seq = max, rows = [], now = nowIso_();
  arms.forEach(function (arm) {
    var need = DEMO_STUDENTS_PER_CLASS - (existingByArm[arm.id] || 0);
    if (need <= 0) return;
    var level = levelsById[arm.classLevelId] || {};
    for (var i = 0; i < need; i++) {
      seq++;
      var male = Math.random() < 0.5;
      var first = demoPick_(male ? DEMO_FIRST_MALE : DEMO_FIRST_FEMALE);
      var last = demoPick_(DEMO_LAST_NAMES);
      var no = String(seq); while (no.length < 4) no = '0' + no;
      rows.push({
        id: uuid_(), admissionNo: prefix + no, firstName: first, middleName: demoPick_(DEMO_FIRST_FEMALE), lastName: last,
        gender: male ? 'Male' : 'Female', dateOfBirth: demoDob_(demoAgeFor_(level)), classArmId: arm.id,
        guardianName: demoPick_([].concat(DEMO_FIRST_MALE, DEMO_FIRST_FEMALE)) + ' ' + last,
        guardianPhone: demoPhone_(), address: demoPick_(DEMO_STREETS) + ', Sokoto', status: 'ACTIVE', photoFileId: '',
        createdAt: now, updatedAt: now
      });
    }
  });
  bulkAppend_('Students', rows);
  var msg = 'Demo students added: ' + rows.length + ' (target ' + DEMO_STUDENTS_PER_CLASS + ' per class).';
  Logger.log(msg);
  return { created: rows.length, message: msg };
}
function createDemoData() {
  var users = createDemoUsers();
  var staff = createDemoStaff();
  var students = createDemoStudents();
  var parents = createDemoParents();
  var staffAtt = createDemoStaffAttendance_();
  var attendance = createDemoAttendance_();
  var scores = createDemoScores_();
  var payments = createDemoFinance_();
  var timetable = createDemoTimetable_();
  var announcements = createDemoAnnouncements_();
  var applications = createDemoApplications_();
  createDemoSettings_();
  var msg = 'Demo data ready (password ' + DEMO_PASSWORD + '):' +
    '\n  Logins: ' + users.created.length + ' new' +
    '\n  Staff: ' + staff.created + ' new' +
    '\n  Students: ' + students.created + ' new' +
    '\n  Parents: ' + parents.created.length + ' new' +
    '\n  Staff attendance rows: ' + staffAtt +
    '\n  Student attendance rows: ' + attendance +
    '\n  Score rows: ' + scores +
    '\n  Payment rows: ' + payments +
    '\n  Timetable entries: ' + timetable +
    '\n  Announcements: ' + announcements +
    '\n  Applications: ' + applications;
  Logger.log(msg);
  return {
    logins: users.created, staff: staff.created, students: students.created, parents: parents.created,
    attendance: attendance, staffAttendance: staffAtt, scores: scores, payments: payments,
    timetable: timetable, announcements: announcements, applications: applications, message: msg
  };
}

/** Parent logins (demo.parent1..10) linked to 1-3 wards sharing the same surname. */
function createDemoParents() {
  var created = [];
  var students = readTable_('Students');
  if (!students.length) return { created: created, message: 'No students to link demo parents to.' };
  var target = Math.min(10, students.length);
  var relationships = ['Father', 'Mother', 'Guardian'];
  /* one parent per distinct surname so every parent's email surfaces as a guardian contact */
  var anchors = [], usedLast = {};
  for (var ai = 0; ai < students.length && anchors.length < target; ai++) {
    var ln = String(students[ai].lastName || '');
    if (!ln || usedLast[ln]) continue;
    usedLast[ln] = true; anchors.push(students[ai]);
  }
  while (anchors.length < target) anchors.push(students[anchors.length % students.length]);
  for (var i = 0; i < target; i++) {
    var username = 'demo.parent' + (i + 1);
    if (findWhere_('Users', function (u) { return String(u.username).toLowerCase() === username.toLowerCase(); })) continue;
    var anchor = anchors[i];
    var last = anchor.lastName;
    var siblings = students.filter(function (s) { return String(s.lastName) === String(last); }).slice(0, 3);
    if (!siblings.length) siblings = [anchor];
    var first = DEMO_FIRST_MALE[(i * 5 + 1) % DEMO_FIRST_MALE.length];
    var salt = makeSalt_();
    var user = {
      id: uuid_(), username: username, passwordHash: hashPassword_(DEMO_PASSWORD, salt), salt: salt, role: 'PARENT',
      fullName: first + ' ' + last, email: demoEmail_(first, last, 200 + i), sectionScope: '', classArmScope: '', active: true, createdAt: nowIso_()
    };
    appendRow_('Users', user);
    siblings.forEach(function (s, k) {
      appendRow_('ParentStudents', { id: uuid_(), parentUserId: user.id, studentId: s.id, relationship: relationships[(i + k) % relationships.length], createdAt: nowIso_() });
    });
    created.push(username);
  }
  var msg = 'Demo parents ready (' + created.length + ' new). Shared password: ' + DEMO_PASSWORD;
  Logger.log(msg);
  return { created: created, message: msg };
}

/** Seeded StaffAttendance for the last 5 school days (skips if any rows exist). */
function createDemoStaffAttendance_() {
  if (readTableSafe_('StaffAttendance').length > 0) return 0;
  var staff = readTable_('Staff');
  if (!staff.length) return 0;
  var adminId = demoAdminId_();
  var days = demoRecentSchoolDays_(5), rows = [], now = nowIso_();
  days.forEach(function (date) {
    staff.forEach(function (st) {
      var r = Math.random();
      var status = r < 0.93 ? 'PRESENT' : r < 0.97 ? 'LATE' : r < 0.99 ? 'ABSENT' : 'EXCUSED';
      rows.push({ id: uuid_(), date: date, staffId: st.id, status: status, note: '', recordedBy: adminId, createdAt: now });
    });
  });
  bulkAppend_('StaffAttendance', rows);
  Logger.log('Demo staff attendance added: ' + rows.length + ' rows.');
  return rows.length;
}

/** Seeded student Attendance for the last 5 school days (skips if any rows exist). */
function createDemoAttendance_() {
  if (readTableSafe_('Attendance').length > 0) return 0;
  var students = readTable_('Students');
  if (!students.length) return 0;
  var teachers = demoTeacherByArm_();
  var byArm = {};
  students.forEach(function (s) { (byArm[s.classArmId] = byArm[s.classArmId] || []).push(s); });
  var days = demoRecentSchoolDays_(5), rows = [], now = nowIso_();
  days.forEach(function (date) {
    Object.keys(byArm).forEach(function (armId) {
      var recorder = teachers[armId] || teachers._admin || '';
      byArm[armId].forEach(function (s) {
        var r = Math.random();
        var status = r < 0.90 ? 'PRESENT' : r < 0.95 ? 'LATE' : r < 0.985 ? 'ABSENT' : 'EXCUSED';
        rows.push({ id: uuid_(), date: date, classArmId: armId, studentId: s.id, status: status, note: '', recordedBy: recorder, createdAt: now });
      });
    });
  });
  bulkAppend_('Attendance', rows);
  Logger.log('Demo attendance added: ' + rows.length + ' rows.');
  return rows.length;
}

/** Seeded Scores + auto-generated ResultSheets for the current term (skips if any scores exist). */
function createDemoScores_() {
  if (readTableSafe_('Scores').length > 0) return 0;
  var term = getCurrentTerm_();
  if (!term) return 0;
  var arms = readTable_('ClassArms').filter(function (a) { return toBool_(a.active); });
  var students = readTable_('Students');
  var byArm = {};
  students.forEach(function (s) { (byArm[s.classArmId] = byArm[s.classArmId] || []).push(s); });
  var teachers = demoTeacherByArm_();
  var scaleBySection = {};
  CFG.SECTIONS.forEach(function (sec) { scaleBySection[sec] = getGradeScale_(sec); });
  function gradeFor(section, total) {
    var scale = scaleBySection[section] || [];
    for (var i = 0; i < scale.length; i++) if (total >= Number(scale[i].minScore) && total <= Number(scale[i].maxScore)) return scale[i];
    return { grade: '', remark: '' };
  }
  var rows = [], now = nowIso_();
  arms.forEach(function (arm) {
    var section = studentSection_(arm.id);
    var subjects = getSubjectsForArm_(arm.id);
    var list = byArm[arm.id] || [];
    var recorder = teachers[arm.id] || teachers._admin || '';
    list.forEach(function (s) {
      var ability = 0.5 + Math.random() * 0.45;
      subjects.forEach(function (sub) {
        var ca1 = Math.max(0, Math.min(10, Math.round(ability * 10 + (Math.random() * 4 - 2))));
        var ca2 = Math.max(0, Math.min(10, Math.round(ability * 10 + (Math.random() * 4 - 2))));
        var ca3 = Math.max(0, Math.min(10, Math.round(ability * 10 + (Math.random() * 4 - 2))));
        var exam = Math.max(0, Math.min(70, Math.round(ability * 70 + (Math.random() * 20 - 10))));
        var total = ca1 + ca2 + ca3 + exam;
        var g = gradeFor(section, total);
        rows.push({
          id: uuid_(), termId: term.id, classArmId: arm.id, studentId: s.id, subjectId: sub.id,
          ca1: ca1, ca2: ca2, ca3: ca3, exam: exam, total: total, grade: g.grade, remark: g.remark,
          recordedBy: recorder, updatedAt: now
        });
      });
    });
  });
  bulkAppend_('Scores', rows);
  var rsRows = [];
  arms.forEach(function (arm) {
    var computed = computeClassResults_(arm.id, term.id);
    Object.keys(computed).forEach(function (sid) {
      var c = computed[sid];
      rsRows.push({
        id: uuid_(), termId: term.id, studentId: sid, position: c.position, totalScore: c.totalScore,
        average: c.average, teacherRemark: demoRemarkFor_(c.average), principalRemark: '', status: 'DRAFT', updatedAt: now
      });
    });
  });
  bulkAppend_('ResultSheets', rsRows);
  Logger.log('Demo scores added: ' + rows.length + ' score rows, ' + rsRows.length + ' result sheets.');
  return rows.length;
}

/** Seeded FeeSelections, FeePlans and Payments for ~150 students (skips if any payments exist). */
function createDemoFinance_() {
  if (readTableSafe_('Payments').length > 0) return 0;
  var term = getCurrentTerm_();
  var students = readTable_('Students');
  if (!term || !students.length) return 0;
  var adminId = demoAdminId_();
  var parentByStudent = {};
  readTableSafe_('ParentStudents').forEach(function (ps) { if (!parentByStudent[ps.studentId]) parentByStudent[ps.studentId] = ps.parentUserId; });
  var levelById = indexById_(readTable_('ClassLevels'));
  var armById = indexById_(readTable_('ClassArms'));
  var feesByLevel = {};
  Object.keys(levelById).forEach(function (lid) { feesByLevel[lid] = applicableFeesForLevel_(levelById[lid], term); });
  function feesForStudent(s) { var arm = armById[s.classArmId]; return arm ? (feesByLevel[arm.classLevelId] || []) : []; }
  var year = new Date().getFullYear();
  var receiptPrefix = 'KMS/RCP/' + year + '/', maxRcp = 0;
  readTableSafe_('Payments').forEach(function (p) { var v = String(p.receiptNo || ''); if (v.indexOf(receiptPrefix) === 0) { var n = parseInt(v.slice(receiptPrefix.length), 10); if (!isNaN(n) && n > maxRcp) maxRcp = n; } });
  var methods = ['Bank transfer', 'Cash', 'POS', 'Bank deposit', 'Cheque'];
  var selRows = [], planRows = [], payRows = [], seen = {};
  var target = Math.min(150, students.length);
  for (var i = 0; i < target; i++) {
    var s = students[(i * 11) % students.length];
    if (seen[s.id]) continue;
    seen[s.id] = true;
    var fees = feesForStudent(s);
    if (!fees.length) continue;
    var parentId = parentByStudent[s.id] || '';
    var items = fees.map(function (f) {
      var mandatory = toBool_(f.mandatory);
      var selected = mandatory || Math.random() < 0.5;
      return { fee: f, selected: selected, mandatory: mandatory };
    });
    items.forEach(function (it) {
      selRows.push({
        id: uuid_(), studentId: s.id, parentUserId: parentId, termId: term.id, feeId: it.fee.id,
        category: String(it.fee.category || 'FEES'), name: String(it.fee.name || ''), amount: round2_(numOrZero_(it.fee.amount)),
        mandatory: it.mandatory, selected: it.selected, createdAt: nowIso_(), updatedAt: nowIso_()
      });
    });
    var total = 0;
    items.forEach(function (it) { if (it.selected) total += numOrZero_(it.fee.amount); });
    total = round2_(total);
    if (total <= 0) continue;
    var installments = 1 + Math.floor(Math.random() * 3);
    var planId = uuid_();
    planRows.push({ id: planId, studentId: s.id, parentUserId: parentId, termId: term.id, installments: installments, createdAt: nowIso_(), updatedAt: nowIso_() });
    var itemNames = items.filter(function (it) { return it.selected; }).map(function (it) { return it.fee.name; }).join(', ');
    var paidInstallments = Math.floor(Math.random() * (installments + 1));
    var per = round2_(total / installments);
    var paid = 0;
    for (var k = 1; k <= paidInstallments; k++) {
      var amt = (k === installments) ? round2_(total - paid) : per;
      if (amt <= 0) break;
      paid = round2_(paid + amt);
      maxRcp++;
      var status = (k === 1 || Math.random() < 0.6) ? 'VERIFIED' : 'PENDING';
      payRows.push({
        id: uuid_(), studentId: s.id, parentUserId: parentId, termId: term.id, category: 'FEES', amount: amt,
        method: demoPick_(methods), reference: 'KMS-REF-' + (100000 + maxRcp), note: '', status: status,
        evidenceFileId: '', evidenceUrl: '', verifiedBy: status === 'VERIFIED' ? adminId : '', verifiedAt: status === 'VERIFIED' ? nowIso_() : '',
        createdAt: demoIsoDate_(new Date(Date.now() - (paidInstallments - k + 1) * 9 * 86400000)), updatedAt: nowIso_(),
        feePlanId: planId, installmentNo: k, amountPaid: amt, balanceAfter: round2_(Math.max(0, total - paid)),
        receiptNo: receiptPrefix + demoPad_(maxRcp, 4), viewfile: '', items: itemNames
      });
    }
  }
  bulkAppend_('FeeSelections', selRows);
  bulkAppend_('FeePlans', planRows);
  bulkAppend_('Payments', payRows);
  Logger.log('Demo finance added: ' + selRows.length + ' selections, ' + planRows.length + ' plans, ' + payRows.length + ' payments.');
  return payRows.length;
}

/** Weekly class timetable for every arm for the current term (skips if any entries exist). */
function createDemoTimetable_() {
  if (readTableSafe_('Timetable').length > 0) return 0;
  var term = getCurrentTerm_();
  if (!term) return 0;
  var arms = readTable_('ClassArms').filter(function (a) { return toBool_(a.active); });
  var days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
  var periods = [['08:00', '08:45'], ['08:45', '09:30'], ['09:30', '10:15'], ['10:45', '11:30'], ['11:30', '12:15']];
  var adminId = demoAdminId_();
  var teacherByArm = {};
  readTable_('Users').forEach(function (u) {
    if (u.role !== 'TEACHER') return;
    parseCsv_(u.classArmScope).forEach(function (a) { if (!teacherByArm[a]) teacherByArm[a] = u.fullName; });
  });
  var rows = [], now = nowIso_();
  arms.forEach(function (arm) {
    var subjects = getSubjectsForArm_(arm.id);
    var teacherName = teacherByArm[arm.id] || 'Class Teacher';
    days.forEach(function (day, di) {
      periods.forEach(function (p, pi) {
        var sub = subjects.length ? subjects[(pi + di) % subjects.length] : null;
        rows.push({
          id: uuid_(), termId: term.id, classArmId: arm.id, dayOfWeek: day, startTime: p[0], endTime: p[1],
          subjectId: sub ? sub.id : '', title: sub ? sub.name : 'Period', teacher: teacherName, room: '',
          kind: 'CLASS', note: '', createdBy: adminId, createdAt: now, updatedAt: now
        });
      });
    });
  });
  bulkAppend_('Timetable', rows);
  Logger.log('Demo timetable added: ' + rows.length + ' rows.');
  return rows.length;
}

/** A few published announcements (skips if any exist). */
function createDemoAnnouncements_() {
  if (readTableSafe_('Announcements').length > 0) return 0;
  var adminId = demoAdminId_();
  var defs = [
    { title: 'Welcome to the new academic session', body: 'We welcome all pupils and parents back to Kings Metro School. Please settle outstanding fees and ensure your wards resume on time.', audience: 'ALL', category: 'News' },
    { title: 'Parents–Teachers meeting', body: 'The first Parents–Teachers meeting of the term holds on the last Saturday of the month at 9:00am. Attendance is important.', audience: 'PARENTS', category: 'Event' },
    { title: 'Staff briefing — Friday 2:00pm', body: 'All teaching and non-teaching staff are required to attend the briefing in the assembly hall.', audience: 'STAFF', category: 'Notice' },
    { title: 'Mid-term break', body: 'The school will close for the mid-term break and reopen on the announced resumption date.', audience: 'WEBSITE', category: 'Holiday' },
    { title: 'Admissions still open', body: 'Admission forms for the new session are still available. Kindly visit the school office to obtain a form.', audience: 'WEBSITE', category: 'News' }
  ];
  var rows = defs.map(function (d) {
    return { id: uuid_(), title: d.title, body: d.body, audience: d.audience, createdBy: adminId, createdAt: nowIso_(), active: true, category: d.category, link: d.link || '' };
  });
  bulkAppend_('Announcements', rows);
  Logger.log('Demo announcements added: ' + rows.length + '.');
  return rows.length;
}

/** A handful of admission applications in each status (skips if any exist). */
function createDemoApplications_() {
  if (readTableSafe_('Applications').length > 0) return 0;
  var levels = readTable_('ClassLevels').filter(function (l) { return toBool_(l.active); });
  var adminId = demoAdminId_();
  var statuses = ['PENDING', 'REVIEWED', 'OFFERED', 'ADMITTED', 'REJECTED'];
  var prefix = 'KMS/APP/', seq = 0, now = nowIso_(), rows = [];
  readTableSafe_('Applications').forEach(function (a) { var v = String(a.ref || ''); if (v.indexOf(prefix) === 0) { var n = parseInt(v.slice(prefix.length), 10); if (!isNaN(n) && n > seq) seq = n; } });
  statuses.forEach(function (status, i) {
    var male = i % 2 === 0;
    var firstList = male ? DEMO_FIRST_MALE : DEMO_FIRST_FEMALE;
    var first = firstList[(i * 5 + 6) % firstList.length];
    var last = DEMO_LAST_NAMES[(i * 3 + 2) % DEMO_LAST_NAMES.length];
    var level = levels.length ? levels[(i * 3) % levels.length] : {};
    seq++;
    rows.push({
      id: uuid_(), ref: prefix + demoPad_(seq, 4), childFirstName: first, childMiddleName: '', childLastName: last,
      gender: male ? 'Male' : 'Female', dateOfBirth: demoDob_(5 + (i % 12)), classLevelId: level.id || '',
      guardianName: DEMO_FIRST_MALE[(i * 4 + 2) % DEMO_FIRST_MALE.length] + ' ' + last, guardianPhone: demoPhone_(),
      guardianEmail: demoEmail_(first, last, 300 + i), address: DEMO_STREETS[(i * 4) % DEMO_STREETS.length] + ', Sokoto',
      previousSchool: '', notes: '', photoFileId: '', documentFileId: '', status: status,
      submittedAt: now, reviewedAt: status === 'PENDING' ? '' : now, reviewedBy: status === 'PENDING' ? '' : adminId, remarks: ''
    });
  });
  bulkAppend_('Applications', rows);
  Logger.log('Demo applications added: ' + rows.length + '.');
  return rows.length;
}

/** Seeds a sensible default admission-notification email if none is set. */
function createDemoSettings_() {
  if (!getSetting_('ADMISSION_NOTIFY_EMAILS', '')) setSetting_('ADMISSION_NOTIFY_EMAILS', OWNER_ADMIN_EMAIL);
  return true;
}

/* =========================== 6. REFERENCE HELPERS =========================== */

var TERM_LABELS = { FIRST: 'First Term', SECOND: 'Second Term', THIRD: 'Third Term' };
function termLabel_(term) { return term ? ((TERM_LABELS[term.termName] || term.termName) + ' · ' + term.sessionName) : ''; }
function getClassLevels_(includeInactive) {
  var levels = readTable_('ClassLevels');
  if (!includeInactive) levels = levels.filter(function (l) { return toBool_(l.active); });
  return levels.sort(function (a, b) {
    if (a.section !== b.section) return CFG.SECTIONS.indexOf(a.section) - CFG.SECTIONS.indexOf(b.section);
    return Number(a.orderIndex) - Number(b.orderIndex);
  });
}
function getClassArms_(user) {
  var levelsById = indexById_(readTable_('ClassLevels'));
  var list = readTable_('ClassArms').filter(function (a) { return toBool_(a.active); }).map(function (a) {
    var l = levelsById[a.classLevelId];
    return { id: a.id, name: a.name, classLevelId: a.classLevelId, classLevel: l ? { id: l.id, name: l.name, section: l.section } : null };
  });
  if (user) {
    if (user.role === 'PARENT') {
      // Parents are scoped strictly to the class arms of their linked wards.
      var wardIds = parentStudentIds_(user);
      var wardArm = {};
      if (wardIds.length) readTable_('Students').forEach(function (s) { if (wardIds.indexOf(String(s.id)) !== -1) wardArm[String(s.classArmId)] = true; });
      list = list.filter(function (a) { return wardArm[String(a.id)]; });
    } else {
      var sections = userSections_(user);
      if (sections.length) list = list.filter(function (a) { return a.classLevel && sections.indexOf(a.classLevel.section) !== -1; });
      var arms = userArmIds_(user);
      if (arms.length) list = list.filter(function (a) { return arms.indexOf(a.id) !== -1; });
    }
  }
  return list;
}
function getArmById_(id) { return findById_('ClassArms', id); }
function getSubjectsForArm_(armId) {
  var arm = getArmById_(armId); if (!arm) return [];
  var ids = readTable_('SubjectClass').filter(function (sc) { return String(sc.classLevelId) === String(arm.classLevelId); }).map(function (sc) { return sc.subjectId; });
  return readTable_('Subjects').filter(function (s) { return toBool_(s.active) && ids.indexOf(s.id) !== -1; }).sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
}
function getGradeScale_(section) {
  return readTable_('GradeScale').filter(function (g) { return String(g.section) === String(section); }).sort(function (a, b) { return Number(a.orderIndex) - Number(b.orderIndex); });
}
function gradeForScore_(section, score) {
  if (score === null || score === undefined || score === '') return { grade: '', remark: '' };
  var n = Number(score), scale = getGradeScale_(section);
  for (var i = 0; i < scale.length; i++) if (n >= Number(scale[i].minScore) && n <= Number(scale[i].maxScore)) return { grade: scale[i].grade, remark: scale[i].remark };
  return { grade: '', remark: '' };
}
function getTerms_() {
  return readTable_('Terms').filter(function (t) { return toBool_(t.active); }).sort(function (a, b) {
    if (a.sessionName !== b.sessionName) return String(b.sessionName).localeCompare(String(a.sessionName));
    return CFG.TERM_NAMES.indexOf(a.termName) - CFG.TERM_NAMES.indexOf(b.termName);
  });
}
function getCurrentTerm_() { var t = getTerms_(); for (var i = 0; i < t.length; i++) if (toBool_(t[i].isCurrent)) return t[i]; return t.length ? t[0] : null; }
function armsMap_(user) { var m = {}; getClassArms_(user).forEach(function (a) { m[a.id] = a; }); return m; }
function studentSection_(classArmId) { var arm = getArmById_(classArmId); if (!arm) return ''; var l = findById_('ClassLevels', arm.classLevelId); return l ? l.section : ''; }
function decorateStudent_(s, armsById) {
  if (!s) return null;
  var arm = armsById[s.classArmId];
  return {
    id: s.id, admissionNo: s.admissionNo, firstName: s.firstName, middleName: s.middleName, lastName: s.lastName,
    gender: s.gender, dateOfBirth: s.dateOfBirth, classArmId: s.classArmId,
    classArm: arm ? { id: arm.id, name: arm.name, classLevel: arm.classLevel } : null,
    guardianName: s.guardianName, guardianPhone: s.guardianPhone, address: s.address, status: s.status, photoFileId: s.photoFileId
  };
}
function assertArmAllowed_(user, armId) {
  var allowed = userArmIds_(user);
  if (allowed.length && allowed.indexOf(String(armId)) === -1) throw new Error('That class is outside your assigned classes.');
  var sections = userSections_(user);
  if (sections.length) {
    var arm = getArmById_(armId), l = arm ? findById_('ClassLevels', arm.classLevelId) : null;
    if (!l || sections.indexOf(l.section) === -1) throw new Error('That class is outside your section.');
  }
}

/* =========================== 7. PARENTS <-> WARDS =========================== */

function parentStudentIds_(user) {
  return readTable_('ParentStudents').filter(function (ps) { return String(ps.parentUserId) === String(user.id); }).map(function (ps) { return String(ps.studentId); });
}
function assertParentOf_(user, studentId) {
  if (parentStudentIds_(user).indexOf(String(studentId)) === -1) throw new Error('This ward is not linked to your account.');
}
function assertStudentAccess_(user, student) {
  if (user.role === 'PARENT') { assertParentOf_(user, student.id); return; }
  assertArmAllowed_(user, student.classArmId);
}
function api_myWards(token) {
  var user = requireUser_(token);
  if (user.role !== 'PARENT') return [];
  var arms = armsMap_(user);
  var ids = parentStudentIds_(user);
  return readTable_('Students').filter(function (s) { return ids.indexOf(String(s.id)) !== -1; }).map(function (s) { return decorateStudent_(s, arms); });
}

/* =========================== 8. STUDENTS =========================== */

function api_listStudents(token, opts) {
  opts = opts || {};
  var user = requireUser_(token);
  var armsById = armsMap_(user);
  var list = readTable_('Students').filter(function (s) { return armsById[s.classArmId]; });
  if (user.role === 'PARENT') { var wardIds = parentStudentIds_(user); list = list.filter(function (s) { return wardIds.indexOf(String(s.id)) !== -1; }); }
  if (opts.classArmId) list = list.filter(function (s) { return String(s.classArmId) === String(opts.classArmId); });
  var q = String(opts.search || '').trim().toLowerCase();
  if (q) list = list.filter(function (s) { return [s.firstName, s.middleName, s.lastName, s.admissionNo].join(' ').toLowerCase().indexOf(q) !== -1; });
  list.sort(function (a, b) { var an = String(a.lastName || '').toLowerCase(), bn = String(b.lastName || '').toLowerCase(); return an !== bn ? (an < bn ? -1 : 1) : (String(a.firstName) < String(b.firstName) ? -1 : 1); });
  return list.map(function (s) { return decorateStudent_(s, armsById); });
}
function api_getStudent(token, id) {
  var user = requireUser_(token);
  var s = findById_('Students', id);
  if (!s) throw new Error('Student not found.');
  assertStudentAccess_(user, s);
  return decorateStudent_(s, armsMap_(user));
}
function api_saveStudent(token, payload) {
  var user = requireUser_(token);
  assertRole_(user, CFG.ENTRY_ROLES, 'You do not have permission to edit students.');
  payload = payload || {};
  if (!payload.firstName || !payload.middleName || !payload.lastName) throw new Error('First, middle and last name are required.');
  if (!payload.gender) throw new Error('Gender is required.');
  if (!payload.dateOfBirth) throw new Error('Date of birth is required.');
  if (!payload.classArmId) throw new Error('Select a class for the student.');
  if (!payload.guardianName) throw new Error('Guardian name is required.');
  if (!payload.guardianPhone) throw new Error('Guardian phone is required.');
  if (!payload.address) throw new Error('Home address is required.');
  assertArmAllowed_(user, payload.classArmId);
  var fields = {
    firstName: String(payload.firstName).trim(), middleName: String(payload.middleName).trim(), lastName: String(payload.lastName).trim(),
    gender: payload.gender, dateOfBirth: payload.dateOfBirth, classArmId: payload.classArmId,
    guardianName: String(payload.guardianName).trim(), guardianPhone: String(payload.guardianPhone).trim(), address: String(payload.address).trim(), status: payload.status || 'ACTIVE'
  };
  var id = payload.id;
  if (id) {
    var existing = findById_('Students', id);
    if (!existing) throw new Error('Student not found.');
    assertArmAllowed_(user, existing.classArmId);
    if (!existing.photoFileId && !(payload.photo && payload.photo.dataUrl)) throw new Error('A passport photo is required.');
    if (payload.photo && payload.photo.dataUrl) fields.photoFileId = storeFile_(user, 'STUDENT', id, payload.photo).driveFileId;
    fields.updatedAt = nowIso_();
    updateRow_('Students', id, fields);
  } else {
    if (!(payload.photo && payload.photo.dataUrl)) throw new Error('A passport photo is required for a new student.');
    id = uuid_();
    fields.id = id; fields.admissionNo = nextAdmissionNo_(); fields.createdAt = nowIso_(); fields.updatedAt = fields.createdAt;
    fields.photoFileId = storeFile_(user, 'STUDENT', id, payload.photo).driveFileId;
    appendRow_('Students', fields);
  }
  return decorateStudent_(findById_('Students', id), armsMap_(user));
}
function api_deleteStudent(token, id) {
  var user = requireUser_(token);
  assertRole_(user, ['PRINCIPAL', 'HEADMASTER'], 'Only a principal or headmaster can remove a student.');
  var s = findById_('Students', id);
  if (!s) throw new Error('Student not found.');
  assertArmAllowed_(user, s.classArmId);
  deleteRow_('Students', id);
  return true;
}
function nextAdmissionNo_() {
  var prefix = 'KMS/' + new Date().getFullYear() + '/', max = 0;
  readTable_('Students').forEach(function (s) { var v = String(s.admissionNo || ''); if (v.indexOf(prefix) === 0) { var n = parseInt(v.slice(prefix.length), 10); if (!isNaN(n) && n > max) max = n; } });
  var next = String(max + 1); while (next.length < 4) next = '0' + next; return prefix + next;
}
function nextStaffNo_() {
  var prefix = 'KMS/STF/', max = 0;
  readTable_('Staff').forEach(function (s) { var v = String(s.staffNo || ''); if (v.indexOf(prefix) === 0) { var n = parseInt(v.slice(prefix.length), 10); if (!isNaN(n) && n > max) max = n; } });
  var next = String(max + 1); while (next.length < 4) next = '0' + next; return prefix + next;
}

/* =========================== 9. STAFF =========================== */

function api_listStaff(token, opts) {
  opts = opts || {};
  var user = requireUser_(token);
  assertRole_(user, ['ADMIN', 'PRINCIPAL', 'HEADMASTER'], 'You do not have access to staff records.');
  var list = readTable_('Staff');
  var sections = userSections_(user);
  if (sections.length) list = list.filter(function (s) { return sections.indexOf(s.section) !== -1 || !s.section; });
  var q = String(opts.search || '').trim().toLowerCase();
  if (q) list = list.filter(function (s) { return [s.firstName, s.middleName, s.lastName, s.staffNo, s.email].join(' ').toLowerCase().indexOf(q) !== -1; });
  list.sort(function (a, b) { return String(a.lastName || '').localeCompare(String(b.lastName || '')); });
  return list.map(stripRow_);
}
function api_saveStaff(token, payload) {
  var user = requireUser_(token);
  assertRole_(user, ['ADMIN', 'PRINCIPAL', 'HEADMASTER'], 'You do not have permission to edit staff.');
  payload = payload || {};
  if (!payload.firstName || !payload.lastName) throw new Error('First and last name are required.');
  var fields = {
    firstName: payload.firstName, middleName: payload.middleName || '', lastName: payload.lastName, gender: payload.gender || '',
    dateOfBirth: payload.dateOfBirth || '', email: payload.email || '', phone: payload.phone || '', address: payload.address || '',
    designation: payload.designation || '', section: payload.section || '', dateJoined: payload.dateJoined || '', status: payload.status || 'ACTIVE'
  };
  var id = payload.id;
  if (id) {
    if (!findById_('Staff', id)) throw new Error('Staff not found.');
    if (payload.photo && payload.photo.dataUrl) fields.photoFileId = storeFile_(user, 'STAFF', id, payload.photo).driveFileId;
    fields.updatedAt = nowIso_();
    updateRow_('Staff', id, fields);
  } else {
    id = uuid_();
    fields.id = id; fields.staffNo = nextStaffNo_(); fields.createdAt = nowIso_(); fields.updatedAt = fields.createdAt;
    if (payload.photo && payload.photo.dataUrl) fields.photoFileId = storeFile_(user, 'STAFF', id, payload.photo).driveFileId;
    appendRow_('Staff', fields);
  }
  return stripRow_(findById_('Staff', id));
}
function api_deleteStaff(token, id) {
  var user = requireUser_(token);
  assertRole_(user, ['ADMIN', 'PRINCIPAL', 'HEADMASTER'], 'You cannot delete staff.');
  deleteRow_('Staff', id); return true;
}

/* =========================== 10. ATTENDANCE =========================== */

function api_getRoster(token, classArmId, date) {
  var user = requireUser_(token);
  assertArmAllowed_(user, classArmId);
  var armsById = armsMap_(user);
  var students = readTable_('Students').filter(function (s) { return String(s.classArmId) === String(classArmId) && String(s.status) !== 'INACTIVE'; });
  students.sort(function (a, b) { return String(a.lastName).localeCompare(String(b.lastName)); });
  var existing = {};
  if (date) readTable_('Attendance').forEach(function (a) { if (String(a.classArmId) === String(classArmId) && String(a.date) === String(date)) existing[a.studentId] = a; });
  return {
    date: date || '', classArm: armsById[classArmId] || null,
    students: students.map(function (s) { var r = existing[s.id]; return { studentId: s.id, student: decorateStudent_(s, armsById), status: r ? r.status : 'PRESENT', note: r ? r.note : '' }; })
  };
}
function api_saveAttendance(token, classArmId, date, records) {
  var user = requireUser_(token);
  assertRole_(user, CFG.ENTRY_ROLES, 'You do not have permission to record attendance.');
  assertArmAllowed_(user, classArmId);
  if (!date) throw new Error('Select a date.');
  var existing = {};
  readTable_('Attendance').forEach(function (a) { if (String(a.classArmId) === String(classArmId) && String(a.date) === String(date)) existing[a.studentId] = a; });
  var saved = 0;
  (records || []).forEach(function (rec) {
    if (!rec.studentId) return;
    var status = CFG.ATTENDANCE_STATUSES.indexOf(rec.status) !== -1 ? rec.status : 'PRESENT';
    if (existing[rec.studentId]) updateRow_('Attendance', existing[rec.studentId].id, { status: status, note: rec.note || '' });
    else appendRow_('Attendance', { id: uuid_(), date: date, classArmId: classArmId, studentId: rec.studentId, status: status, note: rec.note || '', recordedBy: user.id, createdAt: nowIso_() });
    saved++;
  });
  return { saved: saved };
}
function api_attendanceSummary(token, classArmId, from, to) {
  var user = requireUser_(token);
  assertArmAllowed_(user, classArmId);
  var students = readTable_('Students').filter(function (s) { return String(s.classArmId) === String(classArmId); });
  var counts = {}; students.forEach(function (s) { counts[s.id] = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0, total: 0 }; });
  readTable_('Attendance').forEach(function (a) {
    if (String(a.classArmId) !== String(classArmId)) return;
    if (from && String(a.date) < String(from)) return;
    if (to && String(a.date) > String(to)) return;
    var b = counts[a.studentId]; if (!b) return;
    if (b[a.status] === undefined) b[a.status] = 0; b[a.status]++; b.total++;
  });
  var armsById = armsMap_(user);
  return students.map(function (s) { return { student: decorateStudent_(s, armsById), counts: counts[s.id] }; });
}

/* =========================== 11. RESULTS =========================== */

var CA_MAX = 10, EXAM_MAX = 70;
function clampScore_(v, max) { if (v === '' || v === null || v === undefined) return ''; var n = Number(v); if (isNaN(n)) return ''; if (n < 0) n = 0; if (n > max) n = max; return n; }
function totalFor_(s) { return (s.ca1 === '' ? 0 : Number(s.ca1)) + (s.ca2 === '' ? 0 : Number(s.ca2)) + (s.ca3 === '' ? 0 : Number(s.ca3)) + (s.exam === '' ? 0 : Number(s.exam)); }
function api_getScoreSheet(token, classArmId, termId, subjectId) {
  var user = requireUser_(token);
  assertArmAllowed_(user, classArmId);
  var armsById = armsMap_(user);
  var students = readTable_('Students').filter(function (s) { return String(s.classArmId) === String(classArmId) && String(s.status) !== 'INACTIVE'; });
  students.sort(function (a, b) { return String(a.lastName).localeCompare(String(b.lastName)); });
  var existing = {};
  readTable_('Scores').forEach(function (s) { if (String(s.termId) === String(termId) && String(s.subjectId) === String(subjectId)) existing[s.studentId] = s; });
  var subject = subjectId ? findById_('Subjects', subjectId) : null;
  return {
    subject: subject ? { id: subject.id, name: subject.name } : null, classArm: armsById[classArmId] || null,
    rows: students.map(function (s) { var r = existing[s.id]; return { studentId: s.id, student: decorateStudent_(s, armsById), ca1: r ? r.ca1 : '', ca2: r ? r.ca2 : '', ca3: r ? r.ca3 : '', exam: r ? r.exam : '', total: r ? r.total : '', grade: r ? r.grade : '' }; })
  };
}
function api_saveScores(token, termId, classArmId, subjectId, records) {
  var user = requireUser_(token);
  assertRole_(user, CFG.ENTRY_ROLES, 'You do not have permission to enter scores.');
  assertArmAllowed_(user, classArmId);
  if (!termId || !subjectId) throw new Error('Select a term and subject.');
  var section = studentSection_(classArmId), existing = {};
  readTable_('Scores').forEach(function (s) { if (String(s.termId) === String(termId) && String(s.subjectId) === String(subjectId)) existing[s.studentId] = s; });
  var saved = 0;
  (records || []).forEach(function (rec) {
    if (!rec.studentId) return;
    var ca1 = clampScore_(rec.ca1, CA_MAX), ca2 = clampScore_(rec.ca2, CA_MAX), ca3 = clampScore_(rec.ca3, CA_MAX), exam = clampScore_(rec.exam, EXAM_MAX);
    var total = totalFor_({ ca1: ca1, ca2: ca2, ca3: ca3, exam: exam });
    var g = gradeForScore_(section, total);
    var fields = { termId: termId, classArmId: classArmId, subjectId: subjectId, studentId: rec.studentId, ca1: ca1, ca2: ca2, ca3: ca3, exam: exam, total: total, grade: g.grade, remark: g.remark, recordedBy: user.id, updatedAt: nowIso_() };
    if (existing[rec.studentId]) updateRow_('Scores', existing[rec.studentId].id, fields);
    else { fields.id = uuid_(); appendRow_('Scores', fields); }
    saved++;
  });
  return { saved: saved, computed: refreshArmResults_(classArmId, termId).students };
}
function api_getStudentGrades(token, studentId, termId) {
  var user = requireUser_(token);
  if (user.role === 'PARENT') throw new Error('Grade entry is for staff only; parents use the report card.');
  var student = findById_('Students', studentId);
  if (!student) throw new Error('Student not found.');
  assertStudentAccess_(user, student);
  assertArmAllowed_(user, student.classArmId);
  var term = termId ? findById_('Terms', termId) : getCurrentTerm_();
  if (!term || !toBool_(term.active)) throw new Error('No term is available.');
  var section = studentSection_(student.classArmId);
  var existing = {};
  readTable_('Scores').forEach(function (s) { if (String(s.studentId) === String(studentId) && String(s.termId) === String(term.id)) existing[s.subjectId] = s; });
  var subjects = getSubjectsForArm_(student.classArmId);
  var rows = subjects.map(function (s) {
    var r = existing[s.id];
    return { subjectId: s.id, subjectName: s.name, ca1: r ? r.ca1 : '', ca2: r ? r.ca2 : '', ca3: r ? r.ca3 : '', exam: r ? r.exam : '', total: r ? r.total : '', grade: r ? r.grade : '' };
  });
  var computed = computeClassResults_(student.classArmId, term.id)[studentId] || { totalScore: 0, average: 0, position: '', subjectCount: 0 };
  var sheet = findWhere_('ResultSheets', function (r) { return String(r.termId) === String(term.id) && String(r.studentId) === String(studentId); });
  var entered = rows.filter(function (r) { return r.total !== ''; }).length;
  return {
    student: decorateStudent_(student, armsMap_(user)),
    term: { id: term.id, termName: term.termName, sessionName: term.sessionName, label: termLabel_(term) },
    subjects: rows, gradeScale: getGradeScale_(section),
    computed: computed, averageGrade: gradeForScore_(section, computed.average).grade,
    enteredCount: entered, subjectCount: subjects.length, complete: entered >= subjects.length && subjects.length > 0,
    sheet: sheet ? { status: sheet.status, teacherRemark: sheet.teacherRemark, principalRemark: sheet.principalRemark, position: sheet.position, totalScore: sheet.totalScore, average: sheet.average } : { status: 'DRAFT', teacherRemark: '', principalRemark: '', position: '', totalScore: 0, average: 0 }
  };
}
function api_saveStudentGrades(token, studentId, termId, records) {
  var user = requireUser_(token);
  assertRole_(user, CFG.ENTRY_ROLES, 'You do not have permission to enter scores.');
  var student = findById_('Students', studentId);
  if (!student) throw new Error('Student not found.');
  assertStudentAccess_(user, student);
  assertArmAllowed_(user, student.classArmId);
  var term = findById_('Terms', termId);
  if (!term || !toBool_(term.active)) throw new Error('Select a valid term.');
  var allowed = {}; getSubjectsForArm_(student.classArmId).forEach(function (s) { allowed[String(s.id)] = true; });
  var existing = {};
  readTable_('Scores').forEach(function (s) { if (String(s.studentId) === String(studentId) && String(s.termId) === String(termId)) existing[s.subjectId] = s; });
  var section = studentSection_(student.classArmId), saved = 0;
  (records || []).forEach(function (rec) {
    if (!rec.subjectId || !allowed[String(rec.subjectId)]) throw new Error('A selected subject is not part of this student\u2019s curriculum.');
    var ca1 = clampScore_(rec.ca1, CA_MAX), ca2 = clampScore_(rec.ca2, CA_MAX), ca3 = clampScore_(rec.ca3, CA_MAX), exam = clampScore_(rec.exam, EXAM_MAX);
    var total = totalFor_({ ca1: ca1, ca2: ca2, ca3: ca3, exam: exam });
    var g = gradeForScore_(section, total);
    var fields = { termId: termId, classArmId: student.classArmId, subjectId: rec.subjectId, studentId: studentId, ca1: ca1, ca2: ca2, ca3: ca3, exam: exam, total: total, grade: g.grade, remark: g.remark, recordedBy: user.id, updatedAt: nowIso_() };
    if (existing[rec.subjectId]) updateRow_('Scores', existing[rec.subjectId].id, fields);
    else { fields.id = uuid_(); appendRow_('Scores', fields); }
    saved++;
  });
  refreshArmResults_(student.classArmId, termId);
  logAudit_(user, 'SCORES', 'Per-student grades term ' + termId, 'student ' + studentId);
  return api_getStudentGrades(token, studentId, termId);
}
function computeClassResults_(classArmId, termId) {
  var students = readTable_('Students').filter(function (s) { return String(s.classArmId) === String(classArmId) && String(s.status) !== 'INACTIVE'; });
  var agg = {}; students.forEach(function (s) { agg[s.id] = { total: 0, count: 0 }; });
  readTable_('Scores').forEach(function (s) {
    if (String(s.termId) !== String(termId) || String(s.classArmId) !== String(classArmId)) return;
    if (!agg[s.studentId] || s.total === '' || s.total === null || s.total === undefined) return;
    agg[s.studentId].total += Number(s.total); agg[s.studentId].count++;
  });
  var rows = students.map(function (s) { var a = agg[s.id]; return { studentId: s.id, totalScore: round2_(a.total), average: a.count ? round2_(a.total / a.count) : 0, subjectCount: a.count }; });
  var sorted = rows.slice().sort(function (x, y) { return y.totalScore - x.totalScore; });
  var rank = 0, last = null, seen = 0, posById = {};
  sorted.forEach(function (r) { seen++; if (last === null || r.totalScore !== last) { rank = seen; last = r.totalScore; } posById[r.studentId] = r.subjectCount > 0 ? rank : ''; });
  var byId = {}; rows.forEach(function (r) { byId[r.studentId] = { totalScore: r.totalScore, average: r.average, subjectCount: r.subjectCount, position: posById[r.studentId] }; });
  return byId;
}
function refreshArmResults_(classArmId, termId) {
  var computed = computeClassResults_(classArmId, termId), existing = {};
  readTable_('ResultSheets').forEach(function (r) { if (String(r.termId) === String(termId)) existing[r.studentId] = r; });
  Object.keys(computed).forEach(function (sid) {
    var c = computed[sid];
    var fields = { termId: termId, studentId: sid, position: c.position, totalScore: c.totalScore, average: c.average, subjectCount: c.subjectCount, updatedAt: nowIso_() };
    if (existing[sid]) updateRow_('ResultSheets', existing[sid].id, fields);
    else { fields.id = uuid_(); fields.teacherRemark = ''; fields.principalRemark = ''; fields.status = 'DRAFT'; appendRow_('ResultSheets', fields); }
  });
  return { students: Object.keys(computed).length };
}
function api_computeResults(token, classArmId, termId) {
  var user = requireUser_(token);
  assertRole_(user, CFG.ENTRY_ROLES, 'You do not have permission to compute results.');
  assertArmAllowed_(user, classArmId);
  return refreshArmResults_(classArmId, termId);
}
function api_listResultSheets(token, classArmId, termId) {
  var user = requireUser_(token);
  assertArmAllowed_(user, classArmId);
  var armsById = armsMap_(user), computed = computeClassResults_(classArmId, termId), sheets = {};
  readTable_('ResultSheets').forEach(function (r) { if (String(r.termId) === String(termId)) sheets[r.studentId] = r; });
  var students = readTable_('Students').filter(function (s) { return String(s.classArmId) === String(classArmId); });
  return students.map(function (s) {
    var c = computed[s.id] || { totalScore: 0, average: 0, position: '' }, sheet = sheets[s.id];
    return { student: decorateStudent_(s, armsById), totalScore: c.totalScore, average: c.average, position: c.position, status: sheet ? sheet.status : '', sheetId: sheet ? sheet.id : '' };
  });
}
function api_getReportCard(token, studentId, termId) {
  var user = requireUser_(token);
  var student = findById_('Students', studentId);
  if (!student) throw new Error('Student not found.');
  assertStudentAccess_(user, student);
  var term = termId ? findById_('Terms', termId) : getCurrentTerm_();
  if (!term) throw new Error('No term is available.');
  var armsById = armsMap_(user);
  var scores = readTable_('Scores').filter(function (s) { return String(s.studentId) === String(studentId) && String(s.termId) === String(term.id); }).map(function (s) {
    var subject = findById_('Subjects', s.subjectId);
    return { id: s.id, subject: subject ? { id: subject.id, name: subject.name } : { id: s.subjectId, name: '—' }, ca1: s.ca1, ca2: s.ca2, ca3: s.ca3, exam: s.exam, total: s.total, grade: s.grade, remark: s.remark };
  });
  scores.sort(function (a, b) { return String(a.subject.name).localeCompare(String(b.subject.name)); });
  var computed = computeClassResults_(student.classArmId, term.id)[studentId] || { totalScore: 0, average: 0, position: '' };
  var sheet = findWhere_('ResultSheets', function (r) { return String(r.termId) === String(term.id) && String(r.studentId) === String(studentId); });
  var attendance = { present: 0, absent: 0, late: 0, excused: 0, total: 0 };
  var tFrom = term.startDate || '', tTo = term.endDate || '';
  readTable_('Attendance').forEach(function (a) {
    if (String(a.studentId) !== String(studentId)) return;
    if (tFrom && String(a.date) < String(tFrom)) return;
    if (tTo && String(a.date) > String(tTo)) return;
    if (attendance[a.status.toLowerCase()] === undefined) attendance[a.status.toLowerCase()] = 0;
    attendance[a.status.toLowerCase()]++; attendance.total++;
  });
  return {
    student: decorateStudent_(student, armsById),
    term: { id: term.id, termName: term.termName, sessionName: term.sessionName, label: termLabel_(term) },
    scores: scores, computed: computed, gradeScale: getGradeScale_(studentSection_(student.classArmId)), attendance: attendance,
    sheet: sheet ? { teacherRemark: sheet.teacherRemark, principalRemark: sheet.principalRemark, status: sheet.status } : { teacherRemark: '', principalRemark: '', status: 'DRAFT' }
  };
}
function api_saveRemarks(token, studentId, termId, remarks) {
  var user = requireUser_(token);
  assertRole_(user, CFG.ENTRY_ROLES, 'You do not have permission to save remarks.');
  var student = findById_('Students', studentId);
  if (!student) throw new Error('Student not found.');
  assertArmAllowed_(user, student.classArmId);
  var sheet = findWhere_('ResultSheets', function (r) { return String(r.termId) === String(termId) && String(r.studentId) === String(studentId); });
  var fields = { updatedAt: nowIso_() };
  if (remarks && Object.prototype.hasOwnProperty.call(remarks, 'teacherRemark')) fields.teacherRemark = remarks.teacherRemark || '';
  if (remarks && Object.prototype.hasOwnProperty.call(remarks, 'principalRemark')) fields.principalRemark = remarks.principalRemark || '';
  if (sheet) updateRow_('ResultSheets', sheet.id, fields);
  else { fields.id = uuid_(); fields.termId = termId; fields.studentId = studentId; fields.position = ''; fields.totalScore = 0; fields.average = 0; fields.status = 'DRAFT'; appendRow_('ResultSheets', fields); }
  return true;
}
function api_publishResults(token, classArmId, termId, publish) {
  var user = requireUser_(token);
  assertRole_(user, ['ADMIN', 'PRINCIPAL', 'HEADMASTER'], 'Only leadership can publish results.');
  assertArmAllowed_(user, classArmId);
  var status = publish ? 'PUBLISHED' : 'DRAFT', count = 0;
  readTable_('ResultSheets').forEach(function (r) {
    var student = findById_('Students', r.studentId);
    if (student && String(student.classArmId) === String(classArmId) && String(r.termId) === String(termId)) { updateRow_('ResultSheets', r.id, { status: status, updatedAt: nowIso_() }); count++; }
  });
  return { updated: count, status: status };
}

/* =========================== 12. ANNOUNCEMENTS =========================== */

var ANNOUNCE_AUDIENCES = ['ALL', 'WEBSITE', 'KG', 'PRIMARY', 'SECONDARY', 'STAFF', 'PARENTS'];
function announcementVisible_(user, item) {
  var a = item.audience || 'ALL';
  if (a === 'ALL' || a === 'WEBSITE') return true;
  if (a === 'STAFF') return user.role !== 'PARENT';
  if (a === 'PARENTS') return user.role === 'PARENT';
  return userSections_(user).indexOf(a) !== -1;
}
function cleanAnnouncementLink_(url) {
  var u = String(url || '').trim();
  if (!u) return '';
  u = u.split(/\s+/)[0].replace(/[),.;]+$/, '');
  return /^https?:\/\//i.test(u) ? u : '';
}
function api_listAnnouncements(token) {
  var user = requireUser_(token);
  var list = readTable_('Announcements').filter(function (a) { return toBool_(a.active) && announcementVisible_(user, a); });
  list.sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });
  return list.map(function (a) { return { id: a.id, title: a.title, body: a.body, audience: a.audience, category: a.category || '', link: a.link || '', createdAt: a.createdAt }; });
}
function api_saveAnnouncement(token, payload) {
  var user = requireUser_(token);
  assertRole_(user, ['PRINCIPAL', 'HEADMASTER', 'BURSAR', 'ACCOUNT_OFFICER', 'TEACHER'], 'You cannot post announcements.');
  if (!payload || !payload.title || !payload.body) throw new Error('Title and body are required.');
  var audience = ANNOUNCE_AUDIENCES.indexOf(payload.audience) !== -1 ? payload.audience : 'ALL';
  var fields = { title: payload.title, body: payload.body, audience: audience, category: String(payload.category || '').trim(), link: cleanAnnouncementLink_(payload.link) };
  if (payload.id) { if (!findById_('Announcements', payload.id)) throw new Error('Announcement not found.'); updateRow_('Announcements', payload.id, fields); return { id: payload.id }; }
  fields.id = uuid_(); fields.createdBy = user.id; fields.createdAt = nowIso_(); fields.active = true;
  appendRow_('Announcements', fields); return { id: fields.id };
}
function api_deleteAnnouncement(token, id) { assertRole_(requireUser_(token), ['PRINCIPAL', 'HEADMASTER'], 'You cannot delete announcements.'); deleteRow_('Announcements', id); return true; }

/* Public (no login) feed for the school website marquee — only WEBSITE-targeted, active posts. */
function publicWebsiteAnnouncements_() {
  var list = readTable_('Announcements').filter(function (a) {
    return toBool_(a.active) && String(a.audience || '') === 'WEBSITE' && String(a.title || '').trim() !== '';
  });
  list.sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });
  return list.slice(0, 12).map(function (a) {
    return { id: a.id, title: String(a.title || ''), body: String(a.body || ''), category: String(a.category || '').trim() || 'Announcement', link: cleanAnnouncementLink_(a.link), createdAt: String(a.createdAt || '') };
  });
}
function publicAnnouncementsJsonp_(p) {
  var cb = String((p && p.callback) || '').replace(/[^A-Za-z0-9_$\.\[\]]/g, '');
  var payload = JSON.stringify({ ok: true, items: publicWebsiteAnnouncements_(), updatedAt: nowIso_() });
  var out = cb ? (cb + '(' + payload + ');') : payload;
  return ContentService.createTextOutput(out).setMimeType(ContentService.MimeType.JAVASCRIPT);
}
/* One-time, non-destructive migration: adds any missing Announcements header cells. */
function ensureAnnouncementColumns() {
  var sheet = getSheet_('Announcements');
  var headers = HEADERS.Announcements;
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var current = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) { return String(h); });
  var added = [];
  headers.forEach(function (h) {
    if (current.indexOf(h) === -1) { var col = sheet.getLastColumn() + 1; sheet.getRange(1, col).setValue(h); current.push(h); added.push(h); }
  });
  Logger.log('Announcements columns ensured. Added: ' + (added.length ? added.join(', ') : 'none'));
  return added;
}

/* =========================== 12a. SETTINGS & SCHEMA MIGRATION =========================== */

function getSetting_(key, def) {
  var list = readTableSafe_('Settings');
  for (var i = 0; i < list.length; i++) if (String(list[i].key) === String(key)) return list[i].value;
  return def === undefined ? '' : def;
}
function setSetting_(key, value) {
  var list = readTableSafe_('Settings');
  for (var i = 0; i < list.length; i++) if (String(list[i].key) === String(key)) { updateRow_('Settings', list[i].key, { value: value, updatedAt: nowIso_() }); return; }
  appendRow_('Settings', { key: key, value: value, updatedAt: nowIso_() });
}
function ensureColumns_(name, headers) {
  var sheet = getSheet_(name);
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var current = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) { return String(h); });
  headers.forEach(function (h) {
    if (current.indexOf(h) === -1) { sheet.getRange(1, sheet.getLastColumn() + 1).setValue(h); current.push(h); }
  });
}
/**
 * Non-destructive migration (safe on a live spreadsheet). Creates the new
 * fee/settings, staff-register and timetable tabs and appends the new Payments
 * columns. Run once from the editor after deploying the new version — no data
 * is cleared.
 */
function ensureFeeTables() {
  var ss = getSpreadsheet_();
  ['Fees', 'FeeSelections', 'FeePlans', 'Settings', 'StaffAttendance', 'Timetable'].forEach(function (name) { ensureSheet_(ss, name); });
  ensureColumns_('Payments', HEADERS.Payments);
  Logger.log('Fee/settings, staff-register and timetable tables ensured. (Run setUp() to clear & re-seed everything.)');
  return true;
}
function api_getSettings(token) {
  var user = requireUser_(token);
  assertRole_(user, ['ADMIN', 'PRINCIPAL', 'HEADMASTER', 'BURSAR'], 'You cannot view settings.');
  var out = {};
  readTable_('Settings').forEach(function (r) { out[r.key] = r.value; });
  if (!out.ADMISSION_NOTIFY_EMAILS) out.ADMISSION_NOTIFY_EMAILS = OWNER_ADMIN_EMAIL;
  return out;
}
function api_saveSettings(token, payload) {
  var user = requireUser_(token);
  assertRole_(user, ['ADMIN', 'PRINCIPAL', 'HEADMASTER'], 'You cannot change settings.');
  payload = payload || {};
  Object.keys(payload).forEach(function (key) { setSetting_(key, String(payload[key] || '')); });
  logAudit_(user, 'UPDATE_SETTINGS', '', Object.keys(payload).join(','));
  return api_getSettings(token);
}


/* =========================== 13. DRIVE / FILES =========================== */

function getOrCreateSubfolder_(parent, name) { var it = parent.getFoldersByName(name); return it.hasNext() ? it.next() : parent.createFolder(name); }
function ownerSegments_(ownerType, ownerId) {
  if (ownerType === 'STUDENT') { var s = findById_('Students', ownerId); return ['Students', s ? (s.admissionNo || s.id) : ownerId]; }
  if (ownerType === 'STAFF') { var st = findById_('Staff', ownerId); return ['Staff', st ? (st.staffNo || st.id) : ownerId]; }
  if (ownerType === 'PAYMENT') {
    var p = findById_('Payments', ownerId), seg = ['Payments'];
    if (p) { var stu = findById_('Students', p.studentId); seg.push(stu ? (stu.admissionNo || stu.id) : p.studentId); }
    seg.push(ownerId);
    return seg;
  }
  return ['Other', ownerId];
}
function assertCanManageOwner_(user, ownerType, ownerId) {
  if (user.role === 'ADMIN') return;
  if (ownerType === 'STAFF') { assertRole_(user, ['PRINCIPAL', 'HEADMASTER'], 'You cannot manage staff files.'); return; }
  if (ownerType === 'STUDENT') {
    if (user.role === 'PARENT') { assertParentOf_(user, ownerId); return; }
    assertRole_(user, CFG.ENTRY_ROLES, 'You cannot upload this file.');
    var s = findById_('Students', ownerId); if (s) assertArmAllowed_(user, s.classArmId);
    return;
  }
  if (ownerType === 'PAYMENT') {
    var p = findById_('Payments', ownerId);
    if (user.role === 'PARENT' && p) { assertParentOf_(user, p.studentId); return; }
    assertRole_(user, CFG.FINANCE_ROLES, 'You cannot manage this file.');
    return;
  }
}
/** Uploads a base64 data-URL to Drive and records it in the Files tab. */
function storeFile_(user, ownerType, ownerId, filePayload) {
  if (!filePayload || !filePayload.dataUrl) throw new Error('No file provided.');
  assertCanManageOwner_(user, ownerType, ownerId);
  var root = resolveRootFolder_();
  var folder = root;
  ownerSegments_(ownerType, ownerId).forEach(function (seg) { folder = getOrCreateSubfolder_(folder, String(seg)); });
  var parts = String(filePayload.dataUrl).split(',');
  var base64 = parts.length > 1 ? parts[1] : parts[0];
  var mime = filePayload.mimeType || 'application/octet-stream';
  var name = filePayload.name || ('file-' + Date.now());
  var blob = Utilities.newBlob(Utilities.base64Decode(base64), mime, name);
  var file = folder.createFile(blob);
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) { /* domain may forbid */ }
  var url = 'https://drive.google.com/uc?export=view&id=' + file.getId();
  var rec = { id: uuid_(), ownerType: ownerType, ownerId: ownerId, name: file.getName(), mimeType: mime, size: blob.getBytes().length, driveFileId: file.getId(), url: url, uploadedBy: user.id, createdAt: nowIso_() };
  appendRow_('Files', rec);
  return { id: rec.id, url: url, name: rec.name, driveFileId: rec.driveFileId };
}
function api_uploadFile(token, payload) {
  var user = requireUser_(token);
  payload = payload || {};
  if (!payload.ownerType || !payload.ownerId) throw new Error('Missing file owner.');
  return storeFile_(user, payload.ownerType, payload.ownerId, payload);
}
function api_listFiles(token, ownerType, ownerId) {
  var user = requireUser_(token);
  assertCanManageOwner_(user, ownerType, ownerId);
  return readTable_('Files').filter(function (f) { return String(f.ownerType) === String(ownerType) && String(f.ownerId) === String(ownerId); })
    .map(function (f) { return { id: f.id, name: f.name, url: f.url, mimeType: f.mimeType, size: f.size, createdAt: f.createdAt }; });
}

/* =========================== 14. PAYMENTS =========================== */

function paymentsForUser_(user) {
  var all = readTable_('Payments');
  if (user.role === 'PARENT') { var ids = parentStudentIds_(user); return all.filter(function (p) { return ids.indexOf(String(p.studentId)) !== -1; }); }
  var arms = userArmIds_(user);
  if (arms.length) {
    var armStudents = {}; readTable_('Students').forEach(function (s) { armStudents[s.id] = s.classArmId; });
    return all.filter(function (p) { return arms.indexOf(String(armStudents[p.studentId])) !== -1; });
  }
  return all;
}
function api_listPayments(token, opts) {
  opts = opts || {};
  var user = requireUser_(token);
  var list = paymentsForUser_(user);
  if (opts.studentId) list = list.filter(function (p) { return String(p.studentId) === String(opts.studentId); });
  if (opts.status) list = list.filter(function (p) { return String(p.status) === String(opts.status); });
  list.sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });
  var studentsById = indexById_(readTable_('Students'));
  return list.map(function (p) {
    var s = studentsById[p.studentId];
    return {
      id: p.id, studentId: p.studentId, studentName: s ? fullNameOf_(s) : '—', admissionNo: s ? s.admissionNo : '',
      category: p.category, amount: p.amount, method: p.method, reference: p.reference, note: p.note, status: p.status,
      evidenceFileId: p.evidenceFileId, evidenceUrl: p.evidenceUrl, viewfile: p.viewfile || p.evidenceUrl, termId: p.termId,
      feePlanId: p.feePlanId, installmentNo: p.installmentNo, amountPaid: p.amountPaid, balanceAfter: p.balanceAfter,
      receiptNo: p.receiptNo, items: p.items, createdAt: p.createdAt, verifiedAt: p.verifiedAt
    };
  });
}
function api_savePayment(token, payload) {
  var user = requireUser_(token);
  payload = payload || {};
  if (!payload.studentId) throw new Error('Select a ward/student.');
  if (!payload.amount || isNaN(Number(payload.amount))) throw new Error('Enter a valid amount.');
  if (user.role === 'PARENT') assertParentOf_(user, payload.studentId);
  else assertRole_(user, CFG.FINANCE_ROLES, 'You cannot record payments.');
  var category = CFG.PAYMENT_CATEGORIES.indexOf(payload.category) !== -1 ? payload.category : 'FEES';
  var termId = payload.termId || (getCurrentTerm_() || {}).id || '';
  var plan = termId ? feePlanFor_(payload.studentId, termId) : null;
  var sched = null;
  if (termId) {
    var stu0 = findById_('Students', payload.studentId), term0 = findById_('Terms', termId);
    if (stu0 && term0) sched = buildFeeSchedule_(stu0, term0);
  }
  var paidBefore = 0, planCount = 0;
  if (termId) paymentsForPlan_(payload.studentId, termId).forEach(function (p) {
    if (String(p.status).toUpperCase() !== 'REJECTED') { paidBefore += numOrZero_(p.amount); planCount++; }
  });
  var amount = round2_(Number(payload.amount));
  var balanceAfter = sched ? round2_(Math.max(0, sched.totalBill - (paidBefore + amount))) : '';
  var fields = {
    id: uuid_(), studentId: payload.studentId, parentUserId: user.role === 'PARENT' ? user.id : (payload.parentUserId || ''),
    termId: termId, category: category, amount: amount, method: payload.method || '', reference: payload.reference || '', note: payload.note || '',
    status: 'PENDING', evidenceFileId: '', evidenceUrl: '', verifiedBy: '', verifiedAt: '', createdAt: nowIso_(), updatedAt: nowIso_(),
    feePlanId: plan ? plan.id : '', installmentNo: termId ? (planCount + 1) : '', amountPaid: amount, balanceAfter: balanceAfter,
    receiptNo: nextReceiptNo_(), viewfile: '',
    items: sched ? sched.items.filter(function (i) { return i.selected; }).map(function (i) { return i.name; }).join(', ') : ''
  };
  appendRow_('Payments', fields);
  if (payload.evidence && payload.evidence.dataUrl) {
    var stored = storeFile_(user, 'PAYMENT', fields.id, payload.evidence);
    updateRow_('Payments', fields.id, { evidenceFileId: stored.driveFileId, evidenceUrl: stored.url, viewfile: stored.url, updatedAt: nowIso_() });
  }
  logAudit_(user, 'RECORD_PAYMENT', '', 'student ' + payload.studentId + ' amount ' + amount + ' receipt ' + fields.receiptNo);
  return { id: fields.id, receiptNo: fields.receiptNo, balanceAfter: fields.balanceAfter, installmentNo: fields.installmentNo, planId: fields.feePlanId };
}
function api_verifyPayment(token, id, decision) {
  var user = requireUser_(token);
  assertRole_(user, CFG.FINANCE_ROLES, 'You cannot verify payments.');
  var status = decision === 'REJECTED' ? 'REJECTED' : 'VERIFIED';
  if (!findById_('Payments', id)) throw new Error('Payment not found.');
  updateRow_('Payments', id, { status: status, verifiedBy: user.id, verifiedAt: nowIso_(), updatedAt: nowIso_() });
  return { status: status };
}

/* ==================== 14a. FEES, SELECTIONS & RECEIPTS ==================== */

/** A fee applies to a class level when section/level/session/term constraints are blank or match. */
function feeApplies_(fee, level, term) {
  if (!toBool_(fee.active)) return false;
  if (level) {
    if (fee.section && String(fee.section) !== String(level.section)) return false;
    if (fee.classLevelId && String(fee.classLevelId) !== String(level.id)) return false;
  }
  if (term) {
    if (fee.sessionName && String(fee.sessionName) !== String(term.sessionName)) return false;
    if (fee.termName && String(fee.termName) !== String(term.termName)) return false;
  }
  return true;
}
function applicableFeesForLevel_(level, term) {
  if (!level) return [];
  return readTableSafe_('Fees').filter(function (f) { return feeApplies_(f, level, term); }).sort(function (a, b) {
    var ao = numOrZero_(a.orderIndex), bo = numOrZero_(b.orderIndex);
    if (ao !== bo) return ao - bo;
    return String(a.name).localeCompare(String(b.name));
  });
}
function applicableFeesForStudent_(student, term) {
  var arm = getArmById_(student.classArmId);
  var level = arm ? findById_('ClassLevels', arm.classLevelId) : null;
  return applicableFeesForLevel_(level, term);
}
function feeSelectionsFor_(studentId, termId) {
  return readTableSafe_('FeeSelections').filter(function (s) { return String(s.studentId) === String(studentId) && String(s.termId) === String(termId); });
}
function feePlanFor_(studentId, termId) {
  return findWhere_('FeePlans', function (p) { return String(p.studentId) === String(studentId) && String(p.termId) === String(termId); });
}
function paymentsForPlan_(studentId, termId) {
  return readTable_('Payments').filter(function (p) { return String(p.studentId) === String(studentId) && String(p.termId) === String(termId); })
    .sort(function (a, b) { return String(a.createdAt).localeCompare(String(b.createdAt)); });
}
function classArmLabel_(armId) {
  var a = getArmById_(armId), l = a ? findById_('ClassLevels', a.classLevelId) : null;
  return a && l ? (l.section + ' · ' + l.name + ' ' + a.name) : '';
}
/** Reduces a ward + term into a bill: applicable items, mandatory defaults, paid/balance. */
function buildFeeSchedule_(student, term) {
  var fees = applicableFeesForStudent_(student, term);
  var selMap = {}; feeSelectionsFor_(student.id, term.id).forEach(function (r) { selMap[String(r.feeId)] = r; });
  var items = fees.map(function (f) {
    var r = selMap[String(f.id)];
    var mandatory = toBool_(f.mandatory);
    var selected = r ? (mandatory || toBool_(r.selected)) : mandatory;
    return { feeId: f.id, name: String(f.name || ''), category: String(f.category || 'FEES'), amount: round2_(numOrZero_(f.amount)), mandatory: mandatory, selected: selected, note: String(f.note || '') };
  });
  var plan = feePlanFor_(student.id, term.id);
  var total = items.reduce(function (t, i) { return t + (i.selected ? i.amount : 0); }, 0);
  var pays = paymentsForPlan_(student.id, term.id);
  var paid = 0, done = 0;
  pays.forEach(function (p) { if (String(p.status).toUpperCase() !== 'REJECTED') { paid += numOrZero_(p.amount); done++; } });
  return {
    items: items,
    saved: feeSelectionsFor_(student.id, term.id).length > 0,
    installments: plan ? (Number(plan.installments) || 0) : 0, planId: plan ? plan.id : '',
    totalBill: round2_(total), amountPaid: round2_(paid), paidCount: done, balance: round2_(Math.max(0, total - paid)),
    payments: pays.map(paymentReceiptView_)
  };
}
function termRef_(termId) {
  var t = findById_('Terms', termId);
  return t ? { id: t.id, label: termLabel_(t), termName: t.termName, sessionName: t.sessionName } : null;
}
function api_getFeeSchedule(token, studentId, termId) {
  var user = requireUser_(token);
  var student = findById_('Students', studentId);
  if (!student) throw new Error('Student not found.');
  assertStudentAccess_(user, student);
  var term = termId ? findById_('Terms', termId) : getCurrentTerm_();
  if (!term) throw new Error('No term is available.');
  var sched = buildFeeSchedule_(student, term);
  return {
    student: decorateStudent_(student, armsMap_(user)), term: termRef_(term.id),
    items: sched.items, saved: sched.saved, installments: sched.installments, planId: sched.planId,
    totalBill: sched.totalBill, amountPaid: sched.amountPaid, paidCount: sched.paidCount, balance: sched.balance,
    payments: sched.payments
  };
}
function api_saveFeeSelection(token, studentId, termId, payload) {
  var user = requireUser_(token);
  if (user.role !== 'PARENT' && !hasRole_(user, CFG.FINANCE_ROLES)) throw new Error('Only parents or finance staff can select fees.');
  var student = findById_('Students', studentId);
  if (!student) throw new Error('Student not found.');
  assertStudentAccess_(user, student);
  var term = findById_('Terms', termId);
  if (!term || !toBool_(term.active)) throw new Error('Select a valid term.');
  payload = payload || {};
  var existing = {}; feeSelectionsFor_(studentId, termId).forEach(function (r) { existing[String(r.feeId)] = r; });
  (payload.items || []).forEach(function (it) {
    if (!it || !it.feeId) return;
    var fee = findById_('Fees', it.feeId);
    if (!fee || !toBool_(fee.active)) return;
    var mandatory = toBool_(fee.mandatory);
    var fields = {
      studentId: student.id, parentUserId: user.role === 'PARENT' ? user.id : '', termId: termId, feeId: fee.id,
      category: String(fee.category || 'FEES'), name: String(fee.name || ''), amount: round2_(numOrZero_(fee.amount)),
      mandatory: mandatory, selected: mandatory ? true : !!it.selected, updatedAt: nowIso_()
    };
    if (existing[String(fee.id)]) updateRow_('FeeSelections', existing[String(fee.id)].id, fields);
    else { fields.id = uuid_(); fields.createdAt = nowIso_(); appendRow_('FeeSelections', fields); existing[String(fee.id)] = fields; }
  });
  var installments = [1, 2, 3].indexOf(Number(payload.installments)) !== -1 ? Number(payload.installments) : 1;
  var plan = feePlanFor_(studentId, termId);
  if (plan) updateRow_('FeePlans', plan.id, { installments: installments, updatedAt: nowIso_() });
  else appendRow_('FeePlans', { id: uuid_(), studentId: student.id, parentUserId: user.role === 'PARENT' ? user.id : '', termId: termId, installments: installments, createdAt: nowIso_(), updatedAt: nowIso_() });
  logAudit_(user, 'SAVE_FEE_SELECTION', student.id, 'term ' + termId + ' installments ' + installments);
  return buildFeeSchedule_(student, term);
}
var FEE_WRITE_ROLES = ['ADMIN', 'PRINCIPAL', 'HEADMASTER', 'BURSAR'];
function api_listFees(token, opts) {
  requireUser_(token);
  opts = opts || {};
  var list = readTableSafe_('Fees');
  if (opts.activeOnly) list = list.filter(function (f) { return toBool_(f.active); });
  var levelsById = indexById_(readTable_('ClassLevels'));
  return list.map(function (f) {
    var o = stripRow_(f);
    o.levelName = (f.classLevelId && levelsById[f.classLevelId]) ? levelsById[f.classLevelId].name : '';
    return o;
  }).sort(function (a, b) {
    var o = numOrZero_(a.orderIndex) - numOrZero_(b.orderIndex);
    if (o !== 0) return o;
    return String(a.name).localeCompare(String(b.name));
  });
}
function api_saveFee(token, payload) {
  var user = requireUser_(token);
  assertRole_(user, FEE_WRITE_ROLES, 'You cannot edit fees.');
  payload = payload || {};
  if (!payload.name) throw new Error('Fee/charge name is required.');
  if (payload.amount === '' || payload.amount === null || payload.amount === undefined || isNaN(Number(payload.amount))) throw new Error('Enter the amount (₦).');
  var section = String(payload.section || '').trim();
  if (section && CFG.SECTIONS.indexOf(section) === -1) throw new Error('Invalid section.');
  var category = CFG.FEE_CATEGORIES.indexOf(payload.category) !== -1 ? payload.category : 'FEES';
  var fields = {
    name: String(payload.name).trim(), category: category, section: section,
    classLevelId: payload.classLevelId || '', sessionName: String(payload.sessionName || '').trim(),
    termName: CFG.TERM_NAMES.indexOf(payload.termName) !== -1 ? payload.termName : '',
    amount: round2_(numOrZero_(payload.amount)), mandatory: toBool_(payload.mandatory),
    active: payload.active === undefined ? true : toBool_(payload.active), orderIndex: numOrZero_(payload.orderIndex),
    note: String(payload.note || '').trim(), updatedAt: nowIso_()
  };
  if (payload.id) {
    if (!findById_('Fees', payload.id)) throw new Error('Fee not found.');
    updateRow_('Fees', payload.id, fields);
  } else { fields.id = uuid_(); appendRow_('Fees', fields); }
  logAudit_(user, 'SAVE_FEE', fields.name, 'amount ' + fields.amount);
  return api_listFees(token, {});
}
function api_deleteFee(token, id) {
  var user = requireUser_(token);
  assertRole_(user, FEE_WRITE_ROLES, 'You cannot delete fees.');
  if (!findById_('Fees', id)) throw new Error('Fee not found.');
  deleteRow_('Fees', id);
  logAudit_(user, 'DELETE_FEE', id, '');
  return true;
}
function nextReceiptNo_() {
  var prefix = 'KMS/RCP/' + new Date().getFullYear() + '/', max = 0;
  readTable_('Payments').forEach(function (p) { var v = String(p.receiptNo || ''); if (v.indexOf(prefix) === 0) { var n = parseInt(v.slice(prefix.length), 10); if (!isNaN(n) && n > max) max = n; } });
  var next = String(max + 1); while (next.length < 4) next = '0' + next; return prefix + next;
}
function paymentReceiptView_(p) {
  var student = findById_('Students', p.studentId);
  return {
    id: p.id, receiptNo: p.receiptNo || '', studentId: p.studentId,
    studentName: student ? fullNameOf_(student) : '—', admissionNo: student ? student.admissionNo : '',
    classArm: classArmLabel_(student ? student.classArmId : ''), term: termRef_(p.termId),
    category: p.category, amount: numOrZero_(p.amount),
    amountPaid: (p.amountPaid === '' || p.amountPaid === null || p.amountPaid === undefined) ? numOrZero_(p.amount) : numOrZero_(p.amountPaid),
    balanceAfter: (p.balanceAfter === '' || p.balanceAfter === null || p.balanceAfter === undefined) ? '' : numOrZero_(p.balanceAfter),
    installmentNo: p.installmentNo || '', method: p.method, reference: p.reference, note: p.note, items: p.items || '',
    status: p.status, viewfile: p.viewfile || p.evidenceUrl, evidenceUrl: p.evidenceUrl, createdAt: p.createdAt, verifiedAt: p.verifiedAt
  };
}
function api_getReceipt(token, paymentId) {
  var user = requireUser_(token);
  var p = findById_('Payments', paymentId);
  if (!p) throw new Error('Payment/receipt not found.');
  if (user.role === 'PARENT') assertParentOf_(user, p.studentId);
  else if (userArmIds_(user).length) {
    var stu = findById_('Students', p.studentId);
    if (stu) assertArmAllowed_(user, stu.classArmId);
  }
  return { school: brand_(), receipt: paymentReceiptView_(p) };
}

/* =========================== 14b. DASHBOARD / DIRECTORY =========================== */

var SECTION_LABELS = { KG: 'Kindergarten & Creche', PRIMARY: 'Primary', SECONDARY: 'Secondary' };
function sectionLabel_(s) { return SECTION_LABELS[s] || s; }
function sectionsFromArms_(arms) {
  var seen = {}; var out = [];
  Object.keys(arms).forEach(function (k) { var l = arms[k].classLevel; if (l) seen[l.section] = true; });
  CFG.SECTIONS.forEach(function (s) { if (seen[s]) out.push(s); });
  return out;
}
function numOrZero_(v) { var n = Number(v); return isNaN(n) ? 0 : n; }
/** Role-scoped statistics for the management dashboards. */
function api_dashboard(token) {
  var user = requireUser_(token);
  var arms = armsMap_(user);
  var armIds = Object.keys(arms);
  var sections = user.role === 'ADMIN' ? CFG.SECTIONS.slice() : sectionsFromArms_(arms);
  var wardSet = null;
  if (user.role === 'PARENT') { wardSet = {}; parentStudentIds_(user).forEach(function (id) { wardSet[String(id)] = true; }); }

  var bySection = { KG: 0, PRIMARY: 0, SECONDARY: 0 }, byLevelMap = {};
  var total = 0, active = 0, inactive = 0, male = 0, female = 0;
  readTable_('Students').forEach(function (s) {
    if (!arms[s.classArmId] || (wardSet && !wardSet[String(s.id)])) return;
    total++;
    if (String(s.status || 'ACTIVE').toUpperCase() === 'INACTIVE') inactive++; else active++;
    var g = String(s.gender || '').trim();
    if (/^m/i.test(g)) male++; else if (/^f/i.test(g)) female++;
    var arm = arms[s.classArmId];
    if (arm && arm.classLevel) {
      if (bySection[arm.classLevel.section] != null) bySection[arm.classLevel.section]++;
      var ln = arm.classLevel.name;
      if (!byLevelMap[ln]) byLevelMap[ln] = { level: ln, section: arm.classLevel.section, count: 0 };
      byLevelMap[ln].count++;
    }
  });
  var byLevel = Object.keys(byLevelMap).map(function (k) { return byLevelMap[k]; }).sort(function (a, b) {
    if (a.section !== b.section) return CFG.SECTIONS.indexOf(a.section) - CFG.SECTIONS.indexOf(b.section);
    return String(a.level).localeCompare(String(b.level), undefined, { numeric: true });
  });

  var staffAll = user.role === 'PARENT' ? [] : readTable_('Staff');
  var staffScoped = user.role === 'ADMIN' ? staffAll : staffAll.filter(function (st) { return sections.indexOf(st.section) !== -1; });
  var staffBySection = { KG: 0, PRIMARY: 0, SECONDARY: 0, Unassigned: 0 }, staffByDeg = {};
  var staffTotal = 0, staffActive = 0;
  staffScoped.forEach(function (st) {
    staffTotal++;
    if (String(st.status || 'ACTIVE').toUpperCase() !== 'INACTIVE') staffActive++;
    var sec = (st.section && staffBySection[st.section] != null) ? st.section : 'Unassigned';
    staffBySection[sec]++;
    var d = String(st.designation || '').trim() || 'Unspecified';
    staffByDeg[d] = (staffByDeg[d] || 0) + 1;
  });

  var today = Utilities.formatDate(new Date(), 'Africa/Lagos', 'yyyy-MM-dd');
  var att = { date: today, total: 0, PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 };
  readTable_('Attendance').forEach(function (a) {
    if (String(a.date) !== today || !arms[a.classArmId]) return;
    att.total++;
    if (att[a.status] != null) att[a.status]++;
  });

  var pays = paymentsForUser_(user);
  var pay = { count: pays.length, pending: 0, verified: 0, rejected: 0, verifiedAmount: 0, pendingAmount: 0 };
  pays.forEach(function (p) {
    var st = String(p.status || '').toUpperCase(), amt = numOrZero_(p.amount);
    if (st === 'VERIFIED') { pay.verified++; pay.verifiedAmount += amt; }
    else if (st === 'REJECTED') { pay.rejected++; }
    else { pay.pending++; pay.pendingAmount += amt; }
  });

  var ann = readTable_('Announcements').filter(function (a) { return toBool_(a.active) && announcementVisible_(user, a); })
    .sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); })
    .slice(0, 5).map(function (a) { return { id: a.id, title: a.title, body: a.body, audience: a.audience, createdAt: a.createdAt }; });

  var current = getCurrentTerm_();
  return {
    role: user.role,
    sections: sections,
    scopeLabel: user.role === 'ADMIN' ? 'All sections' : (sections.map(sectionLabel_).join(' & ') || 'No scope assigned'),
    students: { total: total, active: active, inactive: inactive, bySection: bySection, byGender: { Male: male, Female: female }, byLevel: byLevel },
    staff: {
      total: staffTotal, active: staffActive, bySection: staffBySection,
      byDesignation: Object.keys(staffByDeg).map(function (k) { return { designation: k, count: staffByDeg[k] }; }).sort(function (a, b) { return b.count - a.count; }),
      available: hasRole_(user, ['PRINCIPAL', 'HEADMASTER'])
    },
    classes: { arms: armIds.length },
    attendance: att,
    payments: pay,
    announcements: ann,
    currentTerm: current ? { id: current.id, label: termLabel_(current) } : null
  };
}
/** Section-scoped student/staff lookup for the dashboard search box. */
function api_searchDirectory(token, query) {
  var user = requireUser_(token);
  var q = String(query || '').trim().toLowerCase();
  var arms = armsMap_(user);
  var out = { students: [], staff: [] };
  if (q.length < 2) return out;
  var wardIds = user.role === 'PARENT' ? parentStudentIds_(user) : null;
  readTable_('Students').forEach(function (s) {
    if (out.students.length >= 40 || !arms[s.classArmId]) return;
    if (wardIds && wardIds.indexOf(String(s.id)) === -1) return;
    var hay = [s.firstName, s.middleName, s.lastName, s.admissionNo, s.guardianName, s.guardianPhone].join(' ').toLowerCase();
    if (hay.indexOf(q) !== -1) out.students.push(decorateStudent_(s, arms));
  });
  if (hasRole_(user, ['PRINCIPAL', 'HEADMASTER'])) {
    var sections = user.role === 'ADMIN' ? null : sectionsFromArms_(arms);
    readTable_('Staff').forEach(function (st) {
      if (out.staff.length >= 40) return;
      if (sections && sections.indexOf(st.section) === -1) return;
      var hay = [st.firstName, st.middleName, st.lastName, st.staffNo, st.email, st.designation, st.phone].join(' ').toLowerCase();
      if (hay.indexOf(q) !== -1) out.staff.push(stripRow_(st));
    });
  }
  return out;
}

/* =========================== 14b. ANALYTICS / STATISTICS =========================== */

var ANALYTICS_ROLES = ['ADMIN', 'PRINCIPAL', 'HEADMASTER', 'BURSAR'];
/** Active terms oldest → newest, optionally limited to the most recent N. */
function analyticsTerms_(limit) {
  var terms = getTerms_();
  terms.sort(function (a, b) {
    var s = String(a.sessionName).localeCompare(String(b.sessionName));
    if (s) return s;
    return CFG.TERM_NAMES.indexOf(a.termName) - CFG.TERM_NAMES.indexOf(b.termName);
  });
  if (limit && terms.length > limit) terms = terms.slice(terms.length - limit);
  return terms;
}
/** Total bill vs collected for one term across scoped students (bill from level fees + per-student selections). */
function collectionForTerm_(term, students, levelById, armById, selByStudent, payByStudentTerm) {
  var feesByLevel = {};
  var billed = 0, collected = 0, bySection = {};
  CFG.SECTIONS.forEach(function (s) { bySection[s] = { billed: 0, collected: 0 }; });
  students.forEach(function (st) {
    var arm = armById[st.classArmId], level = arm ? levelById[arm.classLevelId] : null;
    if (!level) return;
    if (!feesByLevel[level.id]) feesByLevel[level.id] = applicableFeesForLevel_(level, term);
    var sel = selByStudent[st.id] || {}, bill = 0;
    feesByLevel[level.id].forEach(function (f) {
      var r = sel[f.id], mandatory = toBool_(f.mandatory);
      var selected = r === undefined ? mandatory : (mandatory || toBool_(r));
      if (selected) bill += numOrZero_(f.amount);
    });
    var paid = payByStudentTerm[st.id + '|' + term.id] || 0;
    billed += bill; collected += paid;
    if (bySection[level.section]) { bySection[level.section].billed += bill; bySection[level.section].collected += paid; }
  });
  return { billed: round2_(billed), collected: round2_(collected), outstanding: round2_(Math.max(0, billed - collected)), rate: billed ? round2_(collected / billed * 100) : 0, bySection: bySection };
}
function api_getAnalytics(token, opts) {
  opts = opts || {};
  var user = requireUser_(token);
  assertRole_(user, ANALYTICS_ROLES, 'Statistics are for school leadership and finance.');
  var arms = armsMap_(user);
  var sections = user.role === 'ADMIN' ? CFG.SECTIONS.slice() : sectionsFromArms_(arms);
  var levelById = indexById_(readTable_('ClassLevels'));
  var armById = indexById_(readTable_('ClassArms'));
  var students = readTable_('Students').filter(function (s) { return !!arms[s.classArmId]; });
  var studentIds = {}; students.forEach(function (s) { studentIds[String(s.id)] = true; });

  /* enrollment */
  var bySection = { KG: 0, PRIMARY: 0, SECONDARY: 0 }, byLevelMap = {}, total = 0, active = 0, male = 0, female = 0;
  students.forEach(function (s) {
    total++;
    if (String(s.status || 'ACTIVE').toUpperCase() === 'INACTIVE') {} else active++;
    var g = String(s.gender || '').trim();
    if (/^m/i.test(g)) male++; else if (/^f/i.test(g)) female++;
    var arm = arms[s.classArmId];
    if (arm && arm.classLevel) {
      if (bySection[arm.classLevel.section] != null) bySection[arm.classLevel.section]++;
      var ln = arm.classLevel.name;
      if (!byLevelMap[ln]) byLevelMap[ln] = { level: ln, section: arm.classLevel.section, count: 0 };
      byLevelMap[ln].count++;
    }
  });
  var byLevel = Object.keys(byLevelMap).map(function (k) { return byLevelMap[k]; }).sort(function (a, b) {
    if (a.section !== b.section) return CFG.SECTIONS.indexOf(a.section) - CFG.SECTIONS.indexOf(b.section);
    return String(a.level).localeCompare(String(b.level), undefined, { numeric: true });
  });

  var staffAll = readTable_('Staff');
  var staffScoped = user.role === 'ADMIN' ? staffAll : staffAll.filter(function (st) { return sections.indexOf(st.section) !== -1; });
  var staffBySection = { KG: 0, PRIMARY: 0, SECONDARY: 0, Unassigned: 0 };
  staffScoped.forEach(function (st) { var sec = (st.section && staffBySection[st.section] != null) ? st.section : 'Unassigned'; staffBySection[sec]++; });

  /* attendance (all scoped rows) + monthly series */
  var att = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0, total: 0 }, attMonthly = {};
  readTable_('Attendance').forEach(function (a) {
    if (!arms[a.classArmId]) return;
    var st = String(a.status || '').toUpperCase();
    if (att[st] == null) return;
    att[st]++; att.total++;
    var m = String(a.date || '').slice(0, 7);
    if (m) { attMonthly[m] = attMonthly[m] || { month: m, present: 0, total: 0 }; attMonthly[m].present += (st === 'PRESENT' ? 1 : 0); attMonthly[m].total++; }
  });
  var attendanceMonthly = Object.keys(attMonthly).sort().map(function (m) { var r = attMonthly[m]; r.rate = r.total ? round2_(r.present / r.total * 100) : 0; return r; });
  var attendanceRate = att.total ? round2_(att.PRESENT / att.total * 100) : 0;

  /* performance — focus term */
  var focus = opts.termId ? findById_('Terms', opts.termId) : getCurrentTerm_();
  var subjectsById = indexById_(readTable_('Subjects'));
  var gradeCount = {}, subjAgg = {};
  readTable_('Scores').forEach(function (s) {
    if (!studentIds[String(s.studentId)]) return;
    if (focus && String(s.termId) !== String(focus.id)) return;
    if (s.grade) gradeCount[s.grade] = (gradeCount[s.grade] || 0) + 1;
    var sid = String(s.subjectId); subjAgg[sid] = subjAgg[sid] || { subjectId: sid, count: 0, sum: 0 };
    if (s.total !== '' && s.total !== null && s.total !== undefined) { subjAgg[sid].count++; subjAgg[sid].sum += numOrZero_(s.total); }
  });
  var subjectAverages = Object.keys(subjAgg).map(function (k) {
    var a = subjAgg[k], sub = subjectsById[k];
    return { subjectId: k, subject: sub ? sub.name : '—', count: a.count, average: a.count ? round2_(a.sum / a.count) : 0 };
  }).sort(function (x, y) { return y.average - x.average; });
  var sheets = readTable_('ResultSheets').filter(function (r) { return studentIds[String(r.studentId)] && focus && String(r.termId) === String(focus.id) && r.average !== '' && r.average !== null && r.average !== undefined; });
  var avgScore = sheets.length ? round2_(sheets.reduce(function (t, r) { return t + numOrZero_(r.average); }, 0) / sheets.length) : 0;
  var passRate = sheets.length ? round2_(sheets.filter(function (r) { return numOrZero_(r.average) >= 40; }).length / sheets.length * 100) : 0;
  var studentsById = indexById_(students);
  var topStudents = sheets.slice().sort(function (a, b) { return numOrZero_(b.totalScore) - numOrZero_(a.totalScore); }).slice(0, 10).map(function (r) {
    var s = studentsById[r.studentId];
    return { studentId: r.studentId, name: s ? fullNameOf_(s) : '—', admissionNo: s ? s.admissionNo : '', classArm: s ? classArmLabel_(s.classArmId) : '', totalScore: r.totalScore, average: r.average, position: r.position };
  });

  /* finance */
  var paymentsAll = readTable_('Payments').filter(function (p) { return studentIds[String(p.studentId)]; });
  var payByStudentTerm = {}, statusCounts = { PENDING: 0, VERIFIED: 0, REJECTED: 0 }, statusAmounts = { PENDING: 0, VERIFIED: 0, REJECTED: 0 }, monthly = {};
  paymentsAll.forEach(function (p) {
    var st = String(p.status || '').toUpperCase() || 'PENDING', amt = numOrZero_(p.amount);
    if (statusCounts[st] == null) { statusCounts[st] = 0; statusAmounts[st] = 0; }
    statusCounts[st]++; statusAmounts[st] += amt;
    if (st !== 'REJECTED') {
      if (p.termId) { var k = p.studentId + '|' + p.termId; payByStudentTerm[k] = round2_((payByStudentTerm[k] || 0) + amt); }
      var m = String(p.createdAt || '').slice(0, 7);
      if (m) { monthly[m] = monthly[m] || { month: m, amount: 0, count: 0 }; monthly[m].amount = round2_(monthly[m].amount + amt); monthly[m].count++; }
    }
  });
  var monthlyCollections = Object.keys(monthly).sort().map(function (m) { return monthly[m]; });
  var selByTerm = {};
  readTableSafe_('FeeSelections').forEach(function (r) {
    if (!studentIds[String(r.studentId)]) return;
    var tm = String(r.termId); selByTerm[tm] = selByTerm[tm] || {};
    selByTerm[tm][r.studentId] = selByTerm[tm][r.studentId] || {};
    selByTerm[tm][r.studentId][r.feeId] = r.selected;
  });
  var finance = focus ? collectionForTerm_(focus, students, levelById, armById, selByTerm[String(focus.id)] || {}, payByStudentTerm)
    : { billed: 0, collected: 0, outstanding: 0, rate: 0, bySection: {} };

  /* trends — last 6 active terms oldest → newest */
  var trends = analyticsTerms_(6).map(function (tm) {
    var c = collectionForTerm_(tm, students, levelById, armById, selByTerm[String(tm.id)] || {}, payByStudentTerm);
    var from = tm.startDate || '', to = tm.endDate || '', tp = 0, tt = 0;
    readTable_('Attendance').forEach(function (a) {
      if (!arms[a.classArmId]) return;
      var d = String(a.date || ''); if (from && d < from) return; if (to && d > to) return;
      tt++; if (String(a.status || '').toUpperCase() === 'PRESENT') tp++;
    });
    var sh = readTable_('ResultSheets').filter(function (r) { return studentIds[String(r.studentId)] && String(r.termId) === String(tm.id) && r.average !== '' && r.average !== null && r.average !== undefined; });
    var avg = sh.length ? round2_(sh.reduce(function (t, r) { return t + numOrZero_(r.average); }, 0) / sh.length) : 0;
    return { termId: tm.id, label: termLabel_(tm), termName: tm.termName, sessionName: tm.sessionName, attendanceRate: tt ? round2_(tp / tt * 100) : 0, avgScore: avg, billed: c.billed, collected: c.collected, collectionRate: c.rate };
  });
  var termsList = getTerms_().map(function (t) { return { id: t.id, label: termLabel_(t) }; });

  return {
    role: user.role,
    sections: sections,
    scopeLabel: user.role === 'ADMIN' ? 'All sections' : (sections.map(sectionLabel_).join(' & ') || 'No scope assigned'),
    generatedAt: nowIso_(),
    overview: {
      students: { total: total, active: active, male: male, female: female, bySection: bySection, byLevel: byLevel },
      classes: { arms: Object.keys(arms).length },
      staff: { total: staffScoped.length, bySection: staffBySection },
      attendance: { counts: att, rate: attendanceRate, monthly: attendanceMonthly }
    },
    performance: {
      term: focus ? { id: focus.id, label: termLabel_(focus) } : null,
      average: avgScore, passRate: passRate, studentsAssessed: sheets.length,
      gradeDistribution: Object.keys(gradeCount).map(function (g) { return { grade: g, count: gradeCount[g] }; }).sort(function (a, b) { return String(a.grade).localeCompare(String(b.grade)); }),
      subjectAverages: subjectAverages, topStudents: topStudents
    },
    finance: {
      term: focus ? { id: focus.id, label: termLabel_(focus) } : null,
      billed: finance.billed, collected: finance.collected, outstanding: finance.outstanding, collectionRate: finance.rate,
      bySection: CFG.SECTIONS.map(function (s) { var r = finance.bySection[s] || { billed: 0, collected: 0 }; return { section: s, label: sectionLabel_(s), billed: round2_(r.billed), collected: round2_(r.collected), outstanding: round2_(Math.max(0, r.billed - r.collected)) }; }),
      statusCounts: statusCounts, statusAmounts: statusAmounts, monthly: monthlyCollections
    },
    trends: trends,
    terms: termsList
  };
}

/* =========================== 14c. COMMUNICATION, STAFF REGISTER & TIMETABLE =========================== */

var COMMS_ROLES = ['ADMIN', 'PRINCIPAL', 'HEADMASTER', 'BURSAR'];
var MESSAGE_AUDIENCES = ['PARENTS', 'STAFF', 'BOTH'];
var MESSAGE_CHANNELS = ['EMAIL', 'SMS', 'BOTH'];
var MAX_MESSAGE_RECIPIENTS = 300; // safety cap per send (protects the Gmail daily quota)
var DAYS_OF_WEEK = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
var TIMETABLE_KINDS = ['CLASS', 'EXAM'];

/** Students within the caller's section/arm scope. */
function scopedStudents_(user) {
  var arms = armsMap_(user);
  return readTable_('Students').filter(function (s) { return !!arms[s.classArmId]; });
}
/** Staff within the caller's section scope (ADMIN = all). */
function scopedStaff_(user) {
  var all = readTable_('Staff');
  if (user.role === 'ADMIN' || !userSections_(user).length) return all;
  var sections = userSections_(user);
  return all.filter(function (st) { return sections.indexOf(st.section) !== -1; });
}
function money_(n) {
  var v = Math.round(Number(n) || 0), neg = v < 0, s = String(Math.abs(v)), out = '';
  while (s.length > 3) { out = ',' + s.slice(-3) + out; s = s.slice(0, -3); }
  return (neg ? '-' : '') + '\u20A6' + s + out;
}
/** Guardians for a set of students: parent-user email + the student's guardian phone. */
function guardianContactsForStudents_(students) {
  var usersById = indexById_(readTableSafe_('Users'));
  var emailByStudent = {};
  readTableSafe_('ParentStudents').forEach(function (ps) {
    var u = usersById[ps.parentUserId]; if (!u) return;
    var e = String(u.email || '').trim().toLowerCase();
    if (e && EMAIL_RE.test(e) && !emailByStudent[ps.studentId]) emailByStudent[ps.studentId] = e;
  });
  return students.map(function (s) {
    return {
      studentId: s.id, student: fullNameOf_(s), admissionNo: s.admissionNo || '',
      classArm: classArmLabel_(s.classArmId),
      guardianName: s.guardianName || '',
      email: emailByStudent[s.id] || '',
      phone: String(s.guardianPhone || '').trim()
    };
  });
}
function staffContacts_(staffList) {
  return staffList.map(function (st) {
    return { staffId: st.id, name: fullNameOf_(st), designation: st.designation || '', section: st.section || '', email: String(st.email || '').trim(), phone: String(st.phone || '').trim() };
  });
}
function resolveMessageRecipients_(user, opts) {
  opts = opts || {};
  var audience = MESSAGE_AUDIENCES.indexOf(opts.to) !== -1 ? opts.to : 'PARENTS';
  var students = scopedStudents_(user), staff = scopedStaff_(user);
  if (opts.section) {
    students = students.filter(function (s) { return studentSection_(s.classArmId) === opts.section; });
    staff = staff.filter(function (st) { return String(st.section) === String(opts.section); });
  }
  if (opts.classArmId) students = students.filter(function (s) { return String(s.classArmId) === String(opts.classArmId); });
  var guardians = (audience === 'PARENTS' || audience === 'BOTH') ? guardianContactsForStudents_(students) : [];
  var members = (audience === 'STAFF' || audience === 'BOTH') ? staffContacts_(staff) : [];
  return { audience: audience, guardians: guardians, staff: members };
}
function uniqAddresses_(list) {
  var seen = {}, out = [];
  list.forEach(function (x) { var v = String(x || '').trim(); if (!v) return; var k = v.toLowerCase(); if (!seen[k]) { seen[k] = true; out.push(v); } });
  return out;
}
/** Default dialling country code for normalising phone numbers (Settings key SMS_COUNTRY_CODE). */
function smsCountryCode_() {
  var cc = String(getSetting_('SMS_COUNTRY_CODE', '234')).replace(/[^0-9]/g, '');
  return cc || '234';
}
/** Normalise a phone number to international digit form (no +). e.g. 0801… -> 234801… */
function normalizePhone_(raw, cc) {
  var d = String(raw || '').replace(/[^0-9]/g, '');
  if (!d) return '';
  cc = String(cc || smsCountryCode_()).replace(/[^0-9]/g, '') || '234';
  if (d.indexOf('00') === 0) d = d.slice(2);
  if (d.indexOf(cc) === 0 && d.length >= cc.length + 7) return d;
  if (d.charAt(0) === '0') d = d.slice(1);
  if (d.length <= 10) return cc + d;
  return d;
}
/** SMS configuration: an API provider (Termii) and/or the legacy email-to-SMS gateway. */
function smsProviderConfig_() {
  var provider = String(getSetting_('SMS_PROVIDER', '')).trim().toUpperCase();
  var apiKey = String(getSetting_('SMS_API_KEY', '')).trim();
  if (!provider && apiKey) provider = 'TERMII';
  var senderId = String(getSetting_('SMS_SENDER_ID', 'KMS')).trim() || 'KMS';
  var channel = String(getSetting_('SMS_CHANNEL', 'generic')).trim().toLowerCase();
  if (['generic', 'dnd', 'voice', 'whatsapp'].indexOf(channel) === -1) channel = 'generic';
  var gateway = String(getSetting_('SMS_EMAIL_GATEWAY', '')).trim();
  return {
    provider: provider, apiKey: apiKey, senderId: senderId, channel: channel,
    countryCode: smsCountryCode_(), gateway: gateway,
    configured: !!(apiKey && provider), ready: !!(apiKey && provider) || !!gateway
  };
}
/** Send a single SMS via the configured provider (Termii) or the email-to-SMS gateway. Never throws. */
function sendSmsText_(phone, text, subject) {
  var cfg = smsProviderConfig_();
  var to = normalizePhone_(phone, cfg.countryCode);
  if (!to) return { ok: false, reason: 'no-phone' };
  if (cfg.provider === 'TERMII' && cfg.apiKey) {
    try {
      var resp = UrlFetchApp.fetch('https://api.ng.termii.com/api/sms/send', {
        method: 'post', contentType: 'application/json', muteHttpExceptions: true,
        payload: JSON.stringify({ api_key: cfg.apiKey, to: to, from: cfg.senderId, sms: String(text).slice(0, 1000), type: 'plain', channel: cfg.channel })
      });
      var status = 0; try { status = resp.getResponseCode(); } catch (e) { /* ignore */ }
      var raw = ''; try { raw = resp.getContentText(); } catch (e) { /* ignore */ }
      var json = {}; try { json = JSON.parse(raw); } catch (e) { /* ignore */ }
      if (status >= 200 && status < 300 && String(json.code || '').toLowerCase() === 'ok') return { ok: true, provider: 'TERMII', id: json.message_id || '' };
      return { ok: false, reason: 'provider-error', status: status, detail: String(json.message || raw || '').slice(0, 200) };
    } catch (e) { return { ok: false, reason: 'fetch-failed', detail: String(e && e.message || e) }; }
  }
  if (cfg.gateway) {
    try { MailApp.sendEmail({ to: to + cfg.gateway, subject: subject || CFG.APP_NAME, body: String(text) }); return { ok: true, provider: 'EMAIL_GATEWAY' }; }
    catch (e) { return { ok: false, reason: 'mail-failed', detail: String(e && e.message || e) }; }
  }
  return { ok: false, reason: 'not-configured' };
}
/** Sends one message per recipient (email and/or SMS). Never throws on a single failure. */
function dispatchMessages_(emails, phones, channel, subject, body, html) {
  var cfg = smsProviderConfig_();
  var wantsEmail = (channel === 'EMAIL' || channel === 'BOTH');
  var wantsSms = (channel === 'SMS' || channel === 'BOTH');
  var emailList = wantsEmail ? uniqAddresses_(emails) : [];
  var phoneList = wantsSms ? uniqAddresses_(phones).filter(function (p) { return normalizePhone_(p, cfg.countryCode); }) : [];
  var capped = 0, budget = MAX_MESSAGE_RECIPIENTS, totalUnits = emailList.length + phoneList.length;
  if (totalUnits > budget) capped = totalUnits - budget;
  if (emailList.length > budget) emailList = emailList.slice(0, budget);
  var remaining = Math.max(0, budget - emailList.length);
  if (phoneList.length > remaining) phoneList = phoneList.slice(0, remaining);
  var htmlBody = '<div style="font-family:Arial,Helvetica,sans-serif;color:#1b2a26;font-size:14px">' + (html || escHtml_(body).replace(/\n/g, '<br>')) + '</div>';
  var quota = -1; try { quota = MailApp.getRemainingDailyQuota(); } catch (e) { /* ignore */ }
  var emailSent = 0, emailFailed = 0;
  emailList.forEach(function (addr) {
    try { MailApp.sendEmail({ to: addr, subject: subject, body: body, htmlBody: htmlBody }); emailSent++; }
    catch (e) { emailFailed++; }
  });
  var smsSent = 0, smsFailed = 0, smsSkipped = 0;
  if (wantsSms) {
    if (!cfg.ready) smsSkipped = phoneList.length;
    else phoneList.forEach(function (p) {
      var r = sendSmsText_(p, body, subject);
      if (r.ok) smsSent++; else if (r.reason === 'not-configured' || r.reason === 'no-phone') smsSkipped++; else smsFailed++;
    });
  }
  return {
    sent: emailSent + smsSent, failed: emailFailed + smsFailed, skipped: smsSkipped, capped: capped,
    total: emailList.length + phoneList.length, quota: quota,
    emailSent: emailSent, emailFailed: emailFailed, smsSent: smsSent, smsFailed: smsFailed,
    smsGateway: cfg.gateway, smsProvider: cfg.provider, smsReady: cfg.ready
  };
}
function assertComms_(user) { assertRole_(user, COMMS_ROLES, 'Messaging is for school leadership and finance.'); }

function api_messageAudience(token, opts) {
  var user = requireUser_(token);
  assertComms_(user);
  var cfg = smsProviderConfig_();
  var r = resolveMessageRecipients_(user, opts);
  var guardianEmails = uniqAddresses_(r.guardians.map(function (g) { return g.email; }));
  var guardianPhones = uniqAddresses_(r.guardians.map(function (g) { return g.phone; }));
  var staffEmails = uniqAddresses_(r.staff.map(function (s) { return s.email; }));
  var staffPhones = uniqAddresses_(r.staff.map(function (s) { return s.phone; }));
  return {
    audience: r.audience,
    sections: user.role === 'ADMIN' ? CFG.SECTIONS.slice() : sectionsFromArms_(armsMap_(user)),
    guardianCount: r.guardians.length, guardianEmailCount: guardianEmails.length, guardianPhoneCount: guardianPhones.length,
    staffCount: r.staff.length, staffEmailCount: staffEmails.length, staffPhoneCount: staffPhones.length,
    smsGateway: String(getSetting_('SMS_EMAIL_GATEWAY', '')),
    smsProvider: cfg.provider, smsReady: cfg.ready,
    cap: MAX_MESSAGE_RECIPIENTS,
    sample: r.guardians.slice(0, 6).map(function (g) { return { name: g.student, guardianName: g.guardianName, classArm: g.classArm, email: g.email, phone: g.phone }; })
      .concat(r.staff.slice(0, 4).map(function (s) { return { name: s.name, guardianName: s.designation, classArm: s.section, email: s.email, phone: s.phone }; }))
  };
}
function api_sendMessage(token, payload) {
  var user = requireUser_(token);
  assertComms_(user);
  payload = payload || {};
  var subject = String(payload.subject || '').trim();
  var body = String(payload.body || '').trim();
  if (!subject) throw new Error('A subject is required.');
  if (!body) throw new Error('A message body is required.');
  var channel = MESSAGE_CHANNELS.indexOf(payload.channel) !== -1 ? payload.channel : 'EMAIL';
  var r = resolveMessageRecipients_(user, payload);
  var emails = [], phones = [];
  r.guardians.forEach(function (g) { if (g.email) emails.push(g.email); if (g.phone) phones.push(g.phone); });
  r.staff.forEach(function (s) { if (s.email) emails.push(s.email); if (s.phone) phones.push(s.phone); });
  var result = dispatchMessages_(emails, phones, channel, subject, body, payload.html);
  logAudit_(user, 'SEND_MESSAGE', r.audience, channel + ' sent=' + result.sent + ' failed=' + result.failed + ' skipped=' + result.skipped);
  return result;
}
function api_sendFeeReminders(token, termId, opts) {
  var user = requireUser_(token);
  assertComms_(user);
  opts = opts || {};
  var term = termId ? findById_('Terms', termId) : getCurrentTerm_();
  if (!term) throw new Error('No term is available.');
  var students = scopedStudents_(user);
  if (opts.section) students = students.filter(function (s) { return studentSection_(s.classArmId) === opts.section; });
  var levelById = indexById_(readTable_('ClassLevels')), armById = indexById_(readTable_('ClassArms'));
  var selByStudent = {};
  readTableSafe_('FeeSelections').forEach(function (r) {
    if (String(r.termId) !== String(term.id)) return;
    selByStudent[r.studentId] = selByStudent[r.studentId] || {};
    selByStudent[r.studentId][r.feeId] = r.selected;
  });
  var paidByStudent = {};
  readTable_('Payments').forEach(function (p) {
    if (String(p.termId) !== String(term.id)) return;
    if (String(p.status || '').toUpperCase() === 'REJECTED') return;
    paidByStudent[p.studentId] = round2_((paidByStudent[p.studentId] || 0) + numOrZero_(p.amount));
  });
  var feesByLevel = {};
  var debtors = students.map(function (st) {
    var arm = armById[st.classArmId], level = arm ? levelById[arm.classLevelId] : null;
    if (!level) return null;
    if (!feesByLevel[level.id]) feesByLevel[level.id] = applicableFeesForLevel_(level, term);
    var sel = selByStudent[st.id] || {}, bill = 0;
    feesByLevel[level.id].forEach(function (f) {
      var r = sel[f.id], mandatory = toBool_(f.mandatory);
      var selected = r === undefined ? mandatory : (mandatory || toBool_(r));
      if (selected) bill += numOrZero_(f.amount);
    });
    var paid = paidByStudent[st.id] || 0, balance = round2_(Math.max(0, bill - paid));
    if (balance <= 0) return null;
    return { studentId: st.id, student: fullNameOf_(st), admissionNo: st.admissionNo || '', classArm: classArmLabel_(st.classArmId), bill: round2_(bill), paid: round2_(paid), balance: balance };
  }).filter(Boolean);
  var totalOutstanding = round2_(debtors.reduce(function (t, d) { return t + d.balance; }, 0));
  if (opts.dryRun) return { term: termRef_(term.id), debtors: debtors.length, totalOutstanding: totalOutstanding, sample: debtors.slice(0, 10) };
  var channel = MESSAGE_CHANNELS.indexOf(opts.channel) !== -1 ? opts.channel : 'EMAIL';
  var wantsEmail = (channel === 'EMAIL' || channel === 'BOTH');
  var wantsSms = (channel === 'SMS' || channel === 'BOTH');
  var contacts = guardianContactsForStudents_(students);
  var emailByStudent = {}, phoneByStudent = {};
  contacts.forEach(function (c) { emailByStudent[c.studentId] = c.email; phoneByStudent[c.studentId] = c.phone; });
  var subject = 'Outstanding school fees \u2014 ' + termLabel_(term);
  var quota = -1; try { quota = MailApp.getRemainingDailyQuota(); } catch (e) { /* ignore */ }
  var sent = 0, skipped = 0, failed = 0;
  debtors.forEach(function (d) {
    var email = emailByStudent[d.studentId], phone = phoneByStudent[d.studentId], delivered = false;
    var bodyText = [
      'Dear Guardian,', '',
      'Our records show an outstanding balance on school fees for ' + d.student + (d.classArm ? ' (' + d.classArm + ')' : '') + ' for ' + termLabel_(term) + '.', '',
      'Total bill: ' + money_(d.bill),
      'Amount paid: ' + money_(d.paid),
      'Outstanding: ' + money_(d.balance), '',
      'Kindly settle this balance at the school office. If you have already paid, please disregard this message.', '',
      CFG.APP_NAME + ' \u00B7 Finance Office'
    ].join('\n');
    if (wantsEmail && email) { try { MailApp.sendEmail({ to: email, subject: subject, body: bodyText }); sent++; delivered = true; } catch (e) { failed++; } }
    if (wantsSms && phone) { var sr = sendSmsText_(phone, bodyText, subject); if (sr.ok) { sent++; delivered = true; } else if (sr.reason !== 'not-configured' && sr.reason !== 'no-phone') failed++; }
    if (!delivered) skipped++;
  });
  logAudit_(user, 'SEND_FEE_REMINDERS', term.id, channel + ' sent=' + sent + ' skipped=' + skipped);
  return { term: termRef_(term.id), channel: channel, debtors: debtors.length, sent: sent, skipped: skipped, failed: failed, totalOutstanding: totalOutstanding, quota: quota };
}
function api_sendAttendanceAlerts(token, opts) {
  var user = requireUser_(token);
  assertComms_(user);
  opts = opts || {};
  var term = opts.termId ? findById_('Terms', opts.termId) : getCurrentTerm_();
  var threshold = Number(opts.threshold); if (isNaN(threshold) || threshold <= 0 || threshold > 100) threshold = 75;
  var minDays = Number(opts.minDays); if (isNaN(minDays) || minDays < 1) minDays = 3;
  var students = scopedStudents_(user);
  if (opts.section) students = students.filter(function (s) { return studentSection_(s.classArmId) === opts.section; });
  var scopedIds = {}; students.forEach(function (s) { scopedIds[String(s.id)] = true; });
  var agg = {};
  readTable_('Attendance').forEach(function (a) {
    if (!scopedIds[String(a.studentId)]) return;
    var d = String(a.date || '');
    if (term) { var from = term.startDate || '', to = term.endDate || ''; if (from && d < from) return; if (to && d > to) return; }
    var st = String(a.status || '').toUpperCase();
    if (CFG.ATTENDANCE_STATUSES.indexOf(st) === -1) return;
    agg[a.studentId] = agg[a.studentId] || { present: 0, total: 0 };
    agg[a.studentId].total++; if (st === 'PRESENT') agg[a.studentId].present++;
  });
  var studentsById = indexById_(students);
  var atRisk = Object.keys(agg).map(function (sid) {
    var a = agg[sid];
    if (a.total < minDays) return null;
    var rate = round2_(a.present / a.total * 100);
    if (rate >= threshold) return null;
    var s = studentsById[sid];
    return { studentId: sid, student: s ? fullNameOf_(s) : '\u2014', classArm: s ? classArmLabel_(s.classArmId) : '', rate: rate, present: a.present, absences: a.total - a.present, total: a.total };
  }).filter(Boolean).sort(function (x, y) { return x.rate - y.rate; });
  if (opts.dryRun) return { term: term ? termRef_(term.id) : null, threshold: threshold, minDays: minDays, count: atRisk.length, sample: atRisk.slice(0, 10) };
  var channel = MESSAGE_CHANNELS.indexOf(opts.channel) !== -1 ? opts.channel : 'EMAIL';
  var wantsEmail = (channel === 'EMAIL' || channel === 'BOTH');
  var wantsSms = (channel === 'SMS' || channel === 'BOTH');
  var contacts = guardianContactsForStudents_(students);
  var emailByStudent = {}, phoneByStudent = {};
  contacts.forEach(function (c) { emailByStudent[c.studentId] = c.email; phoneByStudent[c.studentId] = c.phone; });
  var subject = 'Attendance alert \u2014 ' + (term ? termLabel_(term) : CFG.APP_NAME);
  var quota = -1; try { quota = MailApp.getRemainingDailyQuota(); } catch (e) { /* ignore */ }
  var sent = 0, skipped = 0, failed = 0;
  atRisk.forEach(function (d) {
    var email = emailByStudent[d.studentId], phone = phoneByStudent[d.studentId], delivered = false;
    var bodyText = [
      'Dear Guardian,', '',
      'Our records show that ' + d.student + (d.classArm ? ' (' + d.classArm + ')' : '') + ' has attended ' + d.rate + '% of school days this term (' + d.absences + ' absence(s) in ' + d.total + ' recorded days).', '',
      'We are concerned about this level of attendance. Kindly ensure regular attendance and contact the school office if there are difficulties.', '',
      CFG.APP_NAME + ' \u00B7 School Office'
    ].join('\n');
    if (wantsEmail && email) { try { MailApp.sendEmail({ to: email, subject: subject, body: bodyText }); sent++; delivered = true; } catch (e) { failed++; } }
    if (wantsSms && phone) { var sr = sendSmsText_(phone, bodyText, subject); if (sr.ok) { sent++; delivered = true; } else if (sr.reason !== 'not-configured' && sr.reason !== 'no-phone') failed++; }
    if (!delivered) skipped++;
  });
  logAudit_(user, 'SEND_ATTENDANCE_ALERTS', term ? term.id : '', channel + ' sent=' + sent + ' skipped=' + skipped);
  return { term: term ? termRef_(term.id) : null, channel: channel, threshold: threshold, minDays: minDays, count: atRisk.length, sent: sent, skipped: skipped, failed: failed, quota: quota };
}

/* ---- staff attendance register ---- */
function api_getStaffRoster(token, date) {
  var user = requireUser_(token);
  assertRole_(user, ['ADMIN', 'PRINCIPAL', 'HEADMASTER'], 'The staff register is for school leadership.');
  date = String(date || todayIso_()).slice(0, 10);
  var staff = scopedStaff_(user).slice().sort(function (a, b) { return fullNameOf_(a).localeCompare(fullNameOf_(b)); });
  var existing = {};
  readTableSafe_('StaffAttendance').forEach(function (r) { if (String(r.date).slice(0, 10) === date) existing[r.staffId] = r; });
  return {
    date: date,
    statuses: CFG.ATTENDANCE_STATUSES,
    records: staff.map(function (st) {
      var e = existing[st.id];
      return { staffId: st.id, staffNo: st.staffNo || '', name: fullNameOf_(st), designation: st.designation || '', section: st.section || '', status: e ? String(e.status || '') : '', note: e ? String(e.note || '') : '' };
    })
  };
}
function api_saveStaffAttendance(token, date, records) {
  var user = requireUser_(token);
  assertRole_(user, ['ADMIN', 'PRINCIPAL', 'HEADMASTER'], 'The staff register is for school leadership.');
  date = String(date || '').slice(0, 10);
  if (!date) throw new Error('A date is required.');
  var allowed = {}; scopedStaff_(user).forEach(function (st) { allowed[st.id] = true; });
  var existingByStaff = {};
  readTableSafe_('StaffAttendance').forEach(function (r) { if (String(r.date).slice(0, 10) === date && allowed[r.staffId]) existingByStaff[r.staffId] = r; });
  var saved = 0;
  (records || []).forEach(function (rec) {
    if (!rec || !rec.staffId || !allowed[rec.staffId]) return;
    var st = String(rec.status || '').toUpperCase();
    if (CFG.ATTENDANCE_STATUSES.indexOf(st) === -1) st = 'PRESENT';
    var note = String(rec.note || '');
    var ex = existingByStaff[rec.staffId];
    if (ex) updateRow_('StaffAttendance', ex.id, { status: st, note: note, recordedBy: user.id });
    else appendRow_('StaffAttendance', { id: uuid_(), date: date, staffId: rec.staffId, status: st, note: note, recordedBy: user.id, createdAt: nowIso_() });
    saved++;
  });
  logAudit_(user, 'SAVE_STAFF_ATTENDANCE', date, saved + ' records');
  return { date: date, saved: saved };
}

/* ---- timetable / exam schedule ---- */
function armLabelAll_(armId) {
  var a = getArmById_(armId), l = a ? findById_('ClassLevels', a.classLevelId) : null;
  return a && l ? (l.section + ' \u00B7 ' + l.name + ' ' + a.name) : '';
}
function timetableArms_(user) {
  if (user.role === 'PARENT') {
    var wardIds = parentStudentIds_(user), seen = {}, out = [];
    readTable_('Students').forEach(function (s) {
      if (wardIds.indexOf(String(s.id)) !== -1 && s.classArmId && !seen[s.classArmId]) { seen[s.classArmId] = true; out.push({ id: s.classArmId, label: armLabelAll_(s.classArmId) }); }
    });
    return out;
  }
  return getClassArms_(user).map(function (a) { return { id: a.id, label: a.classLevel ? (a.classLevel.section + ' \u00B7 ' + a.classLevel.name + ' ' + a.name) : a.name }; });
}
function timetableScopeCheck_(user, armId) {
  if (user.role === 'PARENT') {
    var wardIds = parentStudentIds_(user);
    var ok = readTable_('Students').some(function (s) { return String(s.classArmId) === String(armId) && wardIds.indexOf(String(s.id)) !== -1; });
    if (!ok) throw new Error('That timetable is not for your ward.');
    return;
  }
  assertArmAllowed_(user, armId);
}
function byDayTime_(a, b) {
  var da = DAYS_OF_WEEK.indexOf(String(a.dayOfWeek).toUpperCase()), db = DAYS_OF_WEEK.indexOf(String(b.dayOfWeek).toUpperCase());
  if (da !== db) return da - db;
  return String(a.startTime || '').localeCompare(String(b.startTime || ''));
}
function timetableView_(e, subjectsById) {
  var s = subjectsById[e.subjectId];
  return {
    id: e.id, termId: e.termId, classArmId: e.classArmId,
    dayOfWeek: String(e.dayOfWeek || ''), startTime: String(e.startTime || ''), endTime: String(e.endTime || ''),
    subjectId: e.subjectId || '', subject: s ? s.name : '', title: String(e.title || ''),
    teacher: String(e.teacher || ''), room: String(e.room || ''), kind: String(e.kind || 'CLASS'), note: String(e.note || '')
  };
}
function api_listTimetable(token, opts) {
  var user = requireUser_(token);
  opts = opts || {};
  var arms = timetableArms_(user);
  var armId = String(opts.classArmId || '');
  if (!armId && arms.length) armId = arms[0].id;
  if (!armId) return { arms: arms, classArmId: '', classArm: '', termId: '', days: DAYS_OF_WEEK, kinds: TIMETABLE_KINDS, terms: getTerms_().map(function (t) { return { id: t.id, label: termLabel_(t) }; }), entries: [] };
  timetableScopeCheck_(user, armId);
  var cur = getCurrentTerm_();
  var termId = String(opts.termId || (cur ? cur.id : ''));
  var subjectsById = indexById_(readTableSafe_('Subjects'));
  var entries = readTableSafe_('Timetable').filter(function (e) {
    return String(e.classArmId) === String(armId) && (!termId || String(e.termId) === String(termId));
  }).sort(byDayTime_).map(function (e) { return timetableView_(e, subjectsById); });
  return {
    arms: arms, classArmId: armId, classArm: armLabelAll_(armId), termId: termId, days: DAYS_OF_WEEK, kinds: TIMETABLE_KINDS,
    terms: getTerms_().map(function (t) { return { id: t.id, label: termLabel_(t) }; }), entries: entries
  };
}
function api_saveTimetableEntry(token, payload) {
  var user = requireUser_(token);
  assertRole_(user, CFG.ENTRY_ROLES, 'You cannot edit the timetable.');
  payload = payload || {};
  var armId = String(payload.classArmId || '');
  if (!armId) throw new Error('Select a class.');
  assertArmAllowed_(user, armId);
  var cur = getCurrentTerm_();
  var termId = String(payload.termId || (cur ? cur.id : ''));
  var day = String(payload.dayOfWeek || '').toUpperCase();
  if (DAYS_OF_WEEK.indexOf(day) === -1) throw new Error('Select a day of the week.');
  var kind = TIMETABLE_KINDS.indexOf(String(payload.kind || '').toUpperCase()) !== -1 ? String(payload.kind).toUpperCase() : 'CLASS';
  var subjectId = String(payload.subjectId || '');
  var subject = subjectId ? findById_('Subjects', subjectId) : null;
  var title = String(payload.title || '').trim() || (subject ? subject.name : '');
  if (!title) throw new Error('Enter a subject or a title.');
  var fields = {
    termId: termId, classArmId: armId, dayOfWeek: day,
    startTime: String(payload.startTime || '').trim(), endTime: String(payload.endTime || '').trim(),
    subjectId: subjectId, title: title, teacher: String(payload.teacher || '').trim(), room: String(payload.room || '').trim(),
    kind: kind, note: String(payload.note || '').trim(), updatedAt: nowIso_()
  };
  if (payload.id) {
    var existing = findById_('Timetable', payload.id);
    if (!existing) throw new Error('Timetable entry not found.');
    assertArmAllowed_(user, existing.classArmId);
    updateRow_('Timetable', payload.id, fields);
    logAudit_(user, 'UPDATE_TIMETABLE', payload.id, day + ' ' + title);
    return { id: payload.id };
  }
  fields.id = uuid_(); fields.createdBy = user.id; fields.createdAt = nowIso_();
  appendRow_('Timetable', fields);
  logAudit_(user, 'ADD_TIMETABLE', fields.id, day + ' ' + title);
  return { id: fields.id };
}
function api_deleteTimetableEntry(token, id) {
  var user = requireUser_(token);
  assertRole_(user, CFG.ENTRY_ROLES, 'You cannot edit the timetable.');
  var e = findById_('Timetable', id);
  if (!e) throw new Error('Timetable entry not found.');
  assertArmAllowed_(user, e.classArmId);
  deleteRow_('Timetable', id);
  logAudit_(user, 'DELETE_TIMETABLE', id, '');
  return true;
}

/* =========================== 15. BOOTSTRAP / ADMIN =========================== */

function sanitizeUser_(u) {
  return { id: u.id, username: u.username, role: u.role, fullName: u.fullName, email: u.email, sectionScope: u.sectionScope, classArmScope: u.classArmScope, active: toBool_(u.active), createdAt: u.createdAt };
}
function pick_(payload, keys) { var out = {}; keys.forEach(function (k) { if (k !== 'id' && Object.prototype.hasOwnProperty.call(payload, k)) out[k] = payload[k]; }); return out; }
function api_bootstrap(token) {
  var user = requireUser_(token);
  var current = getCurrentTerm_();
  return {
    user: publicUser_(user),
    classLevels: getClassLevels_(), classLevelsAll: getClassLevels_(true), classArms: getClassArms_(user),
    subjects: readTable_('Subjects').filter(function (s) { return toBool_(s.active); }), subjectClass: readTable_('SubjectClass'),
    terms: getTerms_(), gradeScale: readTable_('GradeScale'), roles: CFG.ROLES, sections: CFG.SECTIONS,
    attendanceStatuses: CFG.ATTENDANCE_STATUSES, audiences: ANNOUNCE_AUDIENCES,
    paymentCategories: CFG.PAYMENT_CATEGORIES, paymentStatuses: CFG.PAYMENT_STATUSES, feeCategories: CFG.FEE_CATEGORIES,
    admissionStatuses: ADMISSION_STATUSES,
    currentTermId: current ? current.id : ''
  };
}
var REF_WRITE_ROLES = ['PRINCIPAL', 'HEADMASTER', 'BURSAR'];
function api_listRef(token, name) {
  requireUser_(token);
  if (!HEADERS[name]) throw new Error('Unknown table: ' + name);
  if (name === 'Users') return readTable_('Users').map(sanitizeUser_);
  if (name === 'ParentStudents') {
    var usersById = indexById_(readTable_('Users')), studentsById = indexById_(readTable_('Students'));
    return readTable_('ParentStudents').map(function (ps) {
      var u = usersById[ps.parentUserId], s = studentsById[ps.studentId];
      return { id: ps.id, parentUserId: ps.parentUserId, studentId: ps.studentId, relationship: ps.relationship, parentName: u ? (u.fullName || u.username) : '—', studentName: s ? fullNameOf_(s) : '—' };
    });
  }
  return readTable_(name).map(stripRow_);
}
function api_saveRef(token, name, payload) {
  var user = requireUser_(token);
  if (!HEADERS[name]) throw new Error('Unknown table: ' + name);
  payload = payload || {};
  if (name === 'Users') return saveUser_(user, payload);
  if (name === 'ParentStudents') {
    assertRole_(user, ['PRINCIPAL', 'HEADMASTER'], 'You cannot link parents.');
    if (!payload.parentUserId || !payload.studentId) throw new Error('Select a parent and a student.');
    var fields = { parentUserId: payload.parentUserId, studentId: payload.studentId, relationship: payload.relationship || '' };
    if (payload.id) { updateRow_('ParentStudents', payload.id, fields); return { id: payload.id }; }
    fields.id = uuid_(); fields.createdAt = nowIso_(); appendRow_('ParentStudents', fields); return { id: fields.id };
  }
  assertRole_(user, REF_WRITE_ROLES, 'You cannot modify reference data.');
  var f = pick_(payload, HEADERS[name]);
  if (name === 'ClassLevels') { if (!f.section || !f.name) throw new Error('Section and name are required.'); f.orderIndex = toNum_(f.orderIndex) || 0; if (!('active' in f)) f.active = true; }
  else if (name === 'ClassArms') { if (!f.classLevelId || !f.name) throw new Error('Class level and name are required.'); if (!('active' in f)) f.active = true; }
  else if (name === 'Subjects') { if (!f.section || !f.name) throw new Error('Section and name are required.'); if (!('active' in f)) f.active = true; }
  else if (name === 'SubjectClass') { if (!f.subjectId || !f.classLevelId) throw new Error('Subject and class level are required.'); }
  else if (name === 'Terms') { if (!f.sessionName || !f.termName) throw new Error('Session and term are required.'); f.isCurrent = toBool_(f.isCurrent); if (!('active' in f)) f.active = true; if (f.isCurrent) setOnlyCurrentTerm_(payload.id); }
  else if (name === 'GradeScale') { if (!f.section || !f.grade) throw new Error('Section and grade are required.'); f.minScore = toNum_(f.minScore) || 0; f.maxScore = toNum_(f.maxScore) || 0; f.orderIndex = toNum_(f.orderIndex) || 0; }
  if (payload.id) { if (!findById_(name, payload.id)) throw new Error('Record not found.'); updateRow_(name, payload.id, f); return stripRow_(findById_(name, payload.id)); }
  f.id = uuid_(); appendRow_(name, f); return stripRow_(findById_(name, f.id));
}
function setOnlyCurrentTerm_(keepId) { readTable_('Terms').forEach(function (t) { if (keepId && String(t.id) === String(keepId)) return; if (toBool_(t.isCurrent)) updateRow_('Terms', t.id, { isCurrent: false }); }); }
function api_deleteRef(token, name, id) {
  var user = requireUser_(token);
  if (!HEADERS[name]) throw new Error('Unknown table: ' + name);
  if (name === 'Users') { assertAdmin_(user); if (String(id) === String(user.id)) throw new Error('You cannot delete your own account.'); deleteRow_('Users', id); return true; }
  if (name === 'ParentStudents') { assertRole_(user, ['PRINCIPAL', 'HEADMASTER'], 'You cannot unlink parents.'); deleteRow_('ParentStudents', id); return true; }
  assertRole_(user, ['PRINCIPAL', 'HEADMASTER'], 'You cannot delete reference data.');
  deleteRow_(name, id); return true;
}
function saveUser_(caller, payload) {
  assertAdmin_(caller);
  if (!payload.username || !payload.role || CFG.ROLES.indexOf(payload.role) === -1) throw new Error('A valid username and role are required.');
  var fields = { username: String(payload.username).trim(), role: payload.role, fullName: payload.fullName || payload.username, email: String(payload.email || '').trim(), sectionScope: payload.sectionScope || '', classArmScope: payload.classArmScope || '', active: toBool_(payload.active) };
  if (payload.email && findWhere_('Users', function (u) { return String(u.email || '').toLowerCase() === String(payload.email).trim().toLowerCase() && (!payload.id || String(u.id) !== String(payload.id)); })) throw new Error('That email address is already in use.');
  if (payload.id) {
    if (!findById_('Users', payload.id)) throw new Error('User not found.');
    if (payload.password) { fields.salt = makeSalt_(); fields.passwordHash = hashPassword_(payload.password, fields.salt); }
    updateRow_('Users', payload.id, fields); return sanitizeUser_(findById_('Users', payload.id));
  }
  if (findWhere_('Users', function (u) { return String(u.username).toLowerCase() === fields.username.toLowerCase(); })) throw new Error('That username is already taken.');
  if (!payload.password) throw new Error('A password is required for a new user.');
  fields.id = uuid_(); fields.salt = makeSalt_(); fields.passwordHash = hashPassword_(payload.password, fields.salt); fields.createdAt = nowIso_();
  appendRow_('Users', fields); return sanitizeUser_(findById_('Users', fields.id));
}

/* ==================== 15b. USER MANAGEMENT API ==================== */

function logAudit_(caller, action, target, detail) {
  try {
    appendRow_('AuditLog', { id: uuid_(), at: nowIso_(), actorId: caller ? caller.id : '', actorUsername: caller ? caller.username : '', action: action, target: target || '', detail: detail || '' });
  } catch (e) { Logger.log('audit log failed: ' + (e && e.message ? e.message : e)); }
}
function publicUserForPanel_(u) {
  return { id: u.id, username: u.username, role: u.role, fullName: u.fullName, email: u.email, sectionScope: u.sectionScope, classArmScope: u.classArmScope, active: toBool_(u.active), createdAt: u.createdAt };
}
function assertAdminUser_(token) {
  var u = requireUser_(token);
  if (u.role !== 'ADMIN') throw new Error('Administrator access is required.');
  return u;
}
function api_listUsers(token) {
  assertAdminUser_(token);
  return readTable_('Users').map(publicUserForPanel_).sort(function (a, b) { return String(a.username).localeCompare(String(b.username)); });
}
function api_addUser(token, payload) {
  var caller = assertAdminUser_(token);
  payload = payload || {};
  var username = String(payload.username || '').trim();
  var role = String(payload.role || '');
  if (!username) throw new Error('Username is required.');
  if (!role || CFG.ROLES.indexOf(role) === -1) throw new Error('Choose a valid role.');
  if (findWhere_('Users', function (u) { return String(u.username).toLowerCase() === username.toLowerCase(); })) throw new Error('That username is already taken.');
  var email = String(payload.email || '').trim().toLowerCase();
  if (email && EMAIL_RE.test(email) === false) throw new Error('Enter a valid email address (or leave it blank).');
  if (email && findWhere_('Users', function (u) { return String(u.email || '').toLowerCase() === email; })) throw new Error('That email address is already in use.');
  var password = makePassword_();
  var salt = makeSalt_();
  var fields = {
    id: uuid_(), username: username, passwordHash: hashPassword_(password, salt), salt: salt,
    role: role, fullName: String(payload.fullName || '').trim() || username, email: email,
    sectionScope: String(payload.sectionScope || '').trim(), classArmScope: String(payload.classArmScope || '').trim(),
    active: true, createdAt: nowIso_()
  };
  appendRow_('Users', fields);
  logAudit_(caller, 'ADD_USER', fields.username, 'role=' + role);
  var emailed = sendCredentials_(email, username, password, 'Your ' + CFG.APP_NAME + ' portal login');
  return {
    user: publicUserForPanel_(fields),
    credentialsEmailed: emailed,
    password: emailed ? '' : password,
    message: emailed ? 'User created. Credentials were emailed to ' + email + '.' : 'User created. No email was given — the temporary password is shown once below.'
  };
}
function api_setUserActive(token, id, active) {
  var caller = assertAdminUser_(token);
  active = !!active;
  var u = findById_('Users', id);
  if (!u) throw new Error('User not found.');
  if (!active && String(u.id) === String(caller.id)) throw new Error('You cannot deactivate your own account.');
  if (!active && u.role === 'ADMIN') {
    var otherActiveAdmins = readTable_('Users').filter(function (x) { return x.role === 'ADMIN' && toBool_(x.active) && String(x.id) !== String(id); });
    if (otherActiveAdmins.length === 0) throw new Error('Cannot deactivate the last active administrator.');
  }
  updateRow_('Users', id, { active: active });
  bumpSessionEpoch_(id);
  logAudit_(caller, active ? 'ACTIVATE_USER' : 'DEACTIVATE_USER', u.username, '');
  return true;
}
function api_resetUserPassword(token, id) {
  var caller = assertAdminUser_(token);
  var u = findById_('Users', id);
  if (!u) throw new Error('User not found.');
  var password = makePassword_();
  var salt = makeSalt_();
  updateRow_('Users', id, { passwordHash: hashPassword_(password, salt), salt: salt });
  bumpSessionEpoch_(id);
  logAudit_(caller, 'RESET_USER_PASSWORD', u.username, '');
  var emailed = sendCredentials_(u.email, u.username, password, 'Your ' + CFG.APP_NAME + ' portal password has been reset');
  return {
    credentialsEmailed: emailed,
    password: emailed ? '' : password,
    message: emailed ? 'A new password was emailed to ' + u.email + '.' : 'No email on file — the new temporary password is shown once below.'
  };
}
function api_changeOwnPassword(token, oldPassword, newPassword) {
  var caller = requireUser_(token);
  var user = findById_('Users', caller.id);
  if (!user) throw new Error('Account not found.');
  if (hashPassword_(String(oldPassword || ''), user.salt) !== String(user.passwordHash)) throw new Error('Current password is incorrect.');
  if (String(newPassword || '').length < 8) throw new Error('New password must be at least 8 characters.');
  if (String(newPassword) === String(oldPassword)) throw new Error('New password must be different from the current one.');
  var salt = makeSalt_();
  updateRow_('Users', user.id, { passwordHash: hashPassword_(newPassword, salt), salt: salt });
  bumpSessionEpoch_(user.id);
  logAudit_(caller, 'CHANGE_OWN_PASSWORD', user.username, '');
  return true;
}
function api_listAudit(token) {
  assertAdminUser_(token);
  return readTable_('AuditLog').sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); });
}

/* ==================== 15c. TEACHER ASSIGNMENT (role-scoped) ==================== */

/**
 * Assignment scope: ADMIN covers all sections; PRINCIPAL covers SECONDARY;
 * HEADMASTER covers PRIMARY + KG (incl. creche/nursery). Returns the allowed arm ids,
 * or null for ADMIN (unrestricted).
 */
function teacherScopeArms_(user) {
  if (user.role === 'ADMIN') return null;
  var sections = userSections_(user);
  if (!sections.length) sections = ['KG', 'PRIMARY', 'SECONDARY'];
  var bySec = armIdsBySectionAll_(), out = [];
  sections.forEach(function (s) { (bySec[s] || []).forEach(function (id) { out.push(id); }); });
  return out;
}
function assertTeacherAssigner_(token) {
  var user = requireUser_(token);
  if (user.role !== 'ADMIN' && user.role !== 'PRINCIPAL' && user.role !== 'HEADMASTER') throw new Error('Only admins, the principal and the headmaster can assign teachers.');
  return user;
}
function assertScopeArms_(user, armIds) {
  var allowed = teacherScopeArms_(user);
  if (!allowed) return;
  armIds.forEach(function (a) { if (allowed.indexOf(String(a)) === -1) throw new Error('Some classes are outside your scope (' + (user.role === 'PRINCIPAL' ? 'secondary only' : 'primary & nursery only') + ').'); });
}
function teacherInScope_(user, t) {
  var allowed = teacherScopeArms_(user);
  if (!allowed) return true;
  var arms = userArmIds_(t);
  if (!arms.length) return false; // 'all classes' is outside a leader's scope
  for (var i = 0; i < arms.length; i++) if (allowed.indexOf(String(arms[i])) === -1) return false;
  return true;
}
function teacherViewModel_(u) {
  var armsById = indexById_(readTable_('ClassArms')), levelsById = indexById_(readTable_('ClassLevels'));
  return {
    id: u.id, username: u.username, fullName: u.fullName, email: u.email, active: toBool_(u.active),
    sectionScope: u.sectionScope || '', classArmScope: u.classArmScope || '',
    arms: userArmIds_(u).map(function (aid) {
      var a = armsById[aid], l = a ? levelsById[a.classLevelId] : null;
      return { id: aid, label: a && l ? (l.section + ' · ' + l.name + ' ' + a.name) : aid };
    })
  };
}
function api_listTeachers(token) {
  var user = assertTeacherAssigner_(token);
  return readTable_('Users').filter(function (u) { return u.role === 'TEACHER' && teacherInScope_(user, u); })
    .map(teacherViewModel_).sort(function (a, b) { return String(a.fullName || a.username).localeCompare(String(b.fullName || b.username)); });
}
function firstArmSection_(armIds) {
  var armsById = indexById_(readTable_('ClassArms')), levelsById = indexById_(readTable_('ClassLevels'));
  for (var i = 0; i < armIds.length; i++) { var a = armsById[armIds[i]], l = a ? levelsById[a.classLevelId] : null; if (l) return l.section; }
  return '';
}
function api_saveTeacher(token, payload) {
  var user = assertTeacherAssigner_(token);
  payload = payload || {};
  var armIds = (payload.armIds || []).map(String).filter(Boolean);
  assertScopeArms_(user, armIds);
  var id = payload.id || '', target = null;
  if (id) {
    target = findById_('Users', id);
    if (!target || target.role !== 'TEACHER') throw new Error('Teacher not found.');
    if (!teacherInScope_(user, target)) throw new Error('That teacher teaches classes outside your scope.');
  } else {
    var username = String(payload.username || '').trim();
    if (!username) throw new Error('Username is required.');
    if (!String(payload.fullName || '').trim()) throw new Error('Full name is required.');
    if (findWhere_('Users', function (x) { return String(x.username).toLowerCase() === username.toLowerCase(); })) throw new Error('That username is already taken.');
  }
  var email = String(payload.email || '').trim().toLowerCase();
  if (email && EMAIL_RE.test(email) === false) throw new Error('Enter a valid email address (or leave it blank).');
  if (email && findWhere_('Users', function (x) { return String(x.email || '').toLowerCase() === email && String(x.id) !== String(id); })) throw new Error('That email address is already in use.');
  if (target) {
    updateRow_('Users', target.id, {
      fullName: String(payload.fullName || '').trim() || target.fullName,
      email: email, sectionScope: armIds.length ? firstArmSection_(armIds) : target.sectionScope,
      classArmScope: armIds.join(',')
    });
    logAudit_(user, 'ASSIGN_TEACHER', target.username, 'classes: ' + armIds.join(','));
    return { teacher: teacherViewModel_(target), password: '', message: 'Classes updated for ' + target.username + '.' };
  }
  var password = makePassword_(), salt = makeSalt_();
  var fields = {
    id: uuid_(), username: String(payload.username).trim(), passwordHash: hashPassword_(password, salt), salt: salt,
    role: 'TEACHER', fullName: String(payload.fullName).trim(), email: email,
    sectionScope: armIds.length ? firstArmSection_(armIds) : String(payload.sectionScope || ''),
    classArmScope: armIds.join(','), active: true, createdAt: nowIso_()
  };
  appendRow_('Users', fields);
  logAudit_(user, 'CREATE_TEACHER', fields.username, 'classes: ' + armIds.join(','));
  var emailed = sendCredentials_(email, fields.username, password, 'Your ' + CFG.APP_NAME + ' portal login');
  return {
    teacher: teacherViewModel_(fields), credentialsEmailed: emailed, password: emailed ? '' : password,
    message: emailed ? 'Teacher created. Credentials were emailed to ' + email + '.' : 'Teacher created. No email was given — the temporary password is shown once below.'
  };
}
function api_setTeacherActive(token, userId, active) {
  var user = assertTeacherAssigner_(token);
  var t = findById_('Users', userId);
  if (!t || t.role !== 'TEACHER') throw new Error('Teacher not found.');
  if (String(t.id) === String(user.id)) throw new Error('You cannot deactivate your own account.');
  if (!teacherInScope_(user, t)) throw new Error('That teacher is outside your scope.');
  updateRow_('Users', t.id, { active: !!active });
  bumpSessionEpoch_(t.id);
  logAudit_(user, active ? 'ACTIVATE_TEACHER' : 'DEACTIVATE_TEACHER', t.username, '');
  return true;
}
function api_resetTeacherPassword(token, userId) {
  var user = assertTeacherAssigner_(token);
  var t = findById_('Users', userId);
  if (!t || t.role !== 'TEACHER') throw new Error('Teacher not found.');
  if (!teacherInScope_(user, t)) throw new Error('That teacher is outside your scope.');
  var password = makePassword_(), salt = makeSalt_();
  updateRow_('Users', t.id, { passwordHash: hashPassword_(password, salt), salt: salt });
  bumpSessionEpoch_(t.id);
  logAudit_(user, 'RESET_TEACHER_PASSWORD', t.username, '');
  var emailed = sendCredentials_(t.email, t.username, password, 'Your ' + CFG.APP_NAME + ' portal password has been reset');
  return {
    credentialsEmailed: emailed, password: emailed ? '' : password,
    message: emailed ? ('A new password was emailed to ' + t.email + '.') : 'No email on file — the new temporary password is shown once below.'
  };
}

/* ==================== 15d. PUBLIC ADMISSIONS ==================== */

var ADMISSION_STATUSES = ['PENDING', 'REVIEWED', 'OFFERED', 'ADMITTED', 'REJECTED'];
var APP_SUBMIT_COOLDOWN_SECONDS = 300; // per guardian phone/email
var APP_FILE_MAX_BYTES = 7 * 1024 * 1024; // ~7 MB per uploaded file

function admissionLevels_() { return getClassLevels_(); }
function nextApplicationRef_() {
  var prefix = 'KMS/APP/' + new Date().getFullYear() + '/', max = 0;
  readTable_('Applications').forEach(function (a) { var v = String(a.ref || ''); if (v.indexOf(prefix) === 0) { var n = parseInt(v.slice(prefix.length), 10); if (!isNaN(n) && n > max) max = n; } });
  var next = String(max + 1); while (next.length < 4) next = '0' + next; return prefix + next;
}
function assertValidDob_(value) {
  var t = Date.parse(value);
  if (isNaN(t)) throw new Error('Enter a valid date of birth.');
  if (t > Date.now()) throw new Error('Date of birth cannot be in the future.');
  return new Date(t).toISOString().slice(0, 10);
}
function storePublicFile_(ownerType, ownerId, filePayload) {
  if (!filePayload || !filePayload.dataUrl) return null;
  if (filePayload.size && Number(filePayload.size) > APP_FILE_MAX_BYTES) throw new Error('Uploaded files must be smaller than 7 MB.');
  var folder = getOrCreateSubfolder_(resolveRootFolder_(), 'Applications');
  var parts = String(filePayload.dataUrl).split(',');
  var base64 = parts.length > 1 ? parts[1] : parts[0];
  var mime = filePayload.mimeType || 'application/octet-stream';
  var name = filePayload.name || ('app-' + Date.now());
  var blob = Utilities.newBlob(Utilities.base64Decode(base64), mime, name);
  var file = folder.createFile(blob);
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) { /* domain may forbid */ }
  var url = 'https://drive.google.com/uc?export=view&id=' + file.getId();
  appendRow_('Files', { id: uuid_(), ownerType: ownerType, ownerId: ownerId, name: file.getName(), mimeType: mime, size: blob.getBytes().length, driveFileId: file.getId(), url: url, uploadedBy: '', createdAt: nowIso_() });
  return { driveFileId: file.getId(), url: url, name: file.getName() };
}
function applicationViewModel_(a) {
  var levelsById = indexById_(readTable_('ClassLevels'));
  var l = levelsById[a.classLevelId];
  return {
    id: a.id, ref: a.ref, childFirstName: a.childFirstName, childMiddleName: a.childMiddleName || '', childLastName: a.childLastName,
    gender: a.gender, dateOfBirth: a.dateOfBirth, classLevelId: a.classLevelId,
    applyingClass: l ? (l.section + ' · ' + l.name) : '—',
    guardianName: a.guardianName, guardianPhone: a.guardianPhone, guardianEmail: a.guardianEmail || '',
    address: a.address || '', previousSchool: a.previousSchool || '', notes: a.notes || '',
    photoUrl: a.photoFileId ? ('https://drive.google.com/uc?export=view&id=' + a.photoFileId) : '',
    documentUrl: a.documentFileId ? ('https://drive.google.com/uc?export=view&id=' + a.documentFileId) : '',
    status: a.status || 'PENDING', submittedAt: a.submittedAt, reviewedAt: a.reviewedAt || '', reviewedBy: a.reviewedBy || '', remarks: a.remarks || ''
  };
}
function assertApplicationsAccess_(token) {
  var user = requireUser_(token);
  assertRole_(user, ['ADMIN', 'PRINCIPAL', 'HEADMASTER'], 'You do not have access to admission applications.');
  return user;
}
function assertApplicationScope_(user, a) {
  var sections = userSections_(user);
  if (user.role === 'ADMIN' || !sections.length) return;
  var level = findById_('ClassLevels', a.classLevelId);
  var sec = level ? level.section : '';
  if (sections.indexOf(sec) === -1) throw new Error('That application is outside your scope (' + (user.role === 'PRINCIPAL' ? 'secondary only' : 'primary & nursery only') + ').');
}

/** Public — no login required: submit an admission application from the website. */
function escHtml_(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function admissionRecipients_(guardianEmail) {
  var list = [];
  function add(e) { e = String(e || '').trim().toLowerCase(); if (e && EMAIL_RE.test(e) && list.indexOf(e) === -1) list.push(e); }
  add(guardianEmail);
  readTableSafe_('Users').forEach(function (u) { if ((u.role === 'ADMIN' || u.role === 'PRINCIPAL') && toBool_(u.active)) add(u.email); });
  add(OWNER_ADMIN_EMAIL);
  String(getSetting_('ADMISSION_NOTIFY_EMAILS', '')).split(/[,;\s]+/).forEach(add);
  return list;
}
function admissionPdfBlob_(a, level) {
  try {
    if (typeof DocumentApp === 'undefined') return null;
    var doc = DocumentApp.create('KMS Admission ' + a.ref);
    var body = doc.getBody();
    body.appendParagraph(CFG.APP_NAME).setHeading(DocumentApp.ParagraphHeading.HEADING1);
    body.appendParagraph('Admission Application — Reference ' + a.ref);
    [
      ['Applying for', level ? (level.section + ' · ' + level.name) : ''],
      ['Child', [a.childFirstName, a.childMiddleName, a.childLastName].filter(Boolean).join(' ')],
      ['Gender', a.gender], ['Date of birth', String(a.dateOfBirth || '').slice(0, 10)],
      ['Guardian name', a.guardianName], ['Guardian phone', a.guardianPhone], ['Guardian email', a.guardianEmail || ''],
      ['Home address', a.address || ''], ['Previous school', a.previousSchool || ''], ['Notes', a.notes || '']
    ].forEach(function (r) { body.appendParagraph(r[0] + ':  ' + r[1]); });
    body.appendParagraph('Status: PENDING (awaiting school review)');
    doc.saveAndClose();
    var file = DriveApp.getFileById(doc.getId());
    var blob = file.getAs('application/pdf').setName('KMS-Admission-' + a.ref + '.pdf');
    file.setTrashed(true);
    return blob;
  } catch (e) { Logger.log('admissionPdfBlob_ failed: ' + (e && e.message ? e.message : e)); return null; }
}
/** Sends the applicant + all admin/principal recipients a summary of the application (with PDF). */
function notifyAdmission_(a, level) {
  var subject = 'Admission application received — ' + a.ref + ' (' + [a.childFirstName, a.childLastName].filter(Boolean).join(' ') + ')';
  var text = [
    CFG.APP_NAME + ' — Admission application received',
    '', 'Reference: ' + a.ref,
    'Applying for: ' + (level ? (level.section + ' · ' + level.name) : ''),
    'Child: ' + [a.childFirstName, a.childMiddleName, a.childLastName].filter(Boolean).join(' '),
    'Gender: ' + a.gender, 'Date of birth: ' + String(a.dateOfBirth || '').slice(0, 10),
    'Guardian: ' + a.guardianName, 'Phone: ' + a.guardianPhone, 'Email: ' + (a.guardianEmail || '—'),
    'Address: ' + (a.address || '—'), 'Previous school: ' + (a.previousSchool || '—'),
    'Notes: ' + (a.notes || '—'), '', 'Status: PENDING — the school office will review this application.',
    ''
  ].join('\n');
  var rowHtml = function (label, value) {
    return '<tr><td style="padding:6px 8px;border:1px solid #e2e8e4;background:#f4f7f5;color:#14532d;white-space:nowrap"><strong>' + escHtml_(label) + '</strong></td><td style="padding:6px 8px;border:1px solid #e2e8e4">' + escHtml_(value) + '</td></tr>';
  };
  var html = '<html><body style="font-family:Arial,Helvetica,sans-serif;color:#1b2a26;max-width:640px;margin:0 auto">' +
    '<h2 style="color:#14532d;margin:0 0 4px">' + escHtml_(CFG.APP_NAME) + '</h2>' +
    '<p style="color:#66756f;margin:0 0 16px">Admission application received</p>' +
    '<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:14px">' +
    rowHtml('Reference', a.ref) + rowHtml('Applying for', level ? (level.section + ' · ' + level.name) : '') +
    rowHtml('Child', [a.childFirstName, a.childMiddleName, a.childLastName].filter(Boolean).join(' ')) +
    rowHtml('Gender', a.gender) + rowHtml('Date of birth', String(a.dateOfBirth || '').slice(0, 10)) +
    rowHtml('Guardian name', a.guardianName) + rowHtml('Guardian phone', a.guardianPhone) +
    rowHtml('Guardian email', a.guardianEmail || '—') + rowHtml('Home address', a.address || '—') +
    rowHtml('Previous school', a.previousSchool || '—') + rowHtml('Notes', a.notes || '—') +
    '</table><p style="color:#66756f;font-size:13px;margin-top:12px">Status: <strong>PENDING</strong> — the school office will review this application shortly.</p></body></html>';
  var recipients = admissionRecipients_(a.guardianEmail);
  if (!recipients.length) { Logger.log('No admission notification recipients configured for ' + a.ref); return; }
  try {
    var opts = { to: recipients.join(','), subject: subject, body: text, htmlBody: html };
    var pdf = admissionPdfBlob_(a, level);
    if (pdf) opts.attachments = [pdf];
    MailApp.sendEmail(opts);
    Logger.log('Admission notification for ' + a.ref + ' emailed to ' + recipients.length + ' recipient(s).');
  } catch (e) { Logger.log('Admission notification FAILED for ' + a.ref + ': ' + (e && e.message ? e.message : e)); }
}
function api_applyAdmission(payload) {
  payload = payload || {};
  if (String(payload.website || '').replace(/\s/g, '')) return { ref: 'KMS/APP/0000', status: 'PENDING', submitted: true, message: 'Your application has been received.' }; // honeypot
  var firstName = String(payload.firstName || '').trim(), lastName = String(payload.lastName || '').trim();
  if (!firstName || !lastName) throw new Error('First and last name are required.');
  if (['Male', 'Female'].indexOf(payload.gender) === -1) throw new Error('Select a gender.');
  var dob = assertValidDob_(payload.dateOfBirth);
  var level = findById_('ClassLevels', String(payload.classLevelId || ''));
  if (!level || !toBool_(level.active)) throw new Error('Select the class level you are applying for.');
  if (!String(payload.guardianName || '').trim()) throw new Error('A guardian name is required.');
  var phone = String(payload.guardianPhone || '').trim();
  if (phone.replace(/[^0-9]/g, '').length < 7) throw new Error('A valid guardian phone number is required.');
  var email = String(payload.guardianEmail || '').trim().toLowerCase();
  if (email && EMAIL_RE.test(email) === false) throw new Error('Enter a valid guardian email (or leave it blank).');
  var keys = ['app_phone_' + phone.replace(/[^0-9]/g, '')];
  if (email) keys.push('app_email_' + email);
  var cache = CacheService.getScriptCache();
  keys.forEach(function (key) {
    if (cache.get(key)) throw new Error('Thanks — another application from this contact was just received. Please try again in a few minutes.');
    cache.put(key, '1', APP_SUBMIT_COOLDOWN_SECONDS);
  });
  var id = uuid_(), ref = nextApplicationRef_();
  var fields = {
    id: id, ref: ref,
    childFirstName: firstName, childMiddleName: String(payload.middleName || '').trim(), childLastName: lastName,
    gender: payload.gender, dateOfBirth: dob, classLevelId: level.id,
    guardianName: String(payload.guardianName).trim(), guardianPhone: phone, guardianEmail: email,
    address: String(payload.address || '').trim(), previousSchool: String(payload.previousSchool || '').trim(), notes: String(payload.notes || '').trim(),
    photoFileId: '', documentFileId: '', status: 'PENDING', submittedAt: nowIso_(), reviewedAt: '', reviewedBy: '', remarks: ''
  };
  var photo = storePublicFile_('APPLICATION', ref, payload.photo);
  if (photo) fields.photoFileId = photo.driveFileId;
  var doc = storePublicFile_('APPLICATION', ref, payload.document);
  if (doc) fields.documentFileId = doc.driveFileId;
  appendRow_('Applications', fields);
  Logger.log('New admission application ' + ref + ' for ' + firstName + ' ' + lastName);
  notifyAdmission_(fields, level);
  return { ref: ref, status: 'PENDING', submitted: true, message: 'Your application has been received. A copy has been sent to your email and to the school office.' };
}
function api_listApplications(token) {
  var user = assertApplicationsAccess_(token);
  var sections = userSections_(user), list = readTable_('Applications');
  if (user.role !== 'ADMIN' && sections.length) {
    var secById = {}; readTable_('ClassLevels').forEach(function (l) { secById[l.id] = l.section; });
    list = list.filter(function (a) { return sections.indexOf(secById[a.classLevelId]) !== -1; });
  }
  list.sort(function (a, b) { return String(b.submittedAt).localeCompare(String(a.submittedAt)); });
  return list.map(applicationViewModel_);
}
function api_updateApplication(token, id, updates) {
  var user = assertApplicationsAccess_(token);
  updates = updates || {};
  var a = findById_('Applications', id);
  if (!a) throw new Error('Application not found.');
  assertApplicationScope_(user, a);
  var fields = {};
  if (updates.status) {
    if (ADMISSION_STATUSES.indexOf(updates.status) === -1) throw new Error('Invalid status.');
    fields.status = updates.status;
    fields.reviewedAt = nowIso_();
    fields.reviewedBy = user.username;
  }
  if (updates.remarks !== undefined) fields.remarks = String(updates.remarks || '');
  if (!Object.keys(fields).length) throw new Error('Nothing to update.');
  updateRow_('Applications', a.id, fields);
  logAudit_(user, 'UPDATE_APPLICATION', a.ref, 'status: ' + (updates.status || a.status));
  return applicationViewModel_(findById_('Applications', a.id));
}

/* =========================== 16. WEB ENTRY =========================== */

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (String(p.admission) === '1' || String(p.page) === 'admission') return admissionPage_(p);
  if (String(p.public) === 'announcements') return publicAnnouncementsJsonp_(p);
  var tpl = HtmlService.createTemplateFromFile('index');
  tpl.brandJson = JSON.stringify(brand_());
  tpl.initialViewJson = JSON.stringify(String(p.view || ''));
  tpl.embedJson = JSON.stringify(p.embed === '1' || p.embed === 'true');
  return tpl.evaluate()
    .setTitle(CFG.APP_NAME + ' — Portal')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function admissionPage_(p) {
  var tpl = HtmlService.createTemplateFromFile('Admission');
  tpl.brandJson = JSON.stringify(brand_());
  tpl.embedJson = JSON.stringify(p.embed === '1' || p.embed === 'true');
  tpl.levelOptionsJson = JSON.stringify(admissionLevels_());
  return tpl.evaluate()
    .setTitle(CFG.APP_NAME + ' — Admissions')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function onOpen() {
  try {
    SpreadsheetApp.getUi().createMenu('Kings Metro')
      .addItem('Run setup (RESET & re-seed)', 'setUp')
      .addToUi();
  } catch (e) { /* not container-bound */ }
}
