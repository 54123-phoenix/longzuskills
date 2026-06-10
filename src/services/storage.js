const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'data.db');

let db;
let writeCount = 0;
let flushTimer = null;
const FLUSH_INTERVAL = 2000;
const FLUSH_THRESHOLD = 15;

async function init() {
  const SQL = await initSqlJs();
  const exists = fs.existsSync(DB_FILE);
  db = exists ? new SQL.Database(fs.readFileSync(DB_FILE)) : new SQL.Database();
  db.run(`CREATE TABLE IF NOT EXISTS private_msgs (id INTEGER PRIMARY KEY AUTOINCREMENT, char_id TEXT, user_id TEXT, is_self INTEGER, text TEXT, created_at INTEGER)`);
  db.run(`CREATE TABLE IF NOT EXISTS group_msgs (char_id TEXT, name TEXT, avatar TEXT, color TEXT, text TEXT, is_self INTEGER, type TEXT, created_at INTEGER)`);
  db.run(`CREATE TABLE IF NOT EXISTS profiles (char_id TEXT, user_id TEXT DEFAULT 'default', msg_count INTEGER DEFAULT 0, trust INTEGER DEFAULT 0, respect INTEGER DEFAULT 0, closeness INTEGER DEFAULT 0, dependency INTEGER DEFAULT 0, last_chat INTEGER, PRIMARY KEY(char_id, user_id))`);
  db.run(`CREATE TABLE IF NOT EXISTS memories (id INTEGER PRIMARY KEY AUTOINCREMENT, char_id TEXT, user_id TEXT DEFAULT 'default', key TEXT, value TEXT, confidence REAL DEFAULT 0.5, source TEXT, created_at INTEGER, updated_at INTEGER)`);
  db.run(`CREATE TABLE IF NOT EXISTS relations (char_id_a TEXT, char_id_b TEXT, relation TEXT, strength REAL DEFAULT 0, updated_at INTEGER, PRIMARY KEY(char_id_a, char_id_b))`);
  db.run(`CREATE TABLE IF NOT EXISTS episodes (id INTEGER PRIMARY KEY AUTOINCREMENT, char_id TEXT NOT NULL, user_id TEXT NOT NULL DEFAULT 'default', event TEXT NOT NULL, reason TEXT DEFAULT '', emotion TEXT DEFAULT '', importance REAL DEFAULT 0.5, created_at INTEGER DEFAULT 0, updated_at INTEGER DEFAULT 0)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_pm ON private_msgs(char_id, user_id, created_at)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_gm ON group_msgs(created_at)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_mem ON memories(char_id, user_id, key)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_ep ON episodes(char_id, user_id, created_at)`);
  db.run(`CREATE TABLE IF NOT EXISTS relationship_events ( id INTEGER PRIMARY KEY AUTOINCREMENT, char_id TEXT NOT NULL, user_id TEXT NOT NULL DEFAULT 'default', dimension TEXT NOT NULL, change INTEGER NOT NULL DEFAULT 0, reason TEXT DEFAULT '', created_at INTEGER DEFAULT 0)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_rel_evt ON relationship_events(char_id, user_id, created_at)`);
  db.run(`CREATE TABLE IF NOT EXISTS character_state (char_id TEXT NOT NULL, user_id TEXT NOT NULL DEFAULT 'default', mood TEXT DEFAULT '平静', stress INTEGER DEFAULT 0, energy INTEGER DEFAULT 80, favor INTEGER DEFAULT 20, updated_at INTEGER DEFAULT 0, PRIMARY KEY(char_id, user_id))`);
  db.run(`CREATE TABLE IF NOT EXISTS beliefs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    char_id TEXT NOT NULL,
    user_id TEXT NOT NULL DEFAULT 'default',
    belief TEXT NOT NULL,
    category TEXT DEFAULT '价值观',
    confidence REAL DEFAULT 0.5,
    source TEXT DEFAULT '',
    created_at INTEGER DEFAULT 0,
    updated_at INTEGER DEFAULT 0
  )`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_bel ON beliefs(char_id, user_id, category)`);
  db.run(`CREATE TABLE IF NOT EXISTS dialogue_quotes (id INTEGER PRIMARY KEY AUTOINCREMENT, char_id TEXT NOT NULL, text TEXT NOT NULL, context TEXT DEFAULT '', chapter TEXT DEFAULT '', importance INTEGER DEFAULT 5)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_dq ON dialogue_quotes(char_id)`);
  db.run(`CREATE TABLE IF NOT EXISTS character_events (id INTEGER PRIMARY KEY AUTOINCREMENT, char_id TEXT NOT NULL, event_name TEXT NOT NULL, description TEXT NOT NULL, impact TEXT DEFAULT '', period TEXT DEFAULT '', importance INTEGER DEFAULT 5)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_ce ON character_events(char_id)`);
  db.run(`CREATE TABLE IF NOT EXISTS lore (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT '常识',
  importance INTEGER DEFAULT 5
)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_lore ON lore(category)`);
  try { db.run('ALTER TABLE character_state ADD COLUMN last_thought TEXT DEFAULT \'\''); } catch(e) {}
  if (!exists) flushImmediate();
}

function flushImmediate() {
  clearTimeout(flushTimer);
  fs.writeFileSync(DB_FILE, Buffer.from(db.export()));
  writeCount = 0;
}

function scheduleFlush() {
  writeCount++;
  if (writeCount >= FLUSH_THRESHOLD) {
    clearTimeout(flushTimer);
    flushImmediate();
  } else if (!flushTimer) {
    flushTimer = setTimeout(flushImmediate, FLUSH_INTERVAL);
  }
}

function save() { scheduleFlush(); }

function run(sql, params) { const r = db.run(sql, params); return r; }
function all(sql, params) {
  try {
    const stmt = db.prepare(sql);
    if (params) stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  } catch(e) { return []; }
}
function exec(sql) { try { return db.exec(sql); } catch(e) { return []; } }
function get(sql, params) { const rows = all(sql, params); return rows.length > 0 ? rows[0] : null; }
function quote(s) { return s.replace(/'/g, "''"); }

module.exports = { init, save, run, all, exec, get, quote, flushImmediate };
