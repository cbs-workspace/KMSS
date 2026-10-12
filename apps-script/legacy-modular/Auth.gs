/**
 * Authentication + authorization. Teachers and staff sign in with a
 * username/password stored (salted SHA-256) in the Users tab. Successful
 * logins mint a random session token kept in CacheService for 6 hours.
 */

function makeSalt_() {
  return Utilities.getUuid().replace(/-/g, '');
}

function hashPassword_(password, salt) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(password) + ':' + String(salt),
    Utilities.Charset.UTF_8
  );
  var out = '';
  for (var i = 0; i < bytes.length; i++) {
    var hex = (bytes[i] & 0xff).toString(16);
    if (hex.length === 1) hex = '0' + hex;
    out += hex;
  }
  return out;
}

function publicUser_(user) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    fullName: user.fullName,
    email: user.email,
    sectionScope: user.sectionScope,
    classArmScope: user.classArmScope
  };
}

/** Signs a user in. Returns { token, user } or throws on bad credentials. */
function api_login(username, password) {
  if (!username || !password) throw new Error('Enter your username and password.');
  var user = findWhere_('Users', function (u) {
    return String(u.username).toLowerCase() === String(username).trim().toLowerCase();
  });
  if (!user || !toBool_(user.active)) throw new Error('Invalid username or password.');
  if (hashPassword_(password, user.salt) !== String(user.passwordHash)) {
    throw new Error('Invalid username or password.');
  }
  var token = Utilities.getUuid();
  CacheService.getScriptCache().put('sess_' + token, user.id, CFG.SESSION_TTL_SECONDS);
  return { token: token, user: publicUser_(user) };
}

function api_logout(token) {
  if (token) CacheService.getScriptCache().remove('sess_' + token);
  return true;
}

function api_me(token) {
  return publicUser_(requireUser_(token));
}

/** Resolves the caller from a session token, or throws if not signed in. */
function requireUser_(token) {
  if (!token) throw new Error('Please sign in to continue.');
  var userId = CacheService.getScriptCache().get('sess_' + token);
  if (!userId) throw new Error('Your session has expired. Please sign in again.');
  var user = findById_('Users', userId);
  if (!user || !toBool_(user.active)) throw new Error('Please sign in again.');
  return user;
}

/** True when the user is an admin or holds one of the given roles. */
function hasRole_(user, roles) {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  return roles.indexOf(user.role) !== -1;
}

function assertRole_(user, roles, message) {
  if (!hasRole_(user, roles)) throw new Error(message || 'You do not have permission to do that.');
}

/** The list of class-arm ids a user is restricted to, or null for "all". */
function userArmIds_(user) {
  if (!user) return [];
  return parseCsv_(user.classArmScope);
}

function userSections_(user) {
  return parseCsv_(user.sectionScope);
}
