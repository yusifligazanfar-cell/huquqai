import { handleAppDb, type AppDbEnv } from "./app_db";

export default {
  async fetch(request: Request, env: AppDbEnv): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ ok: true, db: "huquqai-app" }), {
        headers: { "Content-Type": "application/json" },
      });
    }
    return handleAppDb(request, env);
  },
};
