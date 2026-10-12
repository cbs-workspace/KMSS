/**
 * One-time (and repeatable) provisioning. Run setUp() from the Apps Script
 * editor: it creates the backing Spreadsheet, every tab, and seeds the
 * reference data that the original system shipped with.
 */

function setUp() {
  var props = PropertiesService.getScriptProperties();
  var ssId = props.getProperty(SPREADSHEET_ID_KEY);
  var ss;
  if (ssId) {
    ss = SpreadsheetApp.openById(ssId);
  } else {
    ss = SpreadsheetApp.create('Kings Metro School — Data');
    setSpreadsheetId_(ss.getId());
  }

  Object.keys(CFG.SHEETS).forEach(function (key) {
    ensureSheet_(ss, CFG.SHEETS[key]);
  });

  seedReferenceData_();
  seedAdmin_();

  Logger.log('Setup complete.');
  Logger.log('Spreadsheet: ' + ss.getUrl());
  return ss.getUrl();
}

function ensureSheet_(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  var headers = HEADERS[name];
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function seedAdmin_() {
  var existing = findWhere_('Users', function (u) { return String(u.username) === 'admin'; });
  if (existing) return;
  var salt = makeSalt_();
  appendRow_('Users', {
    id: uuid_(),
    username: 'admin',
    passwordHash: hashPassword_('Admin@1234', salt),
    salt: salt,
    role: 'ADMIN',
    fullName: 'System Administrator',
    email: 'admin@kingsmetroschools.com.ng',
    sectionScope: '',
    classArmScope: '',
    active: true,
    createdAt: nowIso_()
  });
  Logger.log('Default admin created → username: admin  password: Admin@1234');
}

function seedReferenceData_() {
  if (readTable_('ClassLevels').length === 0) seedClassLevels_();
  if (readTable_('ClassArms').length === 0) seedClassArms_();
  if (readTable_('Subjects').length === 0) seedSubjects_();
  if (readTable_('Terms').length === 0) seedTerms_();
  if (readTable_('GradeScale').length === 0) seedGradeScale_();
}

function seedClassLevels_() {
  var levels = [
    { section: 'KG', name: 'Pre-Nursery', orderIndex: 1 },
    { section: 'KG', name: 'Nursery 1', orderIndex: 2 },
    { section: 'KG', name: 'Nursery 2', orderIndex: 3 },
    { section: 'KG', name: 'KG', orderIndex: 4 }
  ];
  for (var i = 1; i <= 6; i++) levels.push({ section: 'PRIMARY', name: 'Primary ' + i, orderIndex: i });
  ['JSS 1', 'JSS 2', 'JSS 3', 'SSS 1', 'SSS 2', 'SSS 3'].forEach(function (name, idx) {
    levels.push({ section: 'SECONDARY', name: name, orderIndex: idx + 1 });
  });
  levels.forEach(function (l) {
    appendRow_('ClassLevels', {
      id: uuid_(), section: l.section, name: l.name, orderIndex: l.orderIndex, active: true
    });
  });
}

function seedClassArms_() {
  readTable_('ClassLevels').forEach(function (level) {
    appendRow_('ClassArms', { id: uuid_(), classLevelId: level.id, name: 'A', active: true });
  });
}

function seedSubjects_() {
  var subjectsBySection = {
    KG: ['Numeracy', 'Literacy', 'Rhymes'],
    PRIMARY: ['Mathematics', 'English Studies', 'Basic Science and Technology', 'National Values', 'Cultural & Creative Arts'],
    SECONDARY: ['Mathematics', 'English Language', 'Basic Science', 'Social Studies', 'Biology', 'Chemistry', 'Physics', 'Economics', 'Government']
  };
  var levels = readTable_('ClassLevels');
  Object.keys(subjectsBySection).forEach(function (section) {
    var sectionLevels = levels.filter(function (l) { return l.section === section; });
    subjectsBySection[section].forEach(function (name) {
      var subjectId = uuid_();
      appendRow_('Subjects', { id: subjectId, section: section, name: name, active: true });
      sectionLevels.forEach(function (level) {
        appendRow_('SubjectClass', { id: uuid_(), subjectId: subjectId, classLevelId: level.id });
      });
    });
  });
}

function seedTerms_() {
  var year = new Date().getFullYear();
  var sessionName = year + '/' + (year + 1);
  ['FIRST', 'SECOND', 'THIRD'].forEach(function (termName, idx) {
    appendRow_('Terms', {
      id: uuid_(), sessionName: sessionName, termName: termName,
      startDate: '', endDate: '', isCurrent: idx === 0, active: true
    });
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
    defs.forEach(function (d) {
      appendRow_('GradeScale', {
        id: uuid_(), section: section, grade: d.grade, minScore: d.minScore,
        maxScore: d.maxScore, remark: d.remark, orderIndex: d.orderIndex
      });
    });
  });
}

/**
 * Creates a teacher account (helper for the editor). Adjust and run as needed.
 */
function createUser(username, password, role, fullName, sectionScope, classArmScope) {
  var salt = makeSalt_();
  var existing = findWhere_('Users', function (u) { return String(u.username) === String(username); });
  if (existing) throw new Error('Username already exists: ' + username);
  appendRow_('Users', {
    id: uuid_(), username: username, passwordHash: hashPassword_(password, salt), salt: salt,
    role: role, fullName: fullName || username, email: '', sectionScope: sectionScope || '',
    classArmScope: classArmScope || '', active: true, createdAt: nowIso_()
  });
  Logger.log('Created user ' + username + ' (' + role + ')');
}
