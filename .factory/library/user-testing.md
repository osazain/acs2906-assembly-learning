# User Testing Library

## Validation Concurrency

Phase 2 has 43 assertions organized into 6 surfaces. Based on the isolation analysis:
- Each surface (Course Map, Lecture Reader, Example Explorer, etc.) is independent
- Browser automation is the main resource constraint
- **Max concurrent validators: 3** (one per surface group)

## Flow Validator Guidance: Course Map Navigation

**URL**: `http://localhost:4173/#/course-map`

**Assertions**: P2-NAV-001 to P2-NAV-010

**What to test**:
- 10 lecture cards displayed
- Cards show title, topics, exam relevance
- Click navigation to lecture detail
- Responsive layout at 375px, 768px, 1280px
- Light/dark mode toggle
- Hover/focus states on cards
- Page load under 2 seconds
- Empty/error state handling

**Isolation**: Single browser session, navigate within app

**Test approach**:
1. Open course map
2. Count lecture cards
3. Inspect card content
4. Test navigation
5. Test responsive breakpoints
6. Test color modes

## Flow Validator Guidance: Lecture Reader

**URL**: `http://localhost:4173/#/lecture/1`

**Assertions**: P2-LEC-001 to P2-LEC-008

**What to test**:
- Lecture content loads from course-map.json
- Sections render with titles and content
- Code blocks have syntax highlighting
- "Try in Simulator" buttons exist
- Section navigation sidebar
- Mark as read functionality
- Tablet viewport (768px)
- Accessibility (heading hierarchy)

**Isolation**: Single browser session

**Test approach**:
1. Navigate to lecture/1
2. Verify all sections render
3. Check code highlighting
4. Test section sidebar
5. Test mark as read
6. Run a11y audit

## Flow Validator Guidance: Example Explorer

**URL**: `http://localhost:4173/#/examples`

**Assertions**: P2-EXP-001 to P2-EXP-010

**What to test**:
- Grid view displays all examples
- List view toggle available
- Filter by lecture dropdown
- Filter by instruction search
- Filter by difficulty buttons
- Example cards show metadata
- Click navigates to detail
- URL updates with filters
- Empty state handling

**Isolation**: Single browser session

**Test approach**:
1. Open example explorer
2. Count example cards
3. Toggle list view
4. Apply various filters
5. Navigate to detail
6. Test empty filter state

## Flow Validator Guidance: Example Code Viewer

**URL**: `http://localhost:4173/#/examples/helloworld`

**Assertions**: P2-CODE-001 to P2-CODE-006

**What to test**:
- Code displays with line numbers
- Syntax highlighting works
- "Run in Simulator" button
- Related examples links
- Copy code button
- Long code scrolling

**Isolation**: Single browser session

**Test approach**:
1. Open example detail
2. Verify line numbers
3. Check syntax colors
4. Test copy button
5. Test simulator button
6. Check related examples

## Flow Validator Guidance: Global Search

**URL**: Any page, open with Ctrl+K

**Assertions**: P2-SEARCH-001 to P2-SEARCH-005

**What to test**:
- Cmd+K opens search palette
- Search finds lectures, examples, concepts
- Keyboard navigation in results
- Recent searches shown
- Search closes on Escape

**Isolation**: Single browser session

**Test approach**:
1. Press Ctrl+K anywhere
2. Verify palette opens
3. Type search query
4. Navigate with arrows
5. Press Enter to select
6. Press Escape to close

## Flow Validator Guidance: Responsive Layout

**URL**: Multiple pages at different viewports

**Assertions**: P2-RESP-001 to P2-RESP-004

**What to test**:
- Sidebar collapses on mobile (375px)
- Touch targets 44x44px minimum
- Consistent spacing across breakpoints
- No horizontal scroll at any width

**Isolation**: Single browser session, resize viewport

**Test approach**:
1. Set viewport to 375x667
2. Verify hamburger menu
3. Check all tap targets
4. Test at 768px, 1280px
5. Verify no horizontal scroll

# Phase 3: Assessment Engine

## Validation Concurrency

Phase 3 has 29 assertions organized into 5 surfaces. Based on isolation analysis:
- All surfaces share the same IndexedDB (Dexie)
- Assessment flows (drill, diagnostic) write to same DB tables
- **Max concurrent validators: 2** to avoid DB conflicts

## Flow Validator Guidance: Drill Mode

**URL**: `http://localhost:4173/#/drills`

**Assertions**: P3-DRILL-001 to P3-DRILL-010

**What to test**:
- Topic/concept/instruction filter selection with counts
- Question card displays prompt properly
- Multiple choice shows 4 options
- Submit button processes answer
- Immediate feedback shows correct/incorrect
- Explanation with remediation links
- Progress bar updates per question
- Skip question functionality
- Drill settings (count, difficulty, timer)
- End-of-drill summary with stats

**Isolation**: Single browser session, IndexedDB for mastery records

**Test approach**:
1. Navigate to /#/drills
2. Verify filter panel with topics, concepts, instructions
3. Apply a filter and start drill
4. Answer questions, verify feedback
5. Test skip functionality
6. Complete drill, verify summary
7. Check IndexedDB for answer records

## Flow Validator Guidance: Diagnostic Mode

**URL**: `http://localhost:4173/#/diagnostics`

**Assertions**: P3-DIAG-001 to P3-DIAG-006

**What to test**:
- Initial topic selection screen shows all lectures
- Adaptive question selection based on answers
- Mistake pattern detection
- Diagnostic report generation with accuracy breakdown
- Remediation links in report
- Diagnostic history saved to IndexedDB

**Isolation**: Single browser session, shared IndexedDB

**Test approach**:
1. Navigate to /#/diagnostics
2. Verify topic selection UI
3. Start diagnostic, answer several questions
4. Verify difficulty adapts
5. Complete diagnostic
6. View report with weaknesses
7. Click remediation links
8. Check IndexedDB for diagnostic history

## Flow Validator Guidance: Results Summary

**URL**: Shown after drill/diagnostic completion

**Assertions**: P3-RESULT-001 to P3-RESULT-005

**What to test**:
- Per-concept accuracy breakdown displayed
- Misconception detection and labeling
- Remediation queue generated with priorities
- "Add to Review Queue" action works
- Export/share results functionality

**Isolation**: Single browser session, reads from drill/diagnostic results

**Test approach**:
1. Complete a drill with intentional errors
2. View results summary
3. Verify per-concept accuracy shown
4. Verify misconception labels appear
5. Check remediation queue
6. Test "Add to Review Queue"
7. Test export results button

## Flow Validator Guidance: Mastery Tracking

**URL**: Dashboard visible at `http://localhost:4173/#/progress`

**Assertions**: P3-MAST-001 to P3-MAST-005

**What to test**:
- Answers recorded to IndexedDB via Dexie
- Mastery records updated after drill
- Strength levels calculated per concept
- Mistake patterns tracked in DB
- Mastery visible on dashboard as percentages

**Isolation**: Single browser session, IndexedDB is source of truth

**Test approach**:
1. Complete several drill questions on same concept
2. Open browser DevTools, check IndexedDB
3. Verify answer records exist in Dexie DB
4. Navigate to /#/progress (dashboard)
5. Verify mastery values displayed for concepts practiced
6. Check strength levels update

## Flow Validator Guidance: Study Sessions

**URL**: Session data stored in IndexedDB, visible in dashboard

**Assertions**: P3-SESSION-001 to P3-SESSION-003

**What to test**:
- Session record created on drill begin with startTime
- Session record updated with endTime and stats on completion
- Duration tracked accurately (within 5 seconds)

**Isolation**: Single browser session, IndexedDB

**Test approach**:
1. Start a drill
2. Immediately check IndexedDB for session record with startTime
3. Complete the drill
4. Verify session record has endTime
5. Verify duration field is within 5 seconds of actual elapsed time

# Phase 4: Game Systems

## Validation Concurrency

Phase 4 has 6 assertions organized into 3 surfaces. Based on isolation analysis:
- Games Hub is independent (reads only)
- Individual games (Hangman, Register Rally, Flag Frenzy) are independent (each manages own state)
- Game persistence (localStorage + dashboard) requires game completion first
- **Max concurrent validators: 2** (Games Hub + one game at a time due to localStorage interactions)

## Flow Validator Guidance: Games Hub

**URL**: `http://localhost:4173/#/games`

**Assertions**: P4-GAME-001

**What to test**:
- Games hub page at /#/games loads correctly
- All game cards displayed with titles and launch buttons
- Game status indicators visible
- Navigation to individual games works

**Isolation**: Single browser session

**Test approach**:
1. Navigate to /#/games
2. Verify page loads without errors
3. Count game cards (expect 3: Instruction Hangman, Register Rally, Flag Frenzy)
4. Verify each game has a title and launch button
5. Click each launch button and verify navigation/launch

## Flow Validator Guidance: Individual Games

**URL**: Games launch from /#/games hub

**Assertions**: P4-GAME-002 (Instruction Hangman), P4-GAME-003 (Register Rally), P4-GAME-004 (Flag Frenzy)

**What to test (Hangman)**:
- Masked instruction displayed with underscores/hints
- Keyboard letter inputs accepted (A-Z)
- Correct/incorrect feedback shown
- Win/lose condition detected
- Score updates correctly

**What to test (Register Rally)**:
- Matching interface renders (terms and definitions)
- Clicking matches registers to descriptions
- Correct matches score points
- Incorrect matches show feedback
- Game completion detected

**What to test (Flag Frenzy)**:
- Flag scenario displayed (e.g., "MOV AX, FFFFh")
- Prediction inputs for flags (CF, OF, SF, ZF, AF, PF)
- Feedback shows correct/incorrect predictions
- Score tracks correctly

**Isolation**: Single browser session, each game is independent

**Test approach**:
1. From /#/games, click launch button for each game
2. Play through each game
3. Verify game mechanics work as specified
4. Complete game and verify score recorded

## Flow Validator Guidance: Game Persistence & Dashboard

**URL**: localStorage + `http://localhost:4173/#/progress`

**Assertions**: P4-GAME-005, P4-GAME-006

**What to test**:
- Game scores saved to localStorage after completion
- Scores persist after page reload
- Game results reflected in mastery dashboard metrics
- Dashboard shows game-related mastery updates

**Isolation**: Single browser session, localStorage is shared across game sessions

**Test approach**:
1. Play a game to completion
2. Check browser localStorage for game score entries
3. Reload the page
4. Verify scores persist in localStorage
5. Navigate to /#/progress (dashboard)
6. Verify game-related metrics appear
