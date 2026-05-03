# Staffbase Mock Visualizer — TODO

- [x] tRPC procedure: brand extraction via LLM (company name + URL → colors, font, logo text)
- [x] tRPC procedure: mock HTML generation via LLM (brand data → full Staffbase-style HTML/CSS)
- [x] Frontend: elegant landing/input form (company name + URL)
- [x] Frontend: side-by-side desktop (1280px) + mobile (375px) iframe preview panels
- [x] Frontend: loading states with progress feedback
- [x] Frontend: regenerate button (re-runs generation with same inputs)
- [x] Frontend: reset button (clears all state back to initial)
- [x] Global CSS: refined typography, spacing, color palette
- [x] Vitest: test brand extraction procedure
- [x] Checkpoint and deliver

## Bug Fixes (Round 2)
- [x] Fix brand color extraction: fetch actual website HTML/CSS and pass to LLM for real color detection
- [x] Fix mobile preview width to iPhone 13 actual CSS width (390px)
- [x] Generate all mock UI text content in Japanese

## Bug Fixes (Round 3)
- [x] Fix mobile preview: replace clipped phone frame with flat Staffbase app screen (status bar + bottom nav visible, no bezel cutoff)
- [x] Add AI image generation prompt panel: after mock generation, show a copyable company-specific prompt for use in other AI tools
- [x] Add tRPC procedure to generate the AI image prompt via LLM based on brand data + generated HTML structure

## Bug Fixes (Round 4)
- [x] SD prompt: restructure to ①レイアウト ②ブランド ③ビジュアル ④品質 sections
- [x] HTML download: add "HTMLをダウンロード" button that saves generated mock as .html file
- [x] Nav color extraction: extract primary color specifically from nav/header background of target site
- [x] Replace face widget: remove user profile/avatar widget from generated mock, replace with 必読コンテンツ widget

## Bug Fixes (Round 4 — Deterministic Enforcement)
- [x] Server-side: override LLM primaryColor with extractedNavColor when available (deterministic, not LLM-dependent)
- [x] Server-side: post-process generated HTML to inject 必読コンテンツ widget and remove profile/avatar widgets

## Bug Fixes (Round 5)
- [x] Mock HTML: fill all sections so no empty whitespace appears (hero, news cards, sidebar, quick links all fully populated)
- [x] Mock HTML: bottom navigation bar rendered only in mobile layout (not in desktop)
- [x] Mock HTML: add <img alt="[image generation prompt]"> inside each news card at the appropriate thumbnail position
- [x] Mock HTML: alt text of each img must be a concise English image generation prompt matching the card's content
- [x] SD prompt: remove 4K/8K/resolution quality tags from ④品質 section

## Bug Fixes (Round 6)
- [x] News card img alt: rewrite to Flux-optimized prompt format (subject, style, lighting, composition — no resolution tags)
- [x] Nav logo: add <img alt="[Flux logo recreation prompt]"> in the navigation bar logo area with company-specific logo description
- [x] Both alt prompts must be in English and immediately usable in Cursor + Flux

## Bug Fixes (Round 7)
- [x] Mobile layout: all content sections display as single column (1 item per row) on mobile
- [x] Mobile bottom nav: fix width so it spans full screen width without breaking
- [x] Mobile: remove 社内統計 (progress bar widget) from mobile layout
- [x] Desktop + Mobile: add company-specific community section (groups/channels relevant to the company's industry)
