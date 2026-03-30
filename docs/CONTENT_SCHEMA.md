# Content Schema Requirements

## Principle
Every processed object must be traceable to one or more source files.

## Required Provenance Fields
- sourceFile
- sourceType
- sourceSectionOrLineRange if available
- extractedBy
- extractionConfidence
- reviewedStatus

## Concept Taxonomy
The taxonomy should support:
- lecture-level concepts
- 8086 instruction-level concepts
- memory and addressing concepts
- control flow concepts
- procedure/stack concepts
- I/O and interrupt concepts
- problem-type concepts

## Question Types
- multiple-choice
- true-false
- short-answer
- code-tracing
- output-prediction
- debugging
- fill-the-gap
- next-line
- code-completion
- assignment-style structured task

## Misconception Tags
Examples:
- register-width-confusion
- signed-vs-unsigned-jump-confusion
- address-vs-value-confusion
- stack-order-confusion
- loop-counter-confusion
- DOS-interrupt-usage-confusion

## Simulator Preset Schema
- code
- initialRegisters
- initialMemory
- inputBuffer
- expectedOutput
- steppingNotes
