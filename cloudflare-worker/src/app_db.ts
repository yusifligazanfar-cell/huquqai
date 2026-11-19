export interface AppDbEnv {
  DB: D1Database;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function safeJsonParse<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== "string" || !raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return `pbkdf2$100000$${toHex(salt)}$${toHex(new Uint8Array(bits))}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored || !stored.startsWith("pbkdf2$")) return false;
  const parts = stored.split("$");
  if (parts.length !== 4) return false;
  const iterations = parseInt(parts[1], 10);
  const salt = fromHex(parts[2]);
  const expectedHex = parts[3];
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return toHex(new Uint8Array(bits)) === expectedHex;
}

function hydrateProfile(row: Record<string, any>) {
  return {
    id: row.id,
    name: row.name || "",
    surname: row.surname || "",
    email: row.email || "",
    role: row.role || "client",
    avatar_url: row.avatar_url || "",
    cover_url: row.cover_url || "",
    bio: row.bio || "",
    phone: row.phone || "",
    city: row.city || "",
    license_number: row.license_number || "",
    experience_years: Number(row.experience_years || 0),
    hourly_rate: Number(row.hourly_rate || 0),
    specialties: safeJsonParse<string[]>(row.specialties, []),
    education: safeJsonParse<any[]>(row.education, []),
    workplaces: safeJsonParse<any[]>(row.workplaces, []),
    faqs: safeJsonParse<any[]>(row.faqs, []),
    unavailable_dates: safeJsonParse<string[]>(row.unavailable_dates, []),
    certificates: safeJsonParse<any[]>(row.certificates, []),
    is_verified: Boolean(row.is_verified),
    email_verified: Boolean(row.email_verified),
    admin_note: row.admin_note || "",
    created_at: row.created_at || null,
    last_sign_in_at: row.last_sign_in_at || null,
  };
}

export async function handleAppDb(request: Request, env: AppDbEnv): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const db = env.DB;

  if (!db) {
    return json({ error: "Cloudflare D1 binding (DB) missing" }, 500);
  }

  try {
    // 0. Auth endpoints (Cloudflare D1 native auth)
    if (path === "/app/auth/signup" && request.method === "POST") {
      const p = (await request.json().catch(() => ({}))) as Record<string, any>;
      const email = String(p.email || "").trim().toLowerCase();
      const password = String(p.password || "");
      if (!email || !password) {
        return json({ error: "E-poçt və şifrə tələb olunur." }, 400);
      }

      const existing = await db
        .prepare("SELECT * FROM profiles WHERE lower(email) = ?")
        .bind(email)
        .first<Record<string, any>>();

      const passwordHash = await hashPassword(password);
      const nowIso = new Date().toISOString();

      if (existing && existing.password_hash) {
        return json({ error: "Bu e-poçt ünvanı ilə artıq hesab mövcuddur." }, 409);
      }

      const id = existing?.id ? String(existing.id) : crypto.randomUUID();
      if (existing) {
        await db
          .prepare(
            `UPDATE profiles SET
              password_hash = ?,
              email_verified = ?,
              name = COALESCE(NULLIF(?, ''), name),
              surname = COALESCE(NULLIF(?, ''), surname),
              role = COALESCE(NULLIF(?, ''), role),
              bio = COALESCE(NULLIF(?, ''), bio),
              license_number = COALESCE(NULLIF(?, ''), license_number),
              experience_years = CASE WHEN ? > 0 THEN ? ELSE experience_years END,
              hourly_rate = CASE WHEN ? >= 0 THEN ? ELSE hourly_rate END,
              specialties = COALESCE(?, specialties),
              education = COALESCE(?, education),
              workplaces = COALESCE(?, workplaces),
              last_sign_in_at = ?
            WHERE id = ?`
          )
          .bind(
            passwordHash,
            p.email_verified ? 1 : 0,
            String(p.name || ""),
            String(p.surname || ""),
            String(p.role || ""),
            String(p.bio || ""),
            String(p.license_number || ""),
            Number(p.experience_years || -1),
            Number(p.experience_years || 0),
            Number(p.hourly_rate ?? -1),
            Number(p.hourly_rate || 0),
            Array.isArray(p.specialties) ? JSON.stringify(p.specialties) : null,
            Array.isArray(p.education) ? JSON.stringify(p.education) : null,
            Array.isArray(p.workplaces) ? JSON.stringify(p.workplaces) : null,
            nowIso,
            id
          )
          .run();
      } else {
        await db
          .prepare(
            `INSERT INTO profiles (
              id, name, surname, email, role, avatar_url, cover_url, bio, phone, city,
              license_number, experience_years, hourly_rate, specialties, education,
              workplaces, faqs, unavailable_dates, certificates, is_verified,
              password_hash, email_verified, created_at, last_sign_in_at
            ) VALUES (?, ?, ?, ?, ?, '', '', ?, '', '', ?, ?, ?, ?, ?, ?, '[]', '[]', '[]', 0, ?, ?, ?, ?)`
          )
          .bind(
            id,
            String(p.name || ""),
            String(p.surname || ""),
            email,
            String(p.role || "client"),
            String(p.bio || ""),
            String(p.license_number || ""),
            Number(p.experience_years || 0),
            Number(p.hourly_rate || 0),
            JSON.stringify(Array.isArray(p.specialties) ? p.specialties : []),
            JSON.stringify(Array.isArray(p.education) ? p.education : []),
            JSON.stringify(Array.isArray(p.workplaces) ? p.workplaces : []),
            passwordHash,
            p.email_verified ? 1 : 0,
            nowIso,
            nowIso
          )
          .run();
      }

      const row = await db.prepare("SELECT * FROM profiles WHERE id = ?").bind(id).first<Record<string, any>>();
      return json({ success: true, user: row ? hydrateProfile(row) : null });
    }

    if (path === "/app/auth/login" && request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as {
        email?: string;
        password?: string;
        role?: string;
      };
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      if (!email || !password) {
        return json({ error: "E-poçt və şifrə tələb olunur." }, 400);
      }

      const row = await db
        .prepare("SELECT * FROM profiles WHERE lower(email) = ?")
        .bind(email)
        .first<Record<string, any>>();

      if (!row || !row.password_hash) {
        return json({ error: "E-poçt və ya şifrə yanlışdır." }, 401);
      }

      const valid = await verifyPassword(password, String(row.password_hash));
      if (!valid) {
        return json({ error: "E-poçt və ya şifrə yanlışdır." }, 401);
      }

      if (body.role === "lawyer" && row.role !== "lawyer") {
        return json(
          { error: "Bu hesab Vəkil / Hüquqşünas kimi qeydiyyatdan keçməyib. Əvvəlcə Vəkil / Hüquqşünas kimi qeydiyyatdan keçin." },
          403
        );
      }

      if (!row.email_verified) {
        return json(
          { error: "E-poçt ünvanınız hələ təsdiqlənməyib. Zəhmət olmasa e-poçtunuza göndərilən təsdiq linkinə klikləyin." },
          403
        );
      }

      const nowIso = new Date().toISOString();
      await db.prepare("UPDATE profiles SET last_sign_in_at = ? WHERE id = ?").bind(nowIso, row.id).run();
      const updated = await db.prepare("SELECT * FROM profiles WHERE id = ?").bind(row.id).first<Record<string, any>>();
      return json({ success: true, user: updated ? hydrateProfile(updated) : hydrateProfile(row) });
    }

    if (path === "/app/auth/verify-email" && request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as { email?: string };
      const email = String(body.email || "").trim().toLowerCase();
      if (!email) return json({ error: "email required" }, 400);
      await db.prepare("UPDATE profiles SET email_verified = 1 WHERE lower(email) = ?").bind(email).run();
      const row = await db.prepare("SELECT * FROM profiles WHERE lower(email) = ?").bind(email).first<Record<string, any>>();
      return json({ success: true, user: row ? hydrateProfile(row) : null });
    }

    if (path === "/app/auth/reset-password" && request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as { email?: string; password?: string };
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      if (!email || !password) return json({ error: "E-poçt və yeni şifrə tələb olunur." }, 400);
      const row = await db.prepare("SELECT * FROM profiles WHERE lower(email) = ?").bind(email).first<Record<string, any>>();
      if (!row) return json({ error: "Bu e-poçtla istifadəçi tapılmadı." }, 404);
      const passwordHash = await hashPassword(password);
      await db.prepare("UPDATE profiles SET password_hash = ?, email_verified = 1 WHERE id = ?").bind(passwordHash, row.id).run();
      return json({ success: true });
    }

    if (path === "/app/auth/change-password" && request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as {
        userId?: string;
        currentPassword?: string;
        newPassword?: string;
      };
      const userId = String(body.userId || "").trim();
      const currentPassword = String(body.currentPassword || "");
      const newPassword = String(body.newPassword || "");
      if (!userId || !newPassword) {
        return json({ error: "İstifadəçi və yeni şifrə tələb olunur." }, 400);
      }
      const row = await db.prepare("SELECT * FROM profiles WHERE id = ?").bind(userId).first<Record<string, any>>();
      if (!row) return json({ error: "İstifadəçi tapılmadı." }, 404);

      if (row.password_hash) {
        if (!currentPassword) {
          return json({ error: "Cari şifrənizi daxil edin." }, 400);
        }
        const valid = await verifyPassword(currentPassword, String(row.password_hash));
        if (!valid) {
          return json({ error: "Cari şifrə yanlışdır." }, 401);
        }
      }

      const passwordHash = await hashPassword(newPassword);
      await db.prepare("UPDATE profiles SET password_hash = ?, email_verified = 1 WHERE id = ?").bind(passwordHash, row.id).run();
      return json({ success: true });
    }

    if (path === "/app/auth/user" && request.method === "GET") {
      const id = url.searchParams.get("id") || "";
      const email = (url.searchParams.get("email") || "").trim().toLowerCase();
      const row = id
        ? await db.prepare("SELECT * FROM profiles WHERE id = ?").bind(id).first<Record<string, any>>()
        : email
          ? await db.prepare("SELECT * FROM profiles WHERE lower(email) = ?").bind(email).first<Record<string, any>>()
          : null;
      return json({ user: row ? hydrateProfile(row) : null });
    }

    if (path === "/app/auth/oauth" && request.method === "POST") {
      const p = (await request.json().catch(() => ({}))) as Record<string, any>;
      const email = String(p.email || "").trim().toLowerCase();
      if (!email) return json({ error: "email required" }, 400);

      const existing = await db
        .prepare("SELECT * FROM profiles WHERE lower(email) = ?")
        .bind(email)
        .first<Record<string, any>>();

      if (p.role === "lawyer" && p.mode === "login") {
        if (!existing || existing.role !== "lawyer") {
          return json(
            { error: "Bu Google hesabı Vəkil / Hüquqşünas kimi qeydiyyatdan keçməyib." },
            403
          );
        }
      }

      const nowIso = new Date().toISOString();
      const id = existing?.id ? String(existing.id) : crypto.randomUUID();

      if (existing) {
        await db
          .prepare(
            `UPDATE profiles SET
              email_verified = 1,
              name = COALESCE(NULLIF(name, ''), ?),
              surname = COALESCE(NULLIF(surname, ''), ?),
              avatar_url = COALESCE(NULLIF(avatar_url, ''), ?),
              last_sign_in_at = ?
            WHERE id = ?`
          )
          .bind(
            String(p.name || ""),
            String(p.surname || ""),
            String(p.avatar_url || ""),
            nowIso,
            id
          )
          .run();
      } else {
        await db
          .prepare(
            `INSERT INTO profiles (
              id, name, surname, email, role, avatar_url, cover_url, bio, phone, city,
              license_number, experience_years, hourly_rate, specialties, education,
              workplaces, faqs, unavailable_dates, certificates, is_verified,
              password_hash, email_verified, created_at, last_sign_in_at
            ) VALUES (?, ?, ?, ?, ?, ?, '', '', '', '', '', 0, 0, '[]', '[]', '[]', '[]', '[]', '[]', 0, '', 1, ?, ?)`
          )
          .bind(
            id,
            String(p.name || ""),
            String(p.surname || ""),
            email,
            String(p.role || "client"),
            String(p.avatar_url || ""),
            nowIso,
            nowIso
          )
          .run();
      }

      const row = await db.prepare("SELECT * FROM profiles WHERE id = ?").bind(id).first<Record<string, any>>();
      return json({ success: true, user: row ? hydrateProfile(row) : null });
    }

    // 1. Bulk import / seed from Supabase
    if (path === "/app/admin/import" && request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as {
        profiles?: any[];
        community_posts?: any[];
        consultations?: any[];
      };

      let importedProfiles = 0;
      for (const p of body.profiles || []) {
        if (!p?.id) continue;
        await db
          .prepare(
            `INSERT INTO profiles (
              id, name, surname, email, role, avatar_url, cover_url, bio, phone, city,
              license_number, experience_years, hourly_rate, specialties, education,
              workplaces, faqs, unavailable_dates, certificates, is_verified, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO NOTHING`
          )
          .bind(
            String(p.id),
            String(p.name || ""),
            String(p.surname || ""),
            String(p.email || ""),
            String(p.role || "client"),
            String(p.avatar_url || ""),
            String(p.cover_url || ""),
            String(p.bio || ""),
            String(p.phone || ""),
            String(p.city || ""),
            String(p.license_number || ""),
            Number(p.experience_years || 0),
            Number(p.hourly_rate || 0),
            JSON.stringify(Array.isArray(p.specialties) ? p.specialties : []),
            JSON.stringify(Array.isArray(p.education) ? p.education : []),
            JSON.stringify(Array.isArray(p.workplaces) ? p.workplaces : []),
            JSON.stringify(Array.isArray(p.faqs) ? p.faqs : []),
            JSON.stringify(Array.isArray(p.unavailable_dates) ? p.unavailable_dates : []),
            JSON.stringify(Array.isArray(p.certificates) ? p.certificates : []),
            p.is_verified ? 1 : 0,
            String(p.created_at || new Date().toISOString())
          )
          .run();
        importedProfiles++;
      }

      for (const post of body.community_posts || []) {
        if (!post?.id || !post?.user_id) continue;
        await db
          .prepare(
            `INSERT INTO community_posts (id, user_id, title, content, category, created_at)
             VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING`
          )
          .bind(
            String(post.id),
            String(post.user_id),
            String(post.title || ""),
            String(post.content || ""),
            String(post.category || "Ümumi"),
            String(post.created_at || new Date().toISOString())
          )
          .run();
      }

      return json({ success: true, importedProfiles });
    }

    // 2. Upsert profile on login/signup/account update (never overwrites is_verified!)
    if (path === "/app/sync-profile" && request.method === "POST") {
      const p = (await request.json().catch(() => ({}))) as Record<string, any>;
      if (!p.id) return json({ error: "id required" }, 400);

      const existing = await db
        .prepare("SELECT * FROM profiles WHERE id = ?")
        .bind(String(p.id))
        .first<Record<string, any>>();

      const nowIso = new Date().toISOString();

      if (!existing) {
        await db
          .prepare(
            `INSERT INTO profiles (
              id, name, surname, email, role, avatar_url, cover_url, bio, phone, city,
              license_number, experience_years, hourly_rate, specialties, education,
              workplaces, faqs, unavailable_dates, certificates, is_verified, created_at, last_sign_in_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`
          )
          .bind(
            String(p.id),
            String(p.name || ""),
            String(p.surname || ""),
            String(p.email || ""),
            String(p.role || "client"),
            String(p.avatar_url || ""),
            String(p.cover_url || ""),
            String(p.bio || ""),
            String(p.phone || ""),
            String(p.city || ""),
            String(p.license_number || ""),
            Number(p.experience_years || 0),
            Number(p.hourly_rate || 0),
            JSON.stringify(Array.isArray(p.specialties) ? p.specialties : []),
            JSON.stringify(Array.isArray(p.education) ? p.education : []),
            JSON.stringify(Array.isArray(p.workplaces) ? p.workplaces : []),
            JSON.stringify(Array.isArray(p.faqs) ? p.faqs : []),
            JSON.stringify(Array.isArray(p.unavailable_dates) ? p.unavailable_dates : []),
            JSON.stringify(Array.isArray(p.certificates) ? p.certificates : []),
            String(p.created_at || nowIso),
            nowIso
          )
          .run();
      } else {
        await db
          .prepare(
            `UPDATE profiles SET
              name = COALESCE(NULLIF(?, ''), name),
              surname = COALESCE(NULLIF(?, ''), surname),
              email = COALESCE(NULLIF(?, ''), email),
              role = COALESCE(NULLIF(?, ''), role),
              avatar_url = COALESCE(NULLIF(?, ''), avatar_url),
              cover_url = COALESCE(NULLIF(?, ''), cover_url),
              bio = COALESCE(NULLIF(?, ''), bio),
              license_number = COALESCE(NULLIF(?, ''), license_number),
              experience_years = CASE WHEN ? > 0 THEN ? ELSE experience_years END,
              hourly_rate = CASE WHEN ? >= 0 THEN ? ELSE hourly_rate END,
              specialties = COALESCE(?, specialties),
              education = COALESCE(?, education),
              workplaces = COALESCE(?, workplaces),
              faqs = COALESCE(?, faqs),
              unavailable_dates = COALESCE(?, unavailable_dates),
              last_sign_in_at = ?
            WHERE id = ?`
          )
          .bind(
            p.name ?? "",
            p.surname ?? "",
            p.email ?? "",
            p.role ?? "",
            p.avatar_url ?? "",
            p.cover_url ?? "",
            p.bio ?? "",
            p.license_number ?? "",
            p.experience_years ?? -1,
            p.experience_years ?? 0,
            p.hourly_rate ?? -1,
            p.hourly_rate ?? 0,
            Array.isArray(p.specialties) ? JSON.stringify(p.specialties) : null,
            Array.isArray(p.education) ? JSON.stringify(p.education) : null,
            Array.isArray(p.workplaces) ? JSON.stringify(p.workplaces) : null,
            Array.isArray(p.faqs) ? JSON.stringify(p.faqs) : null,
            Array.isArray(p.unavailable_dates) ? JSON.stringify(p.unavailable_dates) : null,
            p.touch_login ? nowIso : existing.last_sign_in_at || nowIso,
            String(p.id)
          )
          .run();
      }

      const updated = await db
        .prepare("SELECT * FROM profiles WHERE id = ?")
        .bind(String(p.id))
        .first<Record<string, any>>();
      return json({ success: true, profile: updated ? hydrateProfile(updated) : null });
    }

    // 3. Get single profile
    if (path === "/app/profile" && request.method === "GET") {
      const id = url.searchParams.get("id") || "";
      if (!id) return json({ error: "id required" }, 400);
      const row = await db.prepare("SELECT * FROM profiles WHERE id = ?").bind(id).first<Record<string, any>>();
      return json({ profile: row ? hydrateProfile(row) : null });
    }

    // 4. Verified lawyers catalog
    if (path === "/app/lawyers" && request.method === "GET") {
      const q = (url.searchParams.get("q") || "").trim().toLowerCase();
      const category = (url.searchParams.get("category") || "").trim();

      const { results } = await db
        .prepare("SELECT * FROM profiles WHERE role = 'lawyer' AND is_verified = 1 ORDER BY created_at DESC")
        .all<Record<string, any>>();

      let lawyers = (results || []).map(hydrateProfile);
      if (category) {
        lawyers = lawyers.filter((l) => l.specialties.includes(category));
      }
      if (q) {
        lawyers = lawyers.filter(
          (l) =>
            `${l.name} ${l.surname}`.toLowerCase().includes(q) ||
            l.bio.toLowerCase().includes(q) ||
            l.specialties.some((s) => s.toLowerCase().includes(q))
        );
      }
      return json({ lawyers });
    }

    // 5. Single lawyer profile
    if (path.startsWith("/app/lawyers/") && request.method === "GET") {
      const id = decodeURIComponent(path.slice("/app/lawyers/".length));
      const row = await db
        .prepare("SELECT * FROM profiles WHERE id = ? AND role = 'lawyer'")
        .bind(id)
        .first<Record<string, any>>();
      return json({ lawyer: row ? hydrateProfile(row) : null });
    }

    // 6. Admin Overview
    if (path === "/app/admin/overview" && request.method === "GET") {
      const [profilesRes, consultationsRes, feedbacksRes, postsRes, convsRes, msgsRes] = await Promise.all([
        db.prepare("SELECT * FROM profiles ORDER BY created_at DESC").all<Record<string, any>>(),
        db.prepare("SELECT * FROM consultations ORDER BY created_at DESC").all<Record<string, any>>(),
        db.prepare("SELECT * FROM feedbacks ORDER BY created_at DESC").all<Record<string, any>>(),
        db.prepare("SELECT * FROM community_posts ORDER BY created_at DESC").all<Record<string, any>>(),
        db.prepare("SELECT id, user_id, created_at FROM conversations").all<Record<string, any>>(),
        db.prepare("SELECT id FROM messages").all<Record<string, any>>(),
      ]);

      const rawProfiles = profilesRes.results || [];
      const consultations = consultationsRes.results || [];
      const feedbacks = feedbacksRes.results || [];
      const posts = postsRes.results || [];
      const conversations = convsRes.results || [];
      const messages = msgsRes.results || [];

      const consByUser = new Map<string, number>();
      for (const c of consultations) {
        if (c.client_id) consByUser.set(c.client_id, (consByUser.get(c.client_id) || 0) + 1);
        if (c.lawyer_id) consByUser.set(c.lawyer_id, (consByUser.get(c.lawyer_id) || 0) + 1);
      }

      const convsByUser = new Map<string, number>();
      for (const cv of conversations) {
        if (cv.user_id) convsByUser.set(cv.user_id, (convsByUser.get(cv.user_id) || 0) + 1);
      }

      const postsByUser = new Map<string, number>();
      for (const p of posts) {
        if (p.user_id) postsByUser.set(p.user_id, (postsByUser.get(p.user_id) || 0) + 1);
      }

      const nowMs = Date.now();
      const dayMs = 86400000;

      const users = rawProfiles.map((r) => {
        const hp = hydrateProfile(r);
        return {
          ...hp,
          consultations_count: consByUser.get(hp.id) || 0,
          conversations_count: convsByUser.get(hp.id) || 0,
          posts_count: postsByUser.get(hp.id) || 0,
        };
      });

      const lawyers = users.filter((u) => u.role === "lawyer");
      const citizens = users.filter((u) => u.role !== "lawyer");
      const verifiedLawyers = lawyers.filter((l) => l.is_verified).length;
      const pendingLawyers = lawyers.filter(
        (l) => !l.is_verified && !String(l.admin_note || "").startsWith("REJECTED:")
      ).length;

      const activeLast24h = users.filter(
        (u) => u.last_sign_in_at && nowMs - new Date(u.last_sign_in_at).getTime() <= dayMs
      ).length;
      const activeLast7d = users.filter(
        (u) => u.last_sign_in_at && nowMs - new Date(u.last_sign_in_at).getTime() <= 7 * dayMs
      ).length;
      const newUsersLast7d = users.filter(
        (u) => u.created_at && nowMs - new Date(u.created_at).getTime() <= 7 * dayMs
      ).length;

      const dailyTrend14d: Array<{
        date: string;
        label: string;
        signups: number;
        conversations: number;
        consultations: number;
      }> = [];

      for (let i = 13; i >= 0; i--) {
        const d = new Date(nowMs - i * dayMs);
        const isoDay = d.toISOString().slice(0, 10);
        const label = d.toLocaleDateString("az-AZ", { day: "2-digit", month: "short" });
        const signups = users.filter((u) => u.created_at?.slice(0, 10) === isoDay).length;
        const cons = consultations.filter((c) => String(c.created_at || "").slice(0, 10) === isoDay).length;
        dailyTrend14d.push({ date: isoDay, label, signups, conversations: 0, consultations: cons });
      }

      return json({
        stats: {
          totalUsers: users.length,
          totalCitizens: citizens.length,
          totalLawyers: lawyers.length,
          verifiedLawyers,
          pendingLawyers,
          activeLast24h,
          activeLast7d,
          newUsersLast7d,
          totalConversations: conversations.length,
          totalMessages: messages.length,
          totalConsultations: consultations.length,
          totalCommunityPosts: posts.length,
          totalFeedbacks: feedbacks.length,
        },
        dailyTrend14d,
        users,
        feedbacks,
      });
    }

    // 7. Admin Review (approve / reject / request_info) in D1
    if (path === "/app/admin/review" && request.method === "PATCH") {
      const body = (await request.json().catch(() => ({}))) as {
        userId?: string;
        action?: "approve" | "reject" | "request_info";
        note?: string;
      };
      if (!body.userId) return json({ error: "userId required" }, 400);

      const action = body.action || "approve";
      const existing = await db
        .prepare("SELECT * FROM profiles WHERE id = ?")
        .bind(body.userId)
        .first<Record<string, any>>();

      if (!existing) {
        return json({ error: "İstifadəçi Cloudflare D1 bazasında tapılmadı" }, 404);
      }

      if (action === "approve") {
        await db
          .prepare("UPDATE profiles SET is_verified = 1, admin_note = ? WHERE id = ?")
          .bind(String(body.note || ""), body.userId)
          .run();
      } else if (action === "reject") {
        const rejectNote = body.note ? `REJECTED: ${body.note}` : "REJECTED: Müraciət rədd edildi";
        await db
          .prepare("UPDATE profiles SET is_verified = 0, admin_note = ? WHERE id = ?")
          .bind(rejectNote, body.userId)
          .run();
      } else {
        await db
          .prepare("UPDATE profiles SET admin_note = ? WHERE id = ?")
          .bind(String(body.note || "Doğrulama məlumatı tələb olunur"), body.userId)
          .run();
      }

      const updated = await db
        .prepare("SELECT * FROM profiles WHERE id = ?")
        .bind(body.userId)
        .first<Record<string, any>>();

      return json({
        success: true,
        profile: updated ? hydrateProfile(updated) : null,
      });
    }

    // 8. Feedbacks
    if (path === "/app/feedbacks" && request.method === "GET") {
      const { results } = await db
        .prepare("SELECT * FROM feedbacks ORDER BY created_at DESC")
        .all<Record<string, any>>();
      return json({ feedbacks: results || [] });
    }

    if (path === "/app/feedbacks" && request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as Record<string, any>;
      if (!body.message || !String(body.message).trim()) {
        return json({ error: "Rəy mətni daxil edilməlidir" }, 400);
      }
      const id = `fb-${crypto.randomUUID()}`;
      const createdAt = new Date().toISOString();
      await db
        .prepare(
          `INSERT INTO feedbacks (id, user_id, name, email, category, rating, sentiment, subject, message, status, is_anonymous, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)`
        )
        .bind(
          id,
          String(body.user_id || ""),
          body.is_anonymous ? "Anonim İstifadəçi" : String(body.name || "İstifadəçi"),
          body.is_anonymous ? "" : String(body.email || ""),
          String(body.category || "general"),
          Number(body.rating || 5),
          String(body.sentiment || "excellent"),
          String(body.subject || "Rəy və Təklif"),
          String(body.message).trim(),
          body.is_anonymous ? 1 : 0,
          createdAt
        )
        .run();

      const row = await db.prepare("SELECT * FROM feedbacks WHERE id = ?").bind(id).first();
      return json({ success: true, feedback: row });
    }

    // 9. Consultations (bookings & consultation messages)
    if (path === "/app/consultations" && request.method === "GET") {
      const id = url.searchParams.get("id");
      const lawyerId = url.searchParams.get("lawyerId");
      const userId = url.searchParams.get("userId");

      if (id) {
        const row = await db.prepare("SELECT * FROM consultations WHERE id = ?").bind(id).first<Record<string, any>>();
        if (!row) return json({ consultation: null, messages: [] });
        const [clientRow, lawyerRow, msgsRes] = await Promise.all([
          db.prepare("SELECT id, name, surname, avatar_url, email FROM profiles WHERE id = ?").bind(row.client_id).first<Record<string, any>>(),
          db.prepare("SELECT id, name, surname, avatar_url, email, role FROM profiles WHERE id = ?").bind(row.lawyer_id).first<Record<string, any>>(),
          db.prepare("SELECT * FROM consultation_messages WHERE consultation_id = ? ORDER BY created_at ASC").bind(id).all<Record<string, any>>(),
        ]);
        return json({
          consultation: { ...row, client: clientRow || null, lawyer: lawyerRow || null },
          messages: msgsRes.results || [],
        });
      }

      if (lawyerId) {
        const { results } = await db
          .prepare(
            "SELECT * FROM consultations WHERE lawyer_id = ? AND status IN ('Gözləyir', 'pending', 'Qəbul edildi') ORDER BY created_at DESC"
          )
          .bind(lawyerId)
          .all();
        return json({ consultations: results || [] });
      }

      if (userId) {
        const { results } = await db
          .prepare("SELECT * FROM consultations WHERE client_id = ? OR lawyer_id = ? ORDER BY created_at DESC")
          .bind(userId, userId)
          .all<Record<string, any>>();
        const rows = results || [];
        const profileIds = Array.from(new Set(rows.flatMap((r) => [r.client_id, r.lawyer_id]).filter(Boolean)));
        const profileMap = new Map<string, any>();
        for (const pid of profileIds) {
          const pr = await db
            .prepare("SELECT id, name, surname, avatar_url, email FROM profiles WHERE id = ?")
            .bind(pid)
            .first<Record<string, any>>();
          if (pr) profileMap.set(pid, pr);
        }
        return json({
          consultations: rows.map((r) => ({
            ...r,
            client: profileMap.get(r.client_id) || null,
            lawyer: profileMap.get(r.lawyer_id) || null,
          })),
        });
      }

      const { results } = await db.prepare("SELECT * FROM consultations ORDER BY created_at DESC").all();
      return json({ consultations: results || [] });
    }

    if (path === "/app/consultations" && request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as Record<string, any>;
      if (!body.client_id || !body.lawyer_id) {
        return json({ error: "client_id and lawyer_id required" }, 400);
      }
      const id = `cons-${crypto.randomUUID()}`;
      const createdAt = new Date().toISOString();
      await db
        .prepare(
          `INSERT INTO consultations (id, client_id, lawyer_id, problem_description, preferred_date, preferred_time, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 'Gözləyir', ?)`
        )
        .bind(
          id,
          String(body.client_id),
          String(body.lawyer_id),
          String(body.problem_description || ""),
          String(body.preferred_date || ""),
          String(body.preferred_time || ""),
          createdAt
        )
        .run();
      const row = await db.prepare("SELECT * FROM consultations WHERE id = ?").bind(id).first();
      return json({ success: true, consultation: row });
    }

    if (path === "/app/consultations" && request.method === "PATCH") {
      const body = (await request.json().catch(() => ({}))) as { id?: string; status?: string };
      if (!body.id || !body.status) return json({ error: "id and status required" }, 400);
      await db.prepare("UPDATE consultations SET status = ? WHERE id = ?").bind(body.status, body.id).run();
      const row = await db.prepare("SELECT * FROM consultations WHERE id = ?").bind(body.id).first();
      return json({ success: true, consultation: row });
    }

    if (path === "/app/consultations/messages" && request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as {
        consultation_id?: string;
        sender_id?: string;
        content?: string;
      };
      if (!body.consultation_id || !body.sender_id || !body.content?.trim()) {
        return json({ error: "consultation_id, sender_id and content required" }, 400);
      }
      const id = `cmsg-${crypto.randomUUID()}`;
      const createdAt = new Date().toISOString();
      await db
        .prepare(
          "INSERT INTO consultation_messages (id, consultation_id, sender_id, content, created_at) VALUES (?, ?, ?, ?, ?)"
        )
        .bind(id, body.consultation_id, body.sender_id, body.content.trim(), createdAt)
        .run();
      const row = await db.prepare("SELECT * FROM consultation_messages WHERE id = ?").bind(id).first();
      return json({ success: true, message: row });
    }

    // 10. Lawyer Reviews
    if (path === "/app/reviews" && request.method === "GET") {
      const lawyerId = url.searchParams.get("lawyerId") || "";
      if (!lawyerId) return json({ reviews: [] });
      const { results } = await db
        .prepare("SELECT * FROM reviews WHERE lawyer_id = ? ORDER BY created_at DESC")
        .bind(lawyerId)
        .all<Record<string, any>>();
      const rows = results || [];
      const enriched = [];
      for (const r of rows) {
        const client = await db
          .prepare("SELECT id, name, surname, avatar_url FROM profiles WHERE id = ?")
          .bind(r.client_id)
          .first<Record<string, any>>();
        enriched.push({ ...r, client: client || null });
      }
      return json({ reviews: enriched });
    }

    if (path === "/app/reviews" && request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as Record<string, any>;
      if (!body.lawyer_id || !body.client_id) return json({ error: "lawyer_id and client_id required" }, 400);
      const id = `rev-${crypto.randomUUID()}`;
      const createdAt = new Date().toISOString();
      await db
        .prepare("INSERT INTO reviews (id, lawyer_id, client_id, rating, comment, created_at) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(id, String(body.lawyer_id), String(body.client_id), Number(body.rating || 5), String(body.comment || ""), createdAt)
        .run();
      const client = await db
        .prepare("SELECT id, name, surname, avatar_url FROM profiles WHERE id = ?")
        .bind(String(body.client_id))
        .first<Record<string, any>>();
      const row = await db.prepare("SELECT * FROM reviews WHERE id = ?").bind(id).first<Record<string, any>>();
      return json({ success: true, review: row ? { ...row, client: client || null } : null });
    }

    if (path === "/app/reviews" && request.method === "DELETE") {
      const id = url.searchParams.get("id") || "";
      if (!id) return json({ error: "id required" }, 400);
      await db.prepare("DELETE FROM reviews WHERE id = ?").bind(id).run();
      return json({ success: true });
    }

    // 11. Community Posts & Comments
    if (path === "/app/community" && request.method === "GET") {
      const id = url.searchParams.get("id");
      if (id) {
        if (!url.searchParams.get("noView")) {
          await db
            .prepare("UPDATE community_posts SET views_count = COALESCE(views_count, 0) + 1 WHERE id = ?")
            .bind(id)
            .run();
        }
        const post = await db.prepare("SELECT * FROM community_posts WHERE id = ?").bind(id).first<Record<string, any>>();
        if (!post) return json({ post: null, comments: [] });
        const author = await db
          .prepare("SELECT id, name, surname, avatar_url, role, email FROM profiles WHERE id = ?")
          .bind(post.user_id)
          .first<Record<string, any>>();
        const { results: commentRows } = await db
          .prepare("SELECT * FROM community_comments WHERE post_id = ? ORDER BY created_at ASC")
          .bind(id)
          .all<Record<string, any>>();
        const comments = [];
        for (const c of commentRows || []) {
          const ca = await db
            .prepare("SELECT id, name, surname, avatar_url, role FROM profiles WHERE id = ?")
            .bind(c.user_id)
            .first<Record<string, any>>();
          comments.push({ ...c, profiles: ca || null });
        }
        return json({
          post: { ...post, views_count: Number(post.views_count || 0), profiles: author || null },
          comments,
        });
      }

      const { results: posts } = await db
        .prepare("SELECT * FROM community_posts ORDER BY created_at DESC")
        .all<Record<string, any>>();
      const enriched = [];
      for (const p of posts || []) {
        const author = await db
          .prepare("SELECT id, name, surname, avatar_url, role FROM profiles WHERE id = ?")
          .bind(p.user_id)
          .first<Record<string, any>>();
        const { results: cRows } = await db
          .prepare("SELECT id FROM community_comments WHERE post_id = ?")
          .bind(p.id)
          .all<Record<string, any>>();
        enriched.push({
          ...p,
          views_count: Number(p.views_count || 0),
          profiles: author || null,
          community_comments: cRows || [],
        });
      }
      return json({ posts: enriched });
    }

    if (path === "/app/community" && request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as Record<string, any>;
      if (!body.user_id || !body.title?.trim()) return json({ error: "user_id and title required" }, 400);
      const id = `post-${crypto.randomUUID()}`;
      const createdAt = new Date().toISOString();
      await db
        .prepare("INSERT INTO community_posts (id, user_id, title, content, category, created_at) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(id, String(body.user_id), String(body.title).trim(), String(body.content || ""), String(body.category || "Ümumi"), createdAt)
        .run();
      const post = await db.prepare("SELECT * FROM community_posts WHERE id = ?").bind(id).first<Record<string, any>>();
      const author = await db
        .prepare("SELECT id, name, surname, avatar_url, role FROM profiles WHERE id = ?")
        .bind(String(body.user_id))
        .first<Record<string, any>>();
      return json({ success: true, post: post ? { ...post, profiles: author || null, community_comments: [] } : null });
    }

    if (path === "/app/community" && request.method === "DELETE") {
      const id = url.searchParams.get("id") || "";
      if (!id) return json({ error: "id required" }, 400);
      await db.prepare("DELETE FROM community_comments WHERE post_id = ?").bind(id).run();
      await db.prepare("DELETE FROM community_posts WHERE id = ?").bind(id).run();
      return json({ success: true });
    }

    if (path === "/app/community/comments" && request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as Record<string, any>;
      if (!body.post_id || !body.user_id || !body.content?.trim()) {
        return json({ error: "post_id, user_id and content required" }, 400);
      }
      const id = `comm-${crypto.randomUUID()}`;
      const createdAt = new Date().toISOString();
      await db
        .prepare("INSERT INTO community_comments (id, post_id, user_id, content, created_at) VALUES (?, ?, ?, ?, ?)")
        .bind(id, String(body.post_id), String(body.user_id), String(body.content).trim(), createdAt)
        .run();
      const comment = await db.prepare("SELECT * FROM community_comments WHERE id = ?").bind(id).first<Record<string, any>>();
      const author = await db
        .prepare("SELECT id, name, surname, avatar_url, role FROM profiles WHERE id = ?")
        .bind(String(body.user_id))
        .first<Record<string, any>>();
      return json({ success: true, comment: comment ? { ...comment, profiles: author || null } : null });
    }

    if (path === "/app/community/comments" && request.method === "DELETE") {
      const id = url.searchParams.get("id") || "";
      if (!id) return json({ error: "id required" }, 400);
      await db.prepare("DELETE FROM community_comments WHERE id = ?").bind(id).run();
      return json({ success: true });
    }

    // 12. Conversations & Messages (chat / petition / documents)
    if (path === "/app/conversations" && request.method === "GET") {
      const id = url.searchParams.get("id");
      const userId = url.searchParams.get("userId");
      if (id) {
        const conv = await db.prepare("SELECT * FROM conversations WHERE id = ?").bind(id).first();
        const { results: msgs } = await db
          .prepare("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC")
          .bind(id)
          .all();
        return json({ conversation: conv || null, messages: msgs || [] });
      }
      if (userId) {
        const { results } = await db
          .prepare("SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC, created_at DESC LIMIT 30")
          .bind(userId)
          .all();
        return json({ conversations: results || [] });
      }
      return json({ conversations: [] });
    }

    if (path === "/app/conversations" && request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as Record<string, any>;
      if (!body.user_id) return json({ error: "user_id required" }, 400);
      const id = `conv-${crypto.randomUUID()}`;
      const nowIso = new Date().toISOString();
      await db
        .prepare("INSERT INTO conversations (id, user_id, title, mode, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(id, String(body.user_id), String(body.title || "Yeni Söhbət"), String(body.mode || "chat"), nowIso, nowIso)
        .run();
      const conv = await db.prepare("SELECT * FROM conversations WHERE id = ?").bind(id).first();
      return json({ success: true, conversation: conv });
    }

    if (path === "/app/conversations" && request.method === "DELETE") {
      const id = url.searchParams.get("id") || "";
      if (!id) return json({ error: "id required" }, 400);
      await db.prepare("DELETE FROM messages WHERE conversation_id = ?").bind(id).run();
      await db.prepare("DELETE FROM conversations WHERE id = ?").bind(id).run();
      return json({ success: true });
    }

    if (path === "/app/conversations/messages" && request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as {
        conversation_id?: string;
        items?: Array<{ role: string; content: string }>;
      };
      if (!body.conversation_id || !Array.isArray(body.items) || body.items.length === 0) {
        return json({ error: "conversation_id and items required" }, 400);
      }
      const nowIso = new Date().toISOString();
      for (const item of body.items) {
        await db
          .prepare("INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)")
          .bind(`msg-${crypto.randomUUID()}`, body.conversation_id, String(item.role || "user"), String(item.content || ""), nowIso)
          .run();
      }
      await db.prepare("UPDATE conversations SET updated_at = ? WHERE id = ?").bind(nowIso, body.conversation_id).run();
      return json({ success: true });
    }

    return json({ error: "Not found" }, 404);
  } catch (err: any) {
    return json({ error: err?.message || "D1 error" }, 500);
  }
}
