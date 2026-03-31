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
