import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { z } from "zod";

// ─── Brand Extraction ────────────────────────────────────────────────────────

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

// ─── Mock Generation ─────────────────────────────────────────────────────────

const mockGenerationSchema = z.object({
  companyName: z.string(),
  brandData: brandDataSchema,
});

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
    extractBrand: publicProcedure
      .input(brandExtractionSchema)
      .mutation(async ({ input }) => {
        const prompt = `You are a brand analyst. Analyze the company "${input.companyName}" with website "${input.websiteUrl}".

Based on the company name, website URL, and your knowledge of this brand, infer:
1. Primary brand color (main corporate color, e.g. the dominant color in their logo/UI)
2. Secondary brand color (complementary color)
3. Accent color (highlight/CTA color)
4. Background color (typical page background, usually white or very light)
5. Text color (primary body text color, usually dark)
6. Font style: one of "sans-serif", "serif", "geometric", "humanist", "modern"
7. Logo text: the exact company name as it appears in their logo (may be abbreviated)
8. Industry: brief industry label (e.g. "Financial Services", "Retail", "Healthcare", "Technology")
9. Brand tone: one of "professional", "innovative", "friendly", "premium", "energetic", "trustworthy"
10. Tagline: a short fictional but plausible intranet tagline for this company (max 8 words)

Return ONLY valid JSON with these exact keys:
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
            { role: "system", content: "You are a precise brand analyst. Always respond with valid JSON only, no markdown, no explanation." },
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
                required: ["primaryColor", "secondaryColor", "accentColor", "backgroundColor", "textColor", "fontStyle", "logoText", "industry", "brandTone", "tagline"],
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

    generateMock: publicProcedure
      .input(mockGenerationSchema)
      .mutation(async ({ input }) => {
        const { companyName, brandData } = input;
        const {
          primaryColor, secondaryColor, accentColor,
          backgroundColor, textColor, fontStyle,
          logoText, industry, brandTone, tagline,
        } = brandData;

        const fontFamily = fontStyle === "serif"
          ? "'Georgia', 'Times New Roman', serif"
          : fontStyle === "geometric"
            ? "'Futura', 'Century Gothic', 'Trebuchet MS', sans-serif"
            : fontStyle === "humanist"
              ? "'Gill Sans', 'Optima', 'Segoe UI', sans-serif"
              : fontStyle === "modern"
                ? "'Helvetica Neue', 'Arial', sans-serif"
                : "'Inter', 'Segoe UI', 'Helvetica Neue', sans-serif";

        const prompt = `You are an expert UI engineer specializing in enterprise intranet design. Generate a complete, self-contained HTML file that renders a beautiful Staffbase-style intranet home screen for "${companyName}".

BRAND SPECIFICATION:
- Company: ${companyName}
- Industry: ${industry}
- Brand Tone: ${brandTone}
- Logo Text: ${logoText}
- Tagline: "${tagline}"
- Primary Color: ${primaryColor}
- Secondary Color: ${secondaryColor}
- Accent Color: ${accentColor}
- Background Color: ${backgroundColor}
- Text Color: ${textColor}
- Font Family: ${fontFamily}

STRICT REQUIREMENTS:
1. NO external images, no <img> tags, no background-image with URLs. All visuals must use CSS shapes, SVG inline elements, CSS gradients, and Unicode characters only.
2. The layout must be fully self-contained in a single HTML file with all CSS inlined in a <style> tag.
3. Design for BOTH desktop (1280px) and mobile (375px) — use CSS media queries. The same HTML file must look great at both widths.
4. Include these sections:
   a. TOP NAVIGATION BAR: Logo area (SVG/CSS logo mark + company name text), navigation links (Home, News, Knowledge, People, Events), user avatar (CSS circle with initials), notification bell icon (SVG)
   b. HERO SECTION: Full-width gradient banner using brand colors, large welcome heading, tagline, a CTA button
   c. NEWS FEED: 3 news cards with category badge, title, excerpt text, date, and a "Read more" link. Cards use subtle shadows and rounded corners.
   d. QUICK LINKS: A row of 4–6 icon tiles (SVG icons) for common actions like "HR Portal", "IT Help", "Company Policies", "Benefits", "Directory", "Events"
   e. SIDEBAR (desktop only): "My Profile" widget with CSS avatar, name, role, department; "Upcoming Events" list with 2–3 items; "Company Stats" with animated progress bars
   f. BOTTOM NAVIGATION (mobile only): 5-tab bottom nav bar with SVG icons for Home, News, Search, People, Profile
5. Use the brand colors consistently: primary for nav/hero, secondary for cards/sidebar, accent for CTAs/badges/highlights.
6. Typography: use the specified font family. Headlines bold, body text regular weight.
7. Micro-details: hover states on cards (translateY + shadow), smooth transitions, subtle gradients, professional spacing.
8. The design must feel polished, enterprise-grade, and specific to this brand — not generic.
9. All text content must be realistic and relevant to ${companyName}'s industry (${industry}).
10. Include at least one decorative SVG element (abstract shape, wave, or geometric pattern) in the hero section.

OUTPUT: Return ONLY the complete HTML file content, starting with <!DOCTYPE html>. No markdown fences, no explanation.`;

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are an expert UI engineer. Generate complete, production-quality HTML/CSS. Return only raw HTML starting with <!DOCTYPE html>. No markdown code fences.",
            },
            { role: "user", content: prompt },
          ],
        });

        const rawHtml = response.choices[0]?.message?.content ?? "";
        const html = typeof rawHtml === "string" ? rawHtml : "";
        // Strip any accidental markdown fences
        const cleaned = html
          .replace(/^```html\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim();

        // Server-side validation: ensure output is a valid self-contained HTML doc
        if (!cleaned.toLowerCase().startsWith("<!doctype") && !cleaned.toLowerCase().startsWith("<html")) {
          throw new Error("LLM returned invalid HTML. Please try again.");
        }
        if (cleaned.length < 500) {
          throw new Error("Generated HTML is too short. Please try again.");
        }

        return { html: cleaned };
      }),
  }),
});

export type AppRouter = typeof appRouter;
