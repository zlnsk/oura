# Premium UI Audit

> Build 7 — 2026-03-26 — Oura Health Dashboard

This document captures the premium UI audit recommendations, implementation status, and design guidelines for the Oura health dashboard.

---

## 1. Three-Step Flow Shell

The app follows a progressive **Onboarding -> Dashboard -> Detail** flow:

| Step | Component | Purpose |
|------|-----------|---------|
| Onboarding | `OnboardingGuard` | Guides first-time users to add their Oura API key |
| Dashboard | `DashboardShell` | Main chrome: sidebar, status bar, loading bar |
| Detail | Page-level routes | `/sleep`, `/activity`, `/readiness`, etc. |

### Implementation Checklist

- [x] `OnboardingGuard` component detects missing API token and renders setup wizard
- [x] Three-step visual guide (create token, paste in settings, auto-sync)
- [x] `DashboardShell` wraps all authenticated pages with sidebar + status indicators
- [ ] Animated route transitions between detail pages (future)
- [ ] Guided tooltip tour for first dashboard visit (future)

---

## 2. Progressive Disclosure

Content appears in layers so the user is never overwhelmed:

1. **Skeleton placeholders** render immediately on navigation.
2. **Stat cards** populate first (small payload).
3. **Charts** load after scores are visible.
4. **AI Summary** loads last (async LLM call).

### Implementation Checklist

- [x] `LoadingGrid` uses staggered `animationDelay` (80 ms per card, 100 ms per chart)
- [x] `skeleton` CSS utility for consistent placeholder styling
- [x] `animate-fade-in` with `animationFillMode: both` for smooth reveal
- [ ] Intersection Observer lazy-load for below-fold charts (future)

---

## 3. Skeletons & Status Chips

### Skeleton Loading

All loading states use the `.skeleton` utility class (`bg-slate-100 dark:bg-white/5 animate-pulse`) instead of hand-rolled placeholder styles.

### Status Chips

The `StatusChip` component provides five variants:

| Variant | Icon | Use Case |
|---------|------|----------|
| `synced` | CheckCircle2 | Data is fresh |
| `syncing` | RefreshCw (spinning) | Fetch in progress |
| `stale` | Clock | Cached data older than 15 min |
| `offline` | WifiOff | No network connection |
| `error` | AlertTriangle | Sync failed |

### Implementation Checklist

- [x] `StatusChip` component with five variants
- [x] `ConnectionStatus` in `DashboardShell` header derived from `useOuraData`
- [x] Replaces verbose `OfflineBanner` with compact chip
- [x] Shows relative time labels ("Just now", "5m ago", "2h ago")

---

## 4. Design Tokens

All visual values are centralized through CSS custom properties and Tailwind config.

### Color Tokens (CSS Variables)

```
--bg-primary, --bg-secondary, --bg-card, --bg-elevated
--text-primary, --text-secondary, --text-muted
--border, --ring
--surface-container-lowest ... --surface-container-highest
```

### Tailwind Tokens

- `oura-50` through `oura-950` — brand blue palette
- `accent-violet`, `accent-rose`, `accent-amber`, `accent-emerald`, `accent-cyan`
- `surface-1` through `surface-5` — M3 surface containers
- `shadow-card`, `shadow-card-hover`, `shadow-soft` — elevation system
- `ease-m3`, `ease-m3-decel`, `ease-m3-accel` — M3 easing curves

### Implementation Checklist

- [x] All component classes reference tokens (no magic hex values)
- [x] Dark mode tokens defined in `.dark` block
- [x] M3 surface tint system for elevation
- [ ] Extract remaining one-off values into tokens (ongoing)

---

## 5. Targeted Motion Rules

Motion is used sparingly and respects user preferences.

### Motion Budget

| Animation | Duration | Easing | Purpose |
|-----------|----------|--------|---------|
| `fade-in` | 400 ms | M3 standard | Page/card entry |
| `slide-up` | 400 ms | M3 standard | List item entry |
| `slide-in-right` | 300 ms | M3 standard | Panel reveal |
| `loading-bar` | 1.5 s | M3 standard | Top progress indicator |
| `float` | 6 s | ease-in-out | Decorative idle motion |
| `shimmer` | 2 s | linear | Skeleton shimmer |

### Reduced Motion

All animations are disabled when `prefers-reduced-motion: reduce` is active:

- Keyframe animations set to `animation: none !important`
- Transitions collapsed to `0.01ms`
- Tailwind screen variants `motion-safe` / `motion-reduce` available

### Implementation Checklist

- [x] `@media (prefers-reduced-motion: reduce)` block in `globals.css`
- [x] `motion-safe` and `motion-reduce` screen variants in Tailwind config
- [x] Staggered skeleton delays use `animationFillMode: both` to avoid flash
- [ ] Add `will-change` hints for GPU-composited animations (future)

---

## 6. Security & Rate-Limit Hardening

### HTTP Security Headers (next.config.js)

| Header | Value | Purpose |
|--------|-------|---------|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Force HTTPS |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limit referrer leakage |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), interest-cohort=()` | Disable unused APIs |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `X-DNS-Prefetch-Control` | `on` | Faster DNS resolution |
| `Content-Security-Policy` | See next.config.js | Restrict resource origins |

### API Rate Limiting

- Daily per-user limit on AI summary endpoint (default 20/day)
- Rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`) on responses
- Request body size validation (max 100 KB)
- Page type allow-list validation

### Implementation Checklist

- [x] CSP header with explicit `connect-src` for Oura, Anthropic, Google APIs
- [x] `X-Frame-Options: DENY` to prevent embedding
- [x] `interest-cohort=()` to opt out of FLoC
- [x] Request body size check (413 on >100 KB)
- [x] Input sanitization — page type validated against allow-list
- [x] Rate limit headers in AI summary response
- [ ] Per-endpoint rate limiting middleware (future)
- [ ] CSRF token for mutation endpoints (future)
