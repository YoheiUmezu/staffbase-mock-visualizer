import { describe, expect, it, vi } from "vitest";

// Mock the LLM module before importing the router
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify({
            primaryColor: "#0057B8",
            secondaryColor: "#003F8A",
            accentColor: "#FFD700",
            backgroundColor: "#FFFFFF",
            textColor: "#1A1A1A",
            fontStyle: "sans-serif",
            logoText: "ACME Corp",
            industry: "Technology",
            brandTone: "professional",
            tagline: "Connecting people, powering progress",
          }),
        },
      },
    ],
  }),
}));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("mock.extractBrand", () => {
  it("returns structured brand data from LLM response", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.mock.extractBrand({
      companyName: "ACME Corp",
      websiteUrl: "https://acme.example.com",
    });

    expect(result.primaryColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(result.secondaryColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(result.accentColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(result.logoText).toBe("ACME Corp");
    expect(result.industry).toBe("Technology");
    expect(result.brandTone).toBe("professional");
    expect(result.tagline).toBeTruthy();
    expect(result.fontStyle).toBe("sans-serif");
  });
});
