# Implementation Phases

## Phase 0: Bootstrap & Guardrails (1-2 days)

### Goals
- Initialize React + TypeScript + Vite project
- Configure TanStack Router with hash-based routing
- Set up Tailwind CSS v4 + shadcn/ui
- Add Dexie persistence scaffold
- Create GitHub Actions deployment workflow
- Establish project directory structure

### Tasks

- [ ] Initialize Vite project: `npm create vite@latest . -- --template react-ts`
- [ ] Install dependencies: `npm install @tanstack/react-router tailwindcss @tailwindcss/vite dexie framer-motion lucide-react class-variance-authority clsx tailwind-merge`
- [ ] Configure `vite.config.ts` with Tailwind and hash routing
- [ ] Set up `tailwind.config.ts` with custom colors for assembly theme
- [ ] Configure shadcn/ui components
- [ ] Create `src/lib/db.ts` with Dexie schema
- [ ] Create `src/routes/__root.tsx` with basic layout
- [ ] Create `src/routes/index.tsx` landing page
- [ ] Create `.github/workflows/deploy.yml`
- [ ] Update `AGENTS.md` with project specifics

### Deliverables
- Working Vite dev server at localhost:5173
- Hash-based routing working (`/#/`)
- Light/dark mode toggle functional
- GitHub Actions workflow green

---

## Phase 1: Content Ingestion & Normalization (3-5 days)

### Goals
- Parse all 10 lecture PDFs into structured JSON
- Normalize all example .asm files with metadata
- Build lecture → example → worksheet → assignment mappings
- Create instruction index from cross-references
- Build concept taxonomy
- Generate question bank from quiz-data.js and worksheets
- Validate provenance on all processed objects

### Content Inventory

#### Lectures (10 PDFs to parse)
| Lecture | Topics | Page Count |
|---------|--------|------------|
| L1 | Computer Systems Overview | ~40 |
| L2 | Data Representation & Arithmetic | ~60 |
| L3 | Floating Point | ~30 |
| L4 | Assembly Basics | ~70 |
| L5 | I/O & Addressing Modes | ~25 |
| L6 | Control Flow & Logic | ~45 |
| L7 | Procedures & Stack | ~35 |
| L8 | Advanced Topics | ~50 |
| L9 | (TBD) | ~45 |
| L10 | (TBD) | ~35 |

#### Examples (by lecture)
| Lecture | Files |
|---------|-------|
| L4 | Template.asm, HelloWorld.asm, AdditionExample.asm, Buff2.asm, BufferedExample.asm, CharRead.asm, demo.asm, echo.asm, HW2.asm, array.asm |
| L6 | forloop.asm, ifelse.asm, logical.asm, recurs.asm, sort.asm |
| L7 | proc.asm |

#### Cross-References to Preserve
- `INSTRUCTION_TO_EXAMPLE_CROSSREF.md` - Maps instructions to example files
- `VALID_INSTRUCTIONS_FROM_LECTURES.md` - Whitelist of allowed instructions
- `A3_CONCEPT_MAP.md` - Question-to-concept mappings

### Tasks

#### 1. PDF Parsing Pipeline
- [ ] Set up PDF parsing library (pdf-parse or similar)
- [ ] Create `scripts/parse-lectures.ts`
- [ ] Parse Lecture 1 PDF into sections
- [ ] Extract page numbers and content ranges
- [ ] Repeat for lectures 2-10
- [ ] Generate `data/processed/lectures.json`

#### 2. Example Normalization
- [ ] Read all .asm files from `Examples/` directories
- [ ] Create `scripts/normalize-examples.ts`
- [ ] Extract metadata: filename, instructions used, register usage
- [ ] Link to lectures via cross-reference document
- [ ] Generate `data/processed/examples.json`

#### 3. Instruction Index Building
- [ ] Parse `INSTRUCTION_TO_EXAMPLE_CROSSREF.md` into machine-readable format
- [ ] Cross-reference with `VALID_INSTRUCTIONS_FROM_LECTURES.md`
- [ ] Create `data/processed/instruction-index.json`
- [ ] Include syntax, flags affected, examples, lecture refs

#### 4. Concept Taxonomy
- [ ] Define top-level categories from course outline
- [ ] Create `scripts/build-taxonomy.ts`
- [ ] Map concepts to lectures, examples, assessment items
- [ ] Generate `data/processed/concept-taxonomy.json`

#### 5. Question Bank Generation
- [ ] Parse `quiz-data.js` flashcards into assessment items
- [ ] Extract questions from worksheets (PDF → text if possible)
- [ ] Tag each question with: topic, subtopic, concepts, instructions, difficulty
- [ ] Add remediation refs based on concept mapping
- [ ] Generate `data/processed/question-bank.json`

#### 6. Validation
- [ ] Create `scripts/validate-content.ts`
- [ ] Verify all lectures have at least one section
- [ ] Verify all examples link to at least one lecture
- [ ] Verify all assessment items have remediation refs
- [ ] Check provenance completeness (all items have sourceFile)

### Deliverables
- `data/processed/lectures.json` - All 10 lectures parsed
- `data/processed/examples.json` - All .asm files normalized
- `data/processed/instruction-index.json` - Full instruction reference
- `data/processed/concept-taxonomy.json` - Concept hierarchy
- `data/processed/question-bank.json` - All assessment items
- Validation script passing

---

## Phase 2: Reading & Navigation Surfaces (3-5 days)

### Goals
- Build Course Map page (atlas view)
- Build Lecture Reader with section navigation
- Build Example Explorer with filtering
- Implement cross-reference navigation
- Add search across topics/examples/lectures
- Responsive layout for mobile/desktop

### Tasks

#### Course Map
- [ ] Create `src/routes/course-map.tsx`
- [ ] Display lecture cards with progress indicators
- [ ] Show example/worksheet/assignment counts per lecture
- [ ] Add visual concept graph (optional)
- [ ] Link to individual lectures

#### Lecture Reader
- [ ] Create `src/routes/lectures/$lectureId.tsx`
- [ ] Render lecture sections with markdown
- [ ] Add section navigation sidebar
- [ ] Inline code blocks with syntax highlighting
- [ ] "Try in Simulator" buttons
- [ ] Quick-check questions between sections
- [ ] Progress tracking (mark section as read)

#### Example Explorer
- [ ] Create `src/routes/examples/index.tsx`
- [ ] Grid/list view of all examples
- [ ] Filter by: lecture, instruction, concept, difficulty
- [ ] Create `src/routes/examples/$exampleId.tsx`
- [ ] Code viewer with line numbers
- [ ] Annotation overlay (hover register names, instructions)
- [ ] "Run in Simulator" button
- [ ] "See also" links to related examples

#### Search
- [ ] Create `src/components/ui/Command.tsx` (Cmd+K palette)
- [ ] Search lectures, examples, concepts, instructions
- [ ] Keyboard navigation
- [ ] Recent searches

### Deliverables
- Course map at `/#/course-map`
- Lecture reader at `/#/lectures/:id`
- Example explorer at `/#/examples`
- Global search (Cmd+K)

---

## Phase 3: Assessment Engine (3-5 days)

### Goals
- Question bank loader with source-grounded items
- Drill mode with topic filtering
- Diagnostic mode with adaptive-ish questioning
- Results explanation with remediation links
- Local progress persistence with Dexie

### Tasks

#### Drill Mode
- [ ] Create `src/routes/drills/index.tsx`
- [ ] Topic/concept/instruction filter selection
- [ ] Question card component
- [ ] Answer submission with immediate feedback
- [ ] Explanation with "Review this" links
- [ ] Progress bar within drill session
- [ ] End-of-drill summary

#### Diagnostic Mode
- [ ] Create `src/routes/diagnostics/index.tsx`
- [ ] Initial topic selection (what to diagnose)
- [ ] Adaptive question selection (focus on weak areas)
- [ ] Mistake pattern detection
- [ ] Generate diagnostic report
- [ ] Link to remediation resources

#### Results & Remediation
- [ ] Create `src/components/assessment/ResultsSummary.tsx`
- [ ] Per-concept accuracy breakdown
- [ ] Misconception detection
- [ ] Remediation queue generation
- [ ] "Add to Review Queue" action

#### Persistence
- [ ] Hook up Dexie `mastery` table
- [ ] Record every answer
- [ ] Update mastery records after each attempt
- [ ] Strength level calculation

### Deliverables
- Drill mode at `/#/drills`
- Diagnostic mode at `/#/diagnostics`
- Results persistence in IndexedDB
- Remediation recommendations

---

## Phase 4: Game Systems (2-3 days)

### Goals
- Implement Instruction Hangman (refactor from games.js)
- Implement Register Rally
- Implement Flag Frenzy or Trace Runner
- Connect game results to mastery records
- Add leaderboards/high scores (localStorage)

### Tasks

#### Game Architecture
- [ ] Create `src/lib/games/` with shared utilities
- [ ] Refactor `SoundManager` from games.js
- [ ] Refactor `ScoreManager` from games.js
- [ ] Create `GameWrapper` component

#### Instruction Hangman
- [ ] Create `src/components/games/InstructionHangman.tsx`
- [ ] Load instructions from `instruction-index.json`
- [ ] Show category, operands as hints
- [ ] Track mastery for guessed instructions

#### Register Rally
- [ ] Create `src/components/games/RegisterRally.tsx`
- [ ] Match register to use case
- [ ] Identify accessible parts (AX/AL/AH)
- [ ] Connect to register mastery tracking

#### Additional Games (choose 1-2)
- Flag Frenzy: Predict flag states after operations
- Trace Runner: Step through code, predict next state
- Binary Battle: Timed number conversions

### Deliverables
- Games hub at `/#/games`
- At least 3 functional games
- Game results affect mastery dashboard

---

## Phase 5: Simulator Integration (2-3 days)

### Goals
- Port CPU8086Simulator class to React component
- Link simulator to example presets
- Add step-through execution from lectures
- Create challenge presets

### Tasks

#### Simulator Core
- [ ] Create `src/components/simulator/CPU8086Simulator.tsx`
- [ ] Port `simulator.js` CPU8086Simulator class
- [ ] TypeScript types for registers, flags, memory
- [ ] Full 8086 instruction set (not just course subset)
- [ ] Step-by-step execution mode
- [ ] Breakpoint support

#### UI Components
- [ ] Register display with color coding
- [ ] Flag register visualization
- [ ] Memory browser (hex/decimal)
- [ ] Code panel with current instruction highlighting
- [ ] Input/output panels

#### Integration
- [ ] Load example presets (from `examples.json`)
- [ ] "Run in Simulator" from lecture/example pages
- [ ] Pre-built challenge presets
- [ ] Save/load state (localStorage)

### Deliverables
- Simulator at `/#/simulator`
- Examples link to simulator presets
- Full 8086 instruction execution

---

## Phase 6: Mastery Dashboard (2-3 days)

### Goals
- Build heatmap visualization
- Implement weakness summary
- Create study queue generator
- Build recommendation engine

### Tasks

#### Dashboard
- [ ] Create `src/routes/progress/index.tsx`
- [ ] Overall mastery score
- [ ] Per-lecture progress
- [ ] Recent activity

#### Heatmap
- [ ] Create `src/components/mastery/Heatmap.tsx`
- [ ] Grid of concepts/instructions
- [ ] Color coding by strength level
- [ ] Click to drill on topic

#### Weakness Summary
- [ ] Create `src/components/mastery/WeaknessList.tsx`
- [ ] Ranked list of weak areas
- [ ] "Start review" action per item

#### Recommendations
- [ ] Create `src/lib/recommendations.ts`
- [ ] Spaced repetition logic
- [ ] Priority queue based on weakness + recency
- [ ] "Study queue" view

### Deliverables
- Mastery dashboard at `/#/progress`
- Heatmap visualization
- Study queue

---

## Phase 7: Polish & Release (2-3 days)

### Goals
- Accessibility audit and fixes
- Motion polish and transitions
- Offline resilience (service worker)
- GitHub Pages production hardening
- Final QA

### Tasks

#### Accessibility
- [ ] Run axe-core audit
- [ ] Fix all WCAG AA violations
- [ ] Keyboard navigation pass
- [ ] Screen reader testing
- [ ] Focus management

#### Motion
- [ ] Review all animations
- [ ] Respect `prefers-reduced-motion`
- [ ] Add loading skeletons
- [ ] Smooth page transitions

#### Offline
- [ ] Add service worker
- [ ] Cache critical assets
- [ ] Offline fallback page
- [ ] Sync indicator

#### Deployment
- [ ] Configure GitHub Pages
- [ ] Custom domain setup (optional)
- [ ] Test production build
- [ ] Verify hash routing works

#### Final QA
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Mobile testing
- [ ] Performance audit (Lighthouse)
- [ ] Final content validation

### Deliverables
- Production deployment at `https://osazain.github.io/acs2906-assembly-learning/`
- Service worker for offline support
- Accessibility WCAG AA compliant

---

## Total Estimated Timeline

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Phase 0 | 1-2 days | 1-2 days |
| Phase 1 | 3-5 days | 4-7 days |
| Phase 2 | 3-5 days | 7-12 days |
| Phase 3 | 3-5 days | 10-17 days |
| Phase 4 | 2-3 days | 12-20 days |
| Phase 5 | 2-3 days | 14-23 days |
| Phase 6 | 2-3 days | 16-26 days |
| Phase 7 | 2-3 days | 18-29 days |

**Total: ~18-29 working days**
