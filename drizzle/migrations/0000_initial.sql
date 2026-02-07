CREATE TABLE IF NOT EXISTS quotes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  vehicle_type TEXT,
  vehicle_model TEXT,
  service_type TEXT,
  message TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);
