# Oura Analytics - Comprehensive Analysis & Improvement Proposals

## Application Overview

Oura Analytics is a **Next.js 14 web application** serving as a health intelligence dashboard for Oura Ring users. It pulls data from the Oura API (sleep, activity, readiness, HR, stress, workouts), optionally integrates Withings for body composition, and uses Claude AI for health insights. The app uses Google OAuth for authentication, httpOnly cookies for API key storage, React Context for state management, Recharts for visualization, and localStorage for caching — with no backend database.

**Tech Stack**: Next.js 14, React 18, TypeScript, Tailwind CSS, NextAuth.js, Recharts, Anthropic SDK

**Key Pages**: Dashboard, Sleep, Activity, Readiness, Heart Rate, Stress, Workouts, Weight, Settings

---

## 10 Functionality Improvements

### 1. Data Export & Sharing
**Problem**: No way to export health data from the application.
**Proposal**: Add CSV/PDF export for any date range, allowing users to share reports with doctors or keep personal records. Each page should have an "Export" button in the `PageHeader` action slot. Include chart screenshots via html2canvas for visual reports.

### 2. Custom Date Comparison (Side-by-Side)
**Problem**: Users can only view one date range at a time.
**Proposal**: Add a "Compare" mode that lets users overlay two date ranges (e.g., this week vs. last week, this month vs. same month last year) on the same chart with different opacities/colors, making it easy to spot trends and improvements.

### 3. Goal Setting & Progress Tracking
**Problem**: No goal system exists — all data is observational.
**Proposal**: Add user-configurable targets (e.g., 8h sleep, 10k steps, readiness > 80) with progress bars on the dashboard. Store goals in cookies or localStorage. Show daily/weekly achievement rates with streak counters.

### 4. Smart Notifications & Alerts
**Problem**: The app is entirely passive — users must open it to see data.
**Proposal**: Add optional browser push notifications for significant events: unusually low readiness, missed activity goals, irregular HR patterns, or when new data syncs. Allow per-metric notification thresholds in Settings.

### 5. Correlation Insights Engine
**Problem**: Individual metrics are shown in isolation with no cross-metric analysis.
**Proposal**: Build an automatic correlation engine that identifies relationships between metrics (e.g., "Your readiness is 15% higher on days you sleep before 11 PM", "Your HRV drops after high-intensity workouts"). This can leverage the existing AI summary infrastructure with structured prompts.

### 6. Faster Initial Load with Incremental Data Fetching
**Problem**: `fetchData()` loads ALL 14 endpoints before rendering anything.
**Proposal**: Implement progressive loading — fetch today's scores first (for dashboard cards), then load historical data in the background. Users see key stats in <1 second instead of waiting for full sync. Use React Suspense boundaries per section.

### 7. Keyboard Shortcuts for Power Users
**Problem**: No keyboard shortcuts exist beyond Escape to close mobile menu.
**Proposal**: Add global keyboard shortcuts: `1-8` for page navigation, `←/→` for date navigation, `R` to refresh, `T` for theme toggle, `?` for shortcut help modal. The sidebar already has route labels — map them to number keys.

### 8. Data Annotations & Personal Notes
**Problem**: Users can't annotate their health data with context.
**Proposal**: Add the ability to tag specific days with notes (e.g., "sick day", "traveled", "new mattress") that appear on charts as vertical marker lines. Oura's tag API is already fetched but unused — leverage this existing data.

### 9. Workout Auto-Classification & Insights
**Problem**: The workouts page shows raw data but lacks analytical depth.
**Proposal**: Add workout frequency charts, personal records tracking, recovery time analysis (readiness score day after workouts), sport-specific breakdowns, and training load trends. Show correlations between workout intensity and next-day recovery.

### 10. Offline-First Progressive Web App (PWA)
**Problem**: Basic offline support exists via localStorage but the app isn't installable.
**Proposal**: Add a service worker, web app manifest, and install prompt so users can "install" it on mobile/desktop with full offline functionality and faster repeat visits. Cache static assets and API responses with proper strategies.

---

## 5 Security Improvements

### 1. Persistent Rate Limiting
**Problem**: Rate limiter is in-memory — resets on every server restart/deployment.
**Proposal**: Replace with a persistent store (Redis, or at minimum file-based for all endpoints). The AI summary endpoint has a file-based fallback, but the Oura proxy (`200 req/user/day`) relies entirely on memory. In production with frequent deployments, rate limits become ineffective.

### 2. Content Security Policy (CSP) Header
**Problem**: Missing `Content-Security-Policy` header despite other security headers being present.
**Proposal**: Add a strict CSP restricting `script-src 'self'`, `style-src 'self' 'unsafe-inline'` (for Tailwind), `connect-src` to known API domains (api.ouraring.com, api.anthropic.com, wbsapi.withings.net), and `img-src 'self' lh3.googleusercontent.com`. This significantly mitigates XSS.

### 3. API Token Verification on Save
**Problem**: Token validation only checks format (regex), not validity.
**Proposal**: When saving an Oura token or Anthropic key, make a test API call to verify the token is actually valid before storing. The Settings UI has "Test" button patterns — ensure the backend enforces verification before cookie storage.

### 4. Encrypted localStorage Cache
**Problem**: Health data in localStorage is plaintext JSON — accessible to anyone with browser access.
**Proposal**: Encrypt the cache using the Web Crypto API with a key derived from the user's session token, so cached data is only readable during an active authenticated session. On logout, clear the encryption key.

### 5. Audit Logging for Security Events
**Problem**: No logging of security-sensitive operations.
**Proposal**: Add structured server-side logging for: token creation/deletion, failed authentication attempts, rate limit violations, AI summary requests, and OAuth flow completions. This enables abuse detection and supports incident investigation.

---

## 10 Design Improvements

### 1. Unified Health Score Hero Widget
**Problem**: Dashboard shows three separate ScoreRing components with no combined view.
**Proposal**: Add a single combined health score visualization (weighted average of sleep, activity, readiness) as the hero element at the top of the dashboard. The three individual rings appear below it. Gives users an instant "how am I doing?" answer.

### 2. Consistent Chart Interaction Patterns
**Problem**: Charts across pages use inconsistent interaction patterns.
**Proposal**: Standardize all charts with: hover tooltips showing exact values + date, click-to-drill-down to daily view, and pinch-to-zoom on mobile. Create a shared `ChartWrapper` component enforcing these patterns.

### 3. Guided Onboarding Flow
**Problem**: New users land on settings and must figure out API key setup alone.
**Proposal**: Add a step-by-step onboarding wizard: (1) Welcome + connect Google, (2) Enter Oura token with visual guide showing where to find it, (3) Optional AI setup with explanation, (4) Optional Withings integration. Use a modal stepper with progress indicator.

### 4. Micro-Animations for Data Transitions
**Problem**: Score changes and data updates happen instantly with no visual feedback.
**Proposal**: Add number counting animations on StatCard values, smooth chart transitions when changing date ranges, subtle scale animations on ScoreRing when scores update, and fade transitions between pages. This creates a polished, responsive feel.

### 5. Mobile Bottom Tab Navigation
**Problem**: Mobile sidebar requires hamburger tap + full-screen overlay for navigation.
**Proposal**: Replace with a bottom tab bar (native mobile pattern) showing the 4 most-used sections (Dashboard, Sleep, Activity, HR) with a "More" tab for remaining pages. Reduces navigation from 2 taps to 1 on mobile.

### 6. Dark Mode Color Contrast Refinement
**Problem**: Dark mode uses #111116 background with #1c1c24 cards — contrast is very subtle.
**Proposal**: Increase elevation contrast: use #0a0a0f for base background, #16161e for cards, #1e1e28 for elevated elements (modals, dropdowns). Add subtle gradient overlays to premium cards for depth. Test with contrast ratio tools.

### 7. Data Density Controls
**Problem**: Fixed layout density regardless of user preference or screen size.
**Proposal**: Add a compact/comfortable/spacious density toggle in the sidebar or settings. Adjusts card sizes, chart heights, font sizes, and grid columns. Power users see everything at once (compact); casual users get breathing room (spacious).

### 8. Contextual Empty States
**Problem**: Generic EmptyState component used across all pages.
**Proposal**: Create page-specific empty states with contextual guidance. Sleep: "No sleep data — check ring was charged and worn." Activity: "No activity recorded — try a short walk." Include helpful illustrations and actionable next steps.

### 9. Typography Scale System
**Problem**: Inconsistent text sizing without a clear hierarchy across pages.
**Proposal**: Define and enforce a strict type scale as utility classes in globals.css: `.heading-page` (text-2xl font-bold), `.heading-section` (text-lg font-semibold), `.heading-card` (text-sm font-medium text-muted), `.value-primary` (text-3xl font-bold tabular-nums), `.value-secondary` (text-xl font-semibold).

### 10. AI Summary Card Visual Distinction
**Problem**: AISummaryCard looks identical to data cards — no visual distinction for AI content.
**Proposal**: Redesign with: gradient border (subtle purple-to-blue, Anthropic-inspired), small sparkle/AI icon, expandable sections for different insight categories (overall, sleep, activity, tips), and a "regenerate" button. Use a distinct visual language (slight background tint) so users always know when content is AI-generated vs. raw data.

---

## Priority Matrix

| Priority | Functionality | Security | Design |
|----------|--------------|----------|--------|
| **High** | #6 Incremental loading, #10 PWA | #1 Persistent rate limiting, #2 CSP header | #3 Onboarding flow, #5 Mobile nav |
| **Medium** | #1 Data export, #5 Correlations, #8 Annotations | #3 Token verification, #5 Audit logging | #1 Health score widget, #4 Animations, #10 AI card |
| **Low** | #2 Comparison, #3 Goals, #4 Notifications, #7 Shortcuts, #9 Workout insights | #4 Encrypted cache | #2 Chart consistency, #6 Dark mode, #7 Density, #8 Empty states, #9 Typography |
