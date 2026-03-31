# Architecture

## Tech Stack

| Layer | Technology | Justification |
|-------|------------|---------------|
| Frontend Framework | React 18 + TypeScript | Type safety, component model |
| Build Tool | Vite 5 | Fast dev server, optimized builds |
| Routing | TanStack Router | File-based, hash routing support |
| Styling | Tailwind CSS v4 + shadcn/ui | Utility-first, accessible components |
| Animation | Motion (framer-motion) | Restrained, high-quality animations |
| Persistence | Dexie (IndexedDB) | Offline-first, structured storage |
| Deployment | GitHub Actions → GitHub Pages | Free hosting, integrated CI/CD |

## Directory Structure

```
acs2906-assembly-learning/
├── src/
│   ├── routes/              # TanStack Router file-based routes
│   │   ├── __root.tsx      # Root layout with nav
│   │   ├── index.tsx       # Landing/dashboard
│   │   ├── course-map.tsx
│   │   ├── lectures/
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx
│   │   │   └── $lectureId.tsx
│   │   ├── examples/
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx
│   │   │   └── $exampleId.tsx
│   │   ├── worksheets/
│   │   ├── assignments/
│   │   ├── diagnostics/
│   │   ├── drills/
│   │   ├── games/
│   │   ├── tests/
│   │   ├── simulator/
│   │   ├── progress/
│   │   └── settings/
│   ├── components/
│   │   ├── ui/              # shadcn/ui primitives
│   │   ├── layout/          # Header, Sidebar, MobileNav
│   │   ├── lecture/          # LectureReader, SectionNav, etc.
│   │   ├── example/          # CodeViewer, AnnotationLayer
│   │   ├── assessment/       # QuestionCard, AnswerFeedback
│   │   ├── simulator/        # CPU8086Simulator, RegisterDisplay
│   │   ├── games/            # Game wrappers
│   │   └── mastery/          # Heatmap, WeaknessList
│   ├── lib/
│   │   ├── db.ts            # Dexie schema and hooks
│   │   ├── mastery.ts        # Mastery tracking logic
│   │   ├── assessment.ts    # Assessment engine
│   │   ├── crossref.ts      # Cross-reference resolution
│   │   └── games/           # Game utilities
│   ├── data/
│   │   └── processed/       # Normalized JSON (generated)
│   │       ├── lectures.json
│   │       ├── lecture-sections.json
│   │       ├── examples.json
│   │       ├── worksheets.json
│   │       ├── assignments.json
│   │       ├── instruction-index.json
│   │       ├── concept-taxonomy.json
│   │       ├── concept-graph.json
│   │       └── question-bank.json
│   └── styles/
│       └── globals.css
├── public/
│   └── assets/
├── data/
│   ├── raw/                 # Source materials (symlink or copy)
│   │   ├── Lectures/
│   │   ├── Examples/
│   │   ├── Worksheets/
│   │   └── Assignments/
│   └── processed/           # Generated normalized content
├── scripts/                 # Content processing scripts
│   ├── parse-lectures.ts
│   ├── normalize-examples.ts
│   └── generate-question-bank.ts
├── docs/
│   └── product/             # This specification
└── .github/
    └── workflows/
        └── deploy.yml
```

## GitHub Pages Strategy

### Routing
- **Hash-based routing**: `/#/lectures/1`, `/#/simulator`
- TanStack Router with `hash: true` option
- No server configuration needed
- Works on GitHub Pages without .htaccess

### Build Configuration
```typescript
// vite.config.ts
export default defineConfig({
  base: './',           // Relative paths for GitHub Pages
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  // Hash routing handled by TanStack Router
})
```

### Deployment Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - name: Install dependencies
        run: npm ci
      - name: Validate content
        run: npm run validate:content
      - name: Build
        run: npm run build
      - name: Deploy
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

## Theme System

### Light Mode (Default)
```css
:root {
  --background: 0 0% 100%;
  --foreground: 222 47% 11%;
  --primary: 221 83% 53%;
  --secondary: 210 40% 96%;
  --accent: 210 40% 96%;
  -- muted: 210 40% 96%;
  --card: 0 0% 100%;
  --border: 214 32% 91%;
  --ring: 221 83% 53%;
}
```

### Dark Mode
```css
.dark {
  --background: 222 47% 7%;
  --foreground: 210 40% 98%;
  --primary: 217 91% 60%;
  --secondary: 217 33% 17%;
  --accent: 216 28% 14%;
  --muted: 216 28% 14%;
  --card: 222 47% 11%;
  --border: 217 33% 17%;
}
```

### Color Palette for Assembly Theme
- **Primary**: Blue (#3b82f6) - Links, actions
- **Register Colors**: AX (#ef4444), BX (#22c55e), CX (#3b82f6), DX (#f59e0b)
- **Flag Colors**: Set (#22c55e), Unset (#6b7280)
- **Code Background**: Dark slate (#0f172a)
- **Code Text**: Light gray (#e2e8f0)

## Responsive Breakpoints

| Breakpoint | Width | Navigation |
|------------|-------|------------|
| Mobile | <640px | Bottom tab bar |
| Tablet | 640-1024px | Collapsible sidebar |
| Desktop | >1024px | Persistent sidebar |

## Accessibility

- WCAG 2.1 AA compliance target
- Semantic HTML throughout
- ARIA labels on all interactive elements
- Keyboard navigation (Tab, Enter, Escape)
- Focus visible indicators
- Reduced motion support via `prefers-reduced-motion`
