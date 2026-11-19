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
      const [profilesRes, consultationsRes, feedbacksRes, postsRes] = await Promise.all([
        db.prepare("SELECT * FROM profiles ORDER BY created_at DESC").all<Record<string, any>>(),
        db.prepare("SELECT * FROM consultations ORDER BY created_at DESC").all<Record<string, any>>(),
        db.prepare("SELECT * FROM feedbacks ORDER BY created_at DESC").all<Record<string, any>>(),
        db.prepare("SELECT * FROM community_posts ORDER BY created_at DESC").all<Record<string, any>>(),
      ]);

      const rawProfiles = profilesRes.results || [];
      const consultations = consultationsRes.results || [];
      const feedbacks = feedbacksRes.results || [];
      const posts = postsRes.results || [];

      const consByUser = new Map<string, number>();
      for (const c of consultations) {
        if (c.client_id) consByUser.set(c.client_id, (consByUser.get(c.client_id) || 0) + 1);
        if (c.lawyer_id) consByUser.set(c.lawyer_id, (consByUser.get(c.lawyer_id) || 0) + 1);
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
          conversations_count: 0,
          posts_count: postsByUser.get(hp.id) || 0,
        };
      });

      const lawyers = users.filter((u) => u.role === "lawyer");
      const citizens = users.filter((u) => u.role !== "lawyer");
      const verifiedLawyers = lawyers.filter((l) => l.is_verified).length;

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
          pendingLawyers: lawyers.length - verifiedLawyers,
          activeLast24h,
          activeLast7d,
          newUsersLast7d,
          totalConversations: 0,
          totalMessages: 0,
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

      if (action === "approve" || action === "reject") {
        await db
          .prepare("UPDATE profiles SET is_verified = ?, admin_note = ? WHERE id = ?")
          .bind(action === "approve" ? 1 : 0, String(body.note || ""), body.userId)
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

    // 9. Consultations (bookings)
    if (path === "/app/consultations" && request.method === "GET") {
      const lawyerId = url.searchParams.get("lawyerId");
      if (lawyerId) {
        const { results } = await db
          .prepare(
            "SELECT * FROM consultations WHERE lawyer_id = ? AND status IN ('Gözləyir', 'pending', 'Qəbul edildi') ORDER BY created_at DESC"
          )
          .bind(lawyerId)
          .all();
        return json({ consultations: results || [] });
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

    return json({ error: "Not found" }, 404);
  } catch (err: any) {
    return json({ error: err?.message || "D1 error" }, 500);
  }
}
