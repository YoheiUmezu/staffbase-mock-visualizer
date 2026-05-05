import { z } from "zod";
import { systemContext } from "./docs-loader";
import { publicProcedure, router } from "./router";

const brandExtractionSchema = z.object({
  companyName: z.string().min(1),
  websiteUrl: z.string().url(),
  industry: z.string().optional(),
  brandTone: z.string().optional(),
});

const brandDataSchema = z.object({
  primaryColor: z.string(),
  secondaryColor: z.string(),
  accentColor: z.string(),
  backgroundColor: z.string(),
  textColor: z.string(),
  fontStyle: z.string(),
  logoText: z.string(),
  industry: z.string(),
  brandTone: z.string(),
  tagline: z.string(),
});

const mockGenerationSchema = z.object({
  companyName: z.string(),
  websiteUrl: z.string().url(),
  brandData: brandDataSchema,
});

type Message = { role: "system" | "user" | "assistant"; content: string };

type LlmProxyResponse = {
  choices?: Array<{ message?: { content?: unknown } }>;
  raw?: unknown;
};

function extractJsonObjectText(content: string): string {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start >= 0 && end > start) return candidate.slice(start, end + 1);
  return candidate;
}

function extractHtmlDocument(content: string): string {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:html)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  const lower = candidate.toLowerCase();
  const doctypeIdx = lower.indexOf("<!doctype");
  const htmlIdx = lower.indexOf("<html");
  const start =
    doctypeIdx >= 0 ? doctypeIdx : htmlIdx >= 0 ? htmlIdx : -1;
  if (start < 0) return "";
  return candidate.slice(start).trim();
}

/** Reject HTML when there is no stylesheet source inside <head> (avoids raw CSS leaked into body). */
function assertHeadContainsCss(html: string) {
  const lower = html.toLowerCase();
  const headOpen = lower.indexOf("<head");
  const headClose = lower.indexOf("</head>");
  if (headOpen === -1 || headClose === -1 || headClose <= headOpen) {
    throw new Error("CSS not found in HTML");
  }
  const headHtml = html.slice(headOpen, headClose);
  const hasStyle = /<style[\s>]/i.test(headHtml);
  const hasLink = /<link[^>]*rel\s*=\s*["']?stylesheet["']?/i.test(headHtml);
  if (!hasStyle && !hasLink) {
    throw new Error("CSS not found in HTML");
  }
}

function ensureInlineCss(html: string, brand: {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
}) {
  let output = html;
  // Remove external stylesheet links that can break in generated mock.
  output = output.replace(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi, "");

  if (/<style[\s\S]*?>[\s\S]*?<\/style>/i.test(output)) {
    return output;
  }

  const fallbackStyle = `
<style>
  :root {
    --primary: ${brand.primaryColor};
    --secondary: ${brand.secondaryColor};
    --accent: ${brand.accentColor};
    --bg: ${brand.backgroundColor};
    --text: ${brand.textColor};
  }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: var(--bg); color: var(--text); }
  header { background: var(--primary); color: #fff; padding: 16px 24px; }
  nav ul { margin: 0; padding: 0; list-style: none; display: flex; gap: 16px; }
  nav a { color: inherit; text-decoration: none; font-weight: 600; }
  main { padding: 24px; display: grid; gap: 16px; }
  section { background: #fff; border: 1px solid color-mix(in srgb, var(--secondary) 25%, #fff); border-radius: 12px; padding: 16px; }
  .cta, button { background: var(--accent); color: #fff; border: none; border-radius: 8px; padding: 8px 12px; }
</style>`;

  if (/<head[^>]*>/i.test(output)) {
    output = output.replace(/<head[^>]*>/i, match => `${match}\n${fallbackStyle}`);
  } else {
    output = `${fallbackStyle}\n${output}`;
  }
  return output;
}

async function invokeProxyLLM(ctxEnv: {
  CLOUDFLARE_AI_PROXY_URL?: string;
  CLOUDFLARE_AI_PROXY_KEY?: string;
}, messages: Message[]) {
  const url = ctxEnv.CLOUDFLARE_AI_PROXY_URL;
  const key = ctxEnv.CLOUDFLARE_AI_PROXY_KEY;
  if (!url || !key) {
    throw new Error("Pages env vars are missing: CLOUDFLARE_AI_PROXY_URL/CLOUDFLARE_AI_PROXY_KEY");
  }

  const response = await fetch(`${url.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-worker-key": key,
    },
    body: JSON.stringify({
      model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      messages,
      max_tokens: 8192,
    }),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`LLM invoke failed: ${response.status} ${response.statusText} - ${text}`);
  }

  const parsed = JSON.parse(text) as LlmProxyResponse;
  const extractedContent = String(parsed.choices?.[0]?.message?.content ?? "");

  // Temporary production debug logs for response-shape investigation.
  console.log("LLM raw response:", JSON.stringify(parsed));
  console.log("Extracted content:", extractedContent);

  return { llmResponse: parsed, extractedContent };
}

async function extractBrandFromUrl(
  url: string,
  env: {
    CLOUDFLARE_ACCOUNT_ID?: string;
    CLOUDFLARE_API_TOKEN?: string;
  }
) {
  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_API_TOKEN) return "";

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/browser-rendering/markdown`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    }
  );

  if (!response.ok) return "";
  const data = (await response.json()) as { result?: { markdown?: string } };
  return data.result?.markdown ?? "";
}

async function extractCSSColors(
  url: string,
  env: {
    CLOUDFLARE_ACCOUNT_ID?: string;
    CLOUDFLARE_API_TOKEN?: string;
  }
) {
  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_API_TOKEN) return [] as string[];

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/browser-rendering/content`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    }
  );

  if (!response.ok) return [] as string[];
  const data = (await response.json()) as { result?: { content?: string } };
  const html = data.result?.content ?? "";
  const colorMatches =
    html.match(/#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})\b|rgb\(\d+,\s*\d+,\s*\d+\)/g) ?? [];
  return [...new Set(colorMatches)].slice(0, 10);
}

export const mockRouter = router({
  extractBrand: publicProcedure
    .input(brandExtractionSchema)
    .mutation(async ({ input, ctx }) => {
      const prompt = `Analyze ${input.companyName} (${input.websiteUrl}) and return JSON with keys:
primaryColor, secondaryColor, accentColor, backgroundColor, textColor, fontStyle, logoText, industry, brandTone, tagline.
Use hex colors where applicable. Return JSON only.`;

      const { extractedContent } = await invokeProxyLLM(ctx.env, [
        {
          role: "system",
          content:
            "You are a precise brand analyst. Return valid JSON only without markdown.",
        },
        { role: "user", content: prompt },
      ]);

      const parsed = JSON.parse(extractJsonObjectText(extractedContent || "{}"));
      if (input.industry) parsed.industry = input.industry;
      if (input.brandTone) parsed.brandTone = input.brandTone;
      return brandDataSchema.parse(parsed);
    }),

  generateMock: publicProcedure
    .input(mockGenerationSchema)
    .mutation(async ({ input, ctx }) => {
      const [markdown, colors] = await Promise.all([
        extractBrandFromUrl(input.websiteUrl, ctx.env),
        extractCSSColors(input.websiteUrl, ctx.env),
      ]);

      const { extractedContent } = await invokeProxyLLM(ctx.env, [
        {
          role: "system",
          content:
            systemContext +
            "\n\n## 今回のタスク\n" +
            "以下のブランド情報を元に、SKILL.mdとテンプレートの" +
            "指示に従って高品質なStaffbase UIモックアップHTMLを" +
            "生成してください。\n" +
            `実際のページカラー：${colors.join(", ")}\n` +
            `ページコンテンツ：${markdown.slice(0, 2000)}`,
        },
        {
          role: "user",
          content: `
以下の条件で完全なHTMLファイルを生成してください。

URL：${input.websiteUrl}
ブランドカラー：${colors.join(", ")}

## 絶対に守るルール
1. 必ず<!DOCTYPE html>から始めること
2. CSSは必ず<head>内の<style>タグに記述すること
3. CSSをHTMLの外や本文中に書かないこと
4. 以下の形式を厳守すること：

<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ブランド名 Staffbase UI</title>
  <style>
    /* ここにCSSを書く */
    :root {
      --color-primary: #000000;
    }
    body { ... }
    .header { ... }
  </style>
</head>
<body>
  <!-- ここにHTMLを書く -->
  <header class="header">...</header>
  <main>...</main>
  <footer>...</footer>
</body>
</html>

5. この形式以外での出力は禁止
6. コードブロック(\`\`\`html)で囲まないこと
7. 説明文を含めないこと
8. HTMLのみを出力すること
`,
        },
      ]);

      const cleaned = extractHtmlDocument(extractedContent);
      if (!cleaned) {
        throw new Error("LLM returned invalid HTML");
      }

      assertHeadContainsCss(cleaned);

      const styled = ensureInlineCss(cleaned, input.brandData);
      return { html: styled };
    }),

  generateImagePrompt: publicProcedure
    .input(
      z.object({
        companyName: z.string(),
        websiteUrl: z.string(),
        brandData: brandDataSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const prompt = `Create a Japanese Stable Diffusion prompt for ${input.companyName}'s intranet hero image.
Include sections ①レイアウト ②ブランド ③ビジュアル ④品質 in Japanese.`;

      const { extractedContent } = await invokeProxyLLM(ctx.env, [
        {
          role: "system",
          content:
            "You are an AI image prompting specialist. Return only usable prompt text.",
        },
        { role: "user", content: prompt },
      ]);

      if (!extractedContent) throw new Error("No response from LLM");
      return { prompt: extractedContent.trim() };
    }),
});
