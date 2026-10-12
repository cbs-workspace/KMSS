/** Announcements with audience targeting (all, section, staff, parents). */

var ANNOUNCE_AUDIENCES = ['ALL', 'KG', 'PRIMARY', 'SECONDARY', 'STAFF', 'PARENTS'];

function announcementVisible_(user, item) {
  var audience = item.audience || 'ALL';
  if (audience === 'ALL') return true;
  if (audience === 'STAFF') return user.role !== 'PARENT';
  if (audience === 'PARENTS') return user.role === 'PARENT';
  return userSections_(user).indexOf(audience) !== -1;
}

function api_listAnnouncements(token) {
  var user = requireUser_(token);
  var list = readTable_('Announcements').filter(function (a) {
    return toBool_(a.active) && announcementVisible_(user, a);
  });
  list.sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });
  return list.map(function (a) { return { id: a.id, title: a.title, body: a.body, audience: a.audience, createdAt: a.createdAt }; });
}

function api_saveAnnouncement(token, payload) {
  var user = requireUser_(token);
  assertRole_(user, ['PRINCIPAL', 'HEADMASTER', 'BURSAR', 'ACCOUNT_OFFICER', 'TEACHER'], 'You cannot post announcements.');
  if (!payload || !payload.title || !payload.body) throw new Error('Title and body are required.');
  var audience = ANNOUNCE_AUDIENCES.indexOf(payload.audience) !== -1 ? payload.audience : 'ALL';
  var fields = { title: String(payload.title).trim(), body: String(payload.body).trim(), audience: audience };
  if (payload.id) {
    if (!findById_('Announcements', payload.id)) throw new Error('Announcement not found.');
    updateRow_('Announcements', payload.id, fields);
    return { id: payload.id };
  }
  fields.id = uuid_();
  fields.createdBy = user.id;
  fields.createdAt = nowIso_();
  fields.active = true;
  appendRow_('Announcements', fields);
  return { id: fields.id };
}

function api_deleteAnnouncement(token, id) {
  var user = requireUser_(token);
  assertRole_(user, ['PRINCIPAL', 'HEADMASTER'], 'You cannot delete announcements.');
  deleteRow_('Announcements', id);
  return true;
}
