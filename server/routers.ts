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
async function fetchBrandHints(url: string): Promise<{ hints: string; navColor: string }> {
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
    if (!res.ok) return { hints: "", navColor: "" };
    const html = await res.text();
    const candidates: string[] = [];
    let navColor = "";

    // 1. meta theme-color
    const themeMatch = html.match(/theme-color[^>]*content=["']([^"']+)/i);
    if (themeMatch?.[1]) {
      candidates.push(`theme-color: ${themeMatch[1]}`);
      if (!navColor) navColor = themeMatch[1].trim();
    }

    // 2. Nav/header background color — look for background-color on nav/header elements
    // Pattern A: inline style on <nav> or <header> tags
    const navInlineRe = /<(?:nav|header)[^>]*style=["'][^"']*background(?:-color)?\s*:\s*(#[0-9a-fA-F]{6})/gi;
    let nm: RegExpExecArray | null;
    while ((nm = navInlineRe.exec(html)) !== null) {
      const hexVal = nm[1]!.toUpperCase();
      const rr = parseInt(hexVal.slice(1, 3), 16);
      const gg = parseInt(hexVal.slice(3, 5), 16);
      const bb = parseInt(hexVal.slice(5, 7), 16);
      const lum = (rr + gg + bb) / 3;
      if (lum >= 20 && lum <= 235) {
        if (!navColor) navColor = hexVal;
        candidates.push(`nav-background: ${hexVal}`);
        break;
      }
    }
    // Pattern B: CSS rules for nav/header selectors
    if (!navColor) {
      const navCssRe = /(?:nav|header|#header|\.header|\.nav|\.navbar|\.site-header|\.global-nav|\.top-nav|\.main-nav)[^{]*\{[^}]*background(?:-color)?\s*:\s*(#[0-9a-fA-F]{6})/gi;
      while ((nm = navCssRe.exec(html)) !== null) {
        const hexVal = nm[1]!.toUpperCase();
        const rr = parseInt(hexVal.slice(1, 3), 16);
        const gg = parseInt(hexVal.slice(3, 5), 16);
        const bb = parseInt(hexVal.slice(5, 7), 16);
        const lum = (rr + gg + bb) / 3;
        if (lum >= 20 && lum <= 235) {
          if (!navColor) navColor = hexVal;
          candidates.push(`nav-css-background: ${hexVal}`);
          break;
        }
      }
    }

    // 3. CSS custom properties (--primary, --brand, --color-primary, etc.)
    const cssVarRe =
      /--(primary|brand|main|accent|corporate|key|base|highlight|secondary)[^:]*:\s*(#[0-9a-fA-F]{3,8}|rgb[a]?\([^)]+\))/gi;
    let m: RegExpExecArray | null;
    while ((m = cssVarRe.exec(html)) !== null) {
      candidates.push(`${m[1]}: ${m[2]}`);
      if (!navColor && m[1] === "primary") navColor = m[2]!.trim();
      if (candidates.length >= 20) break;
    }

    // 4. Hex colors appearing in style blocks / inline styles (most frequent first)
    const hexRe = /#([0-9a-fA-F]{6})/g;
    const hexCounts: Record<string, number> = {};
    while ((m = hexRe.exec(html)) !== null) {
      const hex = `#${m[1].toUpperCase()}`;
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
    // If still no navColor, use the most frequent non-neutral color
    if (!navColor && topHex.length > 0) {
      navColor = topHex[0]!.split("(")[0]!;
    }
    return { hints: candidates.slice(0, 30).join(" | "), navColor };
  } catch {
    return { hints: "", navColor: "" };
  }
}


// ─── Post-processing: enforce widget rules ────────────────────────────────────
function postProcessMockHtml(html: string, brandData: {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;
  logoText?: string;
}): string {
  let processed = html;

  // Remove common profile/avatar widget patterns by class name
  const avatarClasses = ['user-profile', 'profile-widget', 'avatar-widget', 'user-card', 'employee-card', 'profile-summary'];
  for (const cls of avatarClasses) {
    // Remove <div class="...{cls}...">...</div> blocks (non-greedy, single-line safe)
    const openTag = new RegExp(`<div[^>]*class="[^"]*${cls}[^"]*"[^>]*>`, 'gi');
    let match: RegExpExecArray | null;
    while ((match = openTag.exec(processed)) !== null) {
      const start = match.index;
      let depth = 1;
      let pos = start + match[0].length;
      while (pos < processed.length && depth > 0) {
        const nextOpen = processed.indexOf('<div', pos);
        const nextClose = processed.indexOf('</div>', pos);
        if (nextClose === -1) break;
        if (nextOpen !== -1 && nextOpen < nextClose) {
          depth++;
          pos = nextOpen + 4;
        } else {
          depth--;
          pos = nextClose + 6;
        }
      }
      processed = processed.slice(0, start) + processed.slice(pos);
      openTag.lastIndex = start;
    }
  }

  // Inject 必読コンテンツ widget if not already present
  if (!processed.includes('必読')) {
    const widget = [
      '<div data-widget="hissoku" style="background:#fff;border-radius:12px;padding:16px;margin-bottom:16px;box-shadow:0 1px 4px rgba(0,0,0,0.08);">',
      `  <div style="font-size:13px;font-weight:700;color:${brandData.primaryColor};margin-bottom:12px;">必読コンテンツ</div>`,
      '  <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px;">',
      `    <li style="display:flex;align-items:flex-start;gap:8px;padding:8px;border-radius:8px;background:#f8f9fa;">`,
      `      <span style="background:${brandData.primaryColor};color:#fff;font-size:10px;padding:2px 6px;border-radius:4px;white-space:nowrap;">重要</span>`,
      `      <div><div style="font-size:12px;font-weight:600;color:${brandData.textColor};">2025年度 情報セキュリティ研修</div><div style="font-size:11px;color:#888;margin-top:2px;">期限: 2025年6月30日</div></div>`,
      '    </li>',
      `    <li style="display:flex;align-items:flex-start;gap:8px;padding:8px;border-radius:8px;background:#f8f9fa;">`,
      `      <span style="background:${brandData.accentColor};color:#fff;font-size:10px;padding:2px 6px;border-radius:4px;white-space:nowrap;">必読</span>`,
      `      <div><div style="font-size:12px;font-weight:600;color:${brandData.textColor};">行動規範・ハラスメント防止ガイドライン</div><div style="font-size:11px;color:#888;margin-top:2px;">期限: 2025年7月15日</div></div>`,
      '    </li>',
      `    <li style="display:flex;align-items:flex-start;gap:8px;padding:8px;border-radius:8px;background:#f8f9fa;">`,
      `      <span style="background:#6c757d;color:#fff;font-size:10px;padding:2px 6px;border-radius:4px;white-space:nowrap;">確認</span>`,
      `      <div><div style="font-size:12px;font-weight:600;color:${brandData.textColor};">個人情報保護方針 改定のお知らせ</div><div style="font-size:11px;color:#888;margin-top:2px;">期限: 2025年8月1日</div></div>`,
      '    </li>',
      '  </ul>',
      '</div>',
    ].join('\n');
    if (processed.includes('</aside>')) {
      processed = processed.replace('</aside>', widget + '\n    </aside>');
    } else {
      processed = processed.replace('</body>', widget + '\n</body>');
    }
  }

  // ── Enforce bottom-nav desktop hide ────────────────────────────────────────
  // If the LLM generated a bottom-nav without proper media query hiding,
  // inject a CSS rule to ensure it is hidden on desktop.
  const bottomNavPatterns = ['bottom-nav', 'bottom-navigation', 'tab-bar', 'mobile-nav', 'mobile-bottom'];
  for (const cls of bottomNavPatterns) {
    if (processed.includes(cls)) {
      // Check if a display:none rule for desktop already exists
      const desktopHidePattern = new RegExp(`@media[^{]*min-width[^{]*{[^}]*\\.${cls}[^}]*display\\s*:\\s*none`, 'i');
      if (!desktopHidePattern.test(processed)) {
        // Inject a CSS rule before </style> to hide on desktop
        const hideRule = `\n  /* Post-processor: hide bottom nav on desktop */\n  @media (min-width: 769px) { .${cls} { display: none !important; } }\n`;
        processed = processed.replace('</style>', hideRule + '</style>');
      }
      break;
    }
  }

  // ── Enforce bottom-nav full-width fix ───────────────────────────────────────
  // Inject CSS to ensure bottom nav spans full width correctly
  for (const cls of bottomNavPatterns) {
    if (processed.includes(cls)) {
      const widthFixRule = `\n  /* Post-processor: bottom nav full-width fix */\n  @media (max-width: 768px) { .${cls} { left: 0 !important; right: 0 !important; width: 100% !important; box-sizing: border-box !important; } .${cls} > * { flex: 1 !important; } }\n`;
      processed = processed.replace('</style>', widthFixRule + '</style>');
      break;
    }
  }

  // ── Enforce mobile single-column layout + sidebar hide + bottom nav full width ──
  // Broad CSS injection that covers all possible LLM-generated class names
  const mobileOverrideRule = `\n  /* Post-processor: mobile layout overrides */\n  @media (max-width: 768px) {\n    /* Single-column for all grid/flex content sections */\n    [class*="grid"] { grid-template-columns: 1fr !important; }\n    [class*="card-grid"] { grid-template-columns: 1fr !important; }\n    [class*="news"][class*="grid"], [class*="news"][class*="feed"] { grid-template-columns: 1fr !important; }\n    [class*="quick"][class*="link"] { grid-template-columns: repeat(2, 1fr) !important; }\n    [class*="community"][class*="grid"] { grid-template-columns: 1fr !important; }\n    /* Hide sidebar and 社内統計 on mobile */\n    aside, [class*="sidebar"], [class*="side-bar"], [class*="side_bar"] { display: none !important; }\n    [class*="stats"], [class*="statistic"], [class*="progress-widget"] { display: none !important; }\n    /* Bottom nav full-width fix — covers all possible class names */\n    [class*="bottom"][class*="nav"], [class*="tab"][class*="bar"], [class*="mobile"][class*="nav"] {\n      left: 0 !important; right: 0 !important; width: 100% !important;\n      box-sizing: border-box !important; display: flex !important;\n      flex-direction: row !important; justify-content: space-around !important;\n    }\n    [class*="bottom"][class*="nav"] > *, [class*="tab"][class*="bar"] > * { flex: 1 !important; text-align: center !important; }\n  }\n`;
  processed = processed.replace('</style>', mobileOverrideRule + '</style>');

  // ── Ensure each news card has an <img> placeholder ─────────────────────────
  // Count existing <img> tags in news card areas
  const imgCount = (processed.match(/<img\s/gi) || []).length;
  if (imgCount === 0) {
    // No img tags at all — inject placeholder img into each news card
    // Look for news card patterns and inject img after the opening div
    const newsCardPatterns = ['news-card', 'news-item', 'post-card', 'article-card', 'feed-item'];
    for (const cls of newsCardPatterns) {
      if (processed.includes(cls)) {
        const cardOpenRe = new RegExp(`(<div[^>]*class="[^"]*${cls}[^"]*"[^>]*>)`, 'gi');
        let cardMatch: RegExpExecArray | null;
        let offset = 0;
        const placeholderImg = `<img alt="Japanese corporate office environment, business professionals at work, corporate photography style, soft natural light, wide shot, clean modern interior" style="width:100%;height:160px;object-fit:cover;border-radius:8px 8px 0 0;background:#e0e0e0;display:block;" src="">`;
        while ((cardMatch = cardOpenRe.exec(processed)) !== null) {
          const insertAt = cardMatch.index + offset + cardMatch[0].length;
          processed = processed.slice(0, insertAt) + placeholderImg + processed.slice(insertAt);
          offset += placeholderImg.length;
        }
        break;
      }
    }
  }

  // ── Ensure nav logo has a Flux-ready <img data-logo="true"> placeholder ────
  // If the LLM did not include a data-logo img, inject one into the first nav/header element
  if (!processed.includes('data-logo="true"')) {
    const logoAlt = `${brandData.logoText || 'company'} corporate logo, bold wordmark with primary color ${brandData.primaryColor}, flat vector design, clean white background, professional corporate identity, minimal style, no gradients`;
    const logoImgTag = `<img alt="${logoAlt}" style="height:32px;width:auto;display:none;vertical-align:middle;" src="" data-logo="true">`;
    // Try to inject after the first nav or header opening tag
    const navOpenRe = /<(nav|header)[^>]*>/i;
    const navMatch = navOpenRe.exec(processed);
    if (navMatch) {
      const insertAt = navMatch.index + navMatch[0].length;
      processed = processed.slice(0, insertAt) + logoImgTag + processed.slice(insertAt);
    }
  }

  return processed;
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
        const { hints: brandHints, navColor: extractedNavColor } = await fetchBrandHints(input.websiteUrl);
        const navColorNote = extractedNavColor
          ? `\n\nNAV/HEADER BACKGROUND COLOR detected: ${extractedNavColor} — This MUST be used as primaryColor. It was found in the navigation or header element of the website.`
          : "";
        const hintSection = brandHints
          ? `\n\nACTUAL COLOR DATA extracted from ${input.websiteUrl}:\n${brandHints}${navColorNote}\n\nIMPORTANT: Use the nav-background color as primaryColor if available. Otherwise use the most frequently occurring non-neutral hex color.`
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
        // Deterministic override: if we extracted a nav/header color from the real website,
        // force it as primaryColor regardless of what the LLM returned.
        if (extractedNavColor) {
          parsed.primaryColor = extractedNavColor;
        }
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
1. 外部画像は一切使用禁止。background-imageに外部URLは使わない。すべてのビジュアルはCSSシェイプ、インラインSVG、CSSグラデーション、Unicode文字のみで描画すること。
2. ただし、各ニュースカードのサムネイル領域には必ず以下の形式で<img>を配置すること:
   <img alt="[Flux image generation prompt]" style="width:100%;height:160px;object-fit:cover;border-radius:8px 8px 0 0;background:#e0e0e0;display:block;" src="">
   altの内容は、Cursor + Fluxで即座に使えるFLUX.1向け英語プロンプトにすること。形式は以下の4要素を含めること:
   - Subject（被写体）: そのカードの内容に合った具体的な被写体
   - Style（スタイル）: "corporate photography style, editorial look" など
   - Lighting（照明）: "soft natural light", "studio lighting" など
   - Composition（構図）: "wide shot", "close-up", "overhead view" など
   例: "Japanese business professionals in a modern conference room, corporate photography style, soft natural light, wide shot, clean background"
   各カードのテーマに合わせて異なるプロンプトを生成すること。
3. すべてのCSSは<style>タグ内にインラインで記述し、単一HTMLファイルとして完結させること。
4. デスクトップ（1280px）とモバイル（390px）の両方に対応するCSSメディアクエリを使用すること。
5. すべてのテキストコンテンツは日本語で記述すること（ナビゲーション、見出し、本文、ボタン、バッジ、日付など）。
6. 【空白禁止】各セクションは必ず十分なコンテンツで埋めること。空のdiv、最小限のコンテンツ、余白だらけのセクションは禁止。
7. 以下のセクションをすべて含め、それぞれ十分なコンテンツで埋めること:
   a. 【トップナビゲーションバー】以下の要素を含めること。デスクトップのみ表示。
      - ロゴエリア: SVG/CSSによるロゴシェイプ（プライマリーカラー使用）と企業名テキストを並べる。さらに、ロゴの直後に以下の形式で<img>を配置すること（ロゴ画像の差し替え用プレースホルダー）:
        <img alt="[Flux logo recreation prompt]" style="height:32px;width:auto;display:none;" src="" data-logo="true">
        altの内容は、Cursor + Fluxで企業ロゴを正確に再現するためのFLUX.1向け英語プロンプトにすること。形式は以下を含めること:
        - Logo description: 色・形状・タイポグラフィの特徴を具体的に記述（例: "horizontal wordmark with bold sans-serif font"）
        - Brand colors: HEXコードを含めて正確に指定
        - Style: "flat vector logo design, clean white background, professional corporate identity"
        - Negative prompt相当の注意: "no gradients, no shadows, simple geometric shapes"
        例: "${logoText} company logo, bold geometric diamond shape in ${primaryColor}, white wordmark text, flat vector design, clean white background, corporate identity, minimal style"
      - ナビリンク（ホーム・ニュース・ナレッジ・社員・イベント）
      - ユーザーアバター（CSSサークル＋イニシャル）
      - 通知ベルアイコン（SVG）
   b. 【ヒーローセクション】ブランドカラーのフルワイドグラデーションバナー（最低200px高さ）、大きなウェルカム見出し（日本語）、タグライン、CTAボタン（日本語）、装飾的なSVG幾何学シェイプを最低2つ含めること。
   c. 【ニュースフィード】3枚のニュースカード。各カードには: サムネイル<img>（上記ルール2に従う）、カテゴリバッジ、タイトル（15文字以上）、本文抜粋（40文字以上）、日付、「続きを読む」リンク。すべて日本語。
   d. 【クイックリンク】6個のアイコンタイル（SVGアイコン付き）：「人事ポータル」「ITヘルプデスク」「社内規程・ポリシー」「福利厚生」「社員名簿」「社内イベント」。各タイルにはアイコンとラベルを含めること。
   e. 【サイドバー（デスクトップのみ）】3つのウィジェットを必ず含めること: (1)「必読コンテンツ」ウィジェット（重要度バッジ付き3件）、(2)「直近のイベント」リスト（3件、日付・タイトル・場所付き）、(3)「社内統計」（3本のプログレスバー、数値ラベル付き）。このサイドバーは @media (max-width: 768px) では display:none にすること（モバイルでは非表示）。
   f. 【ボトムナビゲーション（モバイルのみ）】@media (max-width: 768px) のみで表示。5タブ（ホーム・ニュース・検索・社員・プロフィール）、SVGアイコン付き。CSSは以下を厳守すること:
      position: fixed; bottom: 0; left: 0; right: 0; width: 100%; box-sizing: border-box; display: flex; flex-direction: row; justify-content: space-around; align-items: center;
      各タブは flex: 1; text-align: center; にすること。デスクトップでは display:none にすること。
8. ブランドカラーを一貫して使用：プライマリーはナビ/ヒーロー、セカンダリーはカード/サイドバー、アクセントはCTA/バッジ/ハイライト。
9. タイポグラフィ：指定フォントファミリーを使用。見出しは太字、本文は通常ウェイト。
10. 細部へのこだわり：カードのホバー状態（translateY＋シャドウ）、スムーズなトランジション、繊細なグラデーション、プロフェッショナルな余白。
11. デザインは洗練されたエンタープライズ品質で、${companyName}のブランドらしさが伝わること。
12. モバイル表示では、ボトムナビゲーションが固定されるため、コンテンツエリアに padding-bottom: 70px を設定すること。
13. 【モバイルレイアウト厳守】@media (max-width: 768px) では、すべてのコンテンツセクション（ニュースカード、クイックリンク、コミュニティ等）を1列1アイテムで表示すること。グリッドは grid-template-columns: 1fr のみ使用。横並びレイアウトは禁止。
14. 【コミュニティセクション（デスクトップ・モバイル両方に表示）】${companyName}の業界・業種に合わせた社内コミュニティグループを4〜6個表示すること。各コミュニティには: グループアイコン（SVG）、グループ名（日本語）、メンバー数、最新投稿の抜粋（1行）、「参加する」または「参加中」ボタンを含めること。グループ名は${industry}業界に実際にありそうな社内コミュニティ名にすること（例: 製造業なら「品質改善チーム」「DX推進グループ」「安全衛生委員会」など）。デスクトップでは2〜3列グリッド、モバイルでは1列表示。
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

        // Post-process: remove profile/avatar widgets and inject 必読コンテンツ if missing
        const processedHtml = postProcessMockHtml(cleaned, brandData);
        return { html: processedHtml };
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
        const promptInstruction = `あなたはStable Diffusion向けAI画像生成プロンプトの専門家です。以下の企業情報をもとに、Stable Diffusionで高品質な企業イントラネットUI画像を生成するための、詳細で具体的な日本語プロンプトを作成してください。

【企業情報】
- 企業名: ${companyName}
- 公式サイト: ${websiteUrl}
- 業界: ${brandData.industry}
- ブランドトーン: ${brandData.brandTone}
- プライマリーカラー（ナビゲーション色）: ${brandData.primaryColor}
- セカンダリーカラー: ${brandData.secondaryColor}
- アクセントカラー: ${brandData.accentColor}
- タグライン: ${brandData.tagline}

以下の4セクション構成でプロンプトを作成してください。各セクションは「①レイアウト」「②ブランド」「③ビジュアル」「④品質」の見出しで始めること。

①レイアウト: 画面構成・UI要素の配置を具体的に記述（ナビゲーションバー、ヒーローバナー、ニュースカード、サイドバー、ボトムナビなど）
②ブランド: ${companyName}の公式ロゴの特徴（色・形状・フォント）、ブランドカラー${brandData.primaryColor}の使用箇所、${brandData.industry}らしいビジュアル表現
③ビジュアル: ヒーローバナーの背景画像の内容（${brandData.industry}・${brandData.brandTone}に合わせた実写イメージ）、ニュースカードのサムネイル画像の内容指示、全体的な雰囲気・トーン
④品質: Stable Diffusionで高品質出力を得るための技術的指定（スタイル、レンダリング品質、照明、構図など）。4K・8K・解像度の数値指定は含めないこと。

出力形式: 日本語で、すぐにStable Diffusionに貼り付けられる形式のプロンプトテキストのみを返してください。セクション見出し（①〜④）を含めること。`;

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
