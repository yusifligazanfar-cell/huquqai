import fs from "fs";
import os from "os";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export type LlmProviderName =
  | "muse-http"
  | "muse-cli"
  | "nvidia"
  | "gemini"
  | "groq"
  | "cerebras"
  | "sambanova"
  | "mistral"
  | "openrouter"
  | "huggingface"
  | "together"
  | "fireworks"
  | "deepinfra"
  | "custom"
  | "ollama"
  | "openai";

export interface LlmCompletionOptions {
  messages: LlmMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormatJson?: boolean;
  /** Optional JSON Schema passed to `muse exec --output-schema` when using local Muse CLI. */
  jsonSchema?: Record<string, unknown>;
  /** Explicit API key override (e.g. from client settings modal). */
  apiKeyParam?: string;
  /** Preferred provider order override; otherwise auto-detected from environment. */
  preferredProviders?: LlmProviderName[];
  /** Timeout per provider attempt in milliseconds. */
  timeoutMs?: number;
}

export interface LlmCompletionResult {
  content: string;
  provider: LlmProviderName;
  model: string;
  attempts: string[];
}

function cleanEnvKey(val?: string | null): string {
  const s = (val ?? "").trim();
  if (!s || s === "undefined" || s === "null" || s.startsWith("your_")) return "";
  return s;
}

function resolveMuseBinary(): string | null {
  const candidates = [
    process.env.MUSE_BIN || "",
    path.join(os.homedir(), ".local", "bin", "muse"),
    "/usr/local/bin/muse",
    "/opt/homebrew/bin/muse",
  ].filter(Boolean);

  for (const binPath of candidates) {
    try {
      if (fs.existsSync(binPath)) {
        return binPath;
      }
    } catch {
      // continue
    }
  }
  return null;
}

/**
 * Formats conversation messages into a clean single prompt for `muse exec`.
 */
function formatMessagesForMuseCli(messages: LlmMessage[], requireJson: boolean): string {
  const systemParts: string[] = [];
  const dialogParts: string[] = [];

  for (const m of messages) {
    if (m.role === "system") {
      systemParts.push(m.content);
    } else if (m.role === "assistant") {
      dialogParts.push(`[KÖMƏKÇİ]: ${m.content}`);
    } else {
      dialogParts.push(`[İSTİFADƏÇİ]: ${m.content}`);
    }
  }

  let out = "";
  if (systemParts.length > 0) {
    out += `<SYSTEM_INSTRUCTIONS>\n${systemParts.join("\n\n")}\n</SYSTEM_INSTRUCTIONS>\n\n`;
  }
  out += dialogParts.join("\n\n");
  if (requireJson) {
    out += "\n\nYalnız göstərilən JSON obyektini qaytarın (əlavə izah və ya markdown olmadan).";
  }
  return out;
}

function parseMuseJsonlOutput(stdout: string): { text: string; error?: string } {
  const lines = stdout
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let terminalText = "";
  let deltaAccum = "";
  let terminalError = "";

  for (const line of lines) {
    if (!line.startsWith("{")) continue;
    try {
      const ev = JSON.parse(line) as {
        payload_type?: string;
        payload?: {
          kind?: string;
          terminal?: string;
          text?: string | null;
          reason?: string | null;
          delta?: string;
          content?: string;
        };
      };

      const p = ev.payload;
      if (!p) continue;

      if (ev.payload_type === "run.terminal.completed" || p.terminal === "completed") {
        if (typeof p.text === "string" && p.text.trim()) {
          terminalText = p.text;
        }
      } else if (ev.payload_type === "run.terminal.failed" || p.terminal === "failed") {
        terminalError = p.reason || p.text || "Muse execution failed";
      } else if (typeof p.delta === "string") {
        deltaAccum += p.delta;
      } else if (typeof p.text === "string" && !terminalText) {
        deltaAccum += p.text;
      }
    } catch {
      // ignore non-JSON progress lines
    }
  }

  if (terminalText) return { text: terminalText };
  if (deltaAccum.trim()) return { text: deltaAccum.trim() };
  return { text: "", error: terminalError || "Empty output from muse CLI" };
}

async function callOpenAiCompatibleEndpoint(params: {
  url: string;
  apiKey: string;
  model: string;
  messages: LlmMessage[];
  temperature: number;
  maxTokens: number;
  responseFormatJson: boolean;
  omitResponseFormatJson?: boolean;
  extraHeaders?: Record<string, string>;
  extraBody?: Record<string, unknown>;
  timeoutMs: number;
}): Promise<string> {
  const bodyPayload: Record<string, unknown> = {
    model: params.model,
    messages: params.messages,
    temperature: params.temperature,
    max_tokens: params.maxTokens,
    ...(params.extraBody ?? {}),
  };
  if (params.responseFormatJson && !params.omitResponseFormatJson) {
    bodyPayload.response_format = { type: "json_object" };
  }

  const maxAttempts = 2;
  let lastErr: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), params.timeoutMs);

    try {
      const response = await fetch(params.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${params.apiKey}`,
          ...(params.extraHeaders ?? {}),
        },
        body: JSON.stringify(bodyPayload),
        signal: controller.signal,
      });

      const rawText = await response.text();
      if (!response.ok) {
        // Do not retry hard billing/auth errors
        const isHardFail =
          response.status === 401 ||
          response.status === 403 ||
          rawText.includes("insufficient_quota") ||
          rawText.includes("credit_balance_exhausted") ||
          rawText.includes("billing");
        lastErr = new Error(`HTTP ${response.status}: ${rawText.slice(0, 300)}`);
        if (isHardFail) {
          throw lastErr;
        }
        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, 800 * attempt));
          continue;
        }
        throw lastErr;
      }

      const data = JSON.parse(rawText) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data?.choices?.[0]?.message?.content;
      if (!content || !content.trim()) {
        throw new Error("Empty choice content returned from API");
      }
      return content;
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      const msg = lastErr.message.toLowerCase();
      if (msg.includes("credit_balance_exhausted") || msg.includes("insufficient_quota") || msg.includes("http 401")) {
        throw lastErr;
      }
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 600 * attempt));
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastErr ?? new Error("API request failed");
}

async function callMuseCli(options: LlmCompletionOptions): Promise<{ content: string; model: string }> {
  const museBin = resolveMuseBinary();
  if (!museBin) {
    throw new Error("muse binary not installed (~/.local/bin/muse)");
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "huquqai-muse-"));
  const promptFile = path.join(tmpDir, "prompt.txt");
  const schemaFile = path.join(tmpDir, "schema.json");

  try {
    const promptText = formatMessagesForMuseCli(options.messages, Boolean(options.responseFormatJson));
    fs.writeFileSync(promptFile, promptText, "utf-8");

    const explicitModel = cleanEnvKey(process.env.MUSE_MODEL) || cleanEnvKey(process.env.META_MODEL);
    const cliProvider = cleanEnvKey(process.env.MUSE_CLI_PROVIDER);
    const modelLabel = cliProvider
      ? `muse:${cliProvider}${explicitModel ? `/${explicitModel}` : ""}`
      : explicitModel || "muse-wonder (cli)";

    const args: string[] = [
      "exec",
      "--workspace", os.tmpdir(),
      "--preset", "empty",
      "--max-model-steps", "1",
      "--no-session-log",
      "--disable-web-tools",
      "--disable-reminders",
      "--disable-request-user-input",
      "--disable-write",
      "--disable-shell",
      "--no-foreign-personal-context",
      "--json",
      "--prompt-file", promptFile,
    ];

    if (process.env.MUSE_REASONING_EFFORT && cliProvider !== "echo") {
      args.push("--reasoning-effort", process.env.MUSE_REASONING_EFFORT);
    }

    if (cliProvider) {
      args.push("--provider", cliProvider);
    }
    if (explicitModel && cliProvider !== "echo") {
      args.push("--model", explicitModel);
    }

    if (options.jsonSchema) {
      fs.writeFileSync(schemaFile, JSON.stringify(options.jsonSchema), "utf-8");
      args.push("--output-schema", schemaFile);
    }

    let stdout = "";
    let stderr = "";
    let execFailureMsg = "";
    try {
      const execRes = await execFileAsync(museBin, args, {
        timeout: options.timeoutMs ?? 90000,
        maxBuffer: 8 * 1024 * 1024,
        env: {
          ...process.env,
          NO_COLOR: "1",
        },
      });
      stdout = execRes.stdout || "";
      stderr = execRes.stderr || "";
    } catch (execErr: unknown) {
      const errObj = execErr as { stdout?: string; stderr?: string; message?: string };
      stdout = errObj?.stdout || "";
      stderr = errObj?.stderr || "";
      execFailureMsg = errObj?.message || "muse exec failed";
    }

    const parsed = parseMuseJsonlOutput(stdout);
    if (parsed.text) {
      return { content: parsed.text, model: modelLabel };
    }

    const rawDetail = parsed.error || stderr.trim() || execFailureMsg || "muse exec returned no text";
    const lowerDetail = `${parsed.error || ""} ${stderr} ${execFailureMsg}`.toLowerCase();
    if (
      lowerDetail.includes("not logged in") ||
      lowerDetail.includes("missing meta credentials") ||
      lowerDetail.includes("login did not complete")
    ) {
      throw new Error("Meta Muse hesabı aktiv deyil (terminalda 'muse login' edin və ya META_API_KEY əlavə edin)");
    }
    throw new Error(rawDetail);
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup error
    }
  }
}

function hasMuseAuthFile(): boolean {
  try {
    return fs.existsSync(path.join(os.homedir(), ".config", "muse", "auth.json"));
  } catch {
    return false;
  }
}

async function resolveOllamaConfig(): Promise<{ url: string; model: string } | null> {
  const baseUrl = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
  const configured = cleanEnvKey(process.env.OLLAMA_MODEL);
  if (configured) {
    return { url: `${baseUrl}/v1/chat/completions`, model: configured };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 700);
  try {
    const res = await fetch(`${baseUrl}/api/tags`, { signal: controller.signal });
    if (!res.ok) return null;
    const data = (await res.json()) as { models?: Array<{ name?: string }> };
    const firstModel = data?.models?.find((m) => m?.name)?.name;
    return firstModel ? { url: `${baseUrl}/v1/chat/completions`, model: firstModel } : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function detectApiKeyProvider(key: string): Exclude<LlmProviderName, "muse-cli" | "ollama"> | null {
  if (!key) return null;
  if (key.startsWith("nvapi-")) return "nvidia";
  if (key.startsWith("AIza")) return "gemini";
  if (key.startsWith("gsk_")) return "groq";
  if (key.startsWith("csk-")) return "cerebras";
  if (key.startsWith("hf_")) return "huggingface";
  if (key.startsWith("fw_")) return "fireworks";
  if (key.startsWith("tgp_v1_")) return "together";
  if (key.startsWith("sk-or-")) return "openrouter";
  if (key.startsWith("meta") || key.startsWith("muse")) return "muse-http";
  if (key.startsWith("sk-")) return "openai";
  return null;
}

/**
 * Generates an LLM completion across Meta Muse, NVIDIA NIM, Google Gemini, Groq, Cerebras,
 * SambaNova, Mistral, OpenRouter, Hugging Face, Together, Fireworks, DeepInfra, custom endpoints,
 * local Ollama, and OpenAI with automatic failover and diagnostics.
 */
export async function generateLlmCompletion(
  options: LlmCompletionOptions
): Promise<LlmCompletionResult> {
  const temperature = options.temperature ?? 0.2;
  const maxTokens = options.maxTokens ?? 4096;
  const responseFormatJson = options.responseFormatJson ?? false;
  const timeoutMs = options.timeoutMs ?? 90000;

  const passedKey = cleanEnvKey(options.apiKeyParam);
  const passedProvider = detectApiKeyProvider(passedKey);

  const keyFor = (
    name: Exclude<LlmProviderName, "muse-cli" | "ollama">,
    ...envVars: Array<string | undefined>
  ): string => {
    if (passedProvider === name) return passedKey;
    for (const v of envVars) {
      const cleaned = cleanEnvKey(v);
      if (cleaned) return cleaned;
    }
    return "";
  };

  const compatProviders: Record<
    Exclude<LlmProviderName, "muse-cli" | "ollama">,
    {
      url: string;
      apiKey: string;
      model: string;
      missingMsg: string;
      omitResponseFormatJson?: boolean;
      extraHeaders?: Record<string, string>;
      extraBody?: Record<string, unknown>;
    }
  > = {
    "muse-http": {
      url: `${(process.env.META_API_BASE_URL || "https://api.meta.ai/v1").replace(/\/$/, "")}/chat/completions`,
      apiKey: keyFor("muse-http", process.env.MODEL_API_KEY, process.env.META_API_KEY, process.env.MUSE_API_KEY),
      model: cleanEnvKey(process.env.MUSE_MODEL) || cleanEnvKey(process.env.META_MODEL) || "muse-wonder",
      missingMsg: "no MODEL_API_KEY/META_API_KEY",
    },
    nvidia: {
      url: `${(process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1").replace(/\/$/, "")}/chat/completions`,
      apiKey: keyFor("nvidia", process.env.NVIDIA_API_KEY),
      model: cleanEnvKey(process.env.NVIDIA_MODEL) || "meta/llama-3.3-70b-instruct",
      missingMsg: "no NVIDIA_API_KEY",
      omitResponseFormatJson: true,
      ...(options.jsonSchema ? { extraBody: { nvext: { guided_json: options.jsonSchema } } } : {}),
    },
    gemini: {
      url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      apiKey: keyFor("gemini", process.env.GEMINI_API_KEY, process.env.GOOGLE_API_KEY),
      model: cleanEnvKey(process.env.GEMINI_MODEL) || "gemini-2.5-flash",
      missingMsg: "no GEMINI_API_KEY/GOOGLE_API_KEY",
    },
    groq: {
      url: "https://api.groq.com/openai/v1/chat/completions",
      apiKey: keyFor("groq", process.env.GROQ_API_KEY),
      model: cleanEnvKey(process.env.GROQ_MODEL) || "llama-3.3-70b-versatile",
      missingMsg: "no GROQ_API_KEY",
    },
    cerebras: {
      url: "https://api.cerebras.ai/v1/chat/completions",
      apiKey: keyFor("cerebras", process.env.CEREBRAS_API_KEY),
      model: cleanEnvKey(process.env.CEREBRAS_MODEL) || "gpt-oss-120b",
      missingMsg: "no CEREBRAS_API_KEY",
    },
    sambanova: {
      url: "https://api.sambanova.ai/v1/chat/completions",
      apiKey: keyFor("sambanova", process.env.SAMBANOVA_API_KEY),
      model: cleanEnvKey(process.env.SAMBANOVA_MODEL) || "Meta-Llama-3.3-70B-Instruct",
      missingMsg: "no SAMBANOVA_API_KEY",
    },
    mistral: {
      url: "https://api.mistral.ai/v1/chat/completions",
      apiKey: keyFor("mistral", process.env.MISTRAL_API_KEY),
      model: cleanEnvKey(process.env.MISTRAL_MODEL) || "mistral-small-latest",
      missingMsg: "no MISTRAL_API_KEY",
    },
    openrouter: {
      url: "https://openrouter.ai/api/v1/chat/completions",
      apiKey: keyFor("openrouter", process.env.OPENROUTER_API_KEY),
      model: cleanEnvKey(process.env.OPENROUTER_MODEL) || "meta-llama/llama-3.3-70b-instruct:free",
      missingMsg: "no OPENROUTER_API_KEY",
      extraHeaders: {
        "HTTP-Referer": "https://huquqai.az",
        "X-Title": "HuquqAI",
      },
    },
    huggingface: {
      url: "https://router.huggingface.co/v1/chat/completions",
      apiKey: keyFor("huggingface", process.env.HF_TOKEN, process.env.HUGGINGFACE_API_KEY),
      model: cleanEnvKey(process.env.HF_MODEL) || "meta-llama/Llama-3.3-70B-Instruct",
      missingMsg: "no HF_TOKEN/HUGGINGFACE_API_KEY",
    },
    together: {
      url: "https://api.together.xyz/v1/chat/completions",
      apiKey: keyFor("together", process.env.TOGETHER_API_KEY),
      model: cleanEnvKey(process.env.TOGETHER_MODEL) || "meta-llama/Llama-3.3-70B-Instruct-Turbo",
      missingMsg: "no TOGETHER_API_KEY",
    },
    fireworks: {
      url: "https://api.fireworks.ai/inference/v1/chat/completions",
      apiKey: keyFor("fireworks", process.env.FIREWORKS_API_KEY),
      model: cleanEnvKey(process.env.FIREWORKS_MODEL) || "accounts/fireworks/models/llama-v3p3-70b-instruct",
      missingMsg: "no FIREWORKS_API_KEY",
    },
    deepinfra: {
      url: "https://api.deepinfra.com/v1/openai/chat/completions",
      apiKey: keyFor("deepinfra", process.env.DEEPINFRA_API_KEY),
      model: cleanEnvKey(process.env.DEEPINFRA_MODEL) || "meta-llama/Llama-3.3-70B-Instruct",
      missingMsg: "no DEEPINFRA_API_KEY",
    },
    custom: {
      url: cleanEnvKey(process.env.CUSTOM_LLM_BASE_URL)
        ? `${cleanEnvKey(process.env.CUSTOM_LLM_BASE_URL).replace(/\/$/, "")}/chat/completions`
        : "",
      apiKey: keyFor("custom", process.env.CUSTOM_LLM_API_KEY),
      model: cleanEnvKey(process.env.CUSTOM_LLM_MODEL) || "default",
      missingMsg: "no CUSTOM_LLM_BASE_URL/CUSTOM_LLM_API_KEY",
    },
    openai: {
      url: "https://api.openai.com/v1/chat/completions",
      apiKey: keyFor("openai", process.env.OPENAI_API_KEY),
      model: cleanEnvKey(process.env.OPENAI_MODEL) || "gpt-4o-mini",
      missingMsg: "no OPENAI_API_KEY",
    },
  };

  const forcedProvider = cleanEnvKey(process.env.LLM_PROVIDER) as LlmProviderName | "";
  const hasMuseBin = resolveMuseBinary() !== null;
  const museLoggedIn = hasMuseBin && hasMuseAuthFile();

  const defaultOrder: LlmProviderName[] = [];
  const pushUnique = (p: LlmProviderName | null | undefined) => {
    if (p && !defaultOrder.includes(p)) defaultOrder.push(p);
  };

  const configuredCompatOrder: Array<Exclude<LlmProviderName, "muse-cli" | "ollama" | "openai">> = [
    "muse-http",
    "nvidia",
    "gemini",
    "groq",
    "cerebras",
    "sambanova",
    "mistral",
    "openrouter",
    "huggingface",
    "together",
    "fireworks",
    "deepinfra",
    "custom",
  ];

  if (passedProvider) pushUnique(passedProvider);
  if (forcedProvider) pushUnique(forcedProvider);
  for (const name of configuredCompatOrder) {
    const cfg = compatProviders[name];
    if (cfg.apiKey && cfg.url) pushUnique(name);
  }
  if (museLoggedIn) pushUnique("muse-cli");
  pushUnique("ollama");
  if (hasMuseBin) pushUnique("muse-cli");
  if (compatProviders.openai.apiKey) pushUnique("openai");

  const order = options.preferredProviders?.length ? options.preferredProviders : defaultOrder;
  const attempts: string[] = [];

  for (const provider of order) {
    try {
      if (provider === "muse-cli") {
        const res = await callMuseCli(options);
        attempts.push(`muse-cli: ok (${res.model})`);
        return { content: res.content, provider: "muse-cli", model: res.model, attempts };
      }

      if (provider === "ollama") {
        const ollama = await resolveOllamaConfig();
        if (!ollama) {
          attempts.push("ollama: skipped (Ollama işləmir və ya model yüklənməyib)");
          continue;
        }
        const content = await callOpenAiCompatibleEndpoint({
          url: ollama.url,
          apiKey: "ollama",
          model: ollama.model,
          messages: options.messages,
          temperature,
          maxTokens,
          responseFormatJson,
          timeoutMs,
        });
        attempts.push(`ollama: ok (${ollama.model})`);
        return { content, provider: "ollama", model: ollama.model, attempts };
      }

      const cfg = compatProviders[provider];
      if (!cfg.apiKey || !cfg.url) {
        attempts.push(`${provider}: skipped (${cfg.missingMsg})`);
        continue;
      }
      const callProvider = () =>
        callOpenAiCompatibleEndpoint({
          url: cfg.url,
          apiKey: cfg.apiKey,
          model: cfg.model,
          messages: options.messages,
          temperature,
          maxTokens,
          responseFormatJson,
          omitResponseFormatJson: cfg.omitResponseFormatJson,
          extraHeaders: cfg.extraHeaders,
          extraBody: cfg.extraBody,
          timeoutMs,
        });

      let content: string;
      try {
        content = await callProvider();
      } catch (firstErr) {
        const firstMsg = firstErr instanceof Error ? firstErr.message : String(firstErr);
        if (firstMsg.includes("HTTP 429") && /too_many_tokens|rate_limit|tokens per minute/i.test(firstMsg)) {
          await new Promise((r) => setTimeout(r, 2000));
          content = await callProvider();
        } else {
          throw firstErr;
        }
      }
      attempts.push(`${provider}: ok (${cfg.model})`);
      return { content, provider, model: cfg.model, attempts };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      attempts.push(`${provider}: ${msg}`);
    }
  }

  throw new Error(
    attempts.length > 0
      ? `Bütün LLM provayderləri uğursuz oldu: ${attempts.join(" | ")}`
      : "Heç bir aktiv LLM provayderi tapılmadı (Gemini / Groq / Cerebras / NVIDIA / SambaNova / Mistral / OpenRouter / Ollama)."
  );
}
