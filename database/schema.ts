export const SCHEMA_VERSION = 1;
export const CREATE_SCHEMA = `PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS migrations(version INTEGER PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY, name TEXT NOT NULL, event TEXT NOT NULL DEFAULT '333', has_ao5 INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS solves(id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE, raw_time_ms INTEGER NOT NULL CHECK(raw_time_ms >= 0), scramble TEXT NOT NULL, penalty TEXT NOT NULL CHECK(penalty IN ('none','+2','DNF')), entry_type TEXT NOT NULL CHECK(entry_type IN ('timer','manual')), created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS app_state(id INTEGER PRIMARY KEY CHECK(id=1), json TEXT NOT NULL);
    INSERT OR IGNORE INTO migrations VALUES(1);`;
