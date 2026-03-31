# Architecture

## System Overview

ACS2906 Assembly Language Learning Platform is a static web application that transforms course materials into an interactive mastery-based learning system.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React SPA (Static)                       │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │Lectures │ │Examples  │ │Simulator│ │ Drills  │           │
│  │ Reader  │ │Explorer │ │         │ │  Mode   │           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│                        │                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Dexie (IndexedDB)                       │   │
│  │   Mastery Records │ Sessions │ User Preferences      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
           │                                    │
           ▼                                    ▼
┌──────────────────────┐           ┌──────────────────────┐
│  Processed JSON Data │           │   GitHub Pages       │
│  - lectures.json     │           │   (Static Hosting)   │
│  - examples.json     │           └──────────────────────┘
│  - instruction-index │
│  - question-bank     │
│  - concept-taxonomy  │
└──────────────────────┘
```

## Data Flow

1. **Content Ingestion (Phase 1)**: Raw course materials → Processed JSON
2. **UI Rendering (Phase 2+)**: JSON → React components → User interface
3. **Progress Tracking**: User actions → Dexie → Mastery records

## Key Components

### Content Pipeline
- Scripts parse and normalize course materials
- Output to `data/processed/` as JSON
- Each entity has provenance metadata

### State Management
- React Context for global state (theme, user)
- Dexie for persistent data (mastery, sessions)
- URL state via TanStack Router

### Routing
- Hash-based routing for GitHub Pages compatibility
- Routes: `/`, `/course-map`, `/lectures`, `/examples`, `/drills`, `/games`, `/simulator`, `/progress`, `/settings`

## Tech Stack

- **Framework**: React 19 + TypeScript + Vite
- **Routing**: TanStack Router v1
- **Styling**: Tailwind CSS v4
- **Persistence**: Dexie (IndexedDB)
- **Animation**: Framer Motion
- **Deployment**: GitHub Actions → GitHub Pages

## Directory Structure

```
├── data/
│   ├── processed/       # Generated JSON files
│   └── raw/             # Source materials (PDFs, etc.)
├── scripts/             # Content processing scripts
├── src/
│   ├── components/      # React components
│   ├── lib/             # Utilities, DB, types
│   ├── routes/          # Page components
│   └── styles/          # Global CSS
├── public/              # Static assets
└── docs/                # Project documentation
```
