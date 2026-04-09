# Oura -- Health Analytics Dashboard

A premium web dashboard for Oura Ring data with Withings weight tracking and AI-powered health insights. Designed as a desktop companion to the Oura mobile app, providing deep analysis across sleep, activity, readiness, heart rate, stress, workouts, and body composition.

Connect your Oura Ring and Withings scale, and get intelligent summaries of your health trends powered by AI.

![Next.js](https://img.shields.io/badge/Next.js-14-black) ![React](https://img.shields.io/badge/React-19-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue) ![License](https://img.shields.io/badge/License-MIT-blue)

## Features

- **Sleep analysis** -- sleep stages, duration, efficiency, HRV, heart rate trends
- **Activity tracking** -- steps, calories, activity intensity distribution
- **Readiness scores** -- daily recovery and readiness assessment
- **Heart rate & HRV** -- resting heart rate, HRV trends, cardiovascular insights
- **Stress & resilience** -- stress metrics and recovery patterns
- **Workout history** -- exercise sessions with intensity, duration, and calorie data
- **Weight & body composition** -- via Withings scale (fat %, muscle mass, bone mass, hydration)
- **AI health summaries** -- personalized insights for each health dimension using Claude AI
- **Dark mode** -- full dark theme support
- **PWA** -- installable as a Progressive Web App
- **Data export** -- export your health data

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- [Oura Personal Access Token](https://cloud.ouraring.com/personal-access-tokens) -- from your Oura account
- [Google OAuth credentials](https://console.cloud.google.com/) -- for sign-in (optional for local dev)
- [OpenRouter API key](https://openrouter.ai/) -- for AI summaries (optional)
- [Withings Developer Account](https://developer.withings.com/) -- for weight data (optional)

## Quick Start

```bash
git clone https://github.com/zlnsk/oura.git
cd oura
npm install
cp .env.example .env.local
# Edit .env.local with your tokens and API keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## API Keys Setup

### Oura Ring (Required)

1. Go to [cloud.ouraring.com/personal-access-tokens](https://cloud.ouraring.com/personal-access-tokens)
2. Create a new Personal Access Token
3. This gives access to your sleep, activity, readiness, heart rate, and workout data

### Google OAuth (Optional)

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the Google+ API
3. Create OAuth 2.0 credentials (Web application)
4. Add `http://localhost:3000/api/auth/callback/google` as a redirect URI
5. For local development, you can skip this and access the app directly

### OpenRouter (Optional)

1. Sign up at [openrouter.ai](https://openrouter.ai/)
2. Create an API key
3. Powers the AI health summaries on each dashboard page

### Withings (Optional)

1. Create a developer account at [developer.withings.com](https://developer.withings.com/)
2. Register an application
3. Copy the Client ID and Client Secret
4. Provides weight and body composition data from Withings scales

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `OURA_TOKEN` | Yes | Oura Personal Access Token |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret |
| `NEXTAUTH_URL` | No | App URL (default: http://localhost:3000) |
| `NEXTAUTH_SECRET` | No | NextAuth session secret |
| `OPENROUTER_API_KEY` | No | OpenRouter API key for AI |
| `WITHINGS_CLIENT_ID` | No | Withings OAuth client ID |
| `WITHINGS_CLIENT_SECRET` | No | Withings OAuth client secret |

## Tech Stack

- **Framework:** Next.js 14, React 19, TypeScript
- **Styling:** Tailwind CSS with dark mode
- **Charts:** Recharts
- **Auth:** NextAuth.js (Google OAuth)
- **APIs:** Oura Cloud API, Withings API, OpenRouter
- **PWA:** Service Worker with offline caching

## License

MIT
