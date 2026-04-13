# Architecture

## Content Processing System

### Data Flow
```
raw/ → processing script → processed/JSON files
                              ↓
                         React app
```

### Processed Content Files

#### lectures.json
Complete lecture content with:
- 10 lectures covering 8086 assembly
- 60 total sections
- Section content in markdown format
- Linked concepts, instructions, examples, assessments

#### examples.json
Code examples with:
- Assembly code (MASM/TASM syntax)
- Line-by-line annotations
- Common mistakes documentation
- Concept and instruction mapping

#### question-bank.json
Assessment items with:
- Multiple choice questions
- Conceptual and coding questions
- Difficulty levels
- Concept/section linkage

### Content Schema

Each lecture section maintains:
- Provenance metadata (source file, extraction method)
- Concept taxonomy references
- Instruction references
- Example links
- Assessment item links

This creates a traceable path from any learning item back to source material.
