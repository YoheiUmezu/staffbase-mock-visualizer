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
  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_API_TOKEN) {
    console.log(
      "[extractBrandFromUrl] skip: missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN"
    );
    return "";
  }

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

  const responseText = await response.text();
  console.log(`[extractBrandFromUrl] status=${response.status} url=${url}`);

  if (!response.ok) {
    console.log(
      "[extractBrandFromUrl] error body (trimmed):",
      responseText.slice(0, 2000)
    );
    return "";
  }

  let data: { success?: boolean; errors?: unknown; result?: { markdown?: string } };
  try {
    data = JSON.parse(responseText);
  } catch (e) {
    console.log("[extractBrandFromUrl] JSON parse error:", e);
    return "";
  }

  console.log(
    "[extractBrandFromUrl] API response summary:",
    JSON.stringify({
      success: data.success,
      errors: data.errors,
      markdownLength: data.result?.markdown?.length ?? 0,
    })
  );

  return data.result?.markdown ?? "";
}

async function extractCSSColors(
  url: string,
  env: {
    CLOUDFLARE_ACCOUNT_ID?: string;
    CLOUDFLARE_API_TOKEN?: string;
  }
) {
  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_API_TOKEN) {
    console.log(
      "[extractCSSColors] skip: missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN"
    );
    return [] as string[];
  }

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

  const responseText = await response.text();
  console.log(`[extractCSSColors] status=${response.status} url=${url}`);

  if (!response.ok) {
    console.log(
      "[extractCSSColors] error body (trimmed):",
      responseText.slice(0, 2000)
    );
    return [] as string[];
  }

  let data: { success?: boolean; errors?: unknown; result?: { content?: string } };
  try {
    data = JSON.parse(responseText);
  } catch (e) {
    console.log("[extractCSSColors] JSON parse error:", e);
    return [] as string[];
  }

  const html = data.result?.content ?? "";
  console.log(
    "[extractCSSColors] API response summary:",
    JSON.stringify({
      success: data.success,
      errors: data.errors,
      contentLength: html.length,
    })
  );

  const colorMatches =
    html.match(/#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})\b|rgb\(\d+,\s*\d+,\s*\d+\)/g) ?? [];
  const unique = [...new Set(colorMatches)].slice(0, 10);
  console.log("[extractCSSColors] parsed colors:", unique);
  return unique;
}

/** When Browser Rendering returns no hex/rgb, fall back to brand extraction colors for prompts. */
function colorsForPrompt(
  extracted: string[],
  brand: z.infer<typeof brandDataSchema>
): string[] {
  if (extracted.length > 0) return extracted;
  return [
    brand.primaryColor,
    brand.secondaryColor,
    brand.accentColor,
    brand.backgroundColor,
    brand.textColor,
  ].filter((c) => typeof c === "string" && c.length > 0);
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
      const url = input.websiteUrl;
      const [markdown, colors] = await Promise.all([
        extractBrandFromUrl(url, ctx.env),
        extractCSSColors(url, ctx.env),
      ]);

      console.log("取得したカラー:", colors);
      console.log("取得したMarkdown長:", markdown.length);

      const promptColors = colorsForPrompt(colors, input.brandData);
      if (colors.length === 0 && promptColors.length > 0) {
        console.log(
          "[generateMock] 抽出カラーが空のため brandData をプロンプト用に使用:",
          promptColors
        );
      }

      const { extractedContent } = await invokeProxyLLM(ctx.env, [
        {
          role: "system",
          content:
            systemContext +
            "\n\n## 今回のタスク\n" +
            "以下のブランド情報を元に、SKILL.mdとテンプレートの" +
            "指示に従って高品質なStaffbase UIモックアップHTMLを" +
            "生成してください。\n" +
            `実際のページカラー（抽出またはフォールバック）：${promptColors.join(", ")}\n` +
            `ページコンテンツ：${markdown.slice(0, 2000)}`,
        },
        {
          role: "user",
          content: `
URL：${url}
取得したブランドカラー：${colors.length > 0 ? colors.join(", ") : "未取得（URLから推測してください）"}

## 必須の出力要件
以下のセクションをすべて含む完全なHTMLを生成してください：

1. ヘッダー（ロゴ・ナビゲーションメニュー5項目）
2. ヒーローセクション（大きな見出し・サブテキスト・CTAボタン）
3. 特徴セクション（3カラムのカード）
4. コンテンツセクション（画像プレースホルダー＋テキスト）
5. フッター（リンク・コピーライト）

## カラー指定
- プライマリカラー：取得カラーの中で最も目立つ色を使用
- ヘッダー・CTAボタン・アクセントにプライマリカラーを使用
- 背景は白またはライトグレー

## Staffbase UI要件
- Staffbaseのナビゲーション構造に準拠
- モバイルはハンバーガーメニュー表示
- フォントはsans-serif
- カードには影（box-shadow）を付ける

必ず上記5セクションをすべて含めてください。

## HTML構造（厳守）
1. 必ず<!DOCTYPE html>から始める
2. すべてのCSSは<head>内の<style>のみ。本文中やタグ外にCSSを書かない
3. コードブロック(\`\`\`html)で囲まない。説明文を付けない。HTMLのみを出力
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
