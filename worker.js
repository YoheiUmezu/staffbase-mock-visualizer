const PRIMARY_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const FALLBACK_MODEL = "@cf/meta/llama-3.1-8b-instruct";

const ALLOWED_ORIGINS = new Set([
  "https://staffbase-mock-visualizer.pages.dev",
]);

const PREVIEW_ORIGIN_REGEX =
  /^https:\/\/[a-z0-9-]+\.staffbase-mock-visualizer\.pages\.dev$/i;

function resolveAllowedOrigin(origin) {
  if (!origin) return "*";
  if (ALLOWED_ORIGINS.has(origin) || PREVIEW_ORIGIN_REGEX.test(origin)) {
    return origin;
  }
  return "*";
}

function getCorsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": resolveAllowedOrigin(origin),
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Worker-Key",
    Vary: "Origin",
  };
}

function json(data, status = 200, origin = "") {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
      ...getCorsHeaders(origin),
    },
  });
}

export default {
  async fetch(request, env) {
    const requestOrigin = request.headers.get("origin") ?? "";

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: getCorsHeaders(requestOrigin),
      });
    }

    if (request.method !== "POST") {
      return json({ error: "Method Not Allowed" }, 405, requestOrigin);
    }

    const url = new URL(request.url);
    if (url.pathname !== "/chat/completions") {
      return json({ error: "Not Found" }, 404, requestOrigin);
    }

    const workerKey = request.headers.get("x-worker-key") ?? "";
    const authHeader = request.headers.get("authorization") ?? "";
    const expectedBearer = `Bearer ${env.WORKER_API_KEY ?? ""}`;
    const isAuthorized =
      !!env.WORKER_API_KEY &&
      (workerKey === env.WORKER_API_KEY || authHeader === expectedBearer);

    if (!isAuthorized) {
      return json({ error: "Unauthorized" }, 401, requestOrigin);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400, requestOrigin);
    }

    const payload = {
      model: PRIMARY_MODEL,
      messages: body.messages ?? [],
      max_tokens: body.max_tokens ?? 8192,
      ...(body.response_format ? { response_format: body.response_format } : {}),
      ...(body.tools ? { tools: body.tools } : {}),
      ...(body.tool_choice ? { tool_choice: body.tool_choice } : {}),
    };

    async function runModel(model) {
      const aiResponse = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${model}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...payload, model }),
        }
      );

      let aiData;
      try {
        aiData = await aiResponse.json();
      } catch {
        const errorText = await aiResponse.text();
        return {
          ok: false,
          status: aiResponse.status || 502,
          data: { error: "Workers AI request failed", details: errorText || "Invalid upstream response" },
          model,
        };
      }

      if (!aiResponse.ok || !aiData?.success) {
        return {
          ok: false,
          status: aiResponse.status || 500,
          data: { error: "Workers AI request failed", details: aiData?.errors ?? aiData },
          model,
        };
      }

      return { ok: true, status: 200, data: aiData, model };
    }

    let run = await runModel(PRIMARY_MODEL);
    if (!run.ok) {
      const details = run.data?.details;
      const detailsText = Array.isArray(details)
        ? JSON.stringify(details)
        : String(details ?? "");
      const modelMissing = run.status === 404 || detailsText.includes("does not exist");
      if (modelMissing) {
        run = await runModel(FALLBACK_MODEL);
      }
    }

    if (!run.ok) {
      return json(run.data, run.status, requestOrigin);
    }

    const result = run.data.result ?? {};
    const text = (() => {
      if (typeof result.response === "string") return result.response;
      if (typeof result.output_text === "string") return result.output_text;
      if (result.response && typeof result.response === "object") {
        return JSON.stringify(result.response);
      }
      return "";
    })();

    // Return OpenAI-like response shape to keep existing server code unchanged.
    return json({
      id: crypto.randomUUID(),
      created: Math.floor(Date.now() / 1000),
      model: run.model,
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: text,
          },
          finish_reason: "stop",
        },
      ],
      usage: result.usage ?? undefined,
      raw: result,
    }, 200, requestOrigin);
  },
};
