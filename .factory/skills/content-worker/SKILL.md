---
name: content-worker
description: Extract full content from raw PDF text into lectures.json sections
---

# Content Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Content extraction features that populate section content in `data/processed/lectures.json` from extracted raw text files.

## Required Skills

None — this is a file-based content transformation task. The `tuistry` skill is NOT needed since there is no TUI application to test for this mission.

## Work Procedure

### Step 1: Read Source and Target

1. Read the raw text file for the lecture(s) being extracted (e.g., `data/raw/lecture1_full.txt`)
2. Read the current `data/processed/lectures.json` to understand existing structure
3. Note the existing section IDs, titles, and metadata that must be preserved

### Step 2: Plan Section Mapping

For each lecture being processed:
1. Identify section boundaries in the raw text (look for `##`, `###` headers or slide separators)
2. Match extracted sections to existing section titles in lectures.json
3. Note which existing sections need their `content` field updated vs left as-is

### Step 3: Extract Content

For each section being updated:
1. Extract the full text content from the raw text file
2. Clean up formatting: normalize whitespace, fix encoding artifacts
3. Format as markdown: use `##` for main headers, `###` for sub-headers, ``` for code blocks, `|` for tables
4. Include all meaningful content — tables, bullet lists, code examples, key concepts
5. Ensure assembly instructions (MOV, ADD, SUB, etc.) appear in code fences with `asm` language tag

### Step 4: Update JSON

1. Read `data/processed/lectures.json`
2. For each lecture ID being updated:
   - Update only the `content` field of existing sections
   - Preserve all other fields: `id`, `title`, `concepts`, `instructions`, `examples`, `assessmentItems`, `sourceFile`
   - Do NOT change section order or IDs
3. Write the updated JSON back to `data/processed/lectures.json`

### Step 5: Verify

1. Run `npm run validate:content` — must pass with exit code 0
2. Run `npm run lint` — must pass
3. Verify character counts:
   ```javascript
   const fs = require('fs');
   const lectures = JSON.parse(fs.readFileSync('./data/processed/lectures.json', 'utf8'));
   const l = lectures.lectures.find(l => l.id === N);
   const total = l.sections.reduce((sum, s) => sum + (s.content ? s.content.length : 0), 0);
   console.log('Lecture ' + N + ': ' + total + ' chars');
   ```
4. Spot-check content quality — ensure no placeholder text, all sections have substantive content

### Step 6: Commit

1. `git add -A`
2. `git commit -m "feat(content): extract full content for lecture N"` (one commit per feature)
3. `git push`

## Example Handoff

```json
{
  "salientSummary": "Extracted full content for lectures 1 and 2 from raw PDF text. L1 content increased from 6,596 to 11,200 chars across 5 sections. L2 content increased from 6,904 to 18,800 chars across 4 sections. All existing metadata preserved.",
  "whatWasImplemented": "Updated content field for all sections in lectures 1 and 2 in data/processed/lectures.json. L1 now covers numbering systems, data representation, CPU architecture, assembly basics, and memory organization in full detail. L2 covers signed/unsigned arithmetic, two's complement, flags, and arithmetic instructions with complete examples.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "npm run validate:content", "exitCode": 0, "observation": "Schema validation passed for lectures.json" },
      { "command": "npm run lint", "exitCode": 0, "observation": "No lint errors" },
      { "command": "node -e \"...\" to check char counts", "observation": "L1: 11200 chars, L2: 18800 chars — both exceed minimums" }
    ],
    "interactiveChecks": []
  },
  "tests": { "added": [] },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- Raw text file is empty or missing for the target lecture
- JSON schema validation fails after update
- Content extraction results in significantly fewer sections than expected (missing more than 1 section)
- User-provided lecture title in course-map conflicts with actual PDF content (found a mismatch that wasn't planned)
