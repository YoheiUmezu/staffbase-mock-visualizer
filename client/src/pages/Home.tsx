import { useState, useRef, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Monitor,
  Smartphone,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Globe,
  Building2,
  ChevronRight,
  Loader2,
  CheckCircle2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BrandData {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontStyle: string;
  logoText: string;
  industry: string;
  brandTone: string;
  tagline: string;
}

type Step = "idle" | "extracting" | "generating" | "done" | "error";

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: Step }) {
  const steps = [
    { key: "extracting", label: "Brand analysis" },
    { key: "generating", label: "Mock generation" },
    { key: "done", label: "Complete" },
  ];
  const currentIdx = steps.findIndex(s => s.key === step);

  return (
    <div className="flex items-center gap-1.5">
      {steps.map((s, i) => {
        const isDone = currentIdx > i || step === "done";
        const isActive = s.key === step;
        return (
          <div key={s.key} className="flex items-center gap-1.5">
            <div className={`flex items-center gap-1.5 text-xs font-medium transition-all duration-300 ${
              isDone ? "text-emerald-600" : isActive ? "text-primary" : "text-muted-foreground/50"
            }`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${
                isDone
                  ? "bg-emerald-100 text-emerald-600"
                  : isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground/50"
              }`}>
                {isDone ? "✓" : i + 1}
              </div>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <ChevronRight className="w-3 h-3 text-muted-foreground/30" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Color swatch row ─────────────────────────────────────────────────────────

function ColorSwatches({ brand }: { brand: BrandData }) {
  return (
    <div className="flex items-center gap-1">
      {[brand.primaryColor, brand.secondaryColor, brand.accentColor, brand.backgroundColor].map((c, i) => (
        <div
          key={i}
          className="w-5 h-5 rounded-full ring-1 ring-black/10 shadow-sm"
          style={{ backgroundColor: c }}
          title={c}
        />
      ))}
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function SkeletonFrame({ isDesktop }: { isDesktop: boolean }) {
  return (
    <div className={`rounded-2xl overflow-hidden border border-border/60 shadow-sm ${isDesktop ? "aspect-[16/10]" : "aspect-[9/19.5] max-w-[390px] mx-auto"}`}>
      <div className="w-full h-full shimmer" />
    </div>
  );
}

// ─── Device frame ─────────────────────────────────────────────────────────────

function DesktopFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-border/60 shadow-lg bg-zinc-100">
      {/* Browser chrome */}
      <div className="h-9 bg-zinc-200/80 flex items-center px-3 gap-2 border-b border-zinc-300/60">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400/70" />
          <div className="w-3 h-3 rounded-full bg-yellow-400/70" />
          <div className="w-3 h-3 rounded-full bg-green-400/70" />
        </div>
        <div className="flex-1 mx-3 h-5 rounded-md bg-white/70 border border-zinc-300/50 flex items-center px-2">
          <div className="w-2 h-2 rounded-full bg-zinc-400/50 mr-1.5" />
          <div className="h-2 w-28 rounded-sm bg-zinc-300/70" />
        </div>
      </div>
      {children}
    </div>
  );
}

function MobileFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[2.5rem] overflow-hidden border-4 border-zinc-800 shadow-2xl bg-zinc-800 mx-auto" style={{ maxWidth: 390 }}>
      {/* Notch */}
      <div className="h-7 bg-zinc-900 flex items-center justify-center">
        <div className="w-20 h-4 rounded-full bg-zinc-800" />
      </div>
      {/* Screen */}
      <div className="overflow-hidden rounded-b-[1.8rem]">
        {children}
      </div>
      {/* Home indicator */}
      <div className="h-5 bg-zinc-900 flex items-center justify-center">
        <div className="w-16 h-1 rounded-full bg-zinc-600" />
      </div>
    </div>
  );
}

// ─── Preview panel ────────────────────────────────────────────────────────────

function PreviewPanel({
  html,
  label,
  viewportWidth,
  containerWidth,
}: {
  html: string;
  label: string;
  viewportWidth: number;
  containerWidth: number;
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    setBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [html]);

  const isDesktop = label === "Desktop";
  const effectiveContainer = isDesktop ? containerWidth : Math.min(containerWidth, 390);
  const scale = effectiveContainer / viewportWidth;
  const scaledHeight = isDesktop
    ? Math.round(viewportWidth * 0.625)
    : Math.round(viewportWidth * 2.16);
  const displayHeight = Math.round(scaledHeight * scale);

  if (!blobUrl) return null;

  const iframeEl = (
    <div
      style={{
        width: `${viewportWidth}px`,
        height: `${scaledHeight}px`,
        transform: `scale(${scale})`,
        transformOrigin: "top left",
        position: "absolute",
        top: 0,
        left: 0,
        overflow: "hidden",
      }}
    >
      <iframe
        src={blobUrl}
        style={{
          width: `${viewportWidth}px`,
          height: `${scaledHeight}px`,
          border: "none",
          display: "block",
        }}
        sandbox="allow-scripts allow-same-origin"
        title={`${label} preview`}
      />
    </div>
  );

  const screenContent = (
    <div style={{ width: "100%", height: `${displayHeight}px`, position: "relative", overflow: "hidden" }}>
      {iframeEl}
    </div>
  );

  return (
    <div className="flex flex-col gap-3 fade-in-up">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        {isDesktop ? (
          <Monitor className="w-4 h-4 text-primary" />
        ) : (
          <Smartphone className="w-4 h-4 text-primary" />
        )}
        <span>{label}</span>
        <span className="text-xs font-normal text-muted-foreground">({viewportWidth}px)</span>
      </div>
      {isDesktop ? (
        <DesktopFrame>{screenContent}</DesktopFrame>
      ) : (
        <MobileFrame>{screenContent}</MobileFrame>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Home() {
  const [companyName, setCompanyName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [brandData, setBrandData] = useState<BrandData | null>(null);
  const [mockHtml, setMockHtml] = useState<string | null>(null);

  const desktopContainerRef = useRef<HTMLDivElement>(null);
  const mobileContainerRef = useRef<HTMLDivElement>(null);
  const [desktopWidth, setDesktopWidth] = useState(900);
  const [mobileWidth, setMobileWidth] = useState(390);

  // Observe container widths
  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      for (const entry of entries) {
        const w = Math.floor(entry.contentRect.width);
        if (entry.target === desktopContainerRef.current) setDesktopWidth(w);
        if (entry.target === mobileContainerRef.current) setMobileWidth(w);
      }
    });
    if (desktopContainerRef.current) obs.observe(desktopContainerRef.current);
    if (mobileContainerRef.current) obs.observe(mobileContainerRef.current);
    return () => obs.disconnect();
  }, [step]);

  const extractBrand = trpc.mock.extractBrand.useMutation();
  const generateMock = trpc.mock.generateMock.useMutation();

  const handleGenerate = useCallback(async (name: string, url: string) => {
    if (!name.trim() || !url.trim()) {
      toast.error("Please enter both company name and website URL.");
      return;
    }
    try { new URL(url); } catch {
      toast.error("Please enter a valid URL (e.g. https://example.com).");
      return;
    }

    setStep("extracting");
    setBrandData(null);
    setMockHtml(null);

    try {
      const brand = await extractBrand.mutateAsync({ companyName: name, websiteUrl: url });
      setBrandData(brand);
      setStep("generating");
      const result = await generateMock.mutateAsync({ companyName: name, brandData: brand });
      setMockHtml(result.html);
      setStep("done");
    } catch (err: unknown) {
      setStep("error");
      const message = err instanceof Error ? err.message : "Generation failed. Please try again.";
      toast.error(message);
    }
  }, [extractBrand, generateMock]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleGenerate(companyName, websiteUrl);
  };

  const handleRegenerate = () => handleGenerate(companyName, websiteUrl);

  const handleReset = () => {
    setCompanyName("");
    setWebsiteUrl("");
    setStep("idle");
    setBrandData(null);
    setMockHtml(null);
  };

  const isLoading = step === "extracting" || step === "generating";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="border-b border-border/60 bg-card/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-screen-2xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shadow-sm">
              <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
                <rect x="3" y="3" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.95" />
                <rect x="11" y="3" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.55" />
                <rect x="3" y="11" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.55" />
                <rect x="11" y="11" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.95" />
              </svg>
            </div>
            <div>
              <span className="font-semibold text-sm tracking-tight">Staffbase Mock Visualizer</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(step === "done" || step === "error") && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="gap-1.5 text-muted-foreground hover:text-foreground text-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </Button>
                {step === "done" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRegenerate}
                    disabled={isLoading}
                    className="gap-1.5 text-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Regenerate
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-6 py-10">

        {/* ── IDLE: Hero + form ───────────────────────────────────────────── */}
        {step === "idle" && (
          <div className="flex flex-col items-center text-center gap-10 py-12 fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/8 border border-primary/15 text-primary text-xs font-semibold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              AI-Powered · No external images
            </div>

            <div className="space-y-4 max-w-2xl">
              <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-foreground leading-[1.05]">
                Visualize your brand<br />
                <span className="text-primary">in Staffbase</span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
                Enter a company name and website URL. The AI extracts brand colors and generates a fully branded Staffbase intranet — desktop and mobile, instantly.
              </p>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className="w-full max-w-md bg-card border border-border/60 rounded-2xl p-6 shadow-sm space-y-4 text-left"
            >
              <div className="space-y-1.5">
                <Label htmlFor="company" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  Company Name
                </Label>
                <Input
                  id="company"
                  placeholder="e.g. Toyota, Siemens, Salesforce"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  className="h-11"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="url" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  Official Website URL
                </Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://www.example.com"
                  value={websiteUrl}
                  onChange={e => setWebsiteUrl(e.target.value)}
                  className="h-11"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-11 gap-2 font-semibold"
                disabled={!companyName.trim() || !websiteUrl.trim()}
              >
                <Sparkles className="w-4 h-4" />
                Generate Mock
              </Button>
            </form>

            {/* Feature tags */}
            <div className="flex flex-wrap justify-center gap-2">
              {[
                "Brand color extraction",
                "Desktop preview (1280px)",
                "Mobile preview (390px)",
                "CSS-only visuals",
                "No external images",
                "Regenerate anytime",
              ].map(f => (
                <span key={f} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted border border-border/50 text-xs text-muted-foreground">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── LOADING ─────────────────────────────────────────────────────── */}
        {isLoading && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/60">
              <div>
                <h2 className="text-xl font-bold">{companyName}</h2>
                <p className="text-sm text-muted-foreground mt-0.5 truncate max-w-xs">{websiteUrl}</p>
              </div>
              <StepIndicator step={step} />
            </div>

            <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-primary/5 border border-primary/15">
              <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
              <p className="text-sm text-primary font-medium">
                {step === "extracting"
                  ? `Analyzing ${companyName}'s brand identity and color palette…`
                  : `Generating branded Staffbase intranet mock UI…`}
              </p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-8 items-start">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-3">
                  <Monitor className="w-4 h-4" /> Desktop <span className="font-normal text-xs">(1280px)</span>
                </div>
                <SkeletonFrame isDesktop />
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-3">
                  <Smartphone className="w-4 h-4" /> Mobile <span className="font-normal text-xs">(390px)</span>
                </div>
                <SkeletonFrame isDesktop={false} />
              </div>
            </div>
          </div>
        )}

        {/* ── DONE ────────────────────────────────────────────────────────── */}
        {step === "done" && mockHtml && brandData && (
          <div className="space-y-6 fade-in-up">
            {/* Header row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border/60">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-sm"
                  style={{ backgroundColor: brandData.primaryColor }}
                >
                  {brandData.logoText.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-bold leading-tight">{companyName}</h2>
                  <p className="text-xs text-muted-foreground">{brandData.industry} · {brandData.brandTone}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <StepIndicator step={step} />
                <ColorSwatches brand={brandData} />
              </div>
            </div>

            {/* Brand details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { label: "Primary", value: brandData.primaryColor, color: brandData.primaryColor },
                { label: "Secondary", value: brandData.secondaryColor, color: brandData.secondaryColor },
                { label: "Accent", value: brandData.accentColor, color: brandData.accentColor },
                { label: "Font", value: brandData.fontStyle, color: null },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-card border border-border/60 text-xs">
                  {item.color ? (
                    <div className="w-5 h-5 rounded-full ring-1 ring-black/10 shrink-0" style={{ backgroundColor: item.color }} />
                  ) : (
                    <span className="text-base shrink-0">Aa</span>
                  )}
                  <div className="min-w-0">
                    <div className="text-muted-foreground">{item.label}</div>
                    <div className="font-semibold truncate">{item.value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Tagline */}
            <div className="px-4 py-3 rounded-xl bg-muted/50 border border-border/40 text-sm text-muted-foreground italic">
              "{brandData.tagline}"
            </div>

            {/* Preview panels */}
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-8 items-start">
              <div ref={desktopContainerRef} className="w-full min-w-0">
                <PreviewPanel
                  html={mockHtml}
                  label="Desktop"
                  viewportWidth={1280}
                  containerWidth={desktopWidth}
                />
              </div>
              <div ref={mobileContainerRef} className="w-full min-w-0">
                <PreviewPanel
                  html={mockHtml}
                  label="Mobile"
                  viewportWidth={390}
                  containerWidth={Math.min(mobileWidth, 390)}
                />
              </div>
            </div>

            {/* Mobile action buttons */}
            <div className="flex sm:hidden items-center gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5 text-muted-foreground text-xs">
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </Button>
              <Button variant="outline" size="sm" onClick={handleRegenerate} className="gap-1.5 text-xs">
                <RefreshCw className="w-3.5 h-3.5" /> Regenerate
              </Button>
            </div>
          </div>
        )}

        {/* ── ERROR ───────────────────────────────────────────────────────── */}
        {step === "error" && (
          <div className="flex flex-col items-center gap-6 py-20 text-center fade-in-up">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center text-3xl">
              ⚠️
            </div>
            <div>
              <h3 className="font-semibold text-lg">Generation failed</h3>
              <p className="text-sm text-muted-foreground mt-1">Something went wrong. Please try again.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReset} className="gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </Button>
              <Button onClick={handleRegenerate} className="gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" /> Try Again
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border/40 py-4 px-6">
        <p className="text-center text-xs text-muted-foreground/60">
          Staffbase Mock Visualizer · Presales demo tool · All visuals are CSS-only, no external images
        </p>
      </footer>
    </div>
  );
}
