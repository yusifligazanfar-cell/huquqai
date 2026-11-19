const DEFAULT_DB_WORKER_URL = "https://huquqai-db.huquqai-rag.workers.dev"

export function getCloudflareDbUrl() {
  return (process.env.CLOUDFLARE_DB_URL || DEFAULT_DB_WORKER_URL).replace(/\/+$/, "")
}

export async function cfFetch<T = any>(
  path: string,
  init: RequestInit = {}
): Promise<{ ok: boolean; status: number; data: T }> {
  const url = `${getCloudflareDbUrl()}${path}`
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  }

  const res = await fetch(url, {
    ...init,
    headers,
    cache: "no-store",
  })

  const data = (await res.json().catch(() => ({}))) as T
  return { ok: res.ok, status: res.status, data }
}
