# Backend Worker Skill

## Purpose

Process and normalize course content data for the ACS2906 Assembly Language Learning Platform.

## When to Use

Use this skill when implementing:
- Data processing scripts
- Content normalization
- JSON generation
- Validation logic
- TypeScript type definitions

## Procedure

### 1. Understand the Task

- Read `mission.md` for mission objectives
- Read `AGENTS.md` for conventions and boundaries
- Check `.factory/library/` for relevant knowledge
- Review `src/lib/types.ts` for type definitions

### 2. Implementation

1. Create/update script in `scripts/` directory
2. Use TypeScript with proper types
3. Output to `data/processed/` directory
4. Include metadata in generated files:
   ```typescript
   {
     generatedAt: new Date().toISOString(),
     generator: 'script-name.ts',
     sourceVersion: '1.0'
   }
   ```

### 3. Verification

1. Run the script: `npx tsx scripts/<script-name>.ts`
2. Verify output file exists and is valid JSON
3. Run validation: `npm run validate:content`
4. Type check: `npm run typecheck`

### 4. Completion

- All files generated successfully
- Validation passes
- TypeScript compiles without errors
- Handoff with:
  - Files created/modified
  - Verification results
  - Any discovered issues

## Conventions

### File Naming
- Scripts: `kebab-case.ts`
- Output: `kebab-case.json`

### TypeScript
- Use interfaces from `src/lib/types.ts`
- Strict mode enabled
- No `any` types

### JSON Output
- Pretty print with 2 spaces
- Include metadata object
- Validate before marking complete

## Error Handling

- Exit with code 1 on failure
- Provide clear error messages
- Log progress for debugging

## Example

```typescript
// scripts/build-instruction-index.ts
import * as fs from 'fs';
import * as path from 'path';
import type { InstructionIndex } from '../src/lib/types';

function main() {
  const index: InstructionIndex = {};
  // ... build index ...
  
  fs.writeFileSync(
    path.join(process.cwd(), 'data', 'processed', 'instruction-index.json'),
    JSON.stringify(index, null, 2)
  );
}

main();
```
