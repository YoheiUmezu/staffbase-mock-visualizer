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
