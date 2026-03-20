# FusionAI — Fusion Video Editor

**Final Year Project — Plymouth University**  
*By Sandil Samarasekara*

A modern, full-featured React-based video editor built with Next.js, Remotion, and Cloudflare R2.

## Features

- 🎬 Timeline-based video editing
- 📤 Direct file uploads to Cloudflare R2
- 🔐 Firebase authentication
- 🎨 Rich animation and transition library
- 🎤 Speech-to-text transcription
- 📹 Cloud rendering via DesignCombo API
- 🌐 Asset import from URLs
- 🤖 Smart editing (scene detection, silence detection, auto highlights)
- 📊 Project dashboard with Supabase persistence

## Tech Stack

- **Framework**: Next.js 15.3.2
- **Rendering**: Remotion 4.0.315
- **Storage**: Cloudflare R2
- **Database**: Supabase (PostgreSQL)
- **Auth**: Firebase Authentication
- **UI**: Radix UI + Tailwind CSS
- **State Management**: Zustand

## Getting Started

### Prerequisites

- Node.js 18+ or 20+
- pnpm 10.15.0+ (recommended)
- Cloudflare R2 bucket
- Firebase project
- Supabase project
- DesignCombo API key

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd fusion-video-editor
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Configure environment variables**:
   
   Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

   Update `.env.local` with your credentials (see [Environment Variables](#environment-variables) below).

4. **Run the Supabase schema**:
   - Open your Supabase project → SQL Editor
   - Paste the contents of `supabase/schema.sql`
   - Click Run

5. **Run the development server**:
   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to login or the dashboard.

### Build for Production

```bash
pnpm build
pnpm start
```

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `COMBO_SK` | DesignCombo API secret key (render, transcribe) |
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase service account JSON (minified, single line) |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase client config (API key, auth domain, etc.) |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 access key |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 secret key |
| `R2_ENDPOINT` | R2 endpoint URL |
| `R2_BUCKET_NAME` | R2 bucket name |
| `R2_PUBLIC_URL` | Public R2 URL (e.g. `https://pub-xxx.r2.dev`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |

### Optional (features degrade gracefully if missing)

| Variable | Description |
|----------|-------------|
| `PEXELS_API_KEY` | Pexels API key — powers Images and Videos search panels |
| `GEMINI_API_KEY` | Google Gemini API key — powers Smart Edit and transcription |
| `GIPHY_API_KEY` | Giphy API key — powers stickers and elements |
| `REPLICATE_API_TOKEN` | Optional: Replicate API for server-side Remove BG (paid). Default uses free in-browser removal. |
| `NEXT_PUBLIC_DEV_MODE` | Set to `"true"` only for local dev without auth — **never in production** |

## Routes

| Path | Description |
|------|-------------|
| `/` | Redirects to `/dashboard` (logged in) or `/login` |
| `/login` | Sign in |
| `/signup` | Create account |
| `/dashboard` | Project list, create new project |
| `/editor/[projectId]` | Main editor (protected, loads project from DB) |
| `/edit` | Editor without project (no persistence) |
| `/edit/[id]` | Editor with project ID (legacy route) |

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── api/              # API routes
│   │   │   ├── uploads/      # File upload, URL import
│   │   │   ├── render/       # Video rendering
│   │   │   ├── transcribe/   # Speech-to-text
│   │   │   ├── analyze-video/    # Smart Edit (scenes, silences, highlights)
│   │   │   ├── analysis-history/ # Analysis history persistence
│   │   │   ├── projects/    # Project CRUD
│   │   │   └── ...
│   │   ├── dashboard/        # Project dashboard
│   │   ├── editor/           # Editor page (protected)
│   │   └── edit/             # Editor (unprotected)
│   ├── features/editor/      # Editor UI, timeline, controls
│   ├── lib/
│   │   ├── auth/             # Firebase auth client & server
│   │   ├── db/               # Supabase, projects, assets, renders
│   │   └── storage/          # R2 client
│   └── components/
├── supabase/
│   └── schema.sql            # Database schema
└── public/
```

## Key Features

### Upload System

1. **Direct File Upload**: Client gets presigned URL from `/api/uploads`, uploads to R2, confirms via `/api/uploads/complete`
2. **URL Import**: Server fetches from external URL and uploads to R2

### Authentication

- Firebase Auth (email/password, Google)
- API routes verify Bearer token or session cookie
- Per-user folder isolation in R2

### Video Rendering

- DesignCombo API: `POST /api/render` to start, `GET /api/render/[id]` to poll status

### Smart Editing

- Scene detection, silence detection, auto highlights
- Analysis history saved per project (when opened from dashboard)

### Remove Background (AI)

- One-click background removal for images — **free, runs in your browser** via [@imgly/background-removal](https://github.com/imgly/background-removal-js)
- Select an image in the editor → Image controls → "Remove Background" button (magic wand icon)
- No API key required — processing happens locally; no images are sent to external servers
- Result is uploaded to your R2 bucket

## Development

### Lint & Format

```bash
pnpm lint
pnpm format
```

## Troubleshooting

### PowerShell Script Execution Blocked

If pnpm or npm scripts fail with execution policy errors:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
pnpm install
```

Or run as Administrator for a one-time bypass:

```powershell
powershell -ExecutionPolicy Bypass -Command "pnpm install"
```

### Remotion Version Conflicts

If you see "Multiple versions of Remotion detected":

1. Delete `node_modules` and `.next`
2. Run `pnpm install` again
3. `pnpm.overrides` in package.json enforces a single Remotion version

### Upload 401 Errors

- Ensure you're logged in (Firebase Auth)
- Check `NEXT_PUBLIC_FIREBASE_*` variables in `.env.local`
- Verify `FIREBASE_SERVICE_ACCOUNT` is valid JSON (minified, no newlines)
- Restart dev server after changing env vars

### Dashboard / Database Errors

- Run `supabase/schema.sql` in Supabase SQL Editor
- Verify `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are set
- Tables required: `users`, `projects`, `assets`, `renders`, `analysis_history`

### Cache / Stale Build Issues

```bash
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules/.cache -ErrorAction SilentlyContinue
pnpm dev
```

### Remove Background Not Working

- **"Not authenticated"**: Log in first — Remove Background uploads the result to R2 and requires auth.
- **Slow first run**: The first use downloads ~80MB of AI model files; they are cached locally afterward.
- **CORS errors**: Ensure the image URL is accessible. Images from your R2 or same-origin URLs work best.

## Contributing

1. Create a feature branch
2. Make your changes
3. Run `pnpm lint` and `pnpm format`
4. Test upload, render, and save flows
5. Submit a pull request

## License

MIT License. See [LICENSE](LICENSE) for details.
