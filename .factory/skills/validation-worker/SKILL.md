---
name: validation-worker
description: Validate content extraction quality and coverage across all lectures
---

# Validation Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Final validation features that check all 10 lectures meet quality standards.

## Required Skills

None — this is a file-based validation task.

## Work Procedure

### Step 1: Read Validation Contract

1. Read `C:\Users\zain1\.factory\missions\7721ac7d-b2d5-4eea-b4f6-fe188b1ddc12\validation-contract.md`
2. Understand all assertion IDs and their pass criteria
3. Read `C:\Users\zain1\.factory\missions\7721ac7d-b2d5-4eea-b4f6-fe188b1ddc12\validation-state.json`

### Step 2: Run Automated Checks

1. Run `npm run validate:content` — must pass
2. Run `npm run lint` — must pass
3. Verify JSON structure: all 10 lectures exist, sequential IDs, sourceFile fields present

### Step 3: Content Coverage Check

For each lecture (1-10):
1. Load `data/processed/lectures.json`
2. Calculate total character count across all sections
3. Count number of sections
4. Verify each section has `content` field with > 100 chars

### Step 4: Quality Spot-Check

Manually review 3 lectures for content quality:
- Section content is substantive (not stubs)
- Markdown formatting is correct (headers, code blocks, tables)
- Assembly code examples are present and formatted
- No placeholder text patterns: `[TODO`, `[content pending`, `TBD`, `to be added`

### Step 5: Source Provenance

1. Verify each lecture in `lectures.json` has a `sourceFile` field
2. Verify the corresponding raw text file exists in `data/raw/`

### Step 6: Update Validation State

1. For each assertion that passed, update `validation-state.json` to `"passed"` with evidence
2. For any failed assertions, update to `"failed"` with specific details

## Example Handoff

```json
{
  "salientSummary": "Validated all 10 lectures. All assertions passed: 10/10 lectures present, 54/54 sections have content, no duplicates, JSON schema valid, source provenance verified for all lectures.",
  "whatWasImplemented": "Ran full validation suite: npm run validate:content (pass), npm run lint (pass), char count checks for all 10 lectures, spot-check of L1, L4, L7 content quality. All assertions in validation-contract.md verified as passed.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "npm run validate:content", "exitCode": 0, "observation": "Passed" },
      { "command": "npm run lint", "exitCode": 0, "observation": "No errors" },
      { "command": "node -e \"...\" char count check for all 10", "observation": "All 10 lectures meet minimum char count thresholds" }
    ],
    "interactiveChecks": []
  },
  "tests": { "added": [] },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- Any validation assertion fails
- Content schema invalid
- Source file missing for any lecture
- Significant content quality issues found during spot-check
