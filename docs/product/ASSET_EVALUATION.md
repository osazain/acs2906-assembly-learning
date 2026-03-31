# Existing WebPlatform Asset Evaluation

## Summary

| Asset | Classification | Action |
|-------|---------------|--------|
| `asm-learning-app/` directory | REFACTOR AND KEEP | Extract modules, integrate into React |
| `content.js` | REFACTOR | Parse into `lectures.json` |
| `quiz-data.js` | REFACTOR AND KEEP | Convert to `question-bank.json` |
| `games.js` | REFACTOR AND KEEP | Extract SoundManager, ScoreManager, game logic |
| `simulator.js` | REFACTOR AND KEEP | Port CPU8086Simulator class to React |
| `app.js` | REPLACE | Don't use - monolithic SPA logic |
| `manifest.json` | KEEP AS-IS | PWA config already good |
| `index.html` (root) | REPLACE | Don't use - monolithic 6184-line file |
| `asm-learn-complete.html` | DEPRECATE | Not needed with React build |
| `CPU8086Simulator.html` | DEPRECATE | Functionality in React app |
| `asm-learn-diagnostic.html` | DEPRECATE | Diagnostic mode in React app |
| `asm-learn-mobile.html` | DEPRECATE | Responsive React app replaces this |
| `calculator-module.html` | DEPRECATE | Calculator in React app |
| `simulator-demo.html` | DEPRECATE | Simulator in React app |
| `example-usage.html` | DEPRECATE | Not needed |

## Detailed Evaluations

### `WebPlatform/asm-learning-app/content.js` (836 lines)

**Content**: Lecture content structured as JavaScript objects

**Structure**:
```javascript
const courseContent = {
  courseInfo: { title, description, platform, assembler },
  lectures: [
    {
      id: 1,
      title: "Computer Systems Overview",
      topics: [
        { name, content, examFocus },
        ...
      ],
      keyConcepts: [...],
      summary: "..."
    },
    ...
  ]
};
```

**Classification**: REFACTOR

**Action**: 
1. Parse this file to extract lecture/topic structure
2. The content is well-structured and maps to course outline
3. Use as foundation for `data/processed/lectures.json`
4. Enhance with PDF page references and examples

**Provenance Note**: This file was likely created from lecture PDFs, so provenance should trace back to original PDFs.

---

### `WebPlatform/asm-learning-app/quiz-data.js` (1407 lines)

**Content**: Flashcards and quiz questions

**Structure**:
```javascript
const flashcards = [
  {
    id: 1,
    category: "Number Conversions",
    question: "How do you convert binary to hexadecimal?",
    answer: "Separate the binary number into groups of 4 bits...",
    difficulty: "easy"
  },
  ...
];
```

Plus quiz questions in categories like "Number Conversions", "Two's Complement", "Registers", etc.

**Classification**: REFACTOR AND KEEP

**Action**:
1. Convert flashcards array to `question-bank.json` format
2. Add `sourceRefs`, `remediationRefs`, `misconceptionTags`
3. Enhance with difficulty ratings (1-5)
4. Include all 100+ questions

**High Value**: This is 1400+ lines of curated assessment content - don't recreate, convert.

---

### `WebPlatform/asm-learning-app/games.js` (2980 lines)

**Content**: Game implementations with SoundManager, ScoreManager classes

**Key Classes**:
```javascript
const GameConfig = {
  SOUNDS: {...},
  DEFAULT_SETTINGS: {...},
  DIFFICULTY_LEVELS: {...}
};

class SoundManager {
  loadSetting(), saveSetting(), initAudio(), play(), toggle()
}

class ScoreManager {
  loadHighScore(), saveHighScore(), addPoints(), incrementStreak(), resetStreak(), reset()
}

class BaseGame {
  renderHeader(), renderDifficultySelector(), ...
}
```

**Games Implemented**:
1. Hangman (instruction guessing)
2. Flashcards (memory game)
3. Multiple quiz-based games

**Classification**: REFACTOR AND KEEP

**Action**:
1. Extract `GameConfig`, `SoundManager`, `ScoreManager` to `src/lib/games/`
2. Port `BaseGame` logic to React hooks
3. Rewrite individual games as React components
4. Keep game balance and difficulty settings

---

### `WebPlatform/asm-learning-app/simulator.js` (1857 lines)

**Content**: CPU8086Simulator class

**Key Features**:
- Full register model (AX, BX, CX, DX, SI, DI, SP, BP, CS, DS, SS, ES, IP, FLAGS)
- 256-byte memory visualization
- Flag management (CF, PF, AF, ZF, SF, TF, IF, DF, OF)
- Partial register access (AH/AL, etc.)
- State history for undo/redo
- Event handlers for UI

**Classification**: REFACTOR AND KEEP

**Action**:
1. Port `CPU8086Simulator` class to TypeScript
2. Create React component wrapper
3. Preserve all register/memory visualization
4. Add 8086 instruction implementations (ADD, SUB, MOV, etc.)
5. This is the simulator foundation - high value

---

### `WebPlatform/asm-learning-app/app.js` (65055 lines)

**Content**: Monolithic SPA application logic

**Classification**: REPLACE

**Reason**: This is a 65K line monolithic file that handles everything. The React refactor will replace this entirely. Extract useful constants/data, discard the rest.

---

### `WebPlatform/asm-learning-app/manifest.json`

**Content**: PWA manifest

```json
{
  "name": "Assembly Learn",
  "short_name": "AsmLearn",
  "display": "standalone",
  "theme_color": "#6366f1",
  "icons": [...],
  "shortcuts": [...]
}
```

**Classification**: KEEP AS-IS

**Action**: Copy to new project with minor updates (update theme color, icons path)

---

### Root `index.html` (6184 lines)

**Content**: Complete single-file web application with:
- All CSS inlined
- All JavaScript inlined
- Complete lecture content
- Complete quiz content
- Complete simulator
- Complete games

**Classification**: REPLACE

**Reason**: This monolithic file was created for easy sharing via WhatsApp. The React refactor renders this obsolete.

---

## Source Materials (Keep as Primary Sources)

### Lectures (PDF)
- `../Lectures/Lecture 1.pdf` through `Lecture 10.pdf`
- These are the authoritative source for lecture content
- PDF parsing should extract structured content

### Examples
- `../Examples/Lecture_4/` - 13 .asm files
- `../Examples/Lecture_6/` - 5 .asm files
- `../Examples/Lecture_7/` - 1 .asm file
- Authoritative source for code examples

### Cross-References (High Value - Keep)
- `../Misc/CrossReferences/INSTRUCTION_TO_EXAMPLE_CROSSREF.md`
- `../Misc/CrossReferences/VALID_INSTRUCTIONS_FROM_LECTURES.md`
- `../Misc/CrossReferences/VALID_EXAMPLE_FILES_FOR_A3.md`

### Study Guides
- `../Misc/StudyGuides/Lecture_1_Study_Guide.md`
- `../Misc/StudyGuides/Lecture_3_Study_Guide.md`
- `../Misc/StudyGuides/Lecture_5_Study_Guide.md`

### Assignments
- `../Assignments/a3/A3_CONCEPT_MAP.md` - Shows excellent source-linking approach
- `../Assignments/a3/A3_STEP_BY_STEP_GUIDE.md`
- Reference for assignment-style questions

## Refactoring Priority

1. **Highest**: `simulator.js` - Foundation of simulator feature
2. **High**: `quiz-data.js` - Question bank foundation
3. **High**: `games.js` - Game architecture
4. **Medium**: `content.js` - Lecture structure (but must enhance with PDF content)
5. **Low**: `manifest.json` - Easy copy

## Migration Path

```
Phase 0: Set up React project shell
Phase 1: Parse content.js → lectures.json
Phase 1: Convert quiz-data.js → question-bank.json
Phase 2: Build Lecture Reader using lectures.json
Phase 3: Build Assessment using question-bank.json
Phase 4: Build Games using games.js architecture
Phase 5: Build Simulator using simulator.js core
```
