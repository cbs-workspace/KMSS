/**
 * ============================================================================
 * CAIIT Cisco Networking Academic Capacity-Building Initiative
 * University of Abuja (Yakubu Gowon University)
 * Centre for Artificial Intelligence & Innovative Technology (CAIIT)
 * ============================================================================
 */

/* ============================================================================
 * SECTION 1 - CONFIGURATION
 * ==========================================================================*/

const INFO_SHEET_ID = '1cu9Wm1fN8f-cKeDj5LEeSFGxQsF9Z7IAjsBZpF4Pvz8';
const INFO_TAB_NAME = 'Fac_Dept_MBBS';

const RESPONSE_SHEET_ID = '1ftX30oEsLJIhkGvzQuMSmbT6n6ah8JIh45_fxaTs9ww';
const RESPONSE_TAB_NAME = 'Responses';
const AUDIT_TAB_NAME    = 'Selection_Audit';
const COMMITTEE_TAB_NAME= 'Committee_Assessments';
const SETTINGS_TAB_NAME = 'Settings';
const USERS_TAB_NAME    = 'Users';
const SESSIONS_TAB_NAME = 'Sessions';

const SUBMISSION_PREFIX = 'CAIIT-CISCO-';
const SUBMISSION_MIN = 1000;
const SUBMISSION_MAX = 9999;

const SENDER_DISPLAY_NAME = 'CAIIT, University of Abuja (No-Reply)';
const CAIIT_REPLY_TO      = 'caiit@uniabuja.edu.ng';
const NOREPLY_FROM_ALIAS  = '';

const EMAIL_RE    = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
const STAFF_ID_RE = /^ACA\d{2,4}$/;
const PHONE_RE    = /^0\d{10}$/;

const PROGRAMME_NAME  = 'Cisco Networking Academic Capacity-Building Initiative';
const PROGRAMME_UNIT  = 'Centre for Artificial Intelligence & Innovative Technology (CAIIT)';
const PROGRAMME_HOME  = 'University of Abuja (Yakubu Gowon University)';

const APPLICATIONS_CLOSE_TEXT = 'Applications close 30 September 2026';
const TARGET_PARTICIPANTS = 48;
const APPLICATIONS_CLOSE_DEFAULT_ISO = '2026-09-30';

function getApplicationsCloseIso_() {
  try {
    var sheet = getSettingsSheet_();
    var last = sheet.getLastRow();
    if (last >= 2) {
      var rows = sheet.getRange(2, 1, last - 1, 2).getValues();
      for (var i = 0; i < rows.length; i++) {
        if (String(rows[i][0] || '').trim() === 'applications_close_iso') {
          var v = rows[i][1];
          if (v instanceof Date) return Utilities.formatDate(v, 'Africa/Lagos', 'yyyy-MM-dd');
          var str = String(v || '').trim();
          if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
          var d = new Date(str);
          if (!isNaN(d.getTime())) return Utilities.formatDate(d, 'Africa/Lagos', 'yyyy-MM-dd');
        }
      }
    }
  } catch (e) {}
  return APPLICATIONS_CLOSE_DEFAULT_ISO;
}

function getApplicationsCloseText_() {
  try {
    var sheet = getSettingsSheet_();
    var last = sheet.getLastRow();
    if (last >= 2) {
      var rows = sheet.getRange(2, 1, last - 1, 2).getValues();
      for (var i = 0; i < rows.length; i++) {
        if (String(rows[i][0] || '').trim() === 'applications_close') {
          var v = rows[i][1];
          if (v instanceof Date) return 'Applications close ' + Utilities.formatDate(v, 'Africa/Lagos', 'd MMMM yyyy');
          var str = String(v || '').trim();
          if (str) return str;
        }
      }
    }
  } catch (e) {}
  return APPLICATIONS_CLOSE_TEXT;
}

function isApplicationsClosed_() {
  var iso = getApplicationsCloseIso_();
  if (!iso) return false;
  var tz = 'Africa/Lagos';
  try { var t = Session.getScriptTimeZone(); if (t) tz = t; } catch (e) {}
  return Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd') > iso;
}

const OFFICIAL_FACULTIES = [];

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const PASSWORD_HASH_ITERATIONS = 250;
const MIN_PASSWORD_LENGTH = 8;
const LOGIN_MAX_FAILURES = 5;
const LOGIN_LOCKOUT_SECONDS = 900;

const USER_COLUMNS = ['Email', 'PasswordHash', 'Salt', 'Role', 'Active', 'CreatedAt', 'LastLogin', 'Notes'];
const SESSION_COLUMNS = ['TokenHash', 'Email', 'Role', 'CreatedAt', 'ExpiresAt', 'Status'];

const COMMITTEE_MAX_TEACHING = 5;
const COMMITTEE_MAX_IMPACT   = 5;

const DEFAULT_WEIGHTS = {
  ict: 15, networking: 10, teaching: 15, implementation: 15,
  motivation: 5, readiness: 10, learning: 5, impact: 10, aiReadiness: 5
};

/* ============================================================================
 * SECTION 2 - AUTHENTICATION
 * ==========================================================================*/

function bytesToHex_(bytes) {
  var s = '';
  for (var i = 0; i < bytes.length; i++) {
    var b = bytes[i] < 0 ? bytes[i] + 256 : bytes[i];
    s += (b < 16 ? '0' : '') + b.toString(16);
  }
  return s;
}
function generateSalt_() {
  var bytes = [];
  for (var i = 0; i < 16; i++) bytes.push(Math.floor(Math.random() * 256));
  return bytesToHex_(bytes);
}
function hashPassword_(password, salt) {
  var raw = salt + ':' + password;
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw, Utilities.Charset.UTF_8);
  for (var i = 1; i < PASSWORD_HASH_ITERATIONS; i++) {
    digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, digest);
  }
  return bytesToHex_(digest);
}
function generateToken_() {
  var raw = Utilities.getUuid() + ':' + new Date().getTime() + ':' + Math.random();
  return bytesToHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw));
}
function tokenHash_(token) {
  return bytesToHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(token)));
}

function ensureUsersSheet_() {
  var ss = SpreadsheetApp.openById(RESPONSE_SHEET_ID);
  var sheet = ss.getSheetByName(USERS_TAB_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(USERS_TAB_NAME);
    sheet.getRange(1, 1, 1, USER_COLUMNS.length).setValues([USER_COLUMNS]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}
function ensureSessionsSheet_() {
  var ss = SpreadsheetApp.openById(RESPONSE_SHEET_ID);
  var sheet = ss.getSheetByName(SESSIONS_TAB_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SESSIONS_TAB_NAME);
    sheet.getRange(1, 1, 1, SESSION_COLUMNS.length).setValues([SESSION_COLUMNS]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function findUserRow_(email) {
  var sheet = ensureUsersSheet_();
  var last = sheet.getLastRow();
  if (last < 2) return { sheet: sheet, row: -1, values: null };
  var values = sheet.getRange(2, 1, last - 1, USER_COLUMNS.length).getValues();
  var target = String(email || '').trim().toLowerCase();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0] || '').trim().toLowerCase() === target) return { sheet: sheet, row: i + 2, values: values[i] };
  }
  return { sheet: sheet, row: -1, values: null };
}

function publicUserRecord_(row) {
  return {
    email: String(row[0] || ''), role: String(row[3] || ''), active: String(row[4] || ''),
    createdAt: row[5] instanceof Date ? formatDateTime_(row[5]) : String(row[5] || ''),
    lastLogin: row[6] instanceof Date ? formatDateTime_(row[6]) : String(row[6] || ''),
    notes: String(row[7] || '')
  };
}

function isLoginLocked_(email) {
  var key = 'caiit_login_fail_' + String(email || '').toLowerCase();
  var v = CacheService.getScriptCache().get(key);
  return v !== null && parseInt(v, 10) >= LOGIN_MAX_FAILURES;
}
function recordLoginFailure_(email) {
  var key = 'caiit_login_fail_' + String(email || '').toLowerCase();
  var v = CacheService.getScriptCache().get(key);
  var n = (v ? parseInt(v, 10) : 0) + 1;
  CacheService.getScriptCache().put(key, String(n), LOGIN_LOCKOUT_SECONDS);
}
function clearLoginFailures_(email) {
  CacheService.getScriptCache().remove('caiit_login_fail_' + String(email || '').toLowerCase());
}

function authenticateUser(email, password) {
  try {
    email = String(email || '').trim().toLowerCase();
    password = String(password || '');
    if (!email || !password) return { success: false, message: 'Email and password are required.' };
    if (!EMAIL_RE.test(email)) return { success: false, message: 'Invalid email or password.' };
    if (isLoginLocked_(email)) return { success: false, message: 'Too many failed attempts. Please try again in 15 minutes.' };
    var u = findUserRow_(email);
    if (u.row === -1) { recordLoginFailure_(email); return { success: false, message: 'Invalid email or password.' }; }
    var storedHash = String(u.values[1] || '');
    var salt = String(u.values[2] || '');
    var role = String(u.values[3] || 'reviewer');
    var active = String(u.values[4] || '').toLowerCase();
    if (active !== 'yes' && active !== 'true' && active !== 'active') return { success: false, message: 'This account is not active.' };
    if (hashPassword_(password, salt) !== storedHash) { recordLoginFailure_(email); return { success: false, message: 'Invalid email or password.' }; }
    clearLoginFailures_(email);
    u.sheet.getRange(u.row, 7).setValue(new Date());
    var token = generateToken_();
    var now = new Date();
    var expires = new Date(now.getTime() + SESSION_TTL_MS);
    ensureSessionsSheet_().appendRow([tokenHash_(token), email, role, now, expires, 'active']);
    CacheService.getScriptCache().put('caiit_sess_' + tokenHash_(token),
      JSON.stringify({ email: email, role: role, expiresAt: expires.getTime() }), 21600);
    return { success: true, token: token, email: email, role: role };
  } catch (err) {
    Logger.log('authenticateUser failed: ' + (err && err.stack ? err.stack : err));
    return { success: false, message: 'Login failed. Please try again.' };
  }
}

function validateSession_(token) {
  if (!token) return null;
  var hash = tokenHash_(token);
  var cached = CacheService.getScriptCache().get('caiit_sess_' + hash);
  if (cached) {
    try {
      var obj = JSON.parse(cached);
      if (obj.expiresAt > new Date().getTime()) return { email: obj.email, role: obj.role };
    } catch (e) {}
  }
  try {
    var sheet = ensureSessionsSheet_();
    var last = sheet.getLastRow();
    if (last < 2) return null;
    var values = sheet.getRange(2, 1, last - 1, SESSION_COLUMNS.length).getValues();
    for (var i = 0; i < values.length; i++) {
      if (String(values[i][0] || '') !== hash) continue;
      if (String(values[i][5] || '').toLowerCase() !== 'active') return null;
      var exp = values[i][4] instanceof Date ? values[i][4].getTime() : 0;
      if (exp <= new Date().getTime()) return null;
      var out = { email: String(values[i][1] || ''), role: String(values[i][2] || '') };
      CacheService.getScriptCache().put('caiit_sess_' + hash,
        JSON.stringify({ email: out.email, role: out.role, expiresAt: exp }), 21600);
      return out;
    }
  } catch (e) { Logger.log('validateSession failed: ' + e.message); }
  return null;
}

function validateSession(token) {
  var s = validateSession_(token);
  if (!s) return { success: false };
  return { success: true, email: s.email, role: s.role };
}

function requireSession_(token) {
  var s = validateSession_(token);
  if (!s) { var err = new Error('SESSION_INVALID'); err.code = 'SESSION_INVALID'; throw err; }
  return s;
}
function sessionErrorPayload_() {
  return { success: false, error: 'SESSION_INVALID', message: 'Your session has expired. Please sign in again.' };
}

function logoutSession(token) {
  try {
    if (!token) return { success: true };
    var hash = tokenHash_(token);
    var sheet = ensureSessionsSheet_();
    var last = sheet.getLastRow();
    if (last >= 2) {
      var values = sheet.getRange(2, 1, last - 1, SESSION_COLUMNS.length).getValues();
      for (var i = 0; i < values.length; i++) {
        if (String(values[i][0] || '') === hash && String(values[i][5] || '').toLowerCase() === 'active') {
          sheet.getRange(i + 2, 6).setValue('revoked'); break;
        }
      }
    }
    CacheService.getScriptCache().remove('caiit_sess_' + hash);
    return { success: true };
  } catch (e) { return { success: true }; }
}

function revokeAllSessionsForEmail_(email) {
  try {
    var sheet = ensureSessionsSheet_();
    var last = sheet.getLastRow();
    if (last < 2) return 0;
    var values = sheet.getRange(2, 1, last - 1, SESSION_COLUMNS.length).getValues();
    var target = String(email || '').trim().toLowerCase();
    var n = 0;
    for (var i = 0; i < values.length; i++) {
      if (String(values[i][1] || '').toLowerCase() === target && String(values[i][5] || '').toLowerCase() === 'active') {
        sheet.getRange(i + 2, 6).setValue('revoked');
        CacheService.getScriptCache().remove('caiit_sess_' + String(values[i][0] || ''));
        n++;
      }
    }
    return n;
  } catch (e) { return 0; }
}

function changeOwnPassword(token, oldPassword, newPassword) {
  var s = validateSession_(token);
  if (!s) return sessionErrorPayload_();
  oldPassword = String(oldPassword || ''); newPassword = String(newPassword || '');
  if (newPassword.length < MIN_PASSWORD_LENGTH) return { success: false, message: 'New password must be at least ' + MIN_PASSWORD_LENGTH + ' characters.' };
  var u = findUserRow_(s.email);
  if (u.row === -1) return { success: false, message: 'Account not found.' };
  if (hashPassword_(oldPassword, String(u.values[2] || '')) !== String(u.values[1] || '')) return { success: false, message: 'Current password is incorrect.' };
  var salt = generateSalt_();
  var hash = hashPassword_(newPassword, salt);
  u.sheet.getRange(u.row, 2, 1, 2).setValues([[hash, salt]]);
  revokeAllSessionsForEmail_(s.email);
  return { success: true, message: 'Password changed. Please sign in again.' };
}

/* ============================================================================
 * SECTION 3 - USER MANAGEMENT (admin only)
 * ==========================================================================*/

function requireAdmin_(token) {
  var s = requireSession_(token);
  if (String(s.role).toLowerCase() !== 'admin') { var err = new Error('NOT_ADMIN'); err.code = 'NOT_ADMIN'; throw err; }
  return s;
}

function listUsers(token) {
  try {
    requireAdmin_(token);
    var sheet = ensureUsersSheet_();
    var last = sheet.getLastRow();
    if (last < 2) return { success: true, users: [] };
    var values = sheet.getRange(2, 1, last - 1, USER_COLUMNS.length).getValues();
    return { success: true, users: values.map(publicUserRecord_).filter(function (u) { return u.email; }) };
  } catch (e) {
    if (e.code === 'SESSION_INVALID') return sessionErrorPayload_();
    if (e.code === 'NOT_ADMIN') return { success: false, message: 'Administrator access required.' };
    return { success: false, message: 'Could not load users.' };
  }
}

function addUser(token, payload) {
  try {
    var admin = requireAdmin_(token);
    var email = String(payload && payload.email || '').trim().toLowerCase();
    var password = String(payload && payload.password || '');
    var role = String(payload && payload.role || 'reviewer').toLowerCase();
    var notes = String(payload && payload.notes || '');
    if (!EMAIL_RE.test(email)) return { success: false, message: 'Invalid email address.' };
    if (password.length < MIN_PASSWORD_LENGTH) return { success: false, message: 'Password must be at least ' + MIN_PASSWORD_LENGTH + ' characters.' };
    if (['admin', 'reviewer'].indexOf(role) === -1) role = 'reviewer';
    var u = findUserRow_(email);
    if (u.row !== -1) {
      var salt = generateSalt_();
      var hash = hashPassword_(password, salt);
      u.sheet.getRange(u.row, 2, 1, 2).setValues([[hash, salt]]);
      u.sheet.getRange(u.row, 4, 1, 2).setValues([[role, 'Yes']]);
      u.sheet.getRange(u.row, 8).setValue(notes);
      logAudit_(admin.email, email, '', '', '', '', 'RESET_USER_PASSWORD', 'Password reset by admin for existing user');
      revokeAllSessionsForEmail_(email);
      return { success: true, message: 'User updated.' };
    }
    var salt2 = generateSalt_();
    var hash2 = hashPassword_(password, salt2);
    u.sheet.appendRow([email, hash2, salt2, role, 'Yes', new Date(), '', notes]);
    logAudit_(admin.email, email, '', '', '', '', 'ADD_USER', 'New user added');
    return { success: true, message: 'User added.' };
  } catch (e) {
    if (e.code === 'SESSION_INVALID') return sessionErrorPayload_();
    if (e.code === 'NOT_ADMIN') return { success: false, message: 'Administrator access required.' };
    return { success: false, message: 'Could not add user.' };
  }
}

function setUserActive(token, email, active) {
  try {
    var admin = requireAdmin_(token);
    email = String(email || '').trim().toLowerCase();
    var u = findUserRow_(email);
    if (u.row === -1) return { success: false, message: 'User not found.' };
    if (!active) {
      var sheet = ensureUsersSheet_();
      var last = sheet.getLastRow();
      var values = last >= 2 ? sheet.getRange(2, 1, last - 1, USER_COLUMNS.length).getValues() : [];
      var adminCount = values.filter(function (row) {
        return String(row[3] || '').toLowerCase() === 'admin'
          && String(row[4] || '').toLowerCase() === 'yes'
          && String(row[0] || '').toLowerCase() !== email;
      }).length;
      if (adminCount === 0) return { success: false, message: 'Cannot disable the last active administrator.' };
    }
    u.sheet.getRange(u.row, 5).setValue(active ? 'Yes' : 'No');
    if (!active) revokeAllSessionsForEmail_(email);
    logAudit_(admin.email, email, '', '', '', '', active ? 'ACTIVATE_USER' : 'DEACTIVATE_USER', '');
    return { success: true };
  } catch (e) {
    if (e.code === 'SESSION_INVALID') return sessionErrorPayload_();
    if (e.code === 'NOT_ADMIN') return { success: false, message: 'Administrator access required.' };
    return { success: false, message: 'Could not update user.' };
  }
}

function resetUserPassword(token, email, newPassword) {
  try {
    var admin = requireAdmin_(token);
    email = String(email || '').trim().toLowerCase();
    newPassword = String(newPassword || '');
    if (newPassword.length < MIN_PASSWORD_LENGTH) return { success: false, message: 'Password must be at least ' + MIN_PASSWORD_LENGTH + ' characters.' };
    var u = findUserRow_(email);
    if (u.row === -1) return { success: false, message: 'User not found.' };
    var salt = generateSalt_();
    var hash = hashPassword_(newPassword, salt);
    u.sheet.getRange(u.row, 2, 1, 2).setValues([[hash, salt]]);
    revokeAllSessionsForEmail_(email);
    logAudit_(admin.email, email, '', '', '', '', 'RESET_USER_PASSWORD', 'Password reset by admin');
    return { success: true, message: 'Password reset. All their sessions have been revoked.' };
  } catch (e) {
    if (e.code === 'SESSION_INVALID') return sessionErrorPayload_();
    if (e.code === 'NOT_ADMIN') return { success: false, message: 'Administrator access required.' };
    return { success: false, message: 'Could not reset password.' };
  }
}

function revokeUserSessions(token, email) {
  try {
    var admin = requireAdmin_(token);
    var n = revokeAllSessionsForEmail_(email);
    logAudit_(admin.email, email, '', '', '', '', 'REVOKE_SESSIONS', n + ' session(s) revoked');
    return { success: true, message: n + ' session(s) revoked.' };
  } catch (e) {
    if (e.code === 'SESSION_INVALID') return sessionErrorPayload_();
    if (e.code === 'NOT_ADMIN') return { success: false, message: 'Administrator access required.' };
    return { success: false, message: 'Could not revoke sessions.' };
  }
}

function bootstrapAdminUser() {
  var email = '';
  var password = '';
  if (!EMAIL_RE.test(email)) throw new Error('Invalid bootstrap email.');
  if (String(password).length < MIN_PASSWORD_LENGTH) throw new Error('Bootstrap password too short.');
  var u = findUserRow_(email);
  var salt = generateSalt_();
  var hash = hashPassword_(password, salt);
  if (u.row !== -1) {
    u.sheet.getRange(u.row, 2, 1, 4).setValues([[hash, salt, 'admin', 'Yes']]);
  } else {
    u.sheet.appendRow([email, hash, salt, 'admin', 'Yes', new Date(), '', 'Bootstrap admin']);
  }
  Logger.log('Admin user ready: ' + email);
}

/* ============================================================================
 * SECTION 4 - SPREADSHEET ACCESS
 * ==========================================================================*/

function getInfoSheet_() {
  var ss = SpreadsheetApp.openById(INFO_SHEET_ID);
  var sheet = ss.getSheetByName(INFO_TAB_NAME);
  if (!sheet) throw new Error('Info sheet "' + INFO_TAB_NAME + '" not found.');
  return sheet;
}
function getResponseSpreadsheet_() {
  var ss = SpreadsheetApp.openById(RESPONSE_SHEET_ID);
  if (!ss) throw new Error('Response spreadsheet could not be opened.');
  return ss;
}
function getResponseSheet_() {
  var ss = getResponseSpreadsheet_();
  var sheet = ss.getSheetByName(RESPONSE_TAB_NAME);
  if (!sheet) sheet = ss.insertSheet(RESPONSE_TAB_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, RESPONSE_HEADERS.length).setValues([RESPONSE_HEADERS]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Ensure the sheet has at least `n` physical columns so later range reads
 * against that width cannot throw.
 */
function ensureMinColumns_(sheet, n) {
  try {
    var have = sheet.getMaxColumns();
    if (have < n) sheet.insertColumnsAfter(have, n - have);
  } catch (e) { Logger.log('ensureMinColumns_ failed: ' + e.message); }
}

function getAuditSheet_() {
  var ss = getResponseSpreadsheet_();
  var sheet = ss.getSheetByName(AUDIT_TAB_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(AUDIT_TAB_NAME);
    sheet.getRange(1, 1, 1, 9).setValues([[
      'Timestamp', 'Administrator', 'Submission_ID', 'Previous_Status',
      'New_Status', 'Previous_Score', 'New_Score', 'Action', 'Comment'
    ]]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  ensureMinColumns_(sheet, 9);
  return sheet;
}
function getCommitteeSheet_() {
  var ss = getResponseSpreadsheet_();
  var sheet = ss.getSheetByName(COMMITTEE_TAB_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(COMMITTEE_TAB_NAME);
    sheet.getRange(1, 1, 1, 6).setValues([[
      'Timestamp', 'Submission_ID', 'Reviewer', 'Teaching_Quality_Score',
      'Impact_Score', 'Comment'
    ]]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  ensureMinColumns_(sheet, 6);
  return sheet;
}
function getSettingsSheet_() {
  var ss = getResponseSpreadsheet_();
  var sheet = ss.getSheetByName(SETTINGS_TAB_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SETTINGS_TAB_NAME);
    sheet.getRange(1, 1, 1, 2).setValues([['Key', 'Value']]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/* ============================================================================
 * SECTION 5 - WEB APP ENTRY POINT
 * ==========================================================================*/

function doGet(e) {
  var wantsAdmin = e && e.parameter &&
    (e.parameter.admin === '1' || e.parameter.admin === 'true' || e.parameter.admin === 'yes');
  var file = wantsAdmin ? 'dashboard' : 'index';
  return HtmlService.createHtmlOutputFromFile(file)
    .setTitle(wantsAdmin ? 'CAIIT Selection Dashboard | Cisco Initiative' : 'CAIIT Cisco Initiative Application Form')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* ============================================================================
 * SECTION 6 - FORM API (public)
 * ==========================================================================*/

function getFormBootstrapData() {
  return { config: getFormConfiguration_(), facultyData: getFacultyDepartmentData_() };
}

function getFormConfiguration_() {
  return {
    programmeName: PROGRAMME_NAME, unit: PROGRAMME_UNIT, home: PROGRAMME_HOME,
    applicationsClose: getApplicationsCloseText_(),
    applicationsCloseIso: getApplicationsCloseIso_(),
    targetParticipants: TARGET_PARTICIPANTS,
    options: {
      titles: ['Prof.', 'Dr.', 'Mr.', 'Mrs.', 'Miss', 'Other'],
      sexes: ['Male', 'Female'],
      ranks: ['Professor', 'Assoc. Professor', 'Senior Lecturer', 'Lecturer II', 'Lecturer I',
              'Assistant Lecturer', 'Graduate Assistant', 'Other'],
      ictProficiency: ['Beginner', 'Basic', 'Intermediate', 'Advanced', 'Highly Advanced'],
      computerTasks: [
        'Install and configure computer software', 'Manage files and folders',
        'Troubleshoot common computer problems', 'Use productivity software effectively',
        'Use online learning platforms', 'Conduct advanced online research',
        'Configure basic network connections', 'Troubleshoot basic network problems',
        'Use command-line tools', 'Work with technical/programming software',
        'Use specialised digital tools relevant to my discipline', 'None of the above'
      ],
      networkingKnowledge: ['No prior knowledge', 'Beginner', 'Basic', 'Intermediate', 'Advanced'],
      networkingTools: [
        'Cisco Packet Tracer', 'GNS3', 'EVE-NG', 'Cisco Modeling Labs',
        'Network hardware such as routers/switches', 'Other networking tools', 'None'
      ],
      teachingApplications: [
        'Practical laboratory exercises', 'Computer-based demonstrations',
        'Simulations', 'Student projects', 'Data analysis',
        'Programming/computational activities', 'Digital tools for problem-solving',
        'Technology-supported fieldwork', 'Research activities',
        'Technical assignments', 'Other'
      ],
      practicalFrequency: [
        'In almost every relevant class', 'Frequently', 'Occasionally',
        'Only when specifically required', 'I am not sure yet'
      ],
      studentGroups: [
        'Undergraduate students', 'Postgraduate students',
        'Both undergraduate and postgraduate students',
        'Professional/continuing education students', 'Other'
      ],
      motivationSelections: [
        'Improve practical IT skills', 'Improve teaching effectiveness',
        'Introduce practical IT activities into courses', 'Develop practical learning resources',
        'Support students\' digital/technical skills', 'Acquire networking skills',
        'Professional development', 'Support digital transformation',
        'Personal interest in technology', 'Other'
      ],
      likert5: ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'],
      attendance: [
        'Yes, I can attend all five days', 'I can attend most of the programme',
        'I am uncertain about my availability', 'No'
      ],
      handsOnComfort: ['Very uncomfortable', 'Somewhat uncomfortable', 'Neutral', 'Comfortable', 'Very comfortable'],
      problemSolving: [
        'Wait for the facilitator to provide the solution',
        'Ask a colleague/facilitator for help immediately',
        'Try several approaches before seeking assistance',
        'Research the problem and experiment with possible solutions',
        'Continue investigating until I understand the problem and its solution'
      ],
      practiceOutside: ['Yes', 'No', 'Possibly, depending on the activity'],
      knowledgeSharing: ['Yes', 'No', 'Possibly'],
      contributions: [
        'Incorporate practical IT activities into courses',
        'Develop practical exercises for students', 'Develop digital learning resources',
        'Support student IT-based projects', 'Share knowledge with colleagues',
        'Assist colleagues with practical IT tools', 'Participate in follow-up training',
        'Participate in a CAIIT community of practice', 'Support future practical IT training', 'Other'
      ],
      computerAccess: ['Yes, regularly', 'Yes, but access is limited', 'No'],
      internetAccess: ['Yes', 'Sometimes', 'No'],
      softwareConfidence: ['Not confident', 'Slightly confident', 'Moderately confident', 'Very confident', 'Highly confident'],
      aiFamiliarity: [
        'No exposure to AI tools',
        'Aware of AI tools but have not used any',
        'Have tried one or two AI tools',
        'Use AI tools occasionally',
        'Use AI tools regularly in my work'
      ],
      aiTools: [
        'ChatGPT / OpenAI', 'Google Gemini', 'Microsoft Copilot',
        'Anthropic Claude', 'Perplexity',
        'AI image tools (e.g. DALL·E, Midjourney)',
        'AI coding assistants (e.g. GitHub Copilot)',
        'AI tools built into software I already use (e.g. Word, Canva)',
        'Other AI tools', 'None of the above'
      ],
      aiInterest: [
        'Very interested', 'Interested', 'Neutral', 'Slightly interested', 'Not interested'
      ]
    }
  };
}

function getFacultyDepartmentData_() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('caiit_fac_dept_v1');
  if (cached) { try { return JSON.parse(cached); } catch (e) {} }
  var sheet = getInfoSheet_();
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2) throw new Error('Info sheet has no data rows.');
  var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = values[0].map(function (h) { return String(h || '').trim().toLowerCase(); });
  var fIdx = headers.indexOf('faculty');
  var dIdx = headers.indexOf('department');
  if (fIdx === -1 || dIdx === -1) throw new Error('Info sheet must contain "Faculty" and "Department" headers.');
  var map = {};
  for (var i = 1; i < values.length; i++) {
    var f = String(values[i][fIdx] || '').trim();
    var d = String(values[i][dIdx] || '').trim();
    if (!f || !d) continue;
    if (!map[f]) map[f] = {};
    map[f][d] = true;
  }
  var faculties = Object.keys(map).sort(function (a, b) { return a.localeCompare(b); })
    .map(function (f) { return { faculty: f, departments: Object.keys(map[f]).sort(function (a, b) { return a.localeCompare(b); }) }; });
  var result = { faculties: faculties, map: map };
  try { cache.put('caiit_fac_dept_v1', JSON.stringify(result), 300); } catch (e) {}
  return result;
}

/* ============================================================================
 * SECTION 7 - RESPONSE COLUMN MODEL
 * ==========================================================================*/

var RESPONSE_HEADERS = [
  'Timestamp', 'Submission Number',
  'Staff ID', 'Title', 'Other Title', 'Surname', 'First Name', 'Other Names',
  'Sex', 'Email Address', 'Phone Number',
  'Faculty', 'Department', 'Rank', 'Other Rank',
  'Overall ICT Proficiency', 'Computer Tasks', 'Networking Knowledge',
  'Networking Tools', 'Networking Tools Description',
  'Teaching Applications', 'Practical IT Frequency', 'Student Groups',
  'Motivation Selections', 'Desired Outcome', 'Implementation Commitment',
  'Full Attendance', 'Hands-On Comfort', 'Problem-Solving Approach',
  'Practice Outside Sessions',
  'Knowledge Sharing', 'Possible Contributions',
  'Computer Access', 'Internet Access', 'Software Confidence',
  'AI Familiarity', 'AI Tools', 'AI Interest',
  'Skill 1', 'Skill 2', 'Main Motivation Statement', 'Additional Information',
  'Declaration Accepted', 'Submission Date/Time',
  'Admin Recommendation', 'Admin Status', 'Admin Remarks', 'Reviewed By / Date'
];

/* ============================================================================
 * SECTION 8 - SUBMISSION PIPELINE
 * ==========================================================================*/

function processSubmission(raw) {
  try {
    if (isApplicationsClosed_()) {
      return { success: false, type: 'VALIDATION',
               errors: { _form: 'The application window has closed. Submissions are no longer being accepted.' } };
    }
    var rec = normaliseSubmission_(raw);
    var errors = validateRecord_(rec);
    if (Object.keys(errors).length > 0) return { success: false, type: 'VALIDATION', errors: errors };

    var lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) return { success: false, type: 'SYSTEM', message: 'The server is busy. Please try again in a moment.' };
    var submissionNumber = '';
    try {
      var sheet = getResponseSheet_();
      if (isDuplicateStaffId_(sheet, rec.staffId)) {
        return { success: false, type: 'VALIDATION', errors: { staffId: 'An application has already been received from this Staff ID.' } };
      }
      submissionNumber = generateSubmissionNumber_(sheet);
      rec.submissionNumber = submissionNumber;
      rec.timestamp = new Date();
      rec.submissionDateTime = formatDateTime_(rec.timestamp);
      appendRecord_(sheet, rec);
    } finally { try { lock.releaseLock(); } catch (e) {} }

    var emailSent = true;
    try { sendConfirmationEmail_(rec); }
    catch (err) { emailSent = false; Logger.log('Email failed for ' + submissionNumber + ': ' + (err && err.message)); }

    return {
      success: true, submissionNumber: submissionNumber, emailSent: emailSent,
      applicantName: buildDisplayName_(rec), faculty: rec.faculty, department: rec.department
    };
  } catch (err) {
    Logger.log('processSubmission failed: ' + (err && err.stack ? err.stack : err));
    return { success: false, type: 'SYSTEM', message: 'A system error occurred. Please try again later.' };
  }
}

function normaliseSubmission_(raw) {
  var input = (raw && typeof raw === 'object') ? raw : {};
  var out = {};
  function s(k) { var v = input[k]; return v == null ? '' : String(v).trim(); }
  function sNorm(k) { return s(k).replace(/[ \t]+/g, ' '); }
  function arr(k) {
    var v = input[k];
    if (Array.isArray(v)) return v.map(function (x) { return String(x || '').trim(); }).filter(function (x) { return x; });
    if (typeof v === 'string' && v.trim()) return v.split(/\s*;\s*/).map(function (x) { return x.trim(); }).filter(function (x) { return x; });
    return [];
  }

  out.staffId    = s('staffId').replace(/\s+/g, '').toUpperCase();
  out.title      = s('title');
  out.otherTitle = sNorm('otherTitle');
  if (out.title !== 'Other') out.otherTitle = '';
  out.surname    = s('surname').replace(/\s+/g, ' ').toUpperCase();
  out.firstName  = toTitleCase_(s('firstName'));
  out.otherNames = toTitleCase_(s('otherNames'));
  out.sex        = s('sex');
  out.email      = s('email').toLowerCase();
  out.phone      = s('phone').replace(/[\s\-().]/g, '');
  out.faculty    = sNorm('faculty');
  out.department = sNorm('department');
  out.rank       = s('rank');
  out.otherRank  = sNorm('otherRank');
  if (out.rank !== 'Other') out.otherRank = '';

  out.overallIctProficiency = s('overallIctProficiency');
  out.computerTasks         = arr('computerTasks');
  out.networkingKnowledge   = s('networkingKnowledge');
  out.networkingTools       = arr('networkingTools');
  out.networkingToolsDescription = sNorm('networkingToolsDescription');
  if (out.networkingTools.indexOf('Other networking tools') === -1) out.networkingToolsDescription = '';

  out.teachingApplications = arr('teachingApplications');
  out.practicalFrequency   = s('practicalFrequency');
  out.studentGroups        = arr('studentGroups');

  out.motivationSelections     = arr('motivationSelections').slice(0, 3);
  out.desiredOutcome           = sNorm('desiredOutcome');
  out.implementationCommitment = s('implementationCommitment');

  out.fullAttendance          = s('fullAttendance');
  out.handsOnComfort          = s('handsOnComfort');
  out.problemSolvingApproach  = s('problemSolvingApproach');
  out.practiceOutsideSessions = s('practiceOutsideSessions');

  out.knowledgeSharing      = s('knowledgeSharing');
  out.possibleContributions = arr('possibleContributions');

  out.computerAccess     = s('computerAccess');
  out.internetAccess     = s('internetAccess');
  out.softwareConfidence = s('softwareConfidence');

  out.aiFamiliarity = s('aiFamiliarity');
  out.aiTools       = arr('aiTools');
  out.aiInterest    = s('aiInterest');

  out.skill1 = sNorm('skill1');
  out.skill2 = sNorm('skill2');
  out.mainMotivationStatement = sNorm('mainMotivationStatement');
  out.additionalInformation   = sNorm('additionalInformation');

  out.declarationAccepted = input.declarationAccepted === true ||
    String(input.declarationAccepted).toLowerCase() === 'true' ||
    String(input.declarationAccepted).toLowerCase() === 'yes';

  out.adminRecommendation = '';
  out.adminStatus         = '';
  out.adminRemarks        = '';
  out.reviewedByDate      = '';

  return out;
}

function toTitleCase_(v) {
  var s = String(v || '').trim();
  if (!s) return '';
  return s.toLowerCase().replace(/(^|[\s'\-])([a-z])/g, function (m, a, b) { return a + b.toUpperCase(); });
}

function buildDisplayName_(r) {
  var parts = [];
  if (r.title === 'Other' && r.otherTitle) parts.push(r.otherTitle);
  else if (r.title && r.title !== 'Other') parts.push(r.title);
  if (r.firstName) parts.push(r.firstName);
  if (r.otherNames) parts.push(r.otherNames);
  if (r.surname) parts.push(r.surname);
  return parts.join(' ').trim();
}

/* ============================================================================
 * SECTION 9 - VALIDATION
 * ==========================================================================*/

function validateRecord_(d) {
  var e = {};
  var O = getFormConfiguration_().options;

  if (!d.staffId) e.staffId = 'Staff ID is required.';
  else if (!STAFF_ID_RE.test(d.staffId)) e.staffId = 'Format must be ACA followed by 2-4 digits.';
  if (!d.title) e.title = 'Title is required.';
  else if (O.titles.indexOf(d.title) === -1) e.title = 'Invalid title.';
  else if (d.title === 'Other' && !d.otherTitle) e.otherTitle = 'Please specify your title.';
  if (!d.surname) e.surname = 'Surname is required.';
  if (!d.firstName) e.firstName = 'First name is required.';
  if (!d.sex) e.sex = 'Sex is required.';
  else if (O.sexes.indexOf(d.sex) === -1) e.sex = 'Invalid sex.';
  if (!d.email) e.email = 'Email is required.';
  else if (!EMAIL_RE.test(d.email)) e.email = 'Invalid email address.';
  if (!d.phone) e.phone = 'Phone is required.';
  else if (!PHONE_RE.test(d.phone)) e.phone = 'Must be 11 digits starting with 0.';
  if (!d.faculty) e.faculty = 'Faculty is required.';
  if (!d.department) e.department = 'Department is required.';
  if (!d.rank) e.rank = 'Rank is required.';
  else if (O.ranks.indexOf(d.rank) === -1) e.rank = 'Invalid rank.';
  else if (d.rank === 'Other' && !d.otherRank) e.otherRank = 'Please specify your rank.';

  if (!d.overallIctProficiency) e.overallIctProficiency = 'Required.';
  else if (O.ictProficiency.indexOf(d.overallIctProficiency) === -1) e.overallIctProficiency = 'Invalid option.';
  if (!d.computerTasks.length) e.computerTasks = 'Select at least one option.';
  if (!d.networkingKnowledge) e.networkingKnowledge = 'Required.';
  else if (O.networkingKnowledge.indexOf(d.networkingKnowledge) === -1) e.networkingKnowledge = 'Invalid option.';
  if (!d.networkingTools.length) e.networkingTools = 'Select at least one option.';

  if (!d.teachingApplications.length) e.teachingApplications = 'Select at least one option.';
  if (!d.practicalFrequency) e.practicalFrequency = 'Required.';
  if (!d.studentGroups.length) e.studentGroups = 'Select at least one option.';

  if (!d.motivationSelections.length) e.motivationSelections = 'Select 1-3 motivations.';
  if (d.motivationSelections.length > 3) e.motivationSelections = 'Select at most 3 motivations.';
  if (!d.desiredOutcome) e.desiredOutcome = 'Please describe your desired outcome.';
  if (!d.implementationCommitment) e.implementationCommitment = 'Required.';
  else if (O.likert5.indexOf(d.implementationCommitment) === -1) e.implementationCommitment = 'Invalid option.';

  if (!d.fullAttendance) e.fullAttendance = 'Required.';
  else if (O.attendance.indexOf(d.fullAttendance) === -1) e.fullAttendance = 'Invalid option.';
  if (!d.handsOnComfort) e.handsOnComfort = 'Required.';
  else if (O.handsOnComfort.indexOf(d.handsOnComfort) === -1) e.handsOnComfort = 'Invalid option.';
  if (!d.problemSolvingApproach) e.problemSolvingApproach = 'Required.';
  else if (O.problemSolving.indexOf(d.problemSolvingApproach) === -1) e.problemSolvingApproach = 'Invalid option.';
  if (!d.practiceOutsideSessions) e.practiceOutsideSessions = 'Required.';
  else if (O.practiceOutside.indexOf(d.practiceOutsideSessions) === -1) e.practiceOutsideSessions = 'Invalid option.';

  if (!d.knowledgeSharing) e.knowledgeSharing = 'Required.';
  else if (O.knowledgeSharing.indexOf(d.knowledgeSharing) === -1) e.knowledgeSharing = 'Invalid option.';
  if (!d.possibleContributions.length) e.possibleContributions = 'Select at least one option.';

  if (!d.computerAccess) e.computerAccess = 'Required.';
  else if (O.computerAccess.indexOf(d.computerAccess) === -1) e.computerAccess = 'Invalid option.';
  if (!d.internetAccess) e.internetAccess = 'Required.';
  else if (O.internetAccess.indexOf(d.internetAccess) === -1) e.internetAccess = 'Invalid option.';
  if (!d.softwareConfidence) e.softwareConfidence = 'Required.';
  else if (O.softwareConfidence.indexOf(d.softwareConfidence) === -1) e.softwareConfidence = 'Invalid option.';

  if (!d.aiFamiliarity) e.aiFamiliarity = 'Required.';
  else if (O.aiFamiliarity.indexOf(d.aiFamiliarity) === -1) e.aiFamiliarity = 'Invalid option.';
  if (!d.aiTools.length) e.aiTools = 'Select at least one option.';
  if (!d.aiInterest) e.aiInterest = 'Required.';
  else if (O.aiInterest.indexOf(d.aiInterest) === -1) e.aiInterest = 'Invalid option.';

  if (!d.mainMotivationStatement) e.mainMotivationStatement = 'Motivation statement is required.';
  if (!d.declarationAccepted) e.declarationAccepted = 'You must accept the declaration.';

  if (d.faculty && d.department) {
    try {
      var map = getFacultyDepartmentData_().map;
      if (!map[d.faculty]) e.faculty = 'Invalid faculty.';
      else if (!map[d.faculty][d.department]) e.department = 'Department does not belong to the selected Faculty.';
    } catch (err) {}
  }
  return e;
}

/* ============================================================================
 * SECTION 10 - RESPONSE SHEET WRITING
 * ==========================================================================*/

function getUsedSubmissionNumbers_(sheet) {
  var used = {};
  var last = sheet.getLastRow();
  if (last < 2) return used;
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function (h) { return String(h || '').trim(); });
  var idx = headers.indexOf('Submission Number');
  if (idx === -1) return used;
  var values = sheet.getRange(2, idx + 1, last - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    var v = String(values[i][0] || '').trim();
    if (v) used[v] = true;
  }
  return used;
}

function isDuplicateStaffId_(sheet, staffId) {
  if (!staffId) return false;
  var last = sheet.getLastRow();
  if (last < 2) return false;
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function (h) { return String(h || '').trim(); });
  var idx = headers.indexOf('Staff ID');
  if (idx === -1) return false;
  var values = sheet.getRange(2, idx + 1, last - 1, 1).getValues();
  var target = staffId.toUpperCase();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0] || '').trim().toUpperCase() === target) return true;
  }
  return false;
}

function generateSubmissionNumber_(sheet) {
  var used = getUsedSubmissionNumbers_(sheet);
  var span = SUBMISSION_MAX - SUBMISSION_MIN + 1;
  for (var a = 0; a < 800; a++) {
    var n = SUBMISSION_MIN + Math.floor(Math.random() * span);
    var cand = SUBMISSION_PREFIX + n;
    if (!used[cand]) return cand;
  }
  for (var m = SUBMISSION_MIN; m <= SUBMISSION_MAX; m++) {
    var c2 = SUBMISSION_PREFIX + m;
    if (!used[c2]) return c2;
  }
  throw new Error('Submission number range exhausted.');
}

function appendRecord_(sheet, rec) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function (h) { return String(h || '').trim(); });
  var row = headers.map(function (h) {
    var key = headerToKey_(h);
    var v = rec[key];
    if (Array.isArray(v)) return v.join('; ');
    if (v === null || v === undefined) return '';
    return v;
  });
  sheet.appendRow(row);
}

function headerToKey_(header) {
  var map = {
    'timestamp': 'timestamp', 'submission number': 'submissionNumber',
    'staff id': 'staffId', 'title': 'title', 'other title': 'otherTitle',
    'surname': 'surname', 'first name': 'firstName', 'other names': 'otherNames',
    'sex': 'sex', 'email address': 'email', 'phone number': 'phone',
    'faculty': 'faculty', 'department': 'department', 'rank': 'rank', 'other rank': 'otherRank',
    'overall ict proficiency': 'overallIctProficiency', 'computer tasks': 'computerTasks',
    'networking knowledge': 'networkingKnowledge', 'networking tools': 'networkingTools',
    'networking tools description': 'networkingToolsDescription',
    'teaching applications': 'teachingApplications', 'practical it frequency': 'practicalFrequency',
    'student groups': 'studentGroups',
    'motivation selections': 'motivationSelections', 'desired outcome': 'desiredOutcome',
    'implementation commitment': 'implementationCommitment',
    'full attendance': 'fullAttendance', 'hands-on comfort': 'handsOnComfort',
    'problem-solving approach': 'problemSolvingApproach',
    'practice outside sessions': 'practiceOutsideSessions',
    'knowledge sharing': 'knowledgeSharing', 'possible contributions': 'possibleContributions',
    'computer access': 'computerAccess', 'internet access': 'internetAccess',
    'software confidence': 'softwareConfidence',
    'ai familiarity': 'aiFamiliarity', 'ai tools': 'aiTools', 'ai interest': 'aiInterest',
    'skill 1': 'skill1', 'skill 2': 'skill2',
    'main motivation statement': 'mainMotivationStatement',
    'additional information': 'additionalInformation',
    'declaration accepted': 'declarationAccepted', 'submission date/time': 'submissionDateTime',
    'admin recommendation': 'adminRecommendation', 'admin status': 'adminStatus',
    'admin remarks': 'adminRemarks', 'reviewed by / date': 'reviewedByDate'
  };
  return map[String(header || '').trim().toLowerCase()] || null;
}

/* ============================================================================
 * SECTION 11 - CONFIRMATION EMAIL
 * ==========================================================================*/

function sendConfirmationEmail_(rec) {
  var to = rec.email;
  if (!to || !EMAIL_RE.test(to)) throw new Error('No valid recipient.');
  var closeText = getApplicationsCloseText_();
  var subject = 'Application Received - ' + rec.submissionNumber + ' - CAIIT Cisco Networking Initiative';
  var html = [
    '<div style="background:#f5f7fa;padding:0;margin:0;font-family:Segoe UI,Arial,sans-serif;color:#1c2b23;">',
    '<div style="max-width:640px;margin:0 auto;">',
    '<div style="background:#b3261e;color:#fff;padding:10px 16px;text-align:center;font-size:12.5px;font-weight:700;">',
    '&#9888; DO NOT REPLY - This is an automated no-reply message.', '</div>',
    '<div style="background:#0b3d6b;color:#fff;padding:22px 24px;">',
    '<h1 style="margin:0;font-size:19px;">University of Abuja (Yakubu Gowon University)</h1>',
    '<p style="margin:6px 0 0;font-size:13.5px;color:#bcd4ea;">' + PROGRAMME_UNIT + '</p>', '</div>',
    '<div style="background:#fff;border:1px solid #d9e2dc;border-top:none;padding:24px;">',
    '<p>Dear ' + escapeHtml_(buildDisplayName_(rec)) + ',</p>',
    '<p>Thank you for applying for the <strong>' + escapeHtml_(PROGRAMME_NAME) + '</strong>.</p>',
    '<p>Your application has been received successfully. Your submission number is:</p>',
    '<p style="font-size:22px;font-weight:700;color:#0b3d6b;letter-spacing:1px;">' + escapeHtml_(rec.submissionNumber) + '</p>',
    '<table style="border-collapse:collapse;width:100%;font-size:14px;">',
    '<tr><td style="padding:6px 12px 6px 0;color:#5c6b63;">Faculty</td><td style="font-weight:600;">' + escapeHtml_(rec.faculty) + '</td></tr>',
    '<tr><td style="padding:6px 0;color:#5c6b63;">Department</td><td style="font-weight:600;">' + escapeHtml_(rec.department) + '</td></tr>',
    '<tr><td style="padding:6px 0;color:#5c6b63;">Rank</td><td style="font-weight:600;">' + escapeHtml_(rec.rank === 'Other' ? rec.otherRank : rec.rank) + '</td></tr>',
    '</table>',
    '<p style="margin-top:18px;">This is an application only - submission does not guarantee selection.</p>',
    '<p>' + escapeHtml_(closeText) + '.</p>',
    '<p>Kind regards,<br><strong>' + escapeHtml_(PROGRAMME_UNIT) + '</strong></p>', '</div>',
    '<div style="background:#fdecea;padding:12px 16px;text-align:center;border:1px solid #f3c9c5;border-top:none;">',
    '<p style="margin:0;font-size:12px;color:#8a1f18;font-weight:600;">Please do not reply to this email. For enquiries contact ' + escapeHtml_(CAIIT_REPLY_TO) + '.</p>',
    '</div>', '</div></div>'
  ].join('');
  var text = [
    'DO NOT REPLY - automated message', 'University of Abuja (Yakubu Gowon University)', PROGRAMME_UNIT, '',
    'Dear ' + buildDisplayName_(rec) + ',', '',
    'Thank you for applying for the ' + PROGRAMME_NAME + '.',
    'Submission Number: ' + rec.submissionNumber,
    'Faculty: ' + rec.faculty, 'Department: ' + rec.department, '',
    'This is an application only - submission does not guarantee selection.', '',
    closeText + '.', '', 'Kind regards,', PROGRAMME_UNIT,
    'Please do not reply. For enquiries contact ' + CAIIT_REPLY_TO + '.'
  ].join('\n');
  var options = { to: to, subject: subject, body: text, htmlBody: html, name: SENDER_DISPLAY_NAME };
  if (NOREPLY_FROM_ALIAS) options.from = NOREPLY_FROM_ALIAS;
  if (CAIIT_REPLY_TO && EMAIL_RE.test(CAIIT_REPLY_TO)) options.replyTo = CAIIT_REPLY_TO;
  MailApp.sendEmail(options);
}

/* ============================================================================
 * SECTION 12 - DASHBOARD DATA API  (hardened)
 * ==========================================================================*/

function getDashboardData(token) {
  var stage = 'init';
  try {
    var session = requireSession_(token);

    stage = 'readApplicants';
    var records = readApplicantRecords_();

    stage = 'readCommittee';
    var committee = readCommitteeAssessments_();

    stage = 'readAudit';
    var audit = readAuditLog_();

    stage = 'readSettings';
    var settings = getSettings();

    stage = 'score';
    var skipped = [];
    var applicants = [];
    for (var i = 0; i < records.length; i++) {
      var r = records[i];
      try {
        var scores = computeAllScores(r);
        var cScore = (r.submissionNumber && committee[r.submissionNumber])
                       ? committee[r.submissionNumber] : null;
        var committeeTotal = cScore ? (num_(cScore.teaching, 0) + num_(cScore.impact, 0)) : 0;
        var total = num_(scores.auto, 0) + committeeTotal;
        applicants.push({
          record: r,
          scores: scores,
          committee: cScore,
          committeeTotal: committeeTotal,
          total: total,
          eligibility: evaluateEligibility_(r, scores),
          recommendation: 'PENDING',
          status: r.adminStatus || 'Pending',
          attendanceRisk: r.fullAttendance === 'No' ||
                          r.fullAttendance === 'I am uncertain about my availability'
        });
      } catch (rowErr) {
        skipped.push({ row: r._sheetRow, id: r.submissionNumber || '',
                       message: String(rowErr && rowErr.message || rowErr) });
        Logger.log('Skipping applicant row ' + r._sheetRow + ': ' +
                   (rowErr && rowErr.stack ? rowErr.stack : rowErr));
      }
    }

    stage = 'recommend';
    applicants.forEach(function (a) {
      if (a.record.adminRecommendation) a.recommendation = a.record.adminRecommendation;
    });
    var recommendationSet;
    try {
      recommendationSet = generateRecommendations(applicants, settings);
    } catch (recErr) {
      Logger.log('generateRecommendations failed: ' + (recErr && recErr.stack ? recErr.stack : recErr));
      recommendationSet = {
        labels: {}, recommended: [], reviewRequired: [], waitlist: [], notRecommended: [],
        facultyRepresentatives: {}, facultiesWithNoEligible: [],
        cutoffScore: 0, borderlineThreshold: 1.5,
        target: settings.targetParticipants || TARGET_PARTICIPANTS
      };
    }
    applicants.forEach(function (a) {
      if (a.record.adminRecommendation) return;
      a.recommendation = recommendationSet.labels[a.record.submissionNumber] || 'NOT_RECOMMENDED';
    });

    stage = 'facultySummary';
    var facultySummary;
    try { facultySummary = computeFacultySummary_(applicants, settings); }
    catch (fsErr) { Logger.log('computeFacultySummary_ failed: ' + fsErr); facultySummary = []; }

    stage = 'counts';
    var counts;
    try { counts = computeCounts_(applicants, facultySummary, settings); }
    catch (cErr) { Logger.log('computeCounts_ failed: ' + cErr); counts = { total: applicants.length }; }

    return {
      success: true,
      refreshedAt: formatDateTime_(new Date()),
      session: { email: session.email, role: session.role },
      settings: settings,
      applicants: applicants,
      facultySummary: facultySummary,
      recommendationSet: recommendationSet,
      audit: audit,
      counts: counts,
      skippedRows: skipped
    };
  } catch (err) {
    if (err && err.code === 'SESSION_INVALID') return sessionErrorPayload_();
    Logger.log('getDashboardData failed at stage "' + stage + '": ' +
               (err && err.stack ? err.stack : err));
    return {
      success: false,
      error: 'SYSTEM',
      message: 'Could not load dashboard data (stage: ' + stage + ').',
      detail: String(err && err.message || err)
    };
  }
}

function readApplicantRecords_() {
  var out = [];
  var sheet;
  try { sheet = getResponseSheet_(); }
  catch (e) { Logger.log('readApplicantRecords_: ' + e.message); return out; }

  var last = sheet.getLastRow();
  if (last < 2) return out;
  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) return out;

  var values = sheet.getRange(1, 1, last, lastCol).getValues();
  if (!values.length) return out;

  var headers = values[0].map(function (h) { return String(h == null ? '' : h).trim(); });
  var ARRAY_KEYS = ['computerTasks','networkingTools','teachingApplications','studentGroups',
                    'motivationSelections','possibleContributions','aiTools'];

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var rec = { _sheetRow: i + 1 };
    var hasData = false;
    for (var j = 0; j < headers.length; j++) {
      var h = headers[j];
      if (!h) continue;
      var key = headerToKey_(h) || h;
      var v = row[j];
      if (v instanceof Date) v = formatDateTime_(v);
      else if (v === null || v === undefined) v = '';
      else v = String(v);
      rec[key] = v;
      if (v !== '') hasData = true;
    }
    ARRAY_KEYS.forEach(function (k) {
      var v = rec[k];
      if (Array.isArray(v)) return;
      if (typeof v === 'string' && v.trim()) {
        rec[k] = v.split(/\s*;\s*/).map(function (x) { return x.trim(); })
                   .filter(function (x) { return x; });
      } else {
        rec[k] = [];
      }
    });
    if (hasData) out.push(rec);
  }
  return out;
}

/**
 * Locate the 1-based column numbers of the Committee_Assessments tab by header
 * name so the code survives inserted/deleted columns.
 */
function committeeColumns_(sheet) {
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) {
    return String(h == null ? '' : h).trim().toLowerCase().replace(/[\s\-\/]+/g, '_');
  });
  function find(names, fallback) {
    for (var i = 0; i < names.length; i++) {
      var p = headers.indexOf(names[i]);
      if (p !== -1) return p + 1;
    }
    return Math.min(Math.max(fallback, 1), lastCol);
  }
  return {
    lastCol:  lastCol,
    ts:       find(['timestamp','date','created_at'], 1),
    id:       find(['submission_id','submission_number','id'], 2),
    reviewer: find(['reviewer','reviewer_email','email'], 3),
    teaching: find(['teaching_quality_score','teaching','teaching_score'], 4),
    impact:   find(['impact_score','impact'], 5),
    comment:  find(['comment','comments','remarks'], 6)
  };
}

function readCommitteeAssessments_() {
  var map = {};
  var sheet;
  try { sheet = getCommitteeSheet_(); }
  catch (e) { Logger.log('readCommitteeAssessments_: ' + e.message); return map; }

  var last = sheet.getLastRow();
  if (last < 2) return map;

  var cols = committeeColumns_(sheet);
  var width = Math.max(cols.lastCol, 1);

  var values;
  try { values = sheet.getRange(2, 1, last - 1, width).getValues(); }
  catch (e) { Logger.log('readCommitteeAssessments_ range: ' + e.message); return map; }

  function cell(row, idx) { return (idx - 1) < row.length ? row[idx - 1] : ''; }

  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var id = String(cell(row, cols.id) == null ? '' : cell(row, cols.id)).trim();
    if (!id) continue;
    if (id === '__proto__' || id === 'constructor' || id === 'prototype') continue;

    var t  = clamp_(num_(cell(row, cols.teaching), 0), 0, COMMITTEE_MAX_TEACHING);
    var im = clamp_(num_(cell(row, cols.impact), 0), 0, COMMITTEE_MAX_IMPACT);
    var ts = cell(row, cols.ts);
    var rv = cell(row, cols.reviewer);
    var cm = cell(row, cols.comment);

    map[id] = {
      timestamp: ts instanceof Date ? formatDateTime_(ts) : String(ts || ''),
      reviewer:  String(rv == null ? '' : rv),
      teaching:  Math.round(t * 100) / 100,
      impact:    Math.round(im * 100) / 100,
      comment:   String(cm == null ? '' : cm)
    };
  }
  return map;
}

function readAuditLog_() {
  var out = [];
  var sheet;
  try { sheet = getAuditSheet_(); }
  catch (e) { Logger.log('readAuditLog_: ' + e.message); return out; }

  var last = sheet.getLastRow();
  if (last < 2) return out;
  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) return out;

  var values;
  try { values = sheet.getRange(1, 1, last, lastCol).getValues(); }
  catch (e) { Logger.log('readAuditLog_ range: ' + e.message); return out; }

  var headers = values[0].map(function (h) {
    return String(h == null ? '' : h).trim().toLowerCase().replace(/[\s\-\/]+/g, '_');
  });
  function find(names, fallback) {
    for (var i = 0; i < names.length; i++) {
      var p = headers.indexOf(names[i]);
      if (p !== -1) return p;
    }
    return fallback;
  }
  var iTs   = find(['timestamp','date'], 0);
  var iAdm  = find(['administrator','admin','user','email'], 1);
  var iSub  = find(['submission_id','submission_number','id'], 2);
  var iPSt  = find(['previous_status'], 3);
  var iNSt  = find(['new_status'], 4);
  var iPSc  = find(['previous_score'], 5);
  var iNSc  = find(['new_score'], 6);
  var iAct  = find(['action'], 7);
  var iCom  = find(['comment','comments'], 8);

  function pick(row, idx) { return idx < row.length ? row[idx] : ''; }
  function scoreStr(v) {
    if (v === '' || v === null || v === undefined) return '';
    var n = Number(v);
    return isNaN(n) ? String(v) : n;
  }

  for (var i = 1; i < values.length; i++) {
    var r = values[i];
    var ts = pick(r, iTs);
    out.push({
      timestamp:      ts instanceof Date ? formatDateTime_(ts) : String(ts || ''),
      admin:          String(pick(r, iAdm)  == null ? '' : pick(r, iAdm)),
      submissionId:   String(pick(r, iSub)  == null ? '' : pick(r, iSub)),
      previousStatus: String(pick(r, iPSt)  == null ? '' : pick(r, iPSt)),
      newStatus:      String(pick(r, iNSt)  == null ? '' : pick(r, iNSt)),
      previousScore:  scoreStr(pick(r, iPSc)),
      newScore:       scoreStr(pick(r, iNSc)),
      action:         String(pick(r, iAct)  == null ? '' : pick(r, iAct)),
      comment:        String(pick(r, iCom)  == null ? '' : pick(r, iCom))
    });
  }
  return out.slice(-500).reverse();
}

/* ============================================================================
 * SECTION 13 - SCORING ENGINE
 * ==========================================================================*/

function computeAllScores(rec) {
  rec = rec || {};
  var s = {
    ict:            num_(scoreICTProficiency(rec), 0),
    networking:     num_(scoreNetworkingFoundation(rec), 0),
    teaching:       num_(scoreTeachingApplicability(rec), 0),
    implementation: num_(scoreImplementationCommitment(rec), 0),
    motivation:     num_(scoreMotivation(rec), 0),
    readiness:      num_(scoreTrainingReadiness(rec), 0),
    learning:       num_(scoreLearningReadiness(rec), 0),
    impact:         num_(scoreInstitutionalImpact(rec), 0),
    aiReadiness:    num_(scoreAIReadiness(rec), 0)
  };
  s.auto = Math.round((s.ict + s.networking + s.teaching + s.implementation +
                       s.motivation + s.readiness + s.learning + s.impact +
                       s.aiReadiness) * 100) / 100;
  return s;
}

function scoreICTProficiency(rec) {
  rec = rec || {};
  var map = { 'Beginner':3, 'Basic':6, 'Intermediate':9, 'Advanced':12, 'Highly Advanced':15 };
  return map[rec.overallIctProficiency] || 0;
}

function scoreNetworkingFoundation(rec) {
  rec = rec || {};
  var knowledge = { 'No prior knowledge':0, 'Beginner':2, 'Basic':3, 'Intermediate':5, 'Advanced':8 };
  var k = knowledge[rec.networkingKnowledge] || 0;
  var tools = (rec.networkingTools || []).filter(function (t) { return t && t !== 'None'; }).length;
  return Math.min(10, k + Math.min(2, tools));
}

function scoreTeachingApplicability(rec) {
  rec = rec || {};
  var freq = { 'In almost every relevant class':5,'Frequently':4,'Occasionally':3,
               'Only when specifically required':1,'I am not sure yet':0 };
  var f = freq[rec.practicalFrequency] || 0;
  var apps = (rec.teachingApplications || []).filter(function (x) { return x && x !== 'Other'; }).length;
  return f + Math.min(10, apps);
}

function scoreImplementationCommitment(rec) {
  rec = rec || {};
  var map = { 'Strongly disagree':0,'Disagree':4,'Neutral':7,'Agree':12,'Strongly agree':15 };
  return map[rec.implementationCommitment] || 0;
}

function scoreMotivation(rec) {
  rec = rec || {};
  var weights = {
    'Introduce practical IT activities into courses': 2,
    'Improve teaching effectiveness': 2,
    'Support students\' digital/technical skills': 1.5,
    'Develop practical learning resources': 1.5,
    'Improve practical IT skills': 1.5,
    'Acquire networking skills': 1,
    'Professional development': 1,
    'Support digital transformation': 1,
    'Personal interest in technology': 0.5,
    'Other': 0
  };
  var total = 0;
  (rec.motivationSelections || []).forEach(function (m) { total += weights[m] || 0; });
  return Math.min(5, total);
}

function scoreTrainingReadiness(rec) {
  rec = rec || {};
  var map = {
    'Yes, I can attend all five days': 10,
    'I can attend most of the programme': 5,
    'I am uncertain about my availability': 2,
    'No': 0
  };
  return map[rec.fullAttendance] || 0;
}

function scoreLearningReadiness(rec) {
  rec = rec || {};
  var comfort = { 'Very uncomfortable':0,'Somewhat uncomfortable':0.5,'Neutral':1,'Comfortable':1.5,'Very comfortable':2 };
  var problem = {
    'Wait for the facilitator to provide the solution': 0,
    'Ask a colleague/facilitator for help immediately': 0.5,
    'Try several approaches before seeking assistance': 1.5,
    'Research the problem and experiment with possible solutions': 2,
    'Continue investigating until I understand the problem and its solution': 2
  };
  var practice = { 'Yes':1, 'Possibly, depending on the activity':0.5, 'No':0 };
  var v = (comfort[rec.handsOnComfort] || 0) + (problem[rec.problemSolvingApproach] || 0) + (practice[rec.practiceOutsideSessions] || 0);
  return Math.min(5, Math.round(v * 10) / 10);
}

function scoreInstitutionalImpact(rec) {
  rec = rec || {};
  var share = { 'Yes':4, 'Possibly':2, 'No':0 };
  var s = share[rec.knowledgeSharing] || 0;
  var weights = {
    'Participate in a CAIIT community of practice': 1,
    'Support future practical IT training': 1,
    'Share knowledge with colleagues': 1,
    'Assist colleagues with practical IT tools': 1,
    'Participate in follow-up training': 1,
    'Support student IT-based projects': 1,
    'Develop digital learning resources': 1,
    'Develop practical exercises for students': 1,
    'Incorporate practical IT activities into courses': 1,
    'Other': 0.5
  };
  var c = 0;
  (rec.possibleContributions || []).forEach(function (x) { c += weights[x] || 0; });
  return s + Math.min(6, c);
}

function scoreAIReadiness(rec) {
  rec = rec || {};
  var fam = {
    'No exposure to AI tools': 0,
    'Aware of AI tools but have not used any': 0.5,
    'Have tried one or two AI tools': 1,
    'Use AI tools occasionally': 2,
    'Use AI tools regularly in my work': 3
  };
  var interest = {
    'Not interested': 0,
    'Slightly interested': 0.25,
    'Neutral': 0.5,
    'Interested': 0.75,
    'Very interested': 1
  };
  var famPts = fam[rec.aiFamiliarity] || 0;
  var intPts = interest[rec.aiInterest] || 0;
  var toolsCount = (rec.aiTools || []).filter(function (t) { return t && t !== 'None of the above'; }).length;
  var toolPts = Math.min(1, toolsCount * 0.25);
  return Math.min(5, Math.round((famPts + intPts + toolPts) * 100) / 100);
}

/* ============================================================================
 * SECTION 14 - ELIGIBILITY
 * ==========================================================================*/

function evaluateEligibility_(rec, scores) {
  rec = rec || {};
  var flags = [];
  if (rec.fullAttendance === 'No') flags.push('ATTENDANCE_RISK');
  if (rec.fullAttendance === 'I am uncertain about my availability') flags.push('ATTENDANCE_UNCERTAIN');
  if (!rec.email || !EMAIL_RE.test(rec.email)) flags.push('INVALID_EMAIL');
  if (!rec.faculty) flags.push('MISSING_FACULTY');
  if (rec.computerAccess === 'No' && rec.internetAccess === 'No') flags.push('TECHNICAL_READINESS_LOW');
  var eligible = flags.indexOf('ATTENDANCE_RISK') === -1 &&
                 flags.indexOf('INVALID_EMAIL') === -1 &&
                 flags.indexOf('MISSING_FACULTY') === -1;
  return { eligible: eligible, flags: flags };
}

/* ============================================================================
 * SECTION 15 - FACULTY SUMMARY
 * ==========================================================================*/

function computeFacultySummary_(applicants, settings) {
  var faculties = (settings.faculties || []).slice();
  var summary = {};
  faculties.forEach(function (f) {
    summary[f] = { faculty: f, applications: 0, eligible: 0, scores: [], topCandidate: null, recommended: 0, selected: 0, status: 'NO_APPLICANTS' };
  });
  applicants.forEach(function (a) {
    var f = a.record.faculty;
    if (!f) return;
    if (!summary[f]) summary[f] = { faculty: f, applications: 0, eligible: 0, scores: [], topCandidate: null, recommended: 0, selected: 0, status: 'NO_APPLICANTS' };
    summary[f].applications++;
    summary[f].scores.push(a.total);
    if (a.eligibility.eligible) summary[f].eligible++;
    if (a.recommendation === 'RECOMMENDED') summary[f].recommended++;
    if (a.status === 'Selected') summary[f].selected++;
    if (!summary[f].topCandidate || a.total > summary[f].topCandidate.total) {
      summary[f].topCandidate = { name: buildDisplayName_(a.record), total: a.total, submissionNumber: a.record.submissionNumber };
    }
  });
  Object.keys(summary).forEach(function (f) {
    var s = summary[f];
    if (s.applications === 0) s.status = 'NO_APPLICANTS';
    else if (s.eligible === 0) s.status = 'NO_ELIGIBLE';
    else s.status = 'OK';
    s.average = s.scores.length ? Math.round((s.scores.reduce(function (a, b) { return a + b; }, 0) / s.scores.length) * 10) / 10 : 0;
    s.median = s.scores.length ? computeMedian_(s.scores) : 0;
    s.highest = s.scores.length ? Math.max.apply(null, s.scores) : 0;
  });
  return Object.keys(summary).map(function (k) { return summary[k]; }).sort(function (a, b) { return a.faculty.localeCompare(b.faculty); });
}

function computeMedian_(arr) {
  if (!arr.length) return 0;
  var s = arr.slice().sort(function (a, b) { return a - b; });
  var mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

/* ============================================================================
 * SECTION 16 - RECOMMENDATION ENGINE
 * ==========================================================================*/

function generateRecommendations(applicants, settings) {
  var target = (settings && settings.targetParticipants) || TARGET_PARTICIPANTS;
  var faculties = ((settings && settings.faculties) || []).slice();
  var sorted = applicants.slice().sort(function (a, b) { return b.total - a.total; });
  var eligible = sorted.filter(function (a) { return a.eligibility.eligible; });
  var facultyRep = {}, chosen = {};
  faculties.forEach(function (f) {
    var best = null;
    eligible.forEach(function (a) {
      if (a.record.faculty !== f) return;
      if (!best || a.total > best.total) best = a;
    });
    if (best) { facultyRep[f] = best.record.submissionNumber; chosen[best.record.submissionNumber] = 'RECOMMENDED'; }
  });
  var facultiesWithNoEligible = faculties.filter(function (f) { return !facultyRep[f]; });
  var remaining = target - Object.keys(facultyRep).length;
  var pool = eligible.filter(function (a) { return !chosen[a.record.submissionNumber]; });
  for (var i = 0; i < pool.length && remaining > 0; i++) { chosen[pool[i].record.submissionNumber] = 'RECOMMENDED'; remaining--; }
  var cutoffScore = 0, recCount = 0;
  sorted.forEach(function (a) {
    if (chosen[a.record.submissionNumber] === 'RECOMMENDED') { recCount++; if (recCount === target) cutoffScore = a.total; }
  });
  var BORDER = 1.5;
  var labels = {}, review = [], waitlist = [], notRec = [];
  sorted.forEach(function (a) {
    var id = a.record.submissionNumber;
    if (a.record.adminRecommendation) { labels[id] = a.record.adminRecommendation; return; }
    if (chosen[id] === 'RECOMMENDED') {
      if (cutoffScore && Math.abs(a.total - cutoffScore) <= BORDER &&
          Object.keys(facultyRep).length && facultyRep[a.record.faculty] !== id) {
        labels[id] = 'REVIEW_REQUIRED'; review.push(id);
      } else labels[id] = 'RECOMMENDED';
    } else if (!a.eligibility.eligible) {
      labels[id] = 'NOT_RECOMMENDED'; notRec.push(id);
    } else if (waitlist.length < 20) {
      labels[id] = 'WAITLIST'; waitlist.push(id);
    } else {
      labels[id] = 'NOT_RECOMMENDED'; notRec.push(id);
    }
  });
  return {
    labels: labels,
    recommended: Object.keys(labels).filter(function (id) { return labels[id] === 'RECOMMENDED'; }),
    reviewRequired: review, waitlist: waitlist, notRecommended: notRec,
    facultyRepresentatives: facultyRep, facultiesWithNoEligible: facultiesWithNoEligible,
    cutoffScore: cutoffScore, borderlineThreshold: BORDER, target: target
  };
}

/* ============================================================================
 * SECTION 17 - COMMITTEE ASSESSMENT
 * ==========================================================================*/

function saveCommitteeAssessment(token, payload) {
  try {
    var session = requireSession_(token);
    var id = String(payload && payload.submissionId || '').trim();
    var teaching = clamp_(num_(payload && payload.teaching, 0), 0, COMMITTEE_MAX_TEACHING);
    var impact   = clamp_(num_(payload && payload.impact,   0), 0, COMMITTEE_MAX_IMPACT);
    var comment  = String(payload && payload.comment || '').slice(0, 4000);
    if (!id) return { success: false, message: 'Missing submission id.' };

    var sheet = getCommitteeSheet_();
    var cols  = committeeColumns_(sheet);
    var width = Math.max(cols.lastCol, 6);

    var last = sheet.getLastRow();
    var foundRow = -1;
    if (last >= 2) {
      var ids = sheet.getRange(2, cols.id, last - 1, 1).getValues();
      for (var i = 0; i < ids.length; i++) {
        if (String(ids[i][0] == null ? '' : ids[i][0]).trim() === id) { foundRow = i + 2; break; }
      }
    }

    var rowValues = [];
    for (var w = 0; w < width; w++) rowValues.push('');
    rowValues[cols.ts - 1]       = new Date();
    rowValues[cols.id - 1]       = id;
    rowValues[cols.reviewer - 1] = session.email;
    rowValues[cols.teaching - 1] = teaching;
    rowValues[cols.impact - 1]   = impact;
    rowValues[cols.comment - 1]  = comment;

    var prev = '';
    if (foundRow > 0) {
      var existing = sheet.getRange(foundRow, 1, 1, width).getValues()[0];
      prev = 'T=' + existing[cols.teaching - 1] + ', I=' + existing[cols.impact - 1];
      sheet.getRange(foundRow, 1, 1, width).setValues([rowValues]);
    } else {
      sheet.appendRow(rowValues);
    }

    logAudit_(session.email, id, '', '', prev,
              'T=' + teaching + ', I=' + impact, 'COMMITTEE_ASSESSMENT', comment);
    return { success: true };
  } catch (err) {
    if (err && err.code === 'SESSION_INVALID') return sessionErrorPayload_();
    Logger.log('saveCommitteeAssessment failed: ' + (err && err.stack ? err.stack : err));
    return { success: false, message: 'Could not save the assessment.' };
  }
}

/* ============================================================================
 * SECTION 18 - SELECTION ACTIONS
 * ==========================================================================*/

function applySelectionAction(token, payload) {
  try {
    var session = requireAdmin_(token);
    var id = String(payload && payload.submissionId || '').trim();
    var action = String(payload && payload.action || '').toUpperCase();
    var comment = String(payload && payload.comment || '').slice(0, 2000);
    if (!id) return { success: false, message: 'Missing submission id.' };
    var newRec = '', newStatus = '';
    switch (action) {
      case 'RECOMMEND':       newRec = 'RECOMMENDED'; newStatus = 'Recommended'; break;
      case 'WAITLIST':        newRec = 'WAITLIST';    newStatus = 'Waitlisted'; break;
      case 'REVIEW_REQUIRED': newRec = 'REVIEW_REQUIRED'; newStatus = 'Review Required'; break;
      case 'REJECT':          newRec = 'NOT_RECOMMENDED'; newStatus = 'Not Recommended'; break;
      case 'SELECT':          newRec = 'RECOMMENDED'; newStatus = 'Selected'; break;
      case 'RESET':           newRec = '';            newStatus = 'Pending'; break;
      default: return { success: false, message: 'Unknown action.' };
    }
    var sheet = getResponseSheet_();
    var last = sheet.getLastRow();
    if (last < 2) return { success: false, message: 'No applicants.' };
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function (h) { return String(h || '').trim(); });
    var idCol = headers.indexOf('Submission Number');
    var recCol = headers.indexOf('Admin Recommendation');
    var statCol = headers.indexOf('Admin Status');
    var remCol = headers.indexOf('Admin Remarks');
    var rvcCol = headers.indexOf('Reviewed By / Date');
    if (idCol === -1 || recCol === -1) return { success: false, message: 'Sheet schema mismatch.' };
    var ids = sheet.getRange(2, idCol + 1, last - 1, 1).getValues();
    var targetRow = -1;
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0] || '').trim() === id) { targetRow = i + 2; break; }
    }
    if (targetRow < 0) return { success: false, message: 'Applicant not found.' };
    var prevRec = sheet.getRange(targetRow, recCol + 1).getValue();
    var prevStat = statCol !== -1 ? sheet.getRange(targetRow, statCol + 1).getValue() : '';
    sheet.getRange(targetRow, recCol + 1).setValue(newRec);
    if (statCol !== -1) sheet.getRange(targetRow, statCol + 1).setValue(newStatus);
    if (remCol !== -1 && comment) sheet.getRange(targetRow, remCol + 1).setValue(comment);
    if (rvcCol !== -1) sheet.getRange(targetRow, rvcCol + 1).setValue(session.email + ' / ' + formatDateTime_(new Date()));
    logAudit_(session.email, id, prevStat, newStatus, prevRec, newRec, action, comment);
    return { success: true };
  } catch (err) {
    if (err && err.code === 'SESSION_INVALID') return sessionErrorPayload_();
    if (err && err.code === 'NOT_ADMIN') return { success: false, message: 'Administrator access required.' };
    Logger.log('applySelectionAction failed: ' + (err && err.stack ? err.stack : err));
    return { success: false, message: 'Could not apply the action.' };
  }
}

function confirmCohort(token, payload) {
  try {
    var session = requireAdmin_(token);
    var ids = (payload && payload.ids) || [];
    if (!ids.length) return { success: false, message: 'No applicants to confirm.' };
    var settings = getSettings();
    var target = settings.targetParticipants || TARGET_PARTICIPANTS;
    if (ids.length !== target) return { success: false, message: 'Cohort must contain exactly ' + target + ' participants (submitted: ' + ids.length + ').' };
    var sheet = getResponseSheet_();
    var last = sheet.getLastRow();
    if (last < 2) return { success: false, message: 'No applicants.' };
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function (h) { return String(h || '').trim(); });
    var idCol = headers.indexOf('Submission Number');
    var recCol = headers.indexOf('Admin Recommendation');
    var statCol = headers.indexOf('Admin Status');
    var rvcCol = headers.indexOf('Reviewed By / Date');
    if (idCol === -1 || recCol === -1 || statCol === -1) return { success: false, message: 'Sheet schema mismatch.' };
    var idsCol = sheet.getRange(2, idCol + 1, last - 1, 1).getValues();
    var lookup = {};
    for (var i = 0; i < idsCol.length; i++) lookup[String(idsCol[i][0] || '').trim()] = i + 2;
    var stamp = session.email + ' / ' + formatDateTime_(new Date());
    var confirmed = 0;
    ids.forEach(function (id) {
      var row = lookup[id];
      if (!row) return;
      sheet.getRange(row, recCol + 1).setValue('RECOMMENDED');
      sheet.getRange(row, statCol + 1).setValue('Selected');
      if (rvcCol !== -1) sheet.getRange(row, rvcCol + 1).setValue(stamp);
      logAudit_(session.email, id, '', 'Selected', '', 'RECOMMENDED', 'CONFIRM_COHORT', 'Cohort confirmed');
      confirmed++;
    });
    return { success: true, confirmed: confirmed };
  } catch (err) {
    if (err && err.code === 'SESSION_INVALID') return sessionErrorPayload_();
    if (err && err.code === 'NOT_ADMIN') return { success: false, message: 'Administrator access required.' };
    Logger.log('confirmCohort failed: ' + (err && err.stack ? err.stack : err));
    return { success: false, message: 'Could not confirm cohort.' };
  }
}

function logAudit_(email, submissionId, prevStatus, newStatus, prevScore, newScore, action, comment) {
  try {
    getAuditSheet_().appendRow([new Date(), email || 'unknown', submissionId, prevStatus, newStatus, prevScore, newScore, action, comment || '']);
  } catch (err) { Logger.log('audit log failed: ' + (err && err.message)); }
}

/* ============================================================================
 * SECTION 19 - SETTINGS
 * ==========================================================================*/

function getSettings() {
  var stored = {};
  try {
    var sheet = getSettingsSheet_();
    var last = sheet.getLastRow();
    if (last >= 2) {
      var rows = sheet.getRange(2, 1, last - 1, 2).getValues();
      rows.forEach(function (r) {
        var k = String(r[0] || '').trim();
        if (k) stored[k] = r[1];
      });
    }
  } catch (e) {}
  var weights = {
    ict:            num_(stored.weight_ict,            DEFAULT_WEIGHTS.ict),
    networking:     num_(stored.weight_networking,     DEFAULT_WEIGHTS.networking),
    teaching:       num_(stored.weight_teaching,       DEFAULT_WEIGHTS.teaching),
    implementation: num_(stored.weight_implementation, DEFAULT_WEIGHTS.implementation),
    motivation:     num_(stored.weight_motivation,     DEFAULT_WEIGHTS.motivation),
    readiness:      num_(stored.weight_readiness,      DEFAULT_WEIGHTS.readiness),
    learning:       num_(stored.weight_learning,       DEFAULT_WEIGHTS.learning),
    impact:         num_(stored.weight_impact,         DEFAULT_WEIGHTS.impact),
    aiReadiness:    num_(stored.weight_ai_readiness,   DEFAULT_WEIGHTS.aiReadiness)
  };
  weights.total = weights.ict + weights.networking + weights.teaching + weights.implementation +
                  weights.motivation + weights.readiness + weights.learning + weights.impact + weights.aiReadiness;
  weights.committeeTeaching = COMMITTEE_MAX_TEACHING;
  weights.committeeImpact = COMMITTEE_MAX_IMPACT;
  weights.grand = weights.total + weights.committeeTeaching + weights.committeeImpact;
  var facultyList = [];
  if (stored.faculties) {
    facultyList = String(stored.faculties).split(/\s*\n\s*/).map(function (x) { return x.trim(); }).filter(function (x) { return x; });
  } else if (OFFICIAL_FACULTIES.length) {
    facultyList = OFFICIAL_FACULTIES.slice();
  } else {
    try { facultyList = getFacultyDepartmentData_().faculties.map(function (f) { return f.faculty; }); }
    catch (e) { facultyList = []; }
  }
  return {
    weights: weights, faculties: facultyList,
    targetParticipants: num_(stored.target_participants, TARGET_PARTICIPANTS),
    programmeName: String(stored.programme_name || PROGRAMME_NAME),
    applicationsClose: String(stored.applications_close || APPLICATIONS_CLOSE_TEXT)
  };
}

function updateSettings(token, payload) {
  try {
    var session = requireSession_(token);
    var w = (payload && payload.weights) || {};
    var total = num_(w.ict, 0) + num_(w.networking, 0) + num_(w.teaching, 0) + num_(w.implementation, 0) +
                num_(w.motivation, 0) + num_(w.readiness, 0) + num_(w.learning, 0) + num_(w.impact, 0) +
                num_(w.aiReadiness, 0);
    if (total !== 90 && total !== 100) {
      return { success: false, message: 'Weights must total 90 (auto) or 100 (including 10 committee points). Got ' + total + '.' };
    }
    var sheet = getSettingsSheet_();
    var updates = {
      weight_ict: w.ict, weight_networking: w.networking, weight_teaching: w.teaching,
      weight_implementation: w.implementation, weight_motivation: w.motivation,
      weight_readiness: w.readiness, weight_learning: w.learning, weight_impact: w.impact,
      weight_ai_readiness: w.aiReadiness,
      target_participants: payload.targetParticipants, faculties: payload.faculties,
      programme_name: payload.programmeName, applications_close: payload.applicationsClose
    };
    var last = sheet.getLastRow();
    var existing = {};
    if (last >= 2) {
      var rows = sheet.getRange(2, 1, last - 1, 2).getValues();
      for (var i = 0; i < rows.length; i++) existing[String(rows[i][0] || '').trim()] = i + 2;
    }
    Object.keys(updates).forEach(function (k) {
      var v = updates[k];
      if (v === undefined || v === null) return;
      if (existing[k]) sheet.getRange(existing[k], 2).setValue(v);
      else sheet.appendRow([k, v]);
    });
    logAudit_(session.email, '', '', '', '', '', 'UPDATE_SETTINGS', 'Weight total: ' + total);
    return { success: true };
  } catch (err) {
    if (err && err.code === 'SESSION_INVALID') return sessionErrorPayload_();
    Logger.log('updateSettings failed: ' + (err && err.message));
    return { success: false, message: 'Could not save settings.' };
  }
}

/* ============================================================================
 * SECTION 20 - EXPORTS
 * ==========================================================================*/

function exportRecommendedCsv(token) {
  try {
    requireSession_(token);
    var data = getDashboardData(token);
    if (!data.success) return data;
    var header = ['Rank', 'Submission ID', 'Name', 'Faculty', 'Department', 'Total Score', 'Recommendation', 'Status'];
    var lines = [header.join(',')];
    data.applicants.filter(function (a) { return a.recommendation === 'RECOMMENDED'; })
      .sort(function (a, b) { return b.total - a.total; })
      .forEach(function (a, idx) {
        lines.push([idx + 1, csv_(a.record.submissionNumber), csv_(buildDisplayName_(a.record)),
          csv_(a.record.faculty), csv_(a.record.department), a.total, a.recommendation, a.status].join(','));
      });
    return { success: true, csv: lines.join('\r\n') };
  } catch (err) {
    if (err && err.code === 'SESSION_INVALID') return sessionErrorPayload_();
    return { success: false, message: 'Could not export.' };
  }
}

function exportFullReportCsv(token) {
  try {
    requireSession_(token);
    var data = getDashboardData(token);
    if (!data.success) return data;
    var header = ['Submission ID', 'Name', 'Staff ID', 'Faculty', 'Department', 'Rank',
                  'ICT', 'Networking', 'Teaching', 'Implementation', 'Motivation',
                  'Readiness', 'Learning', 'Impact', 'AI Readiness', 'Auto Total', 'Committee',
                  'Total', 'Recommendation', 'Status', 'Eligible', 'Flags',
                  'Attendance Risk', 'Admin Remarks', 'Reviewed By/Date'];
    var lines = [header.join(',')];
    data.applicants.forEach(function (a) {
      lines.push([
        csv_(a.record.submissionNumber), csv_(buildDisplayName_(a.record)), csv_(a.record.staffId),
        csv_(a.record.faculty), csv_(a.record.department),
        csv_(a.record.rank === 'Other' ? a.record.otherRank : a.record.rank),
        a.scores.ict, a.scores.networking, a.scores.teaching, a.scores.implementation,
        a.scores.motivation, a.scores.readiness, a.scores.learning, a.scores.impact, a.scores.aiReadiness,
        a.scores.auto, a.committeeTotal, a.total, a.recommendation, a.status,
        a.eligibility.eligible ? 'Yes' : 'No', csv_(a.eligibility.flags.join('; ')),
        a.attendanceRisk ? 'Yes' : 'No',
        csv_(a.record.adminRemarks || ''), csv_(a.record.reviewedByDate || '')
      ].join(','));
    });
    return { success: true, csv: lines.join('\r\n') };
  } catch (err) {
    if (err && err.code === 'SESSION_INVALID') return sessionErrorPayload_();
    return { success: false, message: 'Could not export.' };
  }
}

function exportFacultyReportCsv(token) {
  try {
    requireSession_(token);
    var data = getDashboardData(token);
    if (!data.success) return data;
    var header = ['Faculty', 'Applications', 'Eligible', 'Average Score', 'Median Score', 'Highest Score', 'Top Candidate', 'Status'];
    var lines = [header.join(',')];
    data.facultySummary.forEach(function (f) {
      lines.push([
        csv_(f.faculty), f.applications, f.eligible, f.average, f.median, f.highest,
        csv_(f.topCandidate ? f.topCandidate.name + ' (' + f.topCandidate.total + ')' : ''), f.status
      ].join(','));
    });
    return { success: true, csv: lines.join('\r\n') };
  } catch (err) {
    if (err && err.code === 'SESSION_INVALID') return sessionErrorPayload_();
    return { success: false, message: 'Could not export.' };
  }
}

/* ============================================================================
 * SECTION 21 - UTILITIES
 * ==========================================================================*/

function computeCounts_(applicants, facultySummary, settings) {
  var eligible = 0, review = 0, recommended = 0, selected = 0, waitlisted = 0;
  var facultiesWithApps = 0, facultiesNoEligible = 0;
  (applicants || []).forEach(function (a) {
    if (a.eligibility && a.eligibility.eligible) eligible++;
    if (a.recommendation === 'REVIEW_REQUIRED') review++;
    if (a.recommendation === 'RECOMMENDED') recommended++;
    if (a.status === 'Selected') selected++;
    if (a.recommendation === 'WAITLIST') waitlisted++;
  });
  (facultySummary || []).forEach(function (f) {
    if (f.applications > 0) facultiesWithApps++;
    if (f.status === 'NO_ELIGIBLE') facultiesNoEligible++;
  });
  return {
    total: (applicants || []).length, eligible: eligible, review: review,
    recommended: recommended, selected: selected, waitlisted: waitlisted,
    facultiesRepresented: facultiesWithApps, facultiesNoEligible: facultiesNoEligible,
    remaining: Math.max(0, ((settings && settings.targetParticipants) || TARGET_PARTICIPANTS) - selected)
  };
}

function formatDateTime_(d) {
  var tz = 'Africa/Lagos';
  try { var t = Session.getScriptTimeZone(); if (t) tz = t; } catch (e) {}
  return Utilities.formatDate(d, tz, 'yyyy-MM-dd HH:mm:ss');
}
function escapeHtml_(v) {
  return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function csv_(v) {
  var s = String(v == null ? '' : v);
  if (/[",\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}
function clamp_(v, lo, hi) { if (isNaN(v)) return lo; return Math.max(lo, Math.min(hi, v)); }
function num_(v, def) { var n = Number(v); return isNaN(n) ? def : n; }

/* ============================================================================
 * SECTION 22 - DIAGNOSTICS
 * ==========================================================================*/

function setupAllSheets() {
  getResponseSheet_();
  getAuditSheet_();
  getCommitteeSheet_();
  getSettingsSheet_();
  ensureUsersSheet_();
  ensureSessionsSheet_();
  Logger.log('All CAIIT sheets are ready.');
}
function refreshInfoCache() {
  CacheService.getScriptCache().remove('caiit_fac_dept_v1');
  Logger.log('Info cache cleared.');
}
function diagnoseSetup() {
  Logger.log('=== CAIIT diagnoseSetup ===');
  try { var fac = getFacultyDepartmentData_(); Logger.log('Faculties: ' + fac.faculties.length); }
  catch (e) { Logger.log('Info sheet FAILED: ' + e.message); }
  try { setupAllSheets(); } catch (e) { Logger.log('Sheet setup FAILED: ' + e.message); }
  try {
    var usersSheet = ensureUsersSheet_();
    var count = usersSheet.getLastRow() - 1;
    Logger.log('Users configured: ' + count);
    if (count < 1) Logger.log('WARNING: no users configured. Run bootstrapAdminUser().');
  } catch (e) { Logger.log('Users tab check failed: ' + e.message); }
  try {
    Logger.log('applications_close_iso: ' + getApplicationsCloseIso_());
    Logger.log('applications_close:     ' + getApplicationsCloseText_());
    Logger.log('isClosed:               ' + isApplicationsClosed_());
  } catch (e) { Logger.log('Close-date check FAILED: ' + e.message); }
  Logger.log('=== end ===');
}

/**
 * Structural health-check for the dashboard data pipeline. Runs the readers in
 * isolation so a failure identifies exactly which tab is malformed.
 * Run this from the Apps Script editor and view Logs.
 */
function diagnoseDashboard() {
  var probe = {};
  function tryIt(label, fn) {
    try { probe[label] = fn(); }
    catch (e) { probe[label] = 'ERROR: ' + (e && e.message ? e.message : e); }
  }
  tryIt('responseHeaders', function () {
    var s = getResponseSheet_();
    return s.getRange(1, 1, 1, Math.max(s.getLastColumn(), 1)).getValues()[0].join(' | ');
  });
  tryIt('responseRows',  function () { return readApplicantRecords_().length; });
  tryIt('committeeCols', function () { return JSON.stringify(committeeColumns_(getCommitteeSheet_())); });
  tryIt('committeeRows', function () { return Object.keys(readCommitteeAssessments_()).length; });
  tryIt('auditHeaders', function () {
    var s = getAuditSheet_();
    return s.getRange(1, 1, 1, Math.max(s.getLastColumn(), 1)).getValues()[0].join(' | ');
  });
  tryIt('auditRows',     function () { return readAuditLog_().length; });
  tryIt('settings',      function () {
    var s = getSettings();
    return 'weights.total=' + s.weights.total + ', faculties=' + s.faculties.length +
           ', target=' + s.targetParticipants;
  });
  Logger.log(JSON.stringify(probe, null, 2));
  return probe;
}

/**
 * Same as diagnoseDashboard but also tries to construct the full dashboard
 * payload. Pass a valid session token; if you don't have one, leave blank and
 * the payload probe will simply report SESSION_INVALID.
 */
function diagnoseDashboardFull(token) {
  var base = diagnoseDashboard();
  try {
    var d = getDashboardData(token || '');
    base.dashboard = d && d.success
      ? ('OK (' + d.applicants.length + ' applicants, ' + d.counts.recommended + ' recommended)')
      : ('FAILED: ' + ((d && d.message) || 'no payload') + ' :: ' + ((d && d.detail) || ''));
  } catch (e) {
    base.dashboard = 'THREW: ' + (e && e.message ? e.message : e);
  }
  Logger.log('dashboard probe: ' + base.dashboard);
  return base;
}