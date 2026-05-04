const MODEL = "@cf/meta/llama-3.1-8b-instruct";

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
      model: MODEL,
      messages: body.messages ?? [],
      max_tokens: body.max_tokens ?? 2048,
      ...(body.response_format ? { response_format: body.response_format } : {}),
      ...(body.tools ? { tools: body.tools } : {}),
      ...(body.tool_choice ? { tool_choice: body.tool_choice } : {}),
    };

    const aiResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${MODEL}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    let aiData;
    try {
      aiData = await aiResponse.json();
    } catch {
      const errorText = await aiResponse.text();
      return json(
        {
          error: "Workers AI request failed",
          details: errorText || "Invalid upstream response",
        },
        aiResponse.status || 502,
        requestOrigin
      );
    }
    if (!aiResponse.ok || !aiData?.success) {
      return json(
        {
          error: "Workers AI request failed",
          details: aiData?.errors ?? aiData,
        },
        aiResponse.status || 500,
        requestOrigin
      );
    }

    const result = aiData.result ?? {};
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
      model: MODEL,
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
