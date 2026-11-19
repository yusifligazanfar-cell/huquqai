CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  name TEXT DEFAULT '',
  surname TEXT DEFAULT '',
  email TEXT DEFAULT '',
  role TEXT DEFAULT 'client',
  avatar_url TEXT DEFAULT '',
  cover_url TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  city TEXT DEFAULT '',
  license_number TEXT DEFAULT '',
  experience_years INTEGER DEFAULT 0,
  hourly_rate INTEGER DEFAULT 0,
  specialties TEXT DEFAULT '[]',
  education TEXT DEFAULT '[]',
  workplaces TEXT DEFAULT '[]',
  faqs TEXT DEFAULT '[]',
  unavailable_dates TEXT DEFAULT '[]',
  certificates TEXT DEFAULT '[]',
  is_verified INTEGER DEFAULT 0,
  admin_note TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  last_sign_in_at TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS consultations (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  lawyer_id TEXT NOT NULL,
  problem_description TEXT DEFAULT '',
  preferred_date TEXT DEFAULT '',
  preferred_time TEXT DEFAULT '',
  status TEXT DEFAULT 'Gözləyir',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS feedbacks (
  id TEXT PRIMARY KEY,
  user_id TEXT DEFAULT '',
  name TEXT DEFAULT 'Anonim İstifadəçi',
  email TEXT DEFAULT '',
  category TEXT DEFAULT 'general',
  rating INTEGER DEFAULT 5,
  sentiment TEXT DEFAULT 'excellent',
  subject TEXT DEFAULT 'Rəy və Təklif',
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new',
  is_anonymous INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS community_posts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  category TEXT DEFAULT 'Ümumi',
  created_at TEXT DEFAULT (datetime('now'))
);
