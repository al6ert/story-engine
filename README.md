# StoryEngine AI

StoryEngine AI is a small React + Vite app for generating illustrated, personalized storybooks with Gemini models.

The app is organized as a 3-step workflow:

1. `Architect`
   Build the story blueprint from a seed idea.
2. `Oracle`
   Fill or auto-suggest story variables, then generate the full set of pages.
3. `Delivery`
   Review pages, copy story text, export a prompt log, or download the story as PDF.

## What The App Does

- Turns a short seed idea into a story synopsis and visual art direction.
- Generates a set of personalization variables such as names, places, or story details.
- Creates story pages one by one with short narrative text and an image prompt.
- Requests image generation for each page and keeps the previous image as reference for visual consistency.
- Exports the final result as PDF and can also export a text log with prompts and generated text.

## Tech Stack

- `React 19`
- `TypeScript`
- `Vite`
- `@google/genai`
- `jsPDF`
- `lucide-react`

## Project Flow

### 1. Architect

The Architect phase takes a seed prompt and asks Gemini for:

- `context`: the global synopsis
- `artStyle`: the visual direction
- `variables`: the personalization questions

Users can lock the synopsis, the art direction, or individual variables before regenerating.

### 2. Oracle

The Oracle phase lets the user:

- manually answer variables
- auto-fill missing variables with Gemini
- generate the final story page-by-page

During page generation the app:

1. asks a text model for page text plus an image prompt
2. sends the image prompt to an image model
3. optionally uses the previous page image as visual reference
4. stores the result in memory for the Delivery phase

The UI includes an on-screen log panel so stalled or failed generations are easier to diagnose.

### 3. Delivery

The Delivery phase lets the user:

- browse generated pages
- copy the raw text
- download a generation log
- export the book as an A4 PDF

## Running Locally

### Prerequisites

- `Node.js` 18+ recommended
- a valid Gemini API key or access through AI Studio

### Install

```bash
npm install
```

### Environment

Create or edit [`.env.local`](./.env.local):

```env
GEMINI_API_KEY=your_real_api_key_here
```

Important:

- `PLACEHOLDER_API_KEY` will not work.
- If you change `.env.local`, restart the dev server.
- This project injects the key through Vite at startup time.

### Start The App

```bash
npm run dev
```

The app runs on:

```text
http://localhost:3000
```

### Production Build

```bash
npm run build
```

## AI Studio vs Local Dev

This app supports two execution contexts:

- `AI Studio wrapper`
  Uses `window.aistudio` to detect and select an API key from the AI Studio environment.
- `Local development`
  Falls back to the key injected from `.env.local`.

If you are running locally, the app assumes a key exists and does not show the AI Studio key selector screen.

## Model Notes

Current model usage in the codebase:

- blueprint generation: `gemini-3-flash-preview`
- variable inspiration: `gemini-3-flash-preview`
- page text generation: `gemini-3-pro-preview`
- image generation:
  - default: `gemini-3-pro-image-preview`
  - free-tier fallback: `gemini-2.5-flash-image`

The UI includes a free-tier path because some image-capable models may require a paid Google Cloud project.

## Known Limitations

- Project state is kept in memory only. Reloading the page resets local work.
- Story generation runs sequentially by page, so image latency can make the app feel frozen.
- There is no server backend; all generation calls happen from the frontend.
- Large generated images are stored as base64 data URLs, which can increase memory usage.
- Exported PDF quality depends on what the image model returned.

## Troubleshooting

### "Failed to generate blueprint"

Likely causes:

- invalid or missing `GEMINI_API_KEY`
- dev server was not restarted after editing `.env.local`
- model access or quota restrictions

### The App Looks Frozen During Story Generation

Most likely the app is waiting on a long-running model call.

Check the Oracle log panel for messages such as:

- `Calling text model: ...`
- `Text model returned page copy and image prompt.`
- `Calling image model: ...`
- `Image model returned no inline image data.`

If the last visible log is an image-model call, the delay is probably in image generation rather than in the React UI itself.

### My Paid Project Does Not Show Up In AI Studio

The app already hints at this in the UI:

- some pro image models require a paid Google Cloud project
- free-tier projects may be filtered out by AI Studio

If needed, switch to the standard model path from the UI.

## Repository Structure

```text
.
├── App.tsx
├── components/
│   ├── ArchitectView.tsx
│   ├── OracleView.tsx
│   ├── DeliveryView.tsx
│   └── Sidebar.tsx
├── services/
│   └── geminiService.ts
├── types.ts
├── vite.config.ts
└── .env.local
```

## Main Files

- [`App.tsx`](./App.tsx)
  Main application shell, phase navigation, project lifecycle, AI Studio key handling.
- [`components/ArchitectView.tsx`](./components/ArchitectView.tsx)
  Blueprint generation and editing UI.
- [`components/OracleView.tsx`](./components/OracleView.tsx)
  Variable input, story generation, and on-screen execution logs.
- [`components/DeliveryView.tsx`](./components/DeliveryView.tsx)
  Story review, copy/export actions, and PDF generation.
- [`services/geminiService.ts`](./services/geminiService.ts)
  Gemini integration for blueprint, variable suggestions, text generation, and image generation.
- [`vite.config.ts`](./vite.config.ts)
  Dev server configuration and env injection.

## Suggested Next Improvements

- persist projects in `localStorage` or a backend
- add request timeouts and cancellation for long image generations
- surface model and quota errors more clearly in the UI
- move API calls to a backend if you need stronger key isolation
- add tests around generation flow and export behavior
