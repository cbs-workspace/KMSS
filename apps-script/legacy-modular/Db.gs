/**
 * Spreadsheet data-access helpers. Every sheet is read/written through these
 * functions so the rest of the code never touches SpreadsheetApp directly.
 */

var SPREADSHEET_ID_KEY = 'SPREADSHEET_ID';

function getSpreadsheetId_() {
  var id = PropertiesService.getScriptProperties().getProperty(SPREADSHEET_ID_KEY);
  if (!id) {
    throw new Error('The portal is not set up yet. Run setUp() once from the Apps Script editor.');
  }
  return id;
}

function setSpreadsheetId_(id) {
  PropertiesService.getScriptProperties().setProperty(SPREADSHEET_ID_KEY, id);
}

function getSpreadsheet_() {
  return SpreadsheetApp.openById(getSpreadsheetId_());
}

function getSheet_(name) {
  var sheet = getSpreadsheet_().getSheetByName(name);
  if (!sheet) throw new Error('Missing sheet tab: ' + name);
  return sheet;
}

/** Reads a whole tab into an array of objects (one per row, keyed by header). */
function readTable_(name) {
  var sheet = getSheet_(name);
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0];
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (row.join('').toString().trim() === '') continue;
    var obj = {};
    for (var c = 0; c < headers.length; c++) obj[headers[c]] = row[c];
    obj._row = i + 1;
    rows.push(obj);
  }
  return rows;
}

function findById_(name, id) {
  var rows = readTable_(name);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].id) === String(id)) return rows[i];
  }
  return null;
}

function findWhere_(name, predicate) {
  var rows = readTable_(name);
  for (var i = 0; i < rows.length; i++) {
    if (predicate(rows[i])) return rows[i];
  }
  return null;
}

function filterWhere_(name, predicate) {
  return readTable_(name).filter(predicate);
}

/** Appends a row built from the given object, using HEADERS[name] ordering. */
function appendRow_(name, obj) {
  var sheet = getSheet_(name);
  var headers = HEADERS[name];
  var row = headers.map(function (h) {
    return obj[h] === undefined || obj[h] === null ? '' : obj[h];
  });
  sheet.appendRow(row);
  return obj;
}

/** Updates only the columns present in `patch` for the row whose id matches. */
function updateRow_(name, id, patch) {
  var sheet = getSheet_(name);
  var headers = HEADERS[name];
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(id)) {
      for (var c = 0; c < headers.length; c++) {
        var key = headers[c];
        if (Object.prototype.hasOwnProperty.call(patch, key)) {
          sheet.getRange(i + 1, c + 1).setValue(patch[key] === null ? '' : patch[key]);
        }
      }
      return true;
    }
  }
  return false;
}

function deleteRow_(name, id) {
  var sheet = getSheet_(name);
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

/** Inserts or updates a full record depending on whether obj.id already exists. */
function upsertRow_(name, obj) {
  if (obj.id && findById_(name, obj.id)) {
    updateRow_(name, obj.id, obj);
    return obj;
  }
  if (!obj.id) obj.id = uuid_();
  appendRow_(name, obj);
  return obj;
}

function uuid_() {
  return Utilities.getUuid();
}

function nowIso_() {
  return new Date().toISOString();
}

function toBool_(value) {
  if (value === true || value === false) return value;
  var s = String(value).toLowerCase();
  return !(s === '' || s === 'false' || s === '0' || s === 'no');
}

function toNum_(value) {
  if (value === '' || value === null || value === undefined) return null;
  var n = Number(value);
  return isNaN(n) ? null : n;
}

function indexById_(rows) {
  var map = {};
  for (var i = 0; i < rows.length; i++) map[rows[i].id] = rows[i];
  return map;
}

function parseCsv_(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map(function (s) { return s.trim(); })
    .filter(function (s) { return s.length > 0; });
}
