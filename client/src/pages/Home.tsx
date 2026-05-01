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
  Copy,
  Check,
  Wand2,
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
    { key: "extracting", label: "ブランド解析" },
    { key: "generating", label: "モック生成" },
    { key: "done", label: "完了" },
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
  if (isDesktop) {
    return (
      <div className="rounded-2xl overflow-hidden border border-border/60 shadow-sm aspect-[16/10]">
        <div className="w-full h-full shimmer" />
      </div>
    );
  }
  // Mobile skeleton: flat app screen style
  return (
    <div className="mx-auto overflow-hidden rounded-2xl border border-border/60 shadow-sm" style={{ width: 390, maxWidth: "100%" }}>
      {/* Status bar */}
      <div className="h-11 shimmer" />
      {/* Content area */}
      <div className="aspect-[390/700] shimmer" />
      {/* Bottom nav */}
      <div className="h-16 shimmer" />
    </div>
  );
}

// ─── Desktop device frame ─────────────────────────────────────────────────────
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

// ─── Mobile app frame (flat Staffbase app style) ──────────────────────────────
function MobileAppFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mx-auto overflow-hidden rounded-2xl border border-border/60 shadow-xl bg-white"
      style={{ width: 390, maxWidth: "100%" }}
    >
      {/* iOS-style status bar */}
      <div className="h-11 bg-white flex items-center justify-between px-5 border-b border-zinc-100">
        <span className="text-[13px] font-semibold text-zinc-900 tabular-nums">9:41</span>
        <div className="flex items-center gap-1.5">
          {/* Signal bars */}
          <svg width="17" height="12" viewBox="0 0 17 12" fill="none">
            <rect x="0" y="7" width="3" height="5" rx="0.5" fill="#1C1C1E" />
            <rect x="4.5" y="5" width="3" height="7" rx="0.5" fill="#1C1C1E" />
            <rect x="9" y="3" width="3" height="9" rx="0.5" fill="#1C1C1E" />
            <rect x="13.5" y="0" width="3" height="12" rx="0.5" fill="#1C1C1E" />
          </svg>
          {/* WiFi */}
          <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
            <path d="M8 9.5C8.83 9.5 9.5 10.17 9.5 11S8.83 12.5 8 12.5 6.5 11.83 6.5 11 7.17 9.5 8 9.5Z" fill="#1C1C1E"/>
            <path d="M8 6C9.93 6 11.68 6.78 12.95 8.05L14.07 6.93C12.5 5.36 10.36 4.4 8 4.4S3.5 5.36 1.93 6.93L3.05 8.05C4.32 6.78 6.07 6 8 6Z" fill="#1C1C1E"/>
            <path d="M8 2.5C11.04 2.5 13.78 3.77 15.72 5.78L16.83 4.67C14.6 2.37 11.46 1 8 1S1.4 2.37-.83 4.67L.28 5.78C2.22 3.77 4.96 2.5 8 2.5Z" fill="#1C1C1E" opacity="0.4"/>
          </svg>
          {/* Battery */}
          <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
            <rect x="0.5" y="0.5" width="21" height="11" rx="3.5" stroke="#1C1C1E" strokeOpacity="0.35"/>
            <rect x="1.5" y="1.5" width="18" height="9" rx="2.5" fill="#1C1C1E"/>
            <path d="M23 4v4a2 2 0 000-4z" fill="#1C1C1E" fillOpacity="0.4"/>
          </svg>
        </div>
      </div>
      {/* App content */}
      {children}
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

  if (!blobUrl) return null;

  if (isDesktop) {
    // Desktop: scale to fit container
    const scale = containerWidth / viewportWidth;
    const scaledHeight = Math.round(viewportWidth * 0.625);
    const displayHeight = Math.round(scaledHeight * scale);
    return (
      <div className="flex flex-col gap-3 fade-in-up">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Monitor className="w-4 h-4 text-primary" />
          <span>デスクトップ</span>
          <span className="text-xs font-normal text-muted-foreground">(1280px)</span>
        </div>
        <DesktopFrame>
          <div style={{ width: "100%", height: `${displayHeight}px`, position: "relative", overflow: "hidden" }}>
            <div
              style={{
                width: `${viewportWidth}px`,
                height: `${scaledHeight}px`,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                position: "absolute",
                top: 0,
                left: 0,
              }}
            >
              <iframe
                src={blobUrl}
                style={{ width: `${viewportWidth}px`, height: `${scaledHeight}px`, border: "none", display: "block" }}
                sandbox="allow-scripts allow-same-origin"
                title="Desktop preview"
              />
            </div>
          </div>
        </DesktopFrame>
      </div>
    );
  }

  // Mobile: flat Staffbase app — show at natural 390px width, scale only if container is narrower
  const mobileViewport = 390;
  const mobileContentHeight = 750; // visible app content height (status bar excluded)
  const effectiveScale = Math.min(1, containerWidth / mobileViewport);
  const displayHeight = Math.round(mobileContentHeight * effectiveScale);

  return (
    <div className="flex flex-col gap-3 fade-in-up">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Smartphone className="w-4 h-4 text-primary" />
        <span>モバイル</span>
        <span className="text-xs font-normal text-muted-foreground">(390px · iPhone 13)</span>
      </div>
      <MobileAppFrame>
        <div style={{ width: "100%", height: `${displayHeight}px`, position: "relative", overflow: "hidden" }}>
          <div
            style={{
              width: `${mobileViewport}px`,
              height: `${mobileContentHeight}px`,
              transform: `scale(${effectiveScale})`,
              transformOrigin: "top left",
              position: "absolute",
              top: 0,
              left: 0,
            }}
          >
            <iframe
              src={blobUrl}
              style={{ width: `${mobileViewport}px`, height: `${mobileContentHeight}px`, border: "none", display: "block" }}
              sandbox="allow-scripts allow-same-origin"
              title="Mobile preview"
            />
          </div>
        </div>
      </MobileAppFrame>
    </div>
  );
}

// ─── AI Prompt panel ──────────────────────────────────────────────────────────
function AiPromptPanel({
  companyName,
  websiteUrl,
  brandData,
  initialPrompt,
  onNewPrompt,
}: {
  companyName: string;
  websiteUrl: string;
  brandData: BrandData;
  initialPrompt: string | null;
  onNewPrompt: (p: string) => void;
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const generatePrompt = trpc.mock.generateImagePrompt.useMutation();
  const promptText = initialPrompt;

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await generatePrompt.mutateAsync({ companyName, websiteUrl, brandData });
      onNewPrompt(result.prompt);
    } catch {
      toast.error("プロンプトの生成に失敗しました。再試行してください。");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!promptText) return;
    await navigator.clipboard.writeText(promptText);
    setCopied(true);
    toast.success("プロンプトをコピーしました");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/40 bg-gradient-to-r from-violet-50/60 to-indigo-50/40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center">
            <Wand2 className="w-4 h-4 text-violet-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">AI画像生成プロンプト</h3>
            <p className="text-xs text-muted-foreground">Midjourney / DALL-E / Stable Diffusion 向け</p>
          </div>
        </div>
        {promptText && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="gap-1.5 text-xs h-8"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "コピー済み" : "コピー"}
          </Button>
        )}
      </div>
      {/* Body */}
      <div className="p-5">
        {!promptText && !isGenerating && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
              生成したモックUIをベースに、他のAIツールで本物のロゴと実写画像を組み込んだ
              高品質なイントラネット画像を作るためのプロンプトを生成します。
            </p>
            <Button onClick={handleGenerate} className="gap-2 bg-violet-600 hover:bg-violet-700 text-white">
              <Wand2 className="w-4 h-4" />
              プロンプトを生成
            </Button>
          </div>
        )}
        {isGenerating && (
          <div className="flex items-center gap-3 py-6 justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-violet-600" />
            <span className="text-sm text-muted-foreground">{companyName}向けプロンプトを生成中…</span>
          </div>
        )}
        {promptText && (
          <div className="space-y-3">
            <div className="relative">
              <pre className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap bg-muted/40 rounded-xl p-4 border border-border/40 font-sans max-h-64 overflow-y-auto">
                {promptText}
              </pre>
            </div>
            <p className="text-xs text-muted-foreground">
              このプロンプトをコピーして、お好みのAI画像生成ツールに貼り付けてください。
              モックUIのスクリーンショットと合わせて使用すると、より精度の高い画像が生成されます。
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="gap-1.5 text-xs text-muted-foreground"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              再生成
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Home() {
  const [companyName, setCompanyName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [brandData, setBrandData] = useState<BrandData | null>(null);
  const [mockHtml, setMockHtml] = useState<string | null>(null);
  const [imagePrompt, setImagePrompt] = useState<string | null>(null);
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
  const generateImagePromptMutation = trpc.mock.generateImagePrompt.useMutation();

  const handleGenerate = useCallback(async (name: string, url: string) => {
    if (!name.trim() || !url.trim()) {
      toast.error("企業名とURLを入力してください。");
      return;
    }
    try { new URL(url); } catch {
      toast.error("有効なURLを入力してください（例: https://example.com）。");
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
      // Auto-generate AI image prompt in background
      generateImagePromptMutation.mutateAsync({ companyName: name, websiteUrl: url, brandData: brand })
        .then(r => setImagePrompt(r.prompt))
        .catch(() => { /* silent fail, user can retry */ });
    } catch (err: unknown) {
      setStep("error");
      const message = err instanceof Error ? err.message : "生成に失敗しました。再試行してください。";
      toast.error(message);
    }
  }, [extractBrand, generateMock, generateImagePromptMutation]);

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
    setImagePrompt(null);
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
            <span className="font-semibold text-sm tracking-tight">Staffbase Mock Visualizer</span>
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
                  リセット
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
                    再生成
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
              AI搭載 · 外部画像不使用
            </div>
            <div className="space-y-4 max-w-2xl">
              <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-foreground leading-[1.05]">
                ブランドを<br />
                <span className="text-primary">Staffbaseで可視化</span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
                企業名と公式サイトURLを入力するだけ。AIがブランドカラーを抽出し、
                デスクトップとモバイルのStaffbaseイントラネットモックを即座に生成します。
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
                  企業名
                </Label>
                <Input
                  id="company"
                  placeholder="例: トヨタ、ソニー、NTT"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  className="h-11"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="url" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  公式サイトURL
                </Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://www.example.co.jp"
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
                モックを生成
              </Button>
            </form>
            {/* Feature tags */}
            <div className="flex flex-wrap justify-center gap-2">
              {[
                "ブランドカラー自動抽出",
                "デスクトップ (1280px)",
                "モバイル (390px · iPhone 13)",
                "CSSのみで描画",
                "外部画像不使用",
                "AI画像生成プロンプト付き",
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
                  ? `${companyName}のブランドカラーとアイデンティティを解析中…`
                  : `ブランドに合わせたStaffbaseイントラネットモックを生成中…`}
              </p>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-8 items-start">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-3">
                  <Monitor className="w-4 h-4" /> デスクトップ <span className="font-normal text-xs">(1280px)</span>
                </div>
                <SkeletonFrame isDesktop />
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-3">
                  <Smartphone className="w-4 h-4" /> モバイル <span className="font-normal text-xs">(390px)</span>
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
                { label: "プライマリー", value: brandData.primaryColor, color: brandData.primaryColor },
                { label: "セカンダリー", value: brandData.secondaryColor, color: brandData.secondaryColor },
                { label: "アクセント", value: brandData.accentColor, color: brandData.accentColor },
                { label: "フォント", value: brandData.fontStyle, color: null },
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
              「{brandData.tagline}」
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

            {/* AI Image Prompt Panel */}
            <AiPromptPanel
              companyName={companyName}
              websiteUrl={websiteUrl}
              brandData={brandData}
              initialPrompt={imagePrompt}
              onNewPrompt={setImagePrompt}
            />

            {/* Mobile action buttons */}
            <div className="flex sm:hidden items-center gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5 text-muted-foreground text-xs">
                <RotateCcw className="w-3.5 h-3.5" /> リセット
              </Button>
              <Button variant="outline" size="sm" onClick={handleRegenerate} className="gap-1.5 text-xs">
                <RefreshCw className="w-3.5 h-3.5" /> 再生成
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
              <h3 className="font-semibold text-lg">生成に失敗しました</h3>
              <p className="text-sm text-muted-foreground mt-1">問題が発生しました。再試行してください。</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReset} className="gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" /> リセット
              </Button>
              <Button onClick={handleRegenerate} className="gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" /> 再試行
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border/40 py-4 px-6">
        <p className="text-center text-xs text-muted-foreground/60">
          Staffbase Mock Visualizer · プリセールスデモツール · すべてのビジュアルはCSSのみで描画
        </p>
      </footer>
    </div>
  );
}
