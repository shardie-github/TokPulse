#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB="$ROOT/packages/feedback/data/app.db"
mkdir -p "$(dirname "$DB")"
sqlite3 "$DB" <<SQL
CREATE TABLE IF NOT EXISTS leads (id INTEGER PRIMARY KEY, email TEXT, source TEXT, ref TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY, type TEXT, payload TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS licenses (id INTEGER PRIMARY KEY, email TEXT, key TEXT, plan TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS metrics (id INTEGER PRIMARY KEY, name TEXT, value REAL, created_at TEXT);
INSERT INTO metrics (name, value, created_at) VALUES ('pricing_test_A', 49, datetime('now'));
INSERT INTO metrics (name, value, created_at) VALUES ('pricing_test_B', 29, datetime('now'));
SQL
echo "Seeded DB at $DB"
