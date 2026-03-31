# ACS2906 Mastery-Based Learning Platform - Specification

## Executive Summary

Build a source-grounded, mastery-based learning platform for ACS2906 Assembly Language Programming. The platform transforms 10 lectures (PDF), 50+ examples (.asm files), 5 worksheets, 2 assignments, cross-references, and existing WebPlatform assets into an elegant, mobile-friendly study system with GitHub Pages deployment.

## Key Decisions

| Decision | Value |
|----------|-------|
| PDF Parsing | OCR and parse all 10 lecture PDFs |
| Content Scope | Everything - all 10 lectures + all features |
| Authentication | Local-only progress (IndexedDB, no accounts) |
| Simulator | Full 8086 instruction set |
| Routing | Hash-based (TanStack Router) for GitHub Pages |
| Deployment | GitHub Actions to GitHub Pages |

## Course Materials Inventory

### Lectures (10 PDFs)
- `Lectures/Lecture 1.pdf` - Computer Systems Overview (1.4MB)
- `Lectures/Lecture 2.pdf` - Data Representation & Integer Arithmetic (2MB)
- `Lectures/Lecture 3.pdf` - Floating Point (676KB)
- `Lectures/Lecture 4.pdf` - Assembly Language Basics (1.1MB)
- `Lectures/Lecture 5.pdf` - I/O & Addressing Modes (235KB)
- `Lectures/Lecture 6.pdf` - Control Flow & Logic (677KB)
- `Lectures/Lecture 7.pdf` - Procedures & Stack (316KB)
- `Lectures/Lecture 8.pdf` - Advanced Topics (1.3MB)
- `Lectures/Lecture 9.pdf` - (1.6MB)
- `Lectures/Lecture 10.pdf` - (1.1MB)

### Examples (50+ .asm files organized by lecture)
- `Examples/Lecture_4/` - Template.asm, HelloWorld.asm, AdditionExample.asm, Buff2.asm, etc.
- `Examples/Lecture_5/` - (empty - examples in lecture content)
- `Examples/Lecture_6/` - forloop.asm, ifelse.asm, logical.asm, recurs.asm, sort.asm
- `Examples/Lecture_7/` - proc.asm

### Worksheets (5 solved PDFs)
- `Worksheets/Worksheet1_Basics_Solved.pdf`
- `Worksheets/Worksheet2_Data_Arithmetic_Solved.pdf`
- `Worksheets/Worksheet3_IO_Solved.pdf`
- `Worksheets/Worksheet4_ControlFlow_Logic_Solved.pdf`
- `Worksheets/Worksheet5_Procedures_Solved.pdf`

### Assignments
- `Assignments/a2/` - Assignment 2 with solutions
- `Assignments/a3/` - Assignment 3 with concept maps

### Cross-References (High Value)
- `Misc/CrossReferences/INSTRUCTION_TO_EXAMPLE_CROSSREF.md`
- `Misc/CrossReferences/VALID_INSTRUCTIONS_FROM_LECTURES.md`
- `Misc/CrossReferences/VALID_EXAMPLE_FILES_FOR_A3.md`

### Study Guides
- `Misc/StudyGuides/Lecture_1_Study_Guide.md`
- `Misc/StudyGuides/Lecture_3_Study_Guide.md`
- `Misc/StudyGuides/Lecture_5_Study_Guide.md`

### Existing WebPlatform Assets (Refactor Targets)
- `WebPlatform/asm-learning-app/content.js` - Lecture content structure
- `WebPlatform/asm-learning-app/quiz-data.js` - 1400+ question bank items
- `WebPlatform/asm-learning-app/games.js` - Game architecture (SoundManager, ScoreManager)
- `WebPlatform/asm-learning-app/simulator.js` - CPU8086Simulator class

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite 5
- **Routing**: TanStack Router (file-based, hash routing)
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Animation**: Motion (framer-motion)
- **Persistence**: Dexie (IndexedDB wrapper)
- **Build**: Vite with static output
- **Deployment**: GitHub Actions to GitHub Pages

## Core Features

1. **Course Atlas**: Interactive map linking lectures, examples, worksheets, assignments
2. **Lecture Reader**: PDF-derived content with section navigation
3. **Example Explorer**: Browse .asm files with syntax highlighting and annotations
4. **Simulator**: Full 8086 instruction execution with register/memory visualization
5. **Drill Mode**: Topic-focused practice with immediate feedback
6. **Diagnostic Mode**: Adaptive testing to identify knowledge gaps
7. **Game Mode**: Gamified learning (Instruction Hangman, Register Rally, etc.)
8. **Exam Mode**: Timed mixed-topic tests
9. **Mastery Dashboard**: Heatmaps and review recommendations
10. **Cross-Reference Navigation**: Source-grounded remediation

## Success Criteria

- All 10 lectures parsed and normalized with provenance metadata
- Every assessment result points to exact source for review
- GitHub Pages deployment works reliably on mobile
- Local progress persists across browser sessions
- Every major topic has at least one learning path and one practice path
