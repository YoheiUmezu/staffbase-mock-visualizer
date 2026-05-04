const MODEL = "@cf/meta/llama-3.1-8b-instruct";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
      ...corsHeaders,
    },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return json({ error: "Method Not Allowed" }, 405);
    }

    const url = new URL(request.url);
    if (url.pathname !== "/chat/completions") {
      return json({ error: "Not Found" }, 404);
    }

    const authHeader = request.headers.get("authorization") ?? "";
    const expected = `Bearer ${env.WORKER_API_KEY ?? ""}`;
    if (!env.WORKER_API_KEY || authHeader !== expected) {
      return json({ error: "Unauthorized" }, 401);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
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

    const aiData = await aiResponse.json();
    if (!aiResponse.ok || !aiData?.success) {
      return json(
        {
          error: "Workers AI request failed",
          details: aiData?.errors ?? aiData,
        },
        aiResponse.status || 500
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
    });
  },
};
