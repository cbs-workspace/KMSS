/**
 * Global configuration and shared constants for the Kings Metro School portal.
 * This is a Google Apps Script web app backed entirely by a Google Spreadsheet.
 */

var CFG = {
  APP_NAME: 'Kings Metro School Sokoto',
  APP_SUBTITLE: 'KG · Primary · Secondary',
  DEFAULT_FOOTER_TEXT: '© 2026 Capacity Building and Support (CBS). All rights reserved.',
  SESSION_TTL_SECONDS: 21600, // 6 hours (Apps Script CacheService maximum)
  SHEETS: {
    USERS: 'Users',
    CLASS_LEVELS: 'ClassLevels',
    CLASS_ARMS: 'ClassArms',
    SUBJECTS: 'Subjects',
    SUBJECT_CLASS: 'SubjectClass',
    TERMS: 'Terms',
    GRADE_SCALE: 'GradeScale',
    STUDENTS: 'Students',
    ATTENDANCE: 'Attendance',
    SCORES: 'Scores',
    RESULT_SHEETS: 'ResultSheets',
    ANNOUNCEMENTS: 'Announcements'
  },
  ROLES: ['ADMIN', 'PRINCIPAL', 'HEADMASTER', 'BURSAR', 'ACCOUNT_OFFICER', 'TEACHER', 'PARENT'],
  SECTIONS: ['KG', 'PRIMARY', 'SECONDARY'],
  TERM_NAMES: ['FIRST', 'SECOND', 'THIRD'],
  ATTENDANCE_STATUSES: ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'],
  ENTRY_ROLES: ['PRINCIPAL', 'HEADMASTER', 'TEACHER'],
  MANAGE_ROLES: ['PRINCIPAL', 'HEADMASTER', 'BURSAR', 'ACCOUNT_OFFICER', 'TEACHER']
};

/** Column headers for every sheet tab. Order is authoritative. */
var HEADERS = {
  Users: ['id', 'username', 'passwordHash', 'salt', 'role', 'fullName', 'email', 'sectionScope', 'classArmScope', 'active', 'createdAt'],
  ClassLevels: ['id', 'section', 'name', 'orderIndex', 'active'],
  ClassArms: ['id', 'classLevelId', 'name', 'active'],
  Subjects: ['id', 'section', 'name', 'active'],
  SubjectClass: ['id', 'subjectId', 'classLevelId'],
  Terms: ['id', 'sessionName', 'termName', 'startDate', 'endDate', 'isCurrent', 'active'],
  GradeScale: ['id', 'section', 'grade', 'minScore', 'maxScore', 'remark', 'orderIndex'],
  Students: ['id', 'admissionNo', 'firstName', 'middleName', 'lastName', 'gender', 'dateOfBirth', 'classArmId', 'guardianName', 'guardianPhone', 'address', 'status', 'createdAt', 'updatedAt'],
  Attendance: ['id', 'date', 'classArmId', 'studentId', 'status', 'note', 'recordedBy', 'createdAt'],
  Scores: ['id', 'termId', 'classArmId', 'studentId', 'subjectId', 'ca1', 'ca2', 'ca3', 'exam', 'total', 'grade', 'remark', 'recordedBy', 'updatedAt'],
  ResultSheets: ['id', 'termId', 'studentId', 'position', 'totalScore', 'average', 'teacherRemark', 'principalRemark', 'status', 'updatedAt'],
  Announcements: ['id', 'title', 'body', 'audience', 'createdBy', 'createdAt', 'active']
};

/** Branding details, overridable through Project Settings → Script Properties. */
function brand_() {
  var props = PropertiesService.getScriptProperties();
  return {
    schoolName: props.getProperty('SCHOOL_NAME') || CFG.APP_NAME,
    subtitle: CFG.APP_SUBTITLE,
    footerText: props.getProperty('FOOTER_TEXT') || CFG.DEFAULT_FOOTER_TEXT,
    logoUrl: props.getProperty('SCHOOL_LOGO_URL') || '',
    cbsLogoUrl: props.getProperty('CBS_LOGO_URL') || ''
  };
}
