---
name: verify
description: How to build, launch and drive the Route 66 PWA to verify changes at its real surface (browser GUI).
---

# Verifying the Route 66 PWA

## Build / typecheck
- `npm run build` — runs `tsc -b && vite build`. Worker has no own build; check it with:
  `npx tsc --noEmit --strict --target es2022 --lib es2022,webworker --module es2022 --moduleResolution bundler worker/src/index.ts`

## Launch
- `npm run dev` (background) → serves at **http://localhost:5173/route-66/** (note the `/route-66/` base path).
- Routing is hash-based: `#/home/city/chicago`, `#/home/leg/<id>`, `#/more/plan`, `#/more/expenses`, `#/more/settings`, …

## Drive (claude-in-chrome)
- A fresh browser profile shows the **"Who is using this phone?" modal first** — click a traveler (e.g. Falco) before anything else.
- **Never click Remove / Reset buttons** — they call `confirm()`, which blocks the extension. To reset test edits instead, clear localStorage keys via javascript_tool: all app keys are prefixed `r66.` (e.g. `r66.planOverrides`, `r66.overrides`, `r66.lang`).
- Language toggle for EN/ES checks: `localStorage.setItem('r66.lang','"es"'); location.reload()` (value is JSON, keep the inner quotes).
- Sync is off in a fresh profile (no `r66.tripPin`), so edits stay local — safe to test.

## Gotchas
- The dev page can re-render between screenshots (layout shifts) — re-screenshot before clicking modal buttons.
- `read_page` a11y tree may omit some input values; trust screenshots.
