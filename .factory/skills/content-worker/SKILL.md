# Content Worker Skill

## Purpose
Content extraction and generation for the ACS2906 learning platform.

## Workflow

### For Content Extraction (from raw slides):
1. Read raw file from `data/raw/` folder
2. Parse slide-by-slide content
3. Update `data/processed/lectures.json` section content
4. Preserve existing metadata (examples, assessments, concepts)

### For Examples/Assessments:
1. Read relevant sections from `data/processed/lectures.json`
2. Generate content following existing patterns
3. Update JSON files with proper structure
4. Run `npm run validate:content`

## Content Standards
- Minimum 1500 chars per section for lectures
- Preserve tables, code, bullet points
- Keep all existing links to examples/assessments

## Quality Checklist
- [ ] Content extracted/completed
- [ ] JSON schema validation passes
- [ ] Existing links preserved
