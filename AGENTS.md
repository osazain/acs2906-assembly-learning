# AGENTS.md

## Project Mission
Build a comprehensive, beautiful, mobile-friendly web learning platform for ACS2906 Assembly Language Programming using the repository's lectures, examples, worksheets, assignments, cross references, and existing web platform assets.

## Product Goals
- Turn raw course material into a mastery-based learning app.
- Use source-grounded pedagogy: every important explanation, drill, quiz, test, and remediation path must trace back to real course material.
- Make the app elegant, fast, offline-friendly, and comfortable on desktop and phone.
- Support light mode and dark mode with a premium, calm visual style.
- Deploy on GitHub Pages first. Keep architecture sync-ready for future multi-device progress sync.

## Non-Negotiables
- Do not ship generic edtech filler.
- Do not invent course facts and present them as source truth.
- Reuse or refactor valuable existing WebPlatform assets instead of rebuilding blindly.
- Every content object must preserve provenance metadata.
- Every assessment item must include concept tags and source references.
- Every remediation recommendation must point to exact lecture/example/worksheet/assignment sources.

## Delivery Strategy
- Use Specification Mode before major implementation.
- Save all plans under /docs/product.
- Implement one phase at a time.
- Validate each phase before the next phase starts.
- Update the implementation plan after each phase.
- Prefer small PRs and milestone commits.

## Target Stack
- React + TypeScript + Vite
- TanStack Router with file-based routing
- Tailwind CSS v4 + shadcn/ui
- Motion for restrained, high-quality animations
- IndexedDB via Dexie for local persistence
- GitHub Pages deployment via GitHub Actions

## GitHub Pages Constraints
- Static hosting only
- Prefer hash-based routing for reliability on GitHub Pages
- No required server for MVP
- Keep secrets and private course files out of the deployed artifact

## UX Rules
- Premium, elegant, study-first design
- Fully responsive from phone to desktop
- Fast navigation between course map, lectures, examples, simulator, games, diagnostics, tests, and mastery dashboard
- Strong hierarchy, restrained motion, excellent contrast, and accessible sizing
- Light and dark modes must both feel first-class

## Content System Rules
- Normalize raw content into structured JSON under /data/processed
- Build explicit mappings:
  lecture -> section -> concept -> example -> worksheet -> assignment -> assessment item
- Maintain an instruction index and concept taxonomy
- Keep generated enrichment clearly labeled as generated

## Assessment Rules
- Support diagnostics, drills, games, exam mode, and assignment-style training
- Track performance by lecture, topic, concept, instruction, and question type
- Detect repeated misconceptions and recommend exact review paths
- Prefer explanation quality over question volume

## Engineering Rules
- Keep modules small and testable
- Add schema validation for processed content
- Add automated tests at each phase boundary
- Prefer composition over giant files
- Add concise documentation for each major subsystem

## Existing Assets
When reviewing existing /WebPlatform assets, classify each major file as:
- keep as-is
- refactor and keep
- replace
Document rationale before replacing working parts.

## Git workflow rules
- After completing a major fix or milestone, run tests/checks first.
- If the change is stable, commit it.
- After committing, push the current branch to origin.
- Do not push if the app is clearly broken or if the current task is only partially done.

Commit style:
- feat: for new features
- fix: for bug fixes
- refactor: for internal cleanup
- docs: for documentation
- chore: for setup/config work