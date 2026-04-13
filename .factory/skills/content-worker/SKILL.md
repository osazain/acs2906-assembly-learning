# Content Worker Skill

## Purpose
Add code examples and assessment items to lecture sections in the ACS2906 learning platform.

## Workflow

### 1. Read Current Content
Read the relevant sections from `data/processed/lectures.json` to understand:
- Which sections need examples
- Which sections need assessments
- Current concepts and instructions covered

### 2. Generate Content

#### For Examples:
1. Create example code that demonstrates the section's topic
2. Add line-by-line annotations explaining key parts
3. Document common mistakes students make
4. Link to relevant concepts and instructions
5. Assign difficulty level based on complexity

#### For Assessments:
1. Create questions covering conceptual understanding
2. Add code analysis questions where applicable
3. Provide clear explanations for each answer
4. Link to relevant sections and concepts

### 3. Update Files

#### lectures.json
Add example IDs and assessment IDs to section arrays:
```json
{
  "examples": ["new-example-id"],
  "assessmentItems": ["q-new-001"]
}
```

#### examples.json
Add complete example object with all required fields.

#### question-bank.json
Add complete question objects with all required fields.

### 4. Validate
Run `npm run validate:content` to ensure JSON is valid.

## Content Standards

### Example Code Requirements
- MASM/TASM compatible syntax
- Well-commented code
- Practical, real-world usage
- Demonstrates proper patterns
- Shows common errors to avoid

### Annotation Types
- `comment`: General comment explanation
- `instruction`: Instruction explanation
- `flag`: Flag behavior
- `memory`: Memory access pattern

### Question Types
- `conceptual`: Theory and definitions
- `coding`: Write assembly code
- `analysis`: Trace through code, identify errors

## Quality Checklist
- [ ] Example code compiles (MASM syntax)
- [ ] At least 2 annotations per example
- [ ] At least 2 common mistakes documented
- [ ] Provenance.sourceFile set to "generated"
- [ ] Sections linked in lectures.json
- [ ] JSON schema validation passes
