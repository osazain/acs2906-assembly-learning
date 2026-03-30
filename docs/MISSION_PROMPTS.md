# Mission Prompts

## 1. Spec Mode Prompt
Use this in Specification Mode after pressing Shift+Tab.

Build a comprehensive, beautiful, mastery-based learning platform for ACS2906 Assembly Language Programming using the full repository materials: lectures, examples, worksheets, assignments, cross references, study guides, final exam review, and the existing web platform assets.

This is not a generic course website. It must be a source-grounded study system where each lecture is broken into structured sections, each section is linked to the correct examples, every important concept and 8086 instruction is cross-linked, and diagnostics, drills, games, tests, simulator-linked practice, and remediation paths are built from the course material.

First, do not implement code immediately. Explore the repository and produce a detailed specification and implementation plan. I want:
- recommended architecture for a GitHub Pages-hosted React + TypeScript + Vite app
- explicit phase breakdown
- file-by-file roadmap
- data model for normalized content
- concept graph strategy
- assessment engine design
- game system design
- mastery analytics design
- reuse/refactor/replace evaluation of existing WebPlatform assets
- testing strategy
- deployment strategy for GitHub Pages
- mobile UX and light/dark mode guidance

Save the generated spec under /docs/product with clear markdown filenames.

## 2. Mission Kickoff Prompt
Use after the spec docs exist.

Read /docs/product/IMPLEMENTATION_PLAN.md, /docs/product/PRD.md, /docs/product/ARCHITECTURE.md, and AGENTS.md. Start a mission to implement this product milestone by milestone. Keep work aligned to the documented plan, update progress inside the plan, and prefer small validated steps over giant risky rewrites.

Do not attempt the entire product in one burst. Start with Phase 0 and Phase 1 only unless blocked. Before replacing major existing assets, document whether they should be kept, refactored, or replaced and why.

## 3. Phase 0 Execution Prompt
Implement Phase 0 only.

Requirements:
- scaffold a Vite React TypeScript application if needed
- set up TanStack Router with file-based routing
- configure Tailwind v4 and shadcn/ui theming for light/dark mode
- add Dexie scaffold for local persistence
- create GitHub Actions deployment workflow for GitHub Pages
- create foundational directories for docs, raw data, processed data, components, routes, features, and lib
- do not begin content ingestion yet
- add verification steps and update plan status

## 4. Phase 1 Execution Prompt
Implement Phase 1 only.

Requirements:
- inventory and normalize course materials into structured JSON under /data/processed
- build lecture/example/worksheet/assignment mappings
- build instruction index and concept taxonomy
- build validation scripts and report any ambiguous mappings
- preserve provenance metadata for every processed object
- do not build final UI for later phases yet
- update implementation docs with findings and progress

## 5. Phase 2 Execution Prompt
Implement Phase 2 only.

Requirements:
- build course map page
- build lecture reader page
- build example explorer and search
- connect related content navigation
- keep UI elegant, responsive, and theme-aware
- use real processed content instead of placeholders wherever available

## 6. Phase 3 Execution Prompt
Implement Phase 3 only.

Requirements:
- create assessment engine and question-bank loaders
- build drill mode and baseline diagnostic
- create result explanations and review recommendations
- persist progress locally with Dexie

## 7. Phase 4 Execution Prompt
Implement Phase 4 only.

Requirements:
- build the first 3 to 5 learning games grounded in actual course concepts
- connect results to mastery records
- avoid gimmicky design and generic trivia

## 8. Phase 5 Execution Prompt
Implement Phase 5 only.

Requirements:
- audit existing simulator assets
- integrate the simulator into lecture/example flows
- support challenge presets and quick launch from explanations

## 9. Phase 6 Execution Prompt
Implement Phase 6 only.

Requirements:
- build mastery dashboard
- show topic, concept, and instruction weaknesses
- generate exact review queues using source references

## 10. Phase 7 Execution Prompt
Implement Phase 7 only.

Requirements:
- accessibility pass
- responsive polish
- motion polish
- production hardening for GitHub Pages
- final validation and documentation cleanup
