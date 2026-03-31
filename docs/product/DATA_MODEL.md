# Data Model

## Content Hierarchy

```
Lecture (1-10)
  └── Section
        └── Concept
              └── Example (.asm file)
              └── Assessment Item

Worksheet
  └── Problem
        └── Linked Concepts
        └── Linked Examples

Assignment
  └── Question
        └── Required Instructions
        └── Reference Examples
```

## Entity Schemas

### Provenance (Required on all entities)

```typescript
interface Provenance {
  sourceFile: string;           // e.g., "Lecture 1.pdf"
  sourceType: 'pdf' | 'asm' | 'markdown' | 'js' | 'generated';
  sourceSectionOrLineRange?: string;  // e.g., "Page 52" or "lines 10-25"
  extractedBy: string;          // e.g., "pdf-parse-v1" or "manual"
  extractionConfidence: number;  // 0-1
  reviewedStatus: 'pending' | 'reviewed' | 'verified';
  lastReviewed?: string;        // ISO date
  notes?: string;
}
```

### Lecture

```typescript
interface Lecture {
  id: number;
  title: string;
  sourceFile: string;           // "Lecture 1.pdf"
  pageCount?: number;
  sections: LectureSection[];
  concepts: string[];           // Concept IDs
  instructions: string[];       // Instruction IDs (e.g., "MOV", "ADD")
  difficulty: 'foundational' | 'intermediate' | 'advanced';
  examRelevance: 'high' | 'medium' | 'low';
  provenance: Provenance;
}

interface LectureSection {
  id: string;                   // e.g., "l1-number-systems"
  lectureId: number;
  title: string;
  content: string;              // Markdown/structured content
  pageRange?: string;           // e.g., "10-25"
  concepts: string[];
  instructions: string[];
  examples: string[];           // Example IDs
  assessmentItems: string[];
  quizQuestions?: string[];     // Quiz question IDs
}
```

### Example

```typescript
interface Example {
  id: string;                   // e.g., "HelloWorld.asm"
  filename: string;
  lectureIds: number[];
  sectionIds: string[];
  concepts: string[];
  instructions: string[];
  code: string;
  annotations: Annotation[];
  simulatorPreset?: SimulatorPreset;
  commonMistakes: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  relatedQuestions: string[];
  provenance: Provenance;
}

interface Annotation {
  line: number;
  type: 'comment' | 'instruction' | 'register' | 'memory' | 'flag';
  text: string;
  linkedConcept?: string;
}

interface SimulatorPreset {
  initialRegisters: Record<string, number>;
  initialMemory?: Record<string, number>;
  inputBuffer?: string;
  expectedOutput?: string;
  steppingNotes?: string[];
}
```

### AssessmentItem

```typescript
interface AssessmentItem {
  id: string;
  sourceType: 'quiz' | 'worksheet' | 'test' | 'exam' | 'generated';
  sourceRefs: string[];         // e.g., ["Worksheet1", "Q3"]
  type: AssessmentType;
  topic: string;
  subtopic: string;
  concepts: string[];
  instructions: string[];
  difficulty: 1 | 2 | 3 | 4 | 5;  // 1=easiest, 5=hardest
  prompt: string;
  answer: string | string[];
  options?: string[];           // For multiple choice
  hints: string[];
  explanation: string;
  remediationRefs: RemediationRef[];
  misconceptionTags: string[];
  timeEstimate?: number;        // seconds
}

type AssessmentType =
  | 'multiple-choice'
  | 'true-false'
  | 'short-answer'
  | 'code-tracing'
  | 'output-prediction'
  | 'debugging'
  | 'fill-the-gap'
  | 'next-line'
  | 'code-completion'
  | 'assignment-style';

interface RemediationRef {
  type: 'lecture' | 'section' | 'example' | 'worksheet' | 'instruction';
  id: string;
  description: string;          // e.g., "Lecture 4, Page 52 - MOV instruction"
}
```

### InstructionIndex

```typescript
interface InstructionIndex {
  [mnemonic: string]: {
    name: string;
    category: 'data-transfer' | 'arithmetic' | 'logical' | 'control-flow' | 'shift' | 'io' | 'procedure';
    syntax: string;             // e.g., "MOV dest, src"
    operands?: OperandSpec[];
    flagsAffected: string[];    // e.g., ["CF", "OF", "ZF"]
    operation: string;          // Human-readable description
    examples: string[];         // Example IDs
    lectureRefs: { lecture: number; page: number }[];
    relatedInstructions: string[];
    exceptions?: string[];
  };
}

interface OperandSpec {
  type: 'register' | 'memory' | 'immediate' | 'register8' | 'register16' | 'segment' | 'relative';
  direction: 'r' | 'm' | 'i' | 'o';  // read, modify, immediate, other
  required: boolean;
  description?: string;
}
```

### ConceptTaxonomy

```typescript
interface ConceptTaxonomy {
  categories: ConceptCategory[];
  concepts: Record<string, Concept>;
  misconceptions: MisconceptionIndex;
}

interface ConceptCategory {
  id: string;                   // e.g., "data-representation"
  name: string;                // e.g., "Data Representation"
  parentId?: string;            // For subcategories
  description: string;
  lectureIds: number[];
  conceptIds: string[];
}

interface Concept {
  id: string;                  // e.g., "twos-complement"
  name: string;                // e.g., "Two's Complement"
  categoryId: string;
  description: string;
  lectureIds: number[];
  exampleIds: string[];
  assessmentItemIds: string[];
  relatedConcepts: string[];
}

interface MisconceptionIndex {
  [tag: string]: {
    description: string;
    indicators: string[];      // How to detect this misconception
    commonIn: string[];        // Assessment item IDs where this appears
    remediationFor: RemediationRef[];
    relatedMisconceptions: string[];
  };
}
```

### MasteryRecord (IndexedDB)

```typescript
interface MasteryRecord {
  id?: number;                 // Auto-increment primary key
  userId: string;              // Browser/device fingerprint
  topicType: 'concept' | 'instruction' | 'section';
  topicId: string;
  metrics: {
    attempts: number;
    correct: number;
    accuracy: number;          // 0-1, computed
    confidence: number;         // 0-1, self-reported
    averageTimeMs: number;
    lastAttempt: string;       // ISO date
    firstAttempt: string;      // ISO date
  };
  mistakePatterns: string[];    // Misconception tags
  strengthLevel: 'mastered' | 'proficient' | 'developing' | 'beginning';
  recommendationRefs: RemediationRef[];
  streak?: number;             // For games
  lastPracticed?: string;       // ISO date
}

interface StudySession {
  id?: number;
  userId: string;
  startedAt: string;
  endedAt?: string;
  mode: 'lecture' | 'drill' | 'diagnostic' | 'game' | 'test' | 'simulator';
  topics: string[];
  itemsCompleted: number;
  correctCount: number;
}
```

## Dexie Schema

```typescript
// src/lib/db.ts
import Dexie, { Table } from 'dexie';

export interface MasteryRecord {
  id?: number;
  userId: string;
  topicType: 'concept' | 'instruction' | 'section';
  topicId: string;
  metrics: {
    attempts: number;
    correct: number;
    accuracy: number;
    confidence: number;
    averageTimeMs: number;
    lastAttempt: string;
    firstAttempt: string;
  };
  mistakePatterns: string[];
  strengthLevel: 'mastered' | 'proficient' | 'developing' | 'beginning';
  recommendationRefs: RemediationRef[];
  streak?: number;
  lastPracticed?: string;
}

export interface StudySession {
  id?: number;
  userId: string;
  startedAt: string;
  endedAt?: string;
  mode: 'lecture' | 'drill' | 'diagnostic' | 'game' | 'test' | 'simulator';
  topics: string[];
  itemsCompleted: number;
  correctCount: number;
}

export interface UserPreferences {
  id?: number;
  userId: string;
  theme: 'light' | 'dark' | 'system';
  soundEnabled: boolean;
  reducedMotion: boolean;
}

class ACS2906Database extends Dexie {
  mastery!: Table<MasteryRecord>;
  sessions!: Table<StudySession>;
  preferences!: Table<UserPreferences>;

  constructor() {
    super('ACS2906Learning');
    this.version(1).stores({
      mastery: '++id, userId, topicType, topicId, [userId+topicType+topicId]',
      sessions: '++id, userId, startedAt, mode',
      preferences: '++id, userId'
    });
  }
}

export const db = new ACS2906Database();
```

## Processed Data Files

### lectures.json
```json
{
  "lectures": [...],
  "metadata": {
    "generatedAt": "2026-03-30T00:00:00Z",
    "generator": "parse-lectures.ts",
    "sourceVersion": "1.0"
  }
}
```

### instruction-index.json
```json
{
  "MOV": {
    "name": "Move",
    "category": "data-transfer",
    "syntax": "MOV dest, src",
    "flagsAffected": [],
    "examples": ["HelloWorld.asm", "proc.asm"],
    "lectureRefs": [{ "lecture": 4, "page": 52 }]
  }
}
```

### concept-taxonomy.json
```json
{
  "categories": [...],
  "concepts": {...},
  "misconceptions": {...}
}
```
