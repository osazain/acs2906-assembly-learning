/**
 * Type definitions for ACS2906 Assembly Language Learning Platform
 * Content entities and assessment types
 */

// ============================================================================
// Provenance (Required on all entities)
// ============================================================================

export interface Provenance {
  sourceFile: string;
  sourceType: 'pdf' | 'asm' | 'markdown' | 'js' | 'generated';
  sourceSectionOrLineRange?: string;
  extractedBy: string;
  extractionConfidence: number;
  reviewedStatus: 'pending' | 'reviewed' | 'verified';
  lastReviewed?: string;
  notes?: string;
}

// ============================================================================
// Lecture Types
// ============================================================================

export interface Lecture {
  id: number;
  title: string;
  sourceFile: string;
  pageCount?: number;
  sections: LectureSection[];
  concepts: string[];
  instructions: string[];
  difficulty: 'foundational' | 'intermediate' | 'advanced';
  examRelevance: 'high' | 'medium' | 'low';
  provenance: Provenance;
}

export interface LectureSection {
  id: string;
  lectureId: number;
  title: string;
  content: string;
  pageRange?: string;
  concepts: string[];
  instructions: string[];
  examples: string[];
  assessmentItems: string[];
  quizQuestions?: string[];
}

// ============================================================================
// Example Types
// ============================================================================

export interface Example {
  id: string;
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

export interface Annotation {
  line: number;
  type: 'comment' | 'instruction' | 'register' | 'memory' | 'flag';
  text: string;
  linkedConcept?: string;
}

export interface SimulatorPreset {
  initialRegisters: Record<string, number>;
  initialMemory?: Record<string, number>;
  inputBuffer?: string;
  expectedOutput?: string;
  steppingNotes?: string[];
}

// ============================================================================
// Assessment Types
// ============================================================================

export type AssessmentType =
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

export interface AssessmentItem {
  id: string;
  sourceType: 'quiz' | 'worksheet' | 'test' | 'exam' | 'generated';
  sourceRefs: string[];
  type: AssessmentType;
  topic: string;
  subtopic: string;
  concepts: string[];
  instructions: string[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  prompt: string;
  answer: string | string[];
  options?: string[];
  hints: string[];
  explanation: string;
  remediationRefs: RemediationRef[];
  misconceptionTags: string[];
  timeEstimate?: number;
}

export interface RemediationRef {
  type: 'lecture' | 'section' | 'example' | 'worksheet' | 'instruction';
  id: string;
  description: string;
}

// ============================================================================
// Instruction Index Types
// ============================================================================

export type InstructionCategory =
  | 'data-transfer'
  | 'arithmetic'
  | 'logical'
  | 'control-flow'
  | 'shift'
  | 'io'
  | 'procedure';

export interface OperandSpec {
  type: 'register' | 'memory' | 'immediate' | 'register8' | 'register16' | 'segment' | 'relative';
  direction: 'r' | 'm' | 'i' | 'o';
  required: boolean;
  description?: string;
}

export interface InstructionEntry {
  name: string;
  category: InstructionCategory;
  syntax: string;
  operands?: OperandSpec[];
  flagsAffected: string[];
  operation: string;
  examples: string[];
  lectureRefs: { lecture: number; page: number }[];
  relatedInstructions: string[];
  exceptions?: string[];
}

export interface InstructionIndex {
  [mnemonic: string]: InstructionEntry;
}

// ============================================================================
// Concept Taxonomy Types
// ============================================================================

export interface ConceptCategory {
  id: string;
  name: string;
  parentId?: string;
  description: string;
  lectureIds: number[];
  conceptIds: string[];
}

export interface Concept {
  id: string;
  name: string;
  categoryId: string;
  description: string;
  lectureIds: number[];
  exampleIds: string[];
  assessmentItemIds: string[];
  relatedConcepts: string[];
}

export interface MisconceptionEntry {
  description: string;
  indicators: string[];
  commonIn: string[];
  remediationFor: RemediationRef[];
  relatedMisconceptions: string[];
}

export interface MisconceptionIndex {
  [tag: string]: MisconceptionEntry;
}

export interface ConceptTaxonomy {
  categories: ConceptCategory[];
  concepts: Record<string, Concept>;
  misconceptions: MisconceptionIndex;
}

// ============================================================================
// Mastery & Progress Types
// ============================================================================

export type StrengthLevel = 'mastered' | 'proficient' | 'developing' | 'beginning';

export interface MasteryMetrics {
  attempts: number;
  correct: number;
  accuracy: number;
  confidence: number;
  averageTimeMs: number;
  lastAttempt: string;
  firstAttempt: string;
}

export interface MasteryRecord {
  id?: number;
  userId: string;
  topicType: 'concept' | 'instruction' | 'section';
  topicId: string;
  metrics: MasteryMetrics;
  mistakePatterns: string[];
  strengthLevel: StrengthLevel;
  recommendationRefs: RemediationRef[];
  streak?: number;
  lastPracticed?: string;
}

export type StudyMode = 'lecture' | 'drill' | 'diagnostic' | 'game' | 'test' | 'simulator';

export interface StudySession {
  id?: number;
  userId: string;
  startedAt: string;
  endedAt?: string;
  mode: StudyMode;
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

// ============================================================================
// Processed Data File Schemas
// ============================================================================

export interface LecturesData {
  lectures: Lecture[];
  metadata: {
    generatedAt: string;
    generator: string;
    sourceVersion: string;
  };
}

export interface ExamplesData {
  examples: Example[];
  metadata: {
    generatedAt: string;
    generator: string;
    sourceVersion: string;
  };
}

export interface QuestionBankData {
  questions: AssessmentItem[];
  metadata: {
    generatedAt: string;
    generator: string;
    sourceVersion: string;
  };
}

// ============================================================================
// Cross-Reference Types
// ============================================================================

export interface InstructionExampleMapping {
  instruction: string;
  examples: string[];
  lectureRefs: { lecture: number; section?: string }[];
}

// ============================================================================
// Course Structure Types
// ============================================================================

export interface CourseMapLecture {
  id: number;
  title: string;
  topics: string[];
  examples: number;
  examRelevance: 'high' | 'medium' | 'low';
  difficulty: 'foundational' | 'intermediate' | 'advanced';
}

export interface CourseMapData {
  lectures: CourseMapLecture[];
  lastUpdated: string;
}
