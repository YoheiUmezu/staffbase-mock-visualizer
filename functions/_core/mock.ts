import { z } from "zod";
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
  brandData: brandDataSchema,
});

type Message = { role: "system" | "user" | "assistant"; content: string };

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
      model: "@cf/meta/llama-3.1-8b-instruct",
      messages,
      max_tokens: 2048,
    }),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`LLM invoke failed: ${response.status} ${response.statusText} - ${text}`);
  }

  const parsed = JSON.parse(text) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return parsed.choices?.[0]?.message?.content ?? "";
}

export const mockRouter = router({
  extractBrand: publicProcedure
    .input(brandExtractionSchema)
    .mutation(async ({ input, ctx }) => {
      const prompt = `Analyze ${input.companyName} (${input.websiteUrl}) and return JSON with keys:
primaryColor, secondaryColor, accentColor, backgroundColor, textColor, fontStyle, logoText, industry, brandTone, tagline.
Use hex colors where applicable. Return JSON only.`;

      const content = await invokeProxyLLM(ctx.env, [
        {
          role: "system",
          content:
            "You are a precise brand analyst. Return valid JSON only without markdown.",
        },
        { role: "user", content: prompt },
      ]);

      const parsed = JSON.parse(content || "{}");
      if (input.industry) parsed.industry = input.industry;
      if (input.brandTone) parsed.brandTone = input.brandTone;
      return brandDataSchema.parse(parsed);
    }),

  generateMock: publicProcedure
    .input(mockGenerationSchema)
    .mutation(async ({ input, ctx }) => {
      const prompt = `Create a complete standalone HTML intranet page for ${input.companyName}.
Use brand colors: ${input.brandData.primaryColor}, ${input.brandData.secondaryColor}, ${input.brandData.accentColor}.
Return only raw HTML starting with <!DOCTYPE html>.`;

      const html = await invokeProxyLLM(ctx.env, [
        {
          role: "system",
          content:
            "You are a UI engineer. Return only production-ready raw HTML. No markdown fences.",
        },
        { role: "user", content: prompt },
      ]);

      const cleaned = html.trim();
      if (!cleaned.toLowerCase().startsWith("<!doctype") && !cleaned.toLowerCase().startsWith("<html")) {
        throw new Error("LLM returned invalid HTML");
      }

      return { html: cleaned };
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

      const content = await invokeProxyLLM(ctx.env, [
        {
          role: "system",
          content:
            "You are an AI image prompting specialist. Return only usable prompt text.",
        },
        { role: "user", content: prompt },
      ]);

      if (!content) throw new Error("No response from LLM");
      return { prompt: content.trim() };
    }),
});
