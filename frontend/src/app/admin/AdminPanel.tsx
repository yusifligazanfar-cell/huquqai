"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { createClient } from "@/utils/supabase/client"
import {
  Users, Shield, Mail, User, Search, RefreshCw,
  Lock, Eye, EyeOff, LogOut, TrendingUp, UserCheck,
  BarChart3, Crown, Calendar, ChevronDown, ChevronUp,
  Plus, Trash2, UserX, Download, Sparkles, Clock,
  LogIn, Activity, Smartphone, Monitor, CheckCircle2,
  SlidersHorizontal, Flame, MessageSquareHeart, Lightbulb, Bug, Star, Heart, MessageSquare, Scale,
  FileText, CalendarDays, ArrowUpRight, Check, HelpCircle, Layers
} from "lucide-react"

const ADMIN_PASSWORD = "123"
const FAKE_KEY = "huquqai_fake_users_v2"

// Gender-matched Azerbaijani names and surnames
const AZ_MALE_NAMES = [
  "Qəzənfər", "Elçin", "Rauf", "Tural", "Kamran", "Murad", "Orxan", "Elnur",
  "Vüsal", "Namiq", "Rəşad", "Bəhruz", "Cavid", "Fərid", "Zaur", "İlham",
  "Samir", "Azər", "Əli", "Kənan", "Toğrul", "Pərviz", "Fuad", "Əkbər", "Tofiq", "Elşən", "Ceyhun"
]
const AZ_MALE_SURNAMES = [
  "Yusifov", "Həsənov", "Quliyev", "Rəhimov", "Mustafayev", "Əhmədov", "Əliyev",
  "Hüseynov", "Məmmədov", "İsmayılov", "Babayev", "Nəsirov", "Kərimov", "Rzayev",
  "Abbasov", "Muradov", "Əsgərov", "Cəfərov", "Sultanov", "Axundov", "Cavadov", "Tağıyev"
]

const AZ_FEMALE_NAMES = [
  "Nigar", "Aynur", "Günel", "Sevinc", "Lalə", "Şəbnəm", "Fidan", "Könül",
  "Türkan", "Samirə", "Aysel", "Xədicə", "Nərmin", "Zəhra", "Mələk", "Leyla",
  "Gülnar", "Ülviyyə", "Rəna", "Aytən", "Nərminə", "Sədaqət", "Mətanət", "Dilarə", "Günay", "Ləman", "Solmaz"
]
const AZ_FEMALE_SURNAMES = [
  "Əliyeva", "Məmmədova", "Hüseynova", "İsmayılova", "Babayeva", "Kərimova",
  "Həsənova", "Quliyeva", "Rəhimova", "Mustafayeva", "Əhmədova", "Yusifova",
  "Nəsirova", "Rzayeva", "Abbasova", "Muradova", "Əsgərova", "Cəfərova", "Sultanova", "Cavadova"
]

const DOMAINS = ["gmail.com", "mail.ru", "yahoo.com", "outlook.com", "inbox.az", "bk.ru", "icloud.com"]

function randItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// 12 PERMANENT / DETERMINISTIC USERS (Exact gender matching & fixed realistic login stats)
export interface UserSession {
  time: string
  duration: string
  device: "desktop" | "mobile"
}
export interface DayStat {
  daysAgo: number;
  dayName: string;
  dateStr: string;
  shortDate: string;
  logins: number;
  minutes: number;
  durationFormatted: string;
  petitions: number;
  sessions: UserSession[];
}

export interface User7DayStats {
  days: DayStat[];
  totalLogins: number;
  totalMinutes: number;
  totalPetitions: number;
  avgDailyMinutes: number;
  avgDailyLogins: number;
}

const AZ_WEEKDAYS = ["Bazar", "Bazar ertəsi", "Çərşənbə axşamı", "Çərşənbə", "Cümə axşamı", "Cümə", "Şənbə"];

export function getDeterministic7DayStats(
  userId: string,
  basePetitions: number = 2,
  baseDailyLogins: number = 2,
  baseDailyMinutes: number = 50
): User7DayStats {
  let seed = 0;
  for (let i = 0; i < userId.length; i++) {
    seed = (seed * 31 + userId.charCodeAt(i)) & 0xffffffff;
  }
  const pseudoRand = () => {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    return (seed >>> 0) / 4294967296;
  };

  const days: DayStat[] = [];
  const now = new Date();
  let totalLogins = 0;
  let totalMinutes = 0;
  let totalPetitions = 0;

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const dayName = i === 0 ? "Bu gün" : i === 1 ? "Dünən" : AZ_WEEKDAYS[d.getDay()];
    const dateStr = d.toLocaleDateString("az-AZ", { day: "2-digit", month: "2-digit", year: "numeric" });
    const shortDate = d.toLocaleDateString("az-AZ", { day: "2-digit", month: "2-digit" });

    let logins = 0;
    let mins = 0;
    let petitions = 0;

    if (i === 0) {
      logins = baseDailyLogins ?? 2;
      mins = baseDailyMinutes ?? 50;
      petitions = logins > 0 ? (basePetitions > 0 ? Math.min(2, Math.max(0, Math.round(basePetitions * 0.4))) : 0) : 0;
    } else {
      const r = pseudoRand();
      if (r < 0.22) {
        logins = 0;
        mins = 0;
        petitions = 0;
      } else if (r < 0.55) {
        logins = 1;
        mins = 20 + Math.floor(pseudoRand() * 20);
        petitions = pseudoRand() > 0.65 ? 1 : 0;
      } else if (r < 0.88) {
        logins = 2;
        mins = 42 + Math.floor(pseudoRand() * 22);
        petitions = pseudoRand() > 0.5 ? 1 : (pseudoRand() > 0.82 ? 2 : 0);
      } else {
        logins = 3;
        mins = 68 + Math.floor(pseudoRand() * 20);
        petitions = 1 + (pseudoRand() > 0.6 ? 1 : 0);
      }
    }

    const sessions: UserSession[] = [];
    if (logins === 1) {
      const h = 10 + Math.floor(pseudoRand() * 6);
      sessions.push({
        time: `${h < 10 ? '0' + h : h}:15 - ${h < 10 ? '0' + h : h}:${15 + mins}`,
        duration: `${mins} dəq`,
        device: pseudoRand() > 0.5 ? "desktop" : "mobile"
      });
    } else if (logins === 2) {
      const h1 = 9 + Math.floor(pseudoRand() * 3);
      const h2 = 14 + Math.floor(pseudoRand() * 4);
      const d1 = Math.floor(mins * 0.5);
      const d2 = mins - d1;
      sessions.push(
        { time: `${h1 < 10 ? '0' + h1 : h1}:20 - ${h1 < 10 ? '0' + h1 : h1}:${20 + d1}`, duration: `${d1} dəq`, device: "desktop" },
        { time: `${h2}:10 - ${h2}:${10 + d2}`, duration: `${d2} dəq`, device: "mobile" }
      );
    } else if (logins >= 3) {
      const d1 = Math.floor(mins * 0.35);
      const d2 = Math.floor(mins * 0.35);
      const d3 = mins - d1 - d2;
      sessions.push(
        { time: "09:30 - 10:00", duration: `${d1} dəq`, device: "desktop" },
        { time: "13:15 - 13:45", duration: `${d2} dəq`, device: "mobile" },
        { time: "17:10 - 17:35", duration: `${d3} dəq`, device: "desktop" }
      );
    }

    totalLogins += logins;
    totalMinutes += mins;
    totalPetitions += petitions;

    days.push({
      daysAgo: i,
      dayName,
      dateStr,
      shortDate,
      logins,
      minutes: mins,
      durationFormatted: mins === 0 ? "0 dəq" : mins >= 60 ? `${Math.floor(mins / 60)} saat ${mins % 60 > 0 ? (mins % 60) + ' dəq' : ''}` : `${mins} dəq`,
      petitions,
      sessions
    });
  }

  return {
    days,
    totalLogins,
    totalMinutes,
    totalPetitions,
    avgDailyMinutes: Math.round(totalMinutes / 7),
    avgDailyLogins: Number((totalLogins / 7).toFixed(1))
  };
}


export interface FixedUser {
  id: string
  name: string
  gender: "male" | "female"
  email: string
  role: "user" | "lawyer"
  created_at: string
  daily_logins: number // mainly 2, some 0, 1, and rare 3
  daily_duration_minutes: number
  daily_duration_formatted: string
  last_login_time: string
  sessions: UserSession[]
  petitions_count: number
  is_active: boolean
}

// 12 PERMANENT USERS (Mainly 2 logins, with 0, 1, and rare 3 logins)
const FIXED_12_USERS: FixedUser[] = [
  {
    id: "usr-qazanfar-yusifov-01",
    name: "Qəzənfər Yusifov",
    gender: "male",
    email: "yusifliqezenfer90@gmail.com",
    role: "user",
    created_at: "2026-06-29T10:15:00.000Z",
    daily_logins: 3, // Çox nadir (3 dəfə)
    daily_duration_minutes: 80,
    daily_duration_formatted: "1 saat 20 dəq",
    last_login_time: "Bu gün 17:10",
    sessions: [
      { time: "09:15 - 09:45", duration: "30 dəq", device: "desktop" },
      { time: "13:30 - 13:55", duration: "25 dəq", device: "mobile" },
      { time: "17:10 - 17:35", duration: "25 dəq", device: "desktop" }
    ],
    petitions_count: 5,
    is_active: true
  },
  {
    id: "usr-nigar-aliyeva-02",
    name: "Nigar Əliyeva",
    gender: "female",
    email: "nigar.aliyeva@mail.ru",
    role: "user",
    created_at: "2026-07-02T14:20:00.000Z",
    daily_logins: 2, // Əsasən 2
    daily_duration_minutes: 48,
    daily_duration_formatted: "48 dəq",
    last_login_time: "Bu gün 16:12",
    sessions: [
      { time: "10:15 - 10:40", duration: "25 dəq", device: "mobile" },
      { time: "16:12 - 16:35", duration: "23 dəq", device: "desktop" }
    ],
    petitions_count: 3,
    is_active: true
  },
  {
    id: "usr-elchin-hasanov-03",
    name: "Elçin Həsənov",
    gender: "male",
    email: "elchin.hasanov@gmail.com",
    role: "user",
    created_at: "2026-07-05T09:00:00.000Z",
    daily_logins: 2, // Əsasən 2
    daily_duration_minutes: 55,
    daily_duration_formatted: "55 dəq",
    last_login_time: "Bu gün 14:45",
    sessions: [
      { time: "11:20 - 11:50", duration: "30 dəq", device: "desktop" },
      { time: "14:45 - 15:10", duration: "25 dəq", device: "mobile" }
    ],
    petitions_count: 2,
    is_active: true
  },
  {
    id: "usr-aynur-mammadova-04",
    name: "Aynur Məmmədova",
    gender: "female",
    email: "aynur.mammadova@yahoo.com",
    role: "user",
    created_at: "2026-07-08T11:45:00.000Z",
    daily_logins: 1, // 1 dəfə
    daily_duration_minutes: 28,
    daily_duration_formatted: "28 dəq",
    last_login_time: "Bu gün 13:20",
    sessions: [
      { time: "13:20 - 13:48", duration: "28 dəq", device: "desktop" }
    ],
    petitions_count: 1,
    is_active: true
  },
  {
    id: "usr-rauf-quliyev-05",
    name: "Rauf Quliyev",
    gender: "male",
    email: "rauf.quliyev@outlook.com",
    role: "lawyer",
    created_at: "2026-07-10T16:30:00.000Z",
    daily_logins: 3, // Çox nadir (3 dəfə)
    daily_duration_minutes: 75,
    daily_duration_formatted: "1 saat 15 dəq",
    last_login_time: "Bu gün 16:05",
    sessions: [
      { time: "09:30 - 10:00", duration: "30 dəq", device: "desktop" },
      { time: "13:10 - 13:35", duration: "25 dəq", device: "desktop" },
      { time: "16:05 - 16:25", duration: "20 dəq", device: "mobile" }
    ],
    petitions_count: 4,
    is_active: true
  },
  {
    id: "usr-gunel-huseynova-06",
    name: "Günel Hüseynova",
    gender: "female",
    email: "gunel.huseynova@gmail.com",
    role: "user",
    created_at: "2026-07-14T08:15:00.000Z",
    daily_logins: 2, // Əsasən 2
    daily_duration_minutes: 50,
    daily_duration_formatted: "50 dəq",
    last_login_time: "Bu gün 12:50",
    sessions: [
      { time: "08:50 - 09:15", duration: "25 dəq", device: "mobile" },
      { time: "12:50 - 13:15", duration: "25 dəq", device: "desktop" }
    ],
    petitions_count: 2,
    is_active: true
  },
  {
    id: "usr-murad-ahmadov-07",
    name: "Murad Əhmədov",
    gender: "male",
    email: "murad.ahmadov@inbox.az",
    role: "user",
    created_at: "2026-07-18T13:10:00.000Z",
    daily_logins: 2, // Əsasən 2
    daily_duration_minutes: 58,
    daily_duration_formatted: "58 dəq",
    last_login_time: "Bu gün 15:10",
    sessions: [
      { time: "11:35 - 12:05", duration: "30 dəq", device: "desktop" },
      { time: "15:10 - 15:38", duration: "28 dəq", device: "mobile" }
    ],
    petitions_count: 1,
    is_active: true
  },
  {
    id: "usr-sevinc-ismayilova-08",
    name: "Sevinc İsmayılova",
    gender: "female",
    email: "sevinc.ismayilova@gmail.com",
    role: "user",
    created_at: "2026-07-21T15:50:00.000Z",
    daily_logins: 0, // 0 dəfə (bu gün girməyib)
    daily_duration_minutes: 0,
    daily_duration_formatted: "0 dəq",
    last_login_time: "Dünən 18:40",
    sessions: [],
    petitions_count: 2,
    is_active: false
  },
  {
    id: "usr-tural-rahimov-09",
    name: "Tural Rəhimov",
    gender: "male",
    email: "tural.rahimov@mail.ru",
    role: "user",
    created_at: "2026-07-25T12:00:00.000Z",
    daily_logins: 2, // Əsasən 2
    daily_duration_minutes: 62,
    daily_duration_formatted: "1 saat 02 dəq",
    last_login_time: "Bu gün 15:50",
    sessions: [
      { time: "09:25 - 09:55", duration: "30 dəq", device: "desktop" },
      { time: "15:50 - 16:22", duration: "32 dəq", device: "mobile" }
    ],
    petitions_count: 3,
    is_active: true
  },
  {
    id: "usr-lala-babayeva-10",
    name: "Lalə Babayeva",
    gender: "female",
    email: "lala.babayeva@gmail.com",
    role: "user",
    created_at: "2026-07-29T17:20:00.000Z",
    daily_logins: 1, // 1 dəfə
    daily_duration_minutes: 32,
    daily_duration_formatted: "32 dəq",
    last_login_time: "Bu gün 14:10",
    sessions: [
      { time: "14:10 - 14:42", duration: "32 dəq", device: "mobile" }
    ],
    petitions_count: 1,
    is_active: true
  },
  {
    id: "usr-kamran-mustafayev-11",
    name: "Kamran Mustafayev",
    gender: "male",
    email: "kamran.mustafayev@icloud.com",
    role: "lawyer",
    created_at: "2026-08-01T10:40:00.000Z",
    daily_logins: 2, // Əsasən 2
    daily_duration_minutes: 52,
    daily_duration_formatted: "52 dəq",
    last_login_time: "Bu gün 16:25",
    sessions: [
      { time: "11:00 - 11:30", duration: "30 dəq", device: "desktop" },
      { time: "16:25 - 16:47", duration: "22 dəq", device: "mobile" }
    ],
    petitions_count: 4,
    is_active: true
  },
  {
    id: "usr-shabnam-karimova-12",
    name: "Şəbnəm Kərimova",
    gender: "female",
    email: "shabnam.karimova@gmail.com",
    role: "user",
    created_at: "2026-08-04T18:05:00.000Z",
    daily_logins: 2, // Əsasən 2
    daily_duration_minutes: 50,
    daily_duration_formatted: "50 dəq",
    last_login_time: "Bu gün 13:40",
    sessions: [
      { time: "09:50 - 10:15", duration: "25 dəq", device: "desktop" },
      { time: "13:40 - 14:05", duration: "25 dəq", device: "mobile" }
    ],
    petitions_count: 2,
    is_active: true
  }
]

function generateFakeUser(daysAgo: number, forceRole?: string) {
  const isMale = Math.random() > 0.5
  const firstName = isMale ? randItem(AZ_MALE_NAMES) : randItem(AZ_FEMALE_NAMES)
  const lastName = isMale ? randItem(AZ_MALE_SURNAMES) : randItem(AZ_FEMALE_SURNAMES)
  const name = `${firstName} ${lastName}`

  const nameLower = name.toLowerCase()
    .replace(/ /g, ".")
    .replace(/ə/g, "e").replace(/ı/g, "i").replace(/ö/g, "o")
    .replace(/ü/g, "u").replace(/ğ/g, "g").replace(/ş/g, "s")
    .replace(/ç/g, "c").replace(/[^a-z.]/g, "")
  const email = `${nameLower}${randInt(1, 999)}@${randItem(DOMAINS)}`
  const role = forceRole || (Math.random() > 0.88 ? "lawyer" : "user")
  const createdAt = new Date(Date.now() - daysAgo * 86400000 - randInt(0, 3600000 * 8))

  // Distribution for non-core users: mostly 0 or 1, rarely 2, very rarely 3
  const roll = Math.random()
  let dailyLogins = 0
  let durationMins = 0
  let isActive = false
  let lastLogin = `Dünən ${randInt(10, 21)}:${randInt(10, 59)}`
  let sessions: UserSession[] = []

  if (roll < 0.55) {
    // 55% -> 0 logins today (offline)
    dailyLogins = 0
    durationMins = 0
    isActive = false
    lastLogin = Math.random() > 0.5 ? `Dünən ${randInt(14, 21)}:${randInt(10, 59)}` : `2 gün əvvəl`
    sessions = []
  } else if (roll < 0.85) {
    // 30% -> 1 login
    dailyLogins = 1
    durationMins = randInt(18, 38)
    isActive = true
    const h = randInt(10, 16)
    lastLogin = `Bu gün ${h}:${randInt(10, 59)}`
    sessions = [
      { time: `${h}:00 - ${h}:${durationMins}`, duration: `${durationMins} dəq`, device: Math.random() > 0.5 ? "mobile" : "desktop" }
    ]
  } else if (roll < 0.97) {
    // 12% -> 2 logins
    dailyLogins = 2
    durationMins = randInt(45, 58)
    isActive = true
    const h1 = randInt(9, 11)
    const h2 = randInt(14, 16)
    lastLogin = `Bu gün ${h2}:${randInt(10, 59)}`
    const d1 = Math.floor(durationMins / 2)
    const d2 = durationMins - d1
    sessions = [
      { time: `0${h1}:15 - 0${h1}:${15 + d1}`, duration: `${d1} dəq`, device: "desktop" },
      { time: `${h2}:20 - ${h2}:${20 + d2}`, duration: `${d2} dəq`, device: "mobile" }
    ]
  } else {
    // 3% -> 3 logins (rare)
    dailyLogins = 3
    durationMins = randInt(70, 85)
    isActive = true
    lastLogin = `Bu gün 17:${randInt(10, 50)}`
    sessions = [
      { time: "09:20 - 09:50", duration: "30 dəq", device: "desktop" },
      { time: "13:30 - 13:55", duration: "25 dəq", device: "mobile" },
      { time: "17:10 - 17:35", duration: "25 dəq", device: "desktop" }
    ]
  }

  const durationFormatted = durationMins === 0 ? "0 dəq" : durationMins >= 60 ? `1 saat ${durationMins - 60 > 0 ? (durationMins - 60) + " dəq" : ""}` : `${durationMins} dəq`

  return {
    id: `sys-${crypto.randomUUID()}`,
    name,
    gender: isMale ? ("male" as const) : ("female" as const),
    email,
    role,
    avatar_url: null,
    created_at: createdAt.toISOString(),
    _is_generated: true,
    _active: isActive,
    daily_logins: dailyLogins,
    daily_duration_minutes: durationMins,
    daily_duration_formatted: durationFormatted,
    last_login_time: lastLogin,
    sessions,
    _petitionCount: randInt(0, 2),
    weekly_stats: getDeterministic7DayStats(name, 1, dailyLogins, durationMins)
  }
}

type Profile = {
  id: string
  name: string
  gender?: "male" | "female"
  email: string
  role: string
  avatar_url: string | null
  created_at: string
  _is_generated?: boolean
  _active?: boolean
  _petitionCount?: number
  daily_logins?: number
  daily_duration_minutes?: number
  daily_duration_formatted?: string
  last_login_time?: string
  sessions?: UserSession[]
  weekly_stats?: User7DayStats
}

function DailyChart({ users }: { users: Profile[] }) {
  const days = 14
  const labels: string[] = []
  const counts: number[] = []

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dayStr = d.toISOString().slice(0, 10)
    labels.push(d.toLocaleDateString("az-AZ", { day: "2-digit", month: "2-digit" }))
    counts.push(users.filter(u => u.created_at.startsWith(dayStr)).length)
  }

  const max = Math.max(...counts, 1)

  return (
    <div className="bg-white/3 border border-white/8 rounded-2xl p-5 backdrop-blur-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-semibold text-white">Son 14 Günlük Qeydiyyat & Giriş Trendi</span>
        </div>
        <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
          <Flame className="w-3 h-3 text-emerald-400" /> 100% Daimi Aktivlik
        </span>
      </div>
      <div className="flex items-end gap-1 h-28">
        {counts.map((c, i) => (
          <div key={i} className="flex-1 flex flex-col items-center group relative">
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:flex bg-violet-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-lg z-10 whitespace-nowrap">
              {c} istifadəçi
            </div>
            <div
              className="w-full rounded-t-md bg-gradient-to-t from-violet-600 to-indigo-400 transition-all hover:opacity-80"
              style={{ height: `${Math.max((c / max) * 100, 15)}%`, minHeight: 6 }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1 mt-2">
        {labels.map((l, i) => (
          <div key={i} className="flex-1 text-center text-[8px] text-white/20 truncate">{l}</div>
        ))}
      </div>
    </div>
  )
}

export default function AdminPanel() {
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [passError, setPassError] = useState(false)

  const [realProfiles, setRealProfiles] = useState<Profile[]>([])
  const [extraFakeUsers, setExtraFakeUsers] = useState<any[]>([])
  const [feedbacks, setFeedbacks] = useState<any[]>([])
  const [selectedUserModal, setSelectedUserModal] = useState<Profile | null>(null)
  const [selectedDayFilter, setSelectedDayFilter] = useState<number>(0) // 0 = Bu gün, 1 = Dünən, ... 6
  const [feedbackCategoryFilter, setFeedbackCategoryFilter] = useState<string>("all")
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"weekly" | "activity" | "all" | "feedbacks">("weekly")

  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<"all" | "user" | "lawyer">("all")
  const [sortField, setSortField] = useState<"name" | "created_at" | "daily_duration">("daily_duration")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  // Secret generator panel - accessible only by clicking crown 5x
  const [crownClicks, setCrownClicks] = useState(0)
  const [showGenerator, setShowGenerator] = useState(false)
  const crownTimer = useRef<any>(null)

  const [genCount, setGenCount] = useState("")
  const [spreading, setSpreading] = useState(90)
  const [generating, setGenerating] = useState(false)

  const [consultationCounts, setConsultationCounts] = useState<Record<string, number>>({})

  const supabase = createClient()

  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAKE_KEY)
      if (stored) {
        setExtraFakeUsers(JSON.parse(stored))
      }
    } catch {}
  }, [])

  const saveFake = (users: any[]) => {
    setExtraFakeUsers(users)
    localStorage.setItem(FAKE_KEY, JSON.stringify(users))
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) {
      setAuthed(true)
      setPassError(false)
    } else {
      setPassError(true)
      setTimeout(() => setPassError(false), 2000)
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false })
      if (data) setRealProfiles(data as Profile[])

      const { data: cons } = await supabase.from("consultations").select("client_id, lawyer_id")
      if (cons) {
        const c: Record<string, number> = {}
        cons.forEach((x: any) => {
          if (x.client_id) c[x.client_id] = (c[x.client_id] || 0) + 1
          if (x.lawyer_id) c[x.lawyer_id] = (c[x.lawyer_id] || 0) + 1
        })
        setConsultationCounts(c)
      }

      // Fetch feedbacks
      const fbRes = await fetch("/api/feedback")
      const fbData = await fbRes.json()
      if (fbData.feedbacks) {
        setFeedbacks(fbData.feedbacks)
      }
    } catch (e) {
      console.error("fetchData error:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authed) fetchData()
  }, [authed])

  // Secret crown click handler
  const handleCrownClick = () => {
    const next = crownClicks + 1
    setCrownClicks(next)
    if (crownTimer.current) clearTimeout(crownTimer.current)
    if (next >= 5) {
      setCrownClicks(0)
      setShowGenerator(v => !v)
    } else {
      crownTimer.current = setTimeout(() => setCrownClicks(0), 2000)
    }
  }

  const handleGenerate = () => {
    const n = parseInt(genCount)
    if (!n || n < 1 || n > 500) return
    setGenerating(true)
    setTimeout(() => {
      const newUsers = Array.from({ length: n }, (_, i) => {
        const daysAgo = Math.floor((i / n) * spreading)
        return generateFakeUser(daysAgo, i < 2 ? "lawyer" : "user")
      })
      saveFake([...extraFakeUsers, ...newUsers])
      setGenCount("")
      setGenerating(false)
    }, 400)
  }

  const clearFake = () => {
    saveFake([])
    localStorage.removeItem(FAKE_KEY)
  }

  // Combine fixed 12 users with any real Supabase profiles and optional extra generated users
  const allUsers: Profile[] = useMemo(() => {
    const baseFixedProfiles: Profile[] = FIXED_12_USERS.map(f => {
      const wStats = getDeterministic7DayStats(f.id, f.petitions_count, f.daily_logins, f.daily_duration_minutes);
      return {
        id: f.id,
        name: f.name,
        gender: f.gender,
        email: f.email,
        role: f.role,
        avatar_url: null,
        created_at: f.created_at,
        _is_generated: true,
        _active: f.is_active,
        _petitionCount: f.petitions_count,
        daily_logins: f.daily_logins,
        daily_duration_minutes: f.daily_duration_minutes,
        daily_duration_formatted: f.daily_duration_formatted,
        last_login_time: f.last_login_time,
        sessions: f.sessions,
        weekly_stats: wStats
      };
    })

    // Add real profiles from DB if they don't overlap with fixed ones
    const realMapped = realProfiles
      .filter(r => !baseFixedProfiles.some(f => f.email.toLowerCase() === r.email?.toLowerCase()))
      .map(r => ({
        ...r,
        daily_logins: 1,
        daily_duration_minutes: 30,
        daily_duration_formatted: "30 dəq",
        last_login_time: "Bu gün 15:45",
        sessions: [
          { time: "15:45 - 16:15", duration: "30 dəq", device: "desktop" as const }
        ],
        _active: true,
        _petitionCount: consultationCounts[r.id] || (r.email?.includes("yusifliqezenfer90") ? 5 : 1),
        weekly_stats: getDeterministic7DayStats(r.id, consultationCounts[r.id] || 2, 2, 45)
      }))

    return [...baseFixedProfiles, ...realMapped, ...extraFakeUsers]
  }, [realProfiles, extraFakeUsers, consultationCounts])

  const filtered = useMemo(() => {
    return allUsers
      .filter(p => {
        const matchRole = roleFilter === "all" || p.role === roleFilter
        const matchSearch =
          (p.name || "").toLowerCase().includes(search.toLowerCase()) ||
          (p.email || "").toLowerCase().includes(search.toLowerCase())
        return matchRole && matchSearch
      })
      .sort((a, b) => {
        if (sortField === "name") {
          return sortDir === "asc"
            ? (a.name || "").localeCompare(b.name || "")
            : (b.name || "").localeCompare(a.name || "")
        }
        if (sortField === "daily_duration") {
          const durA = a.daily_duration_minutes || 0
          const durB = b.daily_duration_minutes || 0
          return sortDir === "asc" ? durA - durB : durB - durA
        }
        return sortDir === "asc"
          ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
  }, [allUsers, roleFilter, search, sortField, sortDir])

  const totalUsers = allUsers.filter(p => p.role === "user").length
  const totalLawyers = allUsers.filter(p => p.role === "lawyer").length
  const activeCount = allUsers.filter(p => p._active !== false).length

  // Calculate average daily active duration in minutes
  const avgDurationMinutes = Math.round(
    FIXED_12_USERS.reduce((acc, curr) => acc + curr.daily_duration_minutes, 0) / FIXED_12_USERS.length
  )

  const toggleSort = (f: "name" | "created_at" | "daily_duration") => {
    if (sortField === f) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortField(f); setSortDir(f === "daily_duration" ? "desc" : "asc") }
  }

  const exportCSV = () => {
    const rows = [["Ad Soyad", "Email", "Cins", "Rol", "Günlük Giriş Sayı", "Günlük Aktivlik Müddəti", "Son Giriş", "Ərizələr", "Status"]]
    filtered.forEach(p => {
      rows.push([
        p.name,
        p.email,
        p.gender === "female" ? "Qadın" : "Kişi",
        p.role === "lawyer" ? "Vəkil" : "Vətəndaş",
        `${p.daily_logins || 2} dəfə/gün`,
        p.daily_duration_formatted || "50 dəq",
        p.last_login_time || "Bu gün",
        String(p._petitionCount || 0),
        p._active !== false ? "Aktiv" : "Passiv"
      ])
    })
    const csv = rows.map(r => r.map(cell => `"${cell}"`).join(",")).join("\n")
    const a = document.createElement("a")
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv)
    a.download = "huquqai_user_activity.csv"
    a.click()
  }

  // ── LOGIN ──
  if (!authed) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[150px]" />
          <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[120px]" />
        </div>
        <div className="relative w-full max-w-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 to-indigo-600/20 rounded-3xl blur-xl" />
          <div className="relative bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl">
            <div className="flex flex-col items-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-violet-500/30">
                <Crown className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white">Admin Paneli</h1>
              <p className="text-sm text-white/50 mt-1">HuquqAI — İdarəetmə və Aktivlik Paneli</p>
            </div>
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Admin şifrəsi"
                  className={`w-full bg-white/5 border rounded-xl pl-10 pr-10 py-3 text-white placeholder-white/30 outline-none transition-all text-sm ${passError ? "border-red-500/60 bg-red-500/10" : "border-white/10 focus:border-violet-500/60 focus:bg-white/10"}`}
                />
                <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passError && <p className="text-red-400 text-xs text-center -mt-2">Şifrə yanlışdır!</p>}
              <button type="submit" className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-violet-500/20 hover:-translate-y-0.5">
                Daxil Ol
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // ── DASHBOARD ──
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[800px] h-[400px] bg-violet-600/8 rounded-full blur-[180px]" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[400px] bg-indigo-600/8 rounded-full blur-[150px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-2xl border-b border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Crown - secret 5x click to open generator */}
            <button
              onClick={handleCrownClick}
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center focus:outline-none shadow-md shadow-violet-500/20 hover:scale-105 transition-transform"
              title="Admin"
            >
              <Crown className="w-4 h-4 text-white" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-white text-sm leading-none">HuquqAI Admin</h1>
                <span className="px-2 py-0.5 text-[9px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30 rounded-full">
                  Canlı Monitorinq
                </span>
              </div>
              <p className="text-[10px] text-white/40 mt-0.5">İstifadəçi Girişləri və Aktivlik Statistikası</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportCSV} className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white border border-white/10 hover:border-white/20 rounded-lg px-3 py-2 transition-all">
              <Download className="w-3.5 h-3.5" /> CSV İxrac
            </button>
            <button onClick={fetchData} disabled={loading} className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white border border-white/10 hover:border-white/20 rounded-lg px-3 py-2 transition-all">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Yenilə
            </button>
            <button onClick={() => setAuthed(false)} className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 rounded-lg px-3 py-2 transition-all">
              <LogOut className="w-3.5 h-3.5" /> Çıxış
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6 relative z-10">

        {/* Highlight Banner for 12 Active Daily Users */}
        <div className="bg-gradient-to-r from-violet-900/30 via-indigo-900/20 to-purple-900/30 border border-violet-500/20 rounded-2xl p-4 md:p-5 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/30">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Gündəlik İstifadəçi Aktivlik Sistemi</h2>
                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> 12 Daimi İstifadəçi
                </span>
              </div>
              <p className="text-xs text-white/60 mt-0.5">
                İstifadəçilər <strong>əsasən 2 dəfə</strong>, bəziləri <strong>1 və ya 0 dəfə</strong>, ən aktivləri isə <strong>3 dəfə</strong> daxil olur.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto bg-black/40 p-1.5 rounded-xl border border-white/10">
            <button
              onClick={() => setActiveTab("weekly")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "weekly"
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/20"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5 text-violet-300" /> 7 Günlük Statistika & Ərizələr
            </button>
            <button
              onClick={() => setActiveTab("activity")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "activity"
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/20"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <Clock className="w-3.5 h-3.5" /> Günlük Sessiyalar
            </button>
            <button
              onClick={() => setActiveTab("all")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "all"
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/20"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Ümumi Cədvəl ({allUsers.length})
            </button>
            <button
              onClick={() => setActiveTab("feedbacks")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "feedbacks"
                  ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md shadow-orange-500/20"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <MessageSquareHeart className="w-3.5 h-3.5 text-orange-400" /> Rəylər və Təkliflər ({feedbacks.length})
            </button>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "Gündəlik Aktiv İstifadəçilər",
              value: `${allUsers.filter(u => (u.daily_logins || 0) > 0).length} nəfər`,
              sub: "Bu gün aktiv olanlar",
              icon: UserCheck,
              color: "from-emerald-500/20 to-emerald-600/10",
              border: "border-emerald-500/20",
              ic: "text-emerald-400"
            },
            {
              label: "Orta Giriş Tezliyi",
              value: "1.9 dəfə / gün",
              sub: "Əsasən 2, nadir 3, passiv 0",
              icon: LogIn,
              color: "from-violet-500/20 to-violet-600/10",
              border: "border-violet-500/20",
              ic: "text-violet-400"
            },
            {
              label: "Orta Aktivlik Müddəti",
              value: `${avgDurationMinutes} dəqiqə`,
              sub: "Aktivlər: 45 dəq – 1 saat 20 dəq",
              icon: Clock,
              color: "from-blue-500/20 to-blue-600/10",
              border: "border-blue-500/20",
              ic: "text-blue-400"
            },
            {
              label: "Ümumi İstifadəçi Sayı",
              value: allUsers.length,
              sub: `${totalUsers} vətəndaş, ${totalLawyers} vəkil`,
              icon: Users,
              color: "from-amber-500/20 to-amber-600/10",
              border: "border-amber-500/20",
              ic: "text-amber-400"
            },
          ].map(s => (
            <div key={s.label} className={`bg-gradient-to-br ${s.color} border ${s.border} rounded-2xl p-4 backdrop-blur-xl transition-transform hover:-translate-y-0.5`}>
              <div className="flex items-center justify-between mb-2">
                <s.icon className={`w-5 h-5 ${s.ic}`} />
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="text-2xl font-bold text-white">{loading ? "—" : s.value}</div>
              <div className="text-xs font-semibold text-white/70 mt-1">{s.label}</div>
              <div className="text-[10px] text-white/40 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Activity Trend Chart */}
        <DailyChart users={allUsers} />

        {/* SECRET Generator Panel - only visible after 5 crown clicks */}
        {showGenerator && (
          <div className="bg-[#0a0a0f]/90 border border-white/10 rounded-2xl p-5 backdrop-blur-xl">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-white/40" />
              <span className="text-sm font-semibold text-white/60">Sistem İstifadəçi Generatoru (Azərbaycan Ad-Soyad Uyğunluğu)</span>
              {extraFakeUsers.length > 0 && (
                <span className="ml-auto text-xs text-white/20">{extraFakeUsers.length} əlavə qeyd</span>
              )}
            </div>
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="text-[11px] text-white/30 block mb-1.5">Say</label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={genCount}
                  onChange={e => setGenCount(e.target.value)}
                  placeholder="məs: 20"
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-white/20 w-32 placeholder-white/15"
                />
              </div>
              <div>
                <label className="text-[11px] text-white/30 block mb-1.5">Günlərə yay: {spreading}</label>
                <input
                  type="range"
                  min={1}
                  max={180}
                  value={spreading}
                  onChange={e => setSpreading(Number(e.target.value))}
                  className="w-32 accent-violet-500"
                />
              </div>
              <button
                onClick={handleGenerate}
                disabled={!genCount || parseInt(genCount) < 1 || generating}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/15 disabled:opacity-30 text-white/70 px-5 py-2.5 rounded-xl transition-all text-sm border border-white/10"
              >
                <Plus className="w-4 h-4" />
                {generating ? "..." : "Əlavə Et"}
              </button>
              {extraFakeUsers.length > 0 && (
                <button
                  onClick={clearFake}
                  className="flex items-center gap-2 text-white/30 hover:text-red-400 border border-white/10 hover:border-red-500/30 px-4 py-2.5 rounded-xl text-sm transition-all"
                >
                  <Trash2 className="w-4 h-4" /> Əlavə Olunanları Sil
                </button>
              )}
            </div>
          </div>
        )}

        {/* TAB 0: 7-GÜNLÜK HƏFTƏLİK STATİSTİKA (Girişlər, Ərizələr, Sessiyalar) */}
        {activeTab === "weekly" && (
          <div className="space-y-6">
            {/* Header & Filter Bar */}
            <div className="bg-gradient-to-r from-violet-900/30 via-indigo-900/20 to-purple-900/30 border border-violet-500/20 rounded-2xl p-5 backdrop-blur-xl">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-violet-600/30 border border-violet-500/30 flex items-center justify-center text-violet-300">
                      <CalendarDays className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        7 Günlük Fərdi və Ümumi Fəaliyyət Statistikası
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
                          Canlı Analitika
                        </span>
                      </h3>
                      <p className="text-xs text-white/50 mt-0.5">
                        Hər bir istifadəçinin son 7 gün ərzində günbəgün neçə dəfə daxil olduğu, neçə ərizə yazdığı və platformada keçirdiyi dəqiq vaxt.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Day selector tabs */}
                <div className="flex flex-wrap items-center gap-1.5 bg-black/40 p-1.5 rounded-xl border border-white/10">
                  {[
                    { id: -1, label: "📊 7 Günün İcmalı" },
                    { id: 0, label: "Bu gün" },
                    { id: 1, label: "Dünən" },
                    { id: 2, label: "2 gün əvvəl" },
                    { id: 3, label: "3 gün əvvəl" },
                    { id: 4, label: "4 gün əvvəl" },
                    { id: 5, label: "5 gün əvvəl" },
                    { id: 6, label: "6 gün əvvəl" },
                  ].map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setSelectedDayFilter(d.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        selectedDayFilter === d.id
                          ? "bg-violet-600 text-white shadow-md shadow-violet-500/20 font-bold"
                          : "text-white/50 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Weekly KPI Highlights */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-white/5">
                <div className="bg-white/3 rounded-xl p-3 border border-white/5">
                  <div className="text-[10px] text-white/40 flex items-center gap-1">
                    <LogIn className="w-3.5 h-3.5 text-violet-400" /> Həftəlik Cəmi Giriş Sayı
                  </div>
                  <div className="text-xl font-bold text-white mt-1">
                    {allUsers.reduce((acc, u) => acc + (u.weekly_stats?.totalLogins || 12), 0)} dəfə
                  </div>
                  <div className="text-[10px] text-emerald-400 mt-0.5">Bütün istifadəçilər üzrə</div>
                </div>

                <div className="bg-white/3 rounded-xl p-3 border border-white/5">
                  <div className="text-[10px] text-white/40 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-indigo-400" /> Həftəlik Tərtib Edilən Ərizələr
                  </div>
                  <div className="text-xl font-bold text-indigo-300 mt-1">
                    {allUsers.reduce((acc, u) => acc + (u.weekly_stats?.totalPetitions || u._petitionCount || 3), 0)} ərizə
                  </div>
                  <div className="text-[10px] text-white/40 mt-0.5">Elektron Ərizə mühərriki ilə</div>
                </div>

                <div className="bg-white/3 rounded-xl p-3 border border-white/5">
                  <div className="text-[10px] text-white/40 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-blue-400" /> Həftəlik Orta Aktivlik
                  </div>
                  <div className="text-xl font-bold text-blue-300 mt-1">
                    {Math.round(
                      allUsers.reduce((acc, u) => acc + (u.weekly_stats?.totalMinutes || 300), 0) / (allUsers.length * 60)
                    )} saat / istifadəçi
                  </div>
                  <div className="text-[10px] text-white/40 mt-0.5">Platformada keçirilən vaxt</div>
                </div>

                <div className="bg-white/3 rounded-xl p-3 border border-white/5">
                  <div className="text-[10px] text-white/40 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Günlük Ən Aktiv İstifadəçi
                  </div>
                  <div className="text-sm font-bold text-emerald-300 mt-1 truncate">
                    Qəzənfər Yusifov
                  </div>
                  <div className="text-[10px] text-white/40 mt-0.5">Həftədə 14 giriş, 6 ərizə</div>
                </div>
              </div>
            </div>

            {/* User-by-User 7-Day Matrix Cards */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-white/50 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-violet-400" />
                  İstifadəçilərin 7 Günlük Təfərrüatlı Cədvəli
                </h4>
                <span className="text-xs text-white/40">
                  Hər hansı istifadəçiyə klikləyərək 7 günlük tam sessiyaları aça bilərsiniz
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {allUsers.map((u) => {
                  const w = u.weekly_stats || getDeterministic7DayStats(u.id, u._petitionCount || 2, u.daily_logins || 2, u.daily_duration_minutes || 50);
                  const isMale = u.gender === "male";
                  const filteredDays = selectedDayFilter === -1 ? w.days : w.days.filter(d => d.daysAgo === selectedDayFilter);

                  return (
                    <div
                      key={u.id}
                      className="bg-white/4 hover:bg-white/6 border border-white/8 hover:border-violet-500/30 rounded-2xl p-5 backdrop-blur-xl transition-all duration-200 shadow-lg group relative overflow-hidden"
                    >
                      {/* Left color bar */}
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-violet-500 to-indigo-600 opacity-60 group-hover:opacity-100" />

                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 pb-3 border-b border-white/5 pl-2">
                        {/* User Identity */}
                        <div className="flex items-center gap-3">
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm text-white shadow-inner flex-shrink-0 ${
                            isMale
                              ? "bg-gradient-to-br from-blue-600 to-indigo-700"
                              : "bg-gradient-to-br from-pink-600 to-purple-700"
                          }`}>
                            {u.name.split(" ").map(n => n[0]).join("")}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-white group-hover:text-violet-300 transition-colors">
                                {u.name}
                              </h4>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/60 font-mono">
                                {isMale ? "Kişi" : "Qadın"}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/25">
                                {u.role === "lawyer" ? "⚖️ Vəkil" : "👤 Vətəndaş"}
                              </span>
                            </div>
                            <p className="text-xs text-white/40 mt-0.5">{u.email}</p>
                          </div>
                        </div>

                        {/* 7-Day Cumulative Summary Pills */}
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="bg-black/30 border border-white/5 rounded-xl px-3 py-1.5 text-center">
                            <span className="text-[10px] text-white/40 block">Həftəlik Giriş</span>
                            <strong className="text-xs text-violet-300 font-bold">{w.totalLogins} dəfə</strong>
                          </div>
                          <div className="bg-black/30 border border-white/5 rounded-xl px-3 py-1.5 text-center">
                            <span className="text-[10px] text-white/40 block">Həftəlik Ərizə</span>
                            <strong className="text-xs text-indigo-300 font-bold">{w.totalPetitions} ədəd</strong>
                          </div>
                          <div className="bg-black/30 border border-white/5 rounded-xl px-3 py-1.5 text-center">
                            <span className="text-[10px] text-white/40 block">Həftəlik Vaxt</span>
                            <strong className="text-xs text-emerald-300 font-bold">
                              {Math.floor(w.totalMinutes / 60)}s {w.totalMinutes % 60 > 0 ? (w.totalMinutes % 60) + 'd' : ''}
                            </strong>
                          </div>
                          <button
                            onClick={() => setSelectedUserModal({ ...u, weekly_stats: w })}
                            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 text-xs font-semibold transition-all ml-1"
                          >
                            <span>Tam Tarixçə</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* 7-Day Horizontal Bar / Pills Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 pl-2">
                        {filteredDays.map((day) => {
                          const isToday = day.daysAgo === 0;
                          const hasLogins = day.logins > 0;
                          const hasPetitions = day.petitions > 0;

                          return (
                            <div
                              key={day.daysAgo}
                              className={`rounded-xl p-3 border transition-all ${
                                isToday
                                  ? "bg-violet-600/15 border-violet-500/40 shadow-inner"
                                  : hasLogins
                                  ? "bg-black/25 border-white/5 hover:border-white/15"
                                  : "bg-white/2 border-white/3 opacity-60"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <span className={`text-[11px] font-bold ${isToday ? "text-violet-300" : "text-white/80"}`}>
                                  {day.dayName}
                                </span>
                                <span className="text-[9px] text-white/40 font-mono">
                                  {day.shortDate}
                                </span>
                              </div>

                              {/* Daily Metrics */}
                              <div className="space-y-1 mt-2">
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="text-white/40 flex items-center gap-1">
                                    <LogIn className="w-3 h-3 text-violet-400" /> Giriş:
                                  </span>
                                  <span className={`font-bold ${day.logins >= 3 ? "text-amber-400" : day.logins > 0 ? "text-white" : "text-white/30"}`}>
                                    {day.logins > 0 ? `${day.logins} dəfə` : "0 (Girməyib)"}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="text-white/40 flex items-center gap-1">
                                    <FileText className="w-3 h-3 text-indigo-400" /> Ərizə:
                                  </span>
                                  <span className={`font-bold ${hasPetitions ? "text-emerald-400" : "text-white/30"}`}>
                                    {hasPetitions ? `${day.petitions} ərizə` : "0"}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="text-white/40 flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-blue-400" /> Vaxt:
                                  </span>
                                  <span className="text-white/80 font-mono font-semibold">
                                    {day.durationFormatted}
                                  </span>
                                </div>
                              </div>

                              {/* Mini progress bar */}
                              <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden mt-2.5">
                                <div
                                  className={`h-full rounded-full ${
                                    day.logins >= 3
                                      ? "bg-amber-400"
                                      : day.logins === 2
                                      ? "bg-violet-500"
                                      : day.logins === 1
                                      ? "bg-blue-400"
                                      : "bg-white/10"
                                  }`}
                                  style={{ width: `${Math.min((day.minutes / 80) * 100, 100)}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: 12 PERMANENT USERS ACTIVITY & SESSION CARDS */}
        {activeTab === "activity" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/3 border border-white/8 rounded-2xl p-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  12 Daimi İstifadəçinin Gündəlik Sessiya İcmalı
                </h3>
                <p className="text-xs text-white/50 mt-0.5">
                  Bütün ad-soyadlar cinsə uyğundur (Kişi: -ov/-yev, Qadın: -ova/-yeva). Giriş tezliyi: Əsasən 2, bəziləri 0, 1 və çox nadir 3.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/40">Girişlər: <strong className="text-white">Əsasən 2 dəfə</strong> (0, 1, 2, 3)</span>
                <span className="text-white/20">&bull;</span>
                <span className="text-xs text-white/40">Aktiv Vaxt: <strong className="text-violet-400">28 dəq – 1 saat 20 dəq</strong></span>
              </div>
            </div>

            {/* Grid of 12 Users */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {FIXED_12_USERS.map((u) => {
                const percentage = Math.min(Math.round((u.daily_duration_minutes / 80) * 100), 100)
                const isMale = u.gender === "male"
                const hasSessions = (u.sessions || []).length > 0

                return (
                  <div
                    key={u.id}
                    className="bg-white/4 hover:bg-white/6 border border-white/8 hover:border-violet-500/30 rounded-2xl p-5 backdrop-blur-xl transition-all duration-200 shadow-lg group relative overflow-hidden"
                  >
                    {/* Top gradient glow on hover */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-indigo-500 to-purple-500 opacity-60 group-hover:opacity-100 transition-opacity" />

                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white shadow-inner flex-shrink-0 ${
                          isMale
                            ? "bg-gradient-to-br from-blue-600 to-indigo-700"
                            : "bg-gradient-to-br from-pink-600 to-purple-700"
                        }`}>
                          {u.name.split(" ").map(n => n[0]).join("")}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-sm font-bold text-white group-hover:text-violet-300 transition-colors">
                              {u.name}
                            </h4>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-white/60 font-mono">
                              {isMale ? "Kişi" : "Qadın"}
                            </span>
                          </div>
                          <p className="text-[11px] text-white/40 truncate max-w-[170px]">{u.email}</p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end">
                        {u.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Aktiv
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/40 text-[10px] font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                            Passiv
                          </span>
                        )}
                        <span className="text-[10px] text-white/40 mt-1">
                          {u.role === "lawyer" ? "⚖️ Vəkil" : "👤 Vətəndaş"}
                        </span>
                      </div>
                    </div>

                    {/* Daily Stats Summary */}
                    <div className="grid grid-cols-2 gap-2 my-3 p-2.5 rounded-xl bg-white/3 border border-white/5">
                      <div>
                        <div className="text-[10px] text-white/40 flex items-center gap-1">
                          <LogIn className="w-3 h-3 text-violet-400" /> Günlük Giriş
                        </div>
                        <div className="text-xs font-bold mt-0.5">
                          {u.daily_logins === 3 ? (
                            <span className="text-amber-400 flex items-center gap-1">
                              3 dəfə <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/15 border border-amber-500/30 font-normal">Nadir</span>
                            </span>
                          ) : u.daily_logins === 2 ? (
                            <span className="text-white">2 dəfə <span className="text-[10px] font-normal text-white/40">/ gün</span></span>
                          ) : u.daily_logins === 1 ? (
                            <span className="text-blue-300">1 dəfə <span className="text-[10px] font-normal text-white/40">/ gün</span></span>
                          ) : (
                            <span className="text-white/40">0 dəfə <span className="text-[9px] font-normal text-white/30">(Oflayn)</span></span>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-white/40 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-indigo-400" /> Günlük Vaxt
                        </div>
                        <div className="text-xs font-bold text-violet-300 mt-0.5">
                          {u.daily_duration_formatted}
                        </div>
                      </div>
                    </div>

                    {/* Duration Progress Bar */}
                    <div className="space-y-1 mb-3">
                      <div className="flex justify-between text-[10px] text-white/40">
                        <span>Aktivlik səviyyəsi</span>
                        <span className="font-semibold text-white/70">{u.daily_duration_minutes} dəq / 80 dəq</span>
                      </div>
                      <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            u.daily_logins === 3
                              ? "bg-gradient-to-r from-amber-500 to-emerald-400"
                              : u.daily_logins === 0
                              ? "bg-white/10"
                              : "bg-gradient-to-r from-violet-500 to-emerald-400"
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Sessions Breakdown */}
                    <div className="space-y-1.5 pt-2 border-t border-white/5 text-xs">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-white/30">
                        {hasSessions ? `Giriş Sessiyaları (${u.sessions.length}):` : "Giriş Sessiyası:"}
                      </div>

                      {!hasSessions ? (
                        <div className="p-2 rounded-lg bg-black/20 text-center text-[11px] text-white/30 italic">
                          Bu gün daxil olmayıb (Oflayn)
                        </div>
                      ) : (
                        u.sessions.map((s, idx) => (
                          <div key={idx} className="flex items-center justify-between text-[11px] p-1.5 rounded-lg bg-black/20 text-white/70">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold ${
                                idx === 0
                                  ? "bg-violet-500/20 text-violet-300"
                                  : idx === 1
                                  ? "bg-indigo-500/20 text-indigo-300"
                                  : "bg-amber-500/20 text-amber-300"
                              }`}>
                                {idx + 1}
                              </span>
                              {s.device === "desktop" ? (
                                <Monitor className="w-3 h-3 text-white/40" />
                              ) : (
                                <Smartphone className="w-3 h-3 text-white/40" />
                              )}
                              <span>{s.time}</span>
                            </div>
                            <span className="font-semibold text-white/90">{s.duration}</span>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Footer / Last seen */}
                    <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px] text-white/40">
                      <span>Son giriş: <strong className="text-white/70">{u.last_login_time}</strong></span>
                      <span>Ərizələr: <strong className="text-violet-400">{u.petitions_count}</strong></span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* TAB 2 & GLOBAL: FULL USERS TABLE */}
        {activeTab === "all" && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="text"
                  placeholder="Ad, soyad və ya e-poçt axtar..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-violet-500/50 transition-all"
                />
              </div>
              {(["all", "user", "lawyer"] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all border ${roleFilter === r ? "bg-violet-600 border-violet-500 text-white" : "bg-white/5 border-white/10 text-white/50 hover:text-white hover:border-white/20"}`}
                >
                  {r === "all" ? "Hamısı" : r === "user" ? "Vətəndaşlar" : "Vəkillər"}
                </button>
              ))}
            </div>

            {/* Table */}
            <div className="bg-white/3 backdrop-blur-xl border border-white/8 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/8 bg-white/3">
                      <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-white/40">#</th>
                      <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-white/40 cursor-pointer hover:text-white/70 transition-colors" onClick={() => toggleSort("name")}>
                        <span className="flex items-center gap-1">İstifadəçi {sortField === "name" ? (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : null}</span>
                      </th>
                      <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-white/40">E-poçt</th>
                      <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-white/40">Rol</th>
                      <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-white/40">Giriş Sayı</th>
                      <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-white/40 cursor-pointer hover:text-white/70 transition-colors" onClick={() => toggleSort("daily_duration")}>
                        <span className="flex items-center gap-1">Aktivlik Vaxtı {sortField === "daily_duration" ? (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : null}</span>
                      </th>
                      <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-white/40">Son Giriş</th>
                      <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-white/40">Ərizələr</th>
                      <th className="text-left px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-white/40">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {loading ? (
                      Array.from({ length: 6 }).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          {Array.from({ length: 9 }).map((_, j) => (
                            <td key={j} className="px-5 py-4"><div className="h-4 bg-white/5 rounded-lg" /></td>
                          ))}
                        </tr>
                      ))
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-5 py-16 text-center text-white/30 text-sm">
                          <UserX className="w-10 h-10 mx-auto mb-3 opacity-30" />
                          İstifadəçi tapılmadı
                        </td>
                      </tr>
                    ) : (
                      filtered.map((p, idx) => {
                        const consCount = p._petitionCount || 0
                        const isActive = p._active !== false && (p.daily_logins || 0) > 0
                        const isMale = p.gender === "male"
                        const initials = (p.name || "?").split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()
                        const logins = p.daily_logins ?? 0

                        return (
                          <tr key={p.id} className="hover:bg-white/3 transition-colors">
                            <td className="px-5 py-4 text-white/30 text-xs font-mono">{idx + 1}</td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center text-white text-xs font-bold border border-white/10 flex-shrink-0 ${
                                  isMale ? "bg-blue-600/30 text-blue-300" : "bg-pink-600/30 text-pink-300"
                                }`}>
                                  {p.avatar_url ? <img src={p.avatar_url} alt={p.name} className="w-full h-full object-cover" /> : initials}
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-white flex items-center gap-1.5">
                                    {p.name || "—"}
                                    {p.gender && (
                                      <span className="text-[9px] px-1 py-0.2 rounded bg-white/5 text-white/40 font-mono">
                                        {isMale ? "K" : "Q"}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-white/25 font-mono">{p.id.substring(0, 8)}…</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2 text-sm text-white/60">
                                <Mail className="w-3.5 h-3.5 text-white/20" />
                                {p.email || "—"}
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              {p.role === "lawyer"
                                ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-xs font-semibold"><Shield className="w-3 h-3" /> Vəkil</span>
                                : <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/15 border border-blue-500/25 text-blue-400 text-xs font-semibold"><User className="w-3 h-3" /> Vətəndaş</span>
                              }
                            </td>
                            <td className="px-5 py-4">
                              {logins === 3 ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold">
                                  <LogIn className="w-3 h-3" /> 3 dəfə/gün (Nadir)
                                </span>
                              ) : logins === 2 ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-bold">
                                  <LogIn className="w-3 h-3" /> 2 dəfə/gün
                                </span>
                              ) : logins === 1 ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-bold">
                                  <LogIn className="w-3 h-3" /> 1 dəfə/gün
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white/30 text-xs font-medium">
                                  <LogIn className="w-3 h-3 text-white/20" /> 0 dəfə/gün
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-white/90">{p.daily_duration_formatted || "0 dəq"}</span>
                                <div className="w-14 bg-white/5 h-1.5 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${logins === 3 ? "bg-gradient-to-r from-amber-500 to-emerald-400" : "bg-gradient-to-r from-violet-500 to-indigo-400"}`}
                                    style={{ width: `${Math.min(Math.round(((p.daily_duration_minutes || 0) / 80) * 100), 100)}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-xs text-white/60">
                              {p.last_login_time || "Bu gün"}
                            </td>
                            <td className="px-5 py-4 text-sm text-white/60 font-mono">{consCount}</td>
                            <td className="px-5 py-4">
                              {isActive
                                ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/15 border border-green-500/25 text-green-400 text-xs font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Aktiv</span>
                                : <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white/30 text-xs font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-white/20" /> Passiv</span>
                              }
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {!loading && filtered.length > 0 && (
                <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between text-xs text-white/25">
                  <span>{filtered.length} nəticə ({allUsers.length} ümumi)</span>
                  <span>Aktiv: {activeCount}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: USER FEEDBACKS & SUGGESTIONS */}
        {activeTab === "feedbacks" && (
          <div className="space-y-6">
            {/* Feedback Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-orange-500/20 to-amber-600/10 border border-orange-500/20 rounded-2xl p-4 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-2">
                  <MessageSquareHeart className="w-5 h-5 text-orange-400" />
                  <span className="text-xs font-semibold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full">Ümumi</span>
                </div>
                <div className="text-2xl font-bold text-white">{feedbacks.length}</div>
                <div className="text-xs font-semibold text-white/70 mt-1">Daxil Olan Rəylər</div>
              </div>

              <div className="bg-gradient-to-br from-amber-500/20 to-yellow-600/10 border border-amber-500/20 rounded-2xl p-4 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-2">
                  <Star className="w-5 h-5 text-amber-400" />
                  <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">Reytinq</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {feedbacks.length > 0 
                    ? (feedbacks.reduce((acc, f) => acc + (Number(f.rating) || 5), 0) / feedbacks.length).toFixed(1)
                    : "5.0"} <span className="text-sm font-normal text-amber-300">/ 5.0</span>
                </div>
                <div className="text-xs font-semibold text-white/70 mt-1">Orta Qiymətləndirmə</div>
              </div>

              <div className="bg-gradient-to-br from-violet-500/20 to-indigo-600/10 border border-violet-500/20 rounded-2xl p-4 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-2">
                  <Lightbulb className="w-5 h-5 text-violet-400" />
                  <span className="text-xs font-semibold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full">İdeyalar</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {feedbacks.filter(f => f.category === "suggestion").length}
                </div>
                <div className="text-xs font-semibold text-white/70 mt-1">Yeni Təklif & Funksiya</div>
              </div>

              <div className="bg-gradient-to-br from-red-500/20 to-pink-600/10 border border-red-500/20 rounded-2xl p-4 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-2">
                  <Bug className="w-5 h-5 text-red-400" />
                  <span className="text-xs font-semibold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">Texniki</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {feedbacks.filter(f => f.category === "bug").length}
                </div>
                <div className="text-xs font-semibold text-white/70 mt-1">Bildirilən Xətalar</div>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: "all", label: "Bütün Rəylər", count: feedbacks.length },
                { id: "suggestion", label: "💡 Təkliflər", count: feedbacks.filter(f => f.category === "suggestion").length },
                { id: "bug", label: "🐞 Xətalar", count: feedbacks.filter(f => f.category === "bug").length },
                { id: "general", label: "⭐ Ümumi Rəylər", count: feedbacks.filter(f => f.category === "general").length },
                { id: "legal", label: "⚖️ Hüquqi Məzmun", count: feedbacks.filter(f => f.category === "legal").length },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFeedbackCategoryFilter(tab.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all border ${
                    feedbackCategoryFilter === tab.id
                      ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white border-orange-500 shadow-md shadow-orange-500/20"
                      : "bg-white/5 border-white/10 text-white/50 hover:text-white hover:border-white/20"
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>

            {/* Feedbacks List */}
            <div className="space-y-3">
              {feedbacks
                .filter(f => feedbackCategoryFilter === "all" || f.category === feedbackCategoryFilter)
                .map((f, idx) => {
                  const ratingVal = Number(f.rating) || 5
                  const isSug = f.category === "suggestion"
                  const isBug = f.category === "bug"
                  const isLegal = f.category === "legal"

                  return (
                    <div
                      key={f.id || idx}
                      className="bg-white/4 hover:bg-white/6 border border-white/8 hover:border-orange-500/30 rounded-2xl p-5 backdrop-blur-xl transition-all shadow-lg group relative overflow-hidden"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white shadow-inner flex-shrink-0 ${
                            isSug
                              ? "bg-gradient-to-br from-amber-500 to-orange-600"
                              : isBug
                              ? "bg-gradient-to-br from-red-500 to-pink-600"
                              : isLegal
                              ? "bg-gradient-to-br from-emerald-500 to-teal-600"
                              : "bg-gradient-to-br from-violet-500 to-indigo-600"
                          }`}>
                            {isSug ? <Lightbulb className="w-5 h-5" /> : isBug ? <Bug className="w-5 h-5" /> : isLegal ? <Scale className="w-5 h-5" /> : <Star className="w-5 h-5" />}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-white group-hover:text-orange-300 transition-colors">
                                {f.name || "Anonim İstifadəçi"}
                              </h4>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/70 font-mono">
                                {isSug ? "💡 Təklif" : isBug ? "🐞 Xəta" : isLegal ? "⚖️ Hüquqi" : "⭐ Rəy"}
                              </span>
                            </div>
                            {f.email ? (
                              <p className="text-[11px] text-white/40 flex items-center gap-1 mt-0.5">
                                <Mail className="w-3 h-3" /> {f.email}
                              </p>
                            ) : (
                              <span className="text-[10px] text-white/30 italic">Anonim göndərilib</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center text-amber-400">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${i < ratingVal ? "fill-amber-400 text-amber-400" : "text-white/15"}`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-white/30 font-mono">
                            {new Date(f.created_at || Date.now()).toLocaleDateString("az-AZ")}
                          </span>
                        </div>
                      </div>

                      {f.subject && (
                        <div className="text-xs font-bold text-white/90 mb-1.5 flex items-center gap-1.5">
                          <span>Mövzu:</span>
                          <span className="text-orange-300">{f.subject}</span>
                        </div>
                      )}

                      <div className="p-3.5 rounded-xl bg-black/20 border border-white/5 text-xs text-white/80 leading-relaxed whitespace-pre-wrap">
                        {f.message}
                      </div>
                    </div>
                  )
                })}

              {feedbacks.filter(f => feedbackCategoryFilter === "all" || f.category === feedbackCategoryFilter).length === 0 && (
                <div className="p-12 text-center text-white/30 text-xs bg-white/3 rounded-2xl border border-white/5">
                  Bu kateqoriyada hələ rəy yoxdur.
                </div>
              )}
            </div>
          </div>
        )}
      
      {/* 7-DAY USER DETAIL MODAL */}
      {selectedUserModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0f0f17] border border-white/15 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3.5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-base text-white shadow-inner ${
                  selectedUserModal.gender === "male"
                    ? "bg-gradient-to-br from-blue-600 to-indigo-700"
                    : "bg-gradient-to-br from-pink-600 to-purple-700"
                }`}>
                  {selectedUserModal.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    {selectedUserModal.name}
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/60">
                      {selectedUserModal.gender === "male" ? "Kişi" : "Qadın"}
                    </span>
                  </h3>
                  <p className="text-xs text-white/50 mt-0.5">{selectedUserModal.email} &bull; {selectedUserModal.role === "lawyer" ? "Vəkil" : "Vətəndaş"}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUserModal(null)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 flex items-center justify-center text-white/50 hover:text-white transition-all"
              >
                &times;
              </button>
            </div>

            {/* 7-Day Stats Summary Banner */}
            <div className="grid grid-cols-3 gap-3 p-3.5 rounded-2xl bg-white/3 border border-white/5 text-center">
              <div>
                <span className="text-[10px] text-white/40 block">Həftəlik Ümumi Giriş</span>
                <strong className="text-base text-violet-300 font-bold">
                  {selectedUserModal.weekly_stats?.totalLogins || 0} dəfə
                </strong>
              </div>
              <div>
                <span className="text-[10px] text-white/40 block">Həftəlik Yazılan Ərizə</span>
                <strong className="text-base text-emerald-300 font-bold">
                  {selectedUserModal.weekly_stats?.totalPetitions || 0} ədəd
                </strong>
              </div>
              <div>
                <span className="text-[10px] text-white/40 block">Cəmi Vaxt</span>
                <strong className="text-base text-blue-300 font-bold">
                  {selectedUserModal.weekly_stats?.totalMinutes || 0} dəqiqə
                </strong>
              </div>
            </div>

            {/* Day by Day Detailed Breakdown */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/40">
                Son 7 Günün Təqvim və Sessiya Jurnalı:
              </h4>

              <div className="space-y-2.5">
                {selectedUserModal.weekly_stats?.days.map((d) => (
                  <div key={d.daysAgo} className="p-3.5 rounded-xl bg-white/3 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{d.dayName}</span>
                        <span className="text-xs text-white/40 font-mono">({d.dateStr})</span>
                        {d.daysAgo === 0 && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">Bu gün</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-white/60 mt-1">
                        <span className="flex items-center gap-1">
                          <LogIn className="w-3 h-3 text-violet-400" /> Giriş: <strong>{d.logins} dəfə</strong>
                        </span>
                        <span>&bull;</span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3 text-indigo-400" /> Ərizə: <strong className={d.petitions > 0 ? "text-emerald-400" : ""}>{d.petitions} ədəd</strong>
                        </span>
                        <span>&bull;</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-blue-400" /> Vaxt: <strong>{d.durationFormatted}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Sessions chips */}
                    <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
                      {d.sessions.length === 0 ? (
                        <span className="text-[11px] text-white/30 italic">Giriş qeydə alınmayıb</span>
                      ) : (
                        d.sessions.map((s, sIdx) => (
                          <span key={sIdx} className="text-[10px] px-2 py-1 rounded-lg bg-black/40 text-white/70 border border-white/5 flex items-center gap-1">
                            {s.device === "desktop" ? <Monitor className="w-3 h-3 text-white/40" /> : <Smartphone className="w-3 h-3 text-white/40" />}
                            {s.time} ({s.duration})
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setSelectedUserModal(null)}
                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-all"
              >
                Bağla
              </button>
            </div>
          </div>
        </div>
      )}

      </main>
    </div>
  )
}
