# Architecture

## Recommended Stack
- Frontend: React + TypeScript + Vite
- Router: TanStack Router using file-based routing
- Styling: Tailwind CSS v4 + shadcn/ui + CSS variables for theming
- Motion: Motion for subtle transitions and feedback
- State: local component state + small shared stores where needed
- Persistence: IndexedDB using Dexie
- Hosting: GitHub Pages via GitHub Actions

## GitHub Pages Strategy
Use a static-only architecture for MVP.
- No required backend
- Hash-based routing for robust deep linking on Pages
- Build to /dist and deploy using Actions
- Keep deployment artifact free of sensitive raw files

## Content Architecture
### Raw Sources
/data/raw
- lectures
- examples
- worksheets
- assignments
- misc

### Processed Sources
/data/processed
- lectures.json
- lecture-sections.json
- examples.json
- worksheets.json
- assignments.json
- instruction-index.json
- concept-taxonomy.json
- concept-graph.json
- question-bank.json
- learning-objectives.json

## Core Domain Models
### Lecture
- id
- title
- sourceFile
- sections[]
- concepts[]
- instructions[]
- linkedExamples[]
- linkedWorksheets[]
- linkedAssignments[]
- difficulty
- examRelevance

### Example
- id
- filename
- lectureIds[]
- concepts[]
- instructions[]
- code
- annotations[]
- simulatorPreset
- relatedQuestions[]
- commonMistakes[]

### AssessmentItem
- id
- sourceType
- sourceRefs[]
- type
- topic
- subtopic
- concepts[]
- instructions[]
- difficulty
- prompt
- answer
- hints[]
- explanation
- remediationRefs[]

### MasteryRecord
- topic
- subtopic
- accuracy
- confidence
- recency
- mistakePatterns[]
- recommendationRefs[]

## App Surface Map
/src/routes
- __root.tsx
- index.tsx
- course-map.tsx
- lectures/
- examples/
- diagnostics/
- drills/
- games/
- tests/
- assignments/
- progress/
- simulator/
- settings/

## Design System
Use tokenized color roles, spacing, radii, shadows, and typography.
Theme tokens must support both light and dark mode.

## Analytics
Track local-only study events for MVP:
- lecture opened
- section completed
- example opened
- simulator run
- drill answer
- test result
- mastery updated
