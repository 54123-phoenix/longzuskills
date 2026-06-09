const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'data.db');

let db;
let writeCount = 0;
let flushTimer = null;
const FLUSH_INTERVAL = 3000;
const FLUSH_THRESHOLD = 10;

async function init() {
  const SQL = await initSqlJs();
  const exists = fs.existsSync(DB_FILE);
  db = exists ? new SQL.Database(fs.readFileSync(DB_FILE)) : new SQL.Database();
  db.run(`CREATE TABLE IF NOT EXISTS private_msgs (id INTEGER PRIMARY KEY AUTOINCREMENT, char_id TEXT, user_id TEXT, is_self INTEGER, text TEXT, created_at INTEGER)`);
  db.run(`CREATE TABLE IF NOT EXISTS group_msgs (char_id TEXT, name TEXT, avatar TEXT, color TEXT, text TEXT, is_self INTEGER, type TEXT, created_at INTEGER)`);
  db.run(`CREATE TABLE IF NOT EXISTS profiles (char_id TEXT, user_id TEXT DEFAULT 'default', msg_count INTEGER DEFAULT 0, trust INTEGER DEFAULT 0, respect INTEGER DEFAULT 0, closeness INTEGER DEFAULT 0, dependency INTEGER DEFAULT 0, last_chat INTEGER, PRIMARY KEY(char_id, user_id))`);
  db.run(`CREATE TABLE IF NOT EXISTS memories (id INTEGER PRIMARY KEY AUTOINCREMENT, char_id TEXT, user_id TEXT DEFAULT 'default', key TEXT, value TEXT, confidence REAL DEFAULT 0.5, source TEXT, created_at INTEGER, updated_at INTEGER)`);
  db.run(`CREATE TABLE IF NOT EXISTS relations (char_id_a TEXT, char_id_b TEXT, relation TEXT, strength REAL DEFAULT 0, updated_at INTEGER, PRIMARY KEY(char_id_a, char_id_b))`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_pm ON private_msgs(char_id, user_id, created_at)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_gm ON group_msgs(created_at)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_mem ON memories(char_id, user_id, key)`);
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
  try { const stmt = db.prepare(sql); return params ? stmt.all(params) : stmt.all(); }
  catch(e) { return []; }
}
function exec(sql) { try { return db.exec(sql); } catch(e) { return []; } }
function get(sql, params) { const rows = all(sql, params); return rows.length > 0 ? rows[0] : null; }
function quote(s) { return s.replace(/'/g, "''"); }

module.exports = { init, save, run, all, exec, get, quote, flushImmediate };
