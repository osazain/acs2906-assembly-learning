# Implementation Plan

## Phase 0 - Bootstrap and Guardrails
- Set up repo structure
- Configure Vite + React + TypeScript app shell
- Add TanStack Router
- Add Tailwind v4 + shadcn/ui theming foundation
- Add Dexie persistence scaffold
- Add GitHub Actions deployment workflow
- Add AGENTS.md and docs

## Phase 1 - Content Ingestion and Normalization
Goals:
- Inventory all raw course materials
- Normalize lectures, examples, worksheets, assignments, and cross references into structured JSON
- Build lecture/example/worksheet/assignment mappings
- Build instruction index and concept taxonomy
- Validate provenance and schema integrity

Acceptance:
- Processed content exists under /data/processed
- Validation scripts pass
- No processed object lacks provenance

## Phase 2 - Reading and Navigation Surfaces
Goals:
- Course map page
- Lecture reader page
- Example explorer
- Search across topics/examples/lectures
- Source-linked navigation between related objects

Acceptance:
- Users can open any lecture and jump to related examples and practice
- Works on mobile and desktop

## Phase 3 - Assessment Engine
Goals:
- Question bank model
- Drill mode
- Baseline diagnostic
- Results and remediation engine
- Local progress recording

Acceptance:
- Assessment items are source-tagged
- Results point to exact review targets

## Phase 4 - Game Systems
Goals:
- Implement 3 to 5 high-value games first
- Connect game results to mastery model
- Keep all content source-grounded

Acceptance:
- Games feel useful, not gimmicky
- Gameplay outcomes influence recommendations

## Phase 5 - Simulator Integration
Goals:
- Evaluate existing simulator assets
- Integrate simulator into lecture/examples/test flows
- Add preloaded challenge presets

Acceptance:
- Learners can launch examples into the simulator from the app

## Phase 6 - Mastery Dashboard
Goals:
- Heatmaps by topic and instruction
- Weakness summaries
- Suggested study path
- Review queue

Acceptance:
- Dashboard clearly reflects local study history

## Phase 7 - Polish and Release
Goals:
- Accessibility pass
- Motion polish
- Offline resilience
- GitHub Pages hardening
- Final QA

Acceptance:
- Production build deploys cleanly to GitHub Pages
- App is comfortable on phone
