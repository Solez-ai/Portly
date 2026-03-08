const fs = require('fs');
const os = require('os');
const path = require('path');

const STORE_DIR = path.join(os.homedir(), '.portly');
const SESSIONS_FILE = path.join(STORE_DIR, 'sessions.json');
const CURRENT_FILE = path.join(STORE_DIR, 'current-session.json');

function ensureStore() {
  if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true });
  if (!fs.existsSync(SESSIONS_FILE)) fs.writeFileSync(SESSIONS_FILE, '[]', 'utf8');
}

function readSessions() {
  ensureStore();
  try {
    return JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
  } catch (_) {
    return [];
  }
}

function writeSessions(sessions) {
  ensureStore();
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf8');
}

function addSession(session) {
  const sessions = readSessions();
  sessions.unshift(session);
  writeSessions(sessions.slice(0, 100));
  fs.writeFileSync(CURRENT_FILE, JSON.stringify(session, null, 2), 'utf8');
}

function updateCurrent(update) {
  if (!fs.existsSync(CURRENT_FILE)) return;
  const current = getCurrentSession();
  if (!current) return;
  const next = { ...current, ...update };
  fs.writeFileSync(CURRENT_FILE, JSON.stringify(next, null, 2), 'utf8');

  const sessions = readSessions();
  const idx = sessions.findIndex((s) => s.id === current.id);
  if (idx >= 0) {
    sessions[idx] = { ...sessions[idx], ...update };
    writeSessions(sessions);
  }
}

function getCurrentSession() {
  if (!fs.existsSync(CURRENT_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(CURRENT_FILE, 'utf8'));
  } catch (_) {
    return null;
  }
}

function listSessions() {
  return readSessions();
}

function clearCurrent() {
  if (fs.existsSync(CURRENT_FILE)) fs.unlinkSync(CURRENT_FILE);
}

module.exports = {
  STORE_DIR,
  SESSIONS_FILE,
  CURRENT_FILE,
  addSession,
  updateCurrent,
  getCurrentSession,
  listSessions,
  clearCurrent
};
