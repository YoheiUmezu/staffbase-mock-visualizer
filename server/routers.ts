import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const brandExtractionSchema = z.object({
  companyName: z.string().min(1),
  websiteUrl: z.string().url(),
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
  brandData: brandDataSchema,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Fetch the website HTML and extract color hints from inline styles,
 * CSS custom properties, and meta theme-color tags.
 * Returns a compact string of color candidates to feed the LLM.
 */
async function fetchBrandHints(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; BrandExtractor/1.0; +https://staffbase.com)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(timer);

    if (!res.ok) return "";
    const html = await res.text();

    // Collect color candidates from the raw HTML/CSS text
    const candidates: string[] = [];

    // 1. meta theme-color
    const themeMatch = html.match(/theme-color[^>]*content=["']([^"']+)/i);
    if (themeMatch?.[1]) candidates.push(`theme-color: ${themeMatch[1]}`);

    // 2. CSS custom properties (--primary, --brand, --color-primary, etc.)
    const cssVarRe =
      /--(primary|brand|main|accent|corporate|key|base|highlight|secondary)[^:]*:\s*(#[0-9a-fA-F]{3,8}|rgb[a]?\([^)]+\))/gi;
    let m: RegExpExecArray | null;
    while ((m = cssVarRe.exec(html)) !== null) {
      candidates.push(`${m[1]}: ${m[2]}`);
      if (candidates.length >= 20) break;
    }

    // 3. Hex colors appearing in style blocks / inline styles (most frequent first)
    const hexRe = /#([0-9a-fA-F]{6})\b/g;
    const hexCounts: Record<string, number> = {};
    while ((m = hexRe.exec(html)) !== null) {
      const hex = `#${m[1].toUpperCase()}`;
      // Skip near-white and near-black — they are rarely brand colors
      const r = parseInt(m[1].slice(0, 2), 16);
      const g = parseInt(m[1].slice(2, 4), 16);
      const b = parseInt(m[1].slice(4, 6), 16);
      const lum = (r + g + b) / 3;
      if (lum < 20 || lum > 235) continue;
      hexCounts[hex] = (hexCounts[hex] ?? 0) + 1;
    }
    const topHex = Object.entries(hexCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([hex, count]) => `${hex}(×${count})`);
    if (topHex.length) candidates.push(`frequent colors: ${topHex.join(", ")}`);

    return candidates.slice(0, 30).join(" | ");
  } catch {
    return "";
  }
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  mock: router({
    // ── Brand extraction ───────────────────────────────────────────────────
    extractBrand: publicProcedure
      .input(brandExtractionSchema)
      .mutation(async ({ input }) => {
        // Step 1: fetch real color hints from the website
        const brandHints = await fetchBrandHints(input.websiteUrl);

        const hintSection = brandHints
          ? `\n\nACTUAL COLOR DATA extracted from ${input.websiteUrl}:\n${brandHints}\n\nUse these extracted colors as the primary source of truth for primaryColor and secondaryColor. Prefer the most frequently occurring non-neutral hex color as primaryColor.`
          : `\n\nNote: Could not fetch the website. Use your knowledge of this brand's well-known corporate colors.`;

        const prompt = `You are a brand analyst. Analyze the company "${input.companyName}" with website "${input.websiteUrl}".${hintSection}

Determine:
1. primaryColor — the single most dominant corporate/brand color (hex). MUST come from the extracted data above if available.
2. secondaryColor — a complementary brand color (hex)
3. accentColor — highlight or CTA color (hex)
4. backgroundColor — typical page background (usually #FFFFFF or very light)
5. textColor — primary body text (usually dark, e.g. #1A1A1A or #333333)
6. fontStyle — one of: "sans-serif", "serif", "geometric", "humanist", "modern"
7. logoText — exact company name as shown in the logo
8. industry — concise Japanese industry label (例: "製造業", "金融サービス", "小売業", "テクノロジー", "医療・ヘルスケア", "エネルギー", "物流・運輸")
9. brandTone — one of: "professional", "innovative", "friendly", "premium", "energetic", "trustworthy"
10. tagline — a short, plausible Japanese intranet tagline for this company (max 10 characters, in Japanese)

Return ONLY valid JSON:
{
  "primaryColor": "#XXXXXX",
  "secondaryColor": "#XXXXXX",
  "accentColor": "#XXXXXX",
  "backgroundColor": "#XXXXXX",
  "textColor": "#XXXXXX",
  "fontStyle": "...",
  "logoText": "...",
  "industry": "...",
  "brandTone": "...",
  "tagline": "..."
}`;

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content:
                "You are a precise brand analyst. Always respond with valid JSON only, no markdown, no explanation. When actual color data is provided, you MUST use it to determine primaryColor accurately.",
            },
            { role: "user", content: prompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "brand_data",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  primaryColor: { type: "string" },
                  secondaryColor: { type: "string" },
                  accentColor: { type: "string" },
                  backgroundColor: { type: "string" },
                  textColor: { type: "string" },
                  fontStyle: { type: "string" },
                  logoText: { type: "string" },
                  industry: { type: "string" },
                  brandTone: { type: "string" },
                  tagline: { type: "string" },
                },
                required: [
                  "primaryColor",
                  "secondaryColor",
                  "accentColor",
                  "backgroundColor",
                  "textColor",
                  "fontStyle",
                  "logoText",
                  "industry",
                  "brandTone",
                  "tagline",
                ],
                additionalProperties: false,
              },
            },
          } as Parameters<typeof invokeLLM>[0]["response_format"],
        });

        const rawContent = response.choices[0]?.message?.content;
        const content = typeof rawContent === "string" ? rawContent : null;
        if (!content) throw new Error("No response from LLM");
        const parsed = JSON.parse(content);
        return brandDataSchema.parse(parsed);
      }),

    // ── Mock HTML generation ───────────────────────────────────────────────
    generateMock: publicProcedure
      .input(mockGenerationSchema)
      .mutation(async ({ input }) => {
        const { companyName, brandData } = input;
        const {
          primaryColor,
          secondaryColor,
          accentColor,
          backgroundColor,
          textColor,
          fontStyle,
          logoText,
          industry,
          brandTone,
          tagline,
        } = brandData;

        const fontFamily =
          fontStyle === "serif"
            ? "'Georgia', 'Times New Roman', serif"
            : fontStyle === "geometric"
              ? "'Futura', 'Century Gothic', 'Trebuchet MS', sans-serif"
              : fontStyle === "humanist"
                ? "'Gill Sans', 'Optima', 'Segoe UI', sans-serif"
                : fontStyle === "modern"
                  ? "'Helvetica Neue', 'Arial', sans-serif"
                  : "'Hiragino Sans', 'Noto Sans JP', 'Yu Gothic', 'Meiryo', sans-serif";

        const prompt = `あなたはエンタープライズ向けイントラネットUIの専門エンジニアです。「${companyName}」向けの、Staffbaseスタイルのイントラネットホーム画面を表す、完全な自己完結型HTMLファイルを生成してください。

【ブランド仕様】
- 企業名: ${companyName}
- 業界: ${industry}
- ブランドトーン: ${brandTone}
- ロゴテキスト: ${logoText}
- タグライン: 「${tagline}」
- プライマリーカラー: ${primaryColor}
- セカンダリーカラー: ${secondaryColor}
- アクセントカラー: ${accentColor}
- 背景色: ${backgroundColor}
- テキスト色: ${textColor}
- フォントファミリー: ${fontFamily}

【厳守事項】
1. 外部画像は一切使用禁止。<img>タグ、外部URLのbackground-imageは使わない。すべてのビジュアルはCSSシェイプ、インラインSVG、CSSグラデーション、Unicode文字のみで描画すること。
2. すべてのCSSは<style>タグ内にインラインで記述し、単一HTMLファイルとして完結させること。
3. デスクトップ（1280px）とモバイル（390px）の両方に対応するCSSメディアクエリを使用すること。
4. すべてのテキストコンテンツは日本語で記述すること（ナビゲーション、見出し、本文、ボタン、バッジ、日付など）。
5. 以下のセクションを含めること:
   a. 【トップナビゲーションバー】SVG/CSSロゴマーク＋企業名テキスト、ナビリンク（ホーム・ニュース・ナレッジ・社員・イベント）、ユーザーアバター（CSSサークル＋イニシャル）、通知ベルアイコン（SVG）
   b. 【ヒーローセクション】ブランドカラーのフルワイドグラデーションバナー、大きなウェルカム見出し（日本語）、タグライン、CTAボタン（日本語）
   c. 【ニュースフィード】3枚のニュースカード（カテゴリバッジ・タイトル・本文抜粋・日付・「続きを読む」リンク、すべて日本語）
   d. 【クイックリンク】4〜6個のアイコンタイル（SVGアイコン）：「人事ポータル」「ITヘルプ」「社内規程」「福利厚生」「社員名簿」「イベント」
   e. 【サイドバー（デスクトップのみ）】「マイプロフィール」ウィジェット（CSSアバター・氏名・役職・部署）、「直近のイベント」リスト（2〜3件）、「社内統計」（アニメーション付きプログレスバー）
   f. 【ボトムナビゲーション（モバイルのみ）】5タブ（ホーム・ニュース・検索・社員・プロフィール）、SVGアイコン付き
6. ブランドカラーを一貫して使用：プライマリーはナビ/ヒーロー、セカンダリーはカード/サイドバー、アクセントはCTA/バッジ/ハイライト。
7. タイポグラフィ：指定フォントファミリーを使用。見出しは太字、本文は通常ウェイト。
8. 細部へのこだわり：カードのホバー状態（translateY＋シャドウ）、スムーズなトランジション、繊細なグラデーション、プロフェッショナルな余白。
9. デザインは洗練されたエンタープライズ品質で、${companyName}のブランドらしさが伝わること。
10. ヒーローセクションに装飾的なSVG要素（抽象シェイプ、波形、幾何学模様）を最低1つ含めること。
11. モバイル表示（390px）では、ボトムナビゲーションを固定表示し、コンテンツが重ならないよう適切なpadding-bottomを設定すること。

出力: <!DOCTYPE html>から始まる完全なHTMLファイルのみを返すこと。マークダウンのコードフェンス不要、説明文不要。`;

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content:
                "あなたはプロのUIエンジニアです。完全な本番品質のHTML/CSSを生成してください。<!DOCTYPE html>から始まる生のHTMLのみを返してください。マークダウンのコードフェンスは不要です。",
            },
            { role: "user", content: prompt },
          ],
        });

        const rawHtml = response.choices[0]?.message?.content ?? "";
        const html = typeof rawHtml === "string" ? rawHtml : "";
        const cleaned = html
          .replace(/^```html\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim();

        if (
          !cleaned.toLowerCase().startsWith("<!doctype") &&
          !cleaned.toLowerCase().startsWith("<html")
        ) {
          throw new Error("LLM returned invalid HTML. Please try again.");
        }
        if (cleaned.length < 500) {
          throw new Error("Generated HTML is too short. Please try again.");
        }

        return { html: cleaned };
      }),

    // ── AI image prompt generation ─────────────────────────────────────────
    generateImagePrompt: publicProcedure
      .input(z.object({
        companyName: z.string(),
        websiteUrl: z.string(),
        brandData: brandDataSchema,
      }))
      .mutation(async ({ input }) => {
        const { companyName, websiteUrl, brandData } = input;
        const promptInstruction = `あなたはAI画像生成プロンプトの専門家です。以下の企業情報をもとに、他のAIツール（Midjourney、DALL-E、Stable Diffusionなど）で高品質な企業イントラネットUI画像を生成するための、詳細で具体的な日本語プロンプトを作成してください。

【企業情報】
- 企業名: ${companyName}
- 公式サイト: ${websiteUrl}
- 業界: ${brandData.industry}
- ブランドトーン: ${brandData.brandTone}
- プライマリーカラー: ${brandData.primaryColor}
- セカンダリーカラー: ${brandData.secondaryColor}
- アクセントカラー: ${brandData.accentColor}
- タグライン: ${brandData.tagline}

以下の固定プロンプトに続けて使える、企業固有の追加指示を作成してください。

固定プロンプト（先頭に付く）:
---
あなたは企業イントラネットUIデザインの専門家です。ユーザーから提供されるモック画像をベースに、本物の企業ロゴと適切な実写画像を組み込んで、完成度の高い企業イントラネット画像を作成します。
---

企業固有の追加指示として以下を含めてください:
1. ${companyName}の公式ロゴの特徴（色、形状、フォントスタイル）
2. ブランドカラーの具体的な使用指示（${brandData.primaryColor}をナビゲーションに、など）
3. 業界（${brandData.industry}）に適したニュース画像・バナー画像の内容指示
4. ヒーローバナーの背景画像の具体的な内容（業界・ブランドトーンに合わせて）
5. 全体的なデザインの雰囲気・トーン指示

出力形式: 日本語で、すぐにAIツールに貼り付けられる形式のプロンプトテキストのみを返してください。`;

        const response = await invokeLLM({
          messages: [
            {
              role: 'system',
              content: 'あなたはAI画像生成プロンプトの専門家です。指示に従い、すぐに使えるプロンプトテキストのみを返してください。',
            },
            { role: 'user', content: promptInstruction },
          ],
        });
        const rawContent = response.choices[0]?.message?.content;
        const content = typeof rawContent === 'string' ? rawContent : '';
        if (!content) throw new Error('No response from LLM');
        return { prompt: content.trim() };
      }),
  }),
});
export type AppRouter = typeof appRouter;
