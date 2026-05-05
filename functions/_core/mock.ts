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
          content:
            `企業名: ${input.companyName}\n` +
            `フォールバックのブランドカラー: ${input.brandData.primaryColor}, ${input.brandData.secondaryColor}, ${input.brandData.accentColor}\n` +
            "抽出されたページカラーを優先し、<!DOCTYPE html> または <html> で始まる生のHTMLのみを返してください。マークダウンのコードフェンスは使わないでください。\n" +
            "外部CSSは参照せず、<head>内の<style>にすべてのCSSを含めてください。",
        },
      ]);

      const cleaned = extractHtmlDocument(extractedContent);
      if (!cleaned) {
        throw new Error("LLM returned invalid HTML");
      }

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
