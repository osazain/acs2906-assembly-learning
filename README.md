# ACS2906 Assembly Language Learning Platform

A source-grounded, mastery-based learning platform for Assembly Language Programming.

## Features

- **Course Atlas**: Interactive map linking lectures, examples, worksheets, assignments
- **Lecture Reader**: PDF-derived content with section navigation
- **Example Explorer**: Browse .asm files with syntax highlighting and annotations
- **8086 Simulator**: Full instruction execution with register/memory visualization
- **Practice Drills**: Topic-focused practice with immediate feedback
- **Diagnostic Mode**: Adaptive testing to identify knowledge gaps
- **Learning Games**: Gamified practice (Instruction Hangman, Register Rally, etc.)
- **Mastery Dashboard**: Heatmaps and review recommendations

## Tech Stack

- React 19 + TypeScript + Vite
- TanStack Router (hash-based routing)
- Tailwind CSS v4
- Dexie (IndexedDB for offline persistence)
- Framer Motion

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Phases

- Phase 0: Bootstrap & Setup (COMPLETE)
- Phase 1: Content Ingestion & Normalization (COMPLETE)
- Phase 2: Reading & Navigation Surfaces (COMPLETE)
- Phase 3: Assessment Engine (COMPLETE)
- Phase 4: Game Systems (COMPLETE)
- Phase 5: Simulator Integration (COMPLETE)
- Phase 6: Mastery Dashboard (COMPLETE)
- Phase 7: Polish & Release (IN PROGRESS)

## Deployment

Deployed automatically to GitHub Pages via GitHub Actions on push to main.

## License

MIT
