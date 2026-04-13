# Validation Worker Skill

## Purpose
Validate that all content meets quality standards and coverage requirements.

## Workflow

### 1. Read Validation Contract
Read `validation-contract.md` to understand all assertions.

### 2. Check Coverage

#### Content Coverage
For each lecture section, verify:
- `examples` array is non-empty
- `assessmentItems` array has at least 2 items

#### Cross-References
For each example ID in lectures.json:
- Verify the ID exists in examples.json
- Verify linked sections exist

For each assessment ID in lectures.json:
- Verify the ID exists in question-bank.json
- Verify linked sections exist

### 3. Schema Validation
Run `npm run validate:content` to ensure all JSON is valid.

### 4. Update validation-state.json
Set assertion status to "passed" for verified assertions.

## Quality Checklist
- [ ] All sections have examples
- [ ] All sections have assessments (2+ per section)
- [ ] All example IDs resolve
- [ ] All assessment IDs resolve
- [ ] JSON schema validation passes
- [ ] validation-state.json updated
