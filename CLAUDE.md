# CLAUDE.md

This file provides guidance to Claude Code when working with the Novel2Script-AI project.

## Project Overview

AI 小说转剧本工具 — converts multi-chapter novels into YAML screenplay format. Supports movies, TV series, and short dramas.

## Tech Stack

- Next.js 14 (App Router) — full-stack framework
- TypeScript — type safety
- Tailwind CSS — styling
- CodeMirror 6 — YAML editor (~150KB, not Monaco)
- Zod — shared schema validation (frontend + backend)
- js-yaml — YAML serialization
- Claude API (Anthropic SDK) — AI conversion

## Architecture

```
Input Page  →  POST /api/convert  →  Claude API  →  Editor Page
  (chapters)     (NDJSON stream)     (JSON→YAML)    (edit+preview+download)
```

Key design decisions:
- **No database** — stateless MVP, sessionStorage for temporary data
- **Two-phase response** — Phase 1 (characters) at 3s, Phase 2 (full YAML) at 20s
- **Single Zod source** — `lib/schema.ts` shared by frontend and backend
- **No streaming (SSE)** — two-phase costs 1/3 of streaming implementation

## Directory Structure

```
app/           Pages + API routes (App Router)
components/    React components (grouped by page: input/ + editor/)
hooks/         Client state management (useChapterList, useConvert, useEditorValidation)
lib/           Core logic (schema, prompt, converter, yaml, validators)
constants/     Global constants (genres, formats, limits)
types/         TypeScript type definitions
docs/          Deliverable documentation (30% of scoring weight)
fixtures/      Test novel samples (sci-fi, romance, history)
```

## Key Files

| File | Purpose |
|------|---------|
| `lib/schema.ts` | **Single source of truth** — Zod schemas imported by both frontend and backend |
| `lib/prompt.ts` | Claude system prompt with genre-specific strategies |
| `lib/converter.ts` | Conversion pipeline: validate → prompt → Claude → JSON → YAML → validate |
| `lib/validators.ts` | YAML parsing + Zod validation for editor real-time lint |
| `types/index.ts` | All TypeScript interfaces |
| `constants/index.ts` | All hardcoded values in one place |

## Schema Design Principles

1. **Three-layer separation** — meta / characters / scenes = 剧本工业标准
2. **Single source of truth** — ID references (CH-001, SC-001) not inline duplication
3. **discriminatedUnion for blocks** — each block type carries only its own fields
4. **No config section** — derivable from meta.format, Zod regex is the real enforcer
5. **source_chapter** — critical for novel-to-script traceability
6. **time_of_day: only day/night** — industry standard, reduces LLM choice burden

## Running

```bash
npm run dev     # Development server on port 3000
npm run build   # Production build
npm run lint    # ESLint
```

## Environment

Copy `.env.example` to `.env.local` and set:
- `ANTHROPIC_API_KEY` — your Claude API key from https://console.anthropic.com/
