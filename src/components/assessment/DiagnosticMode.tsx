import { useState, useMemo, useCallback, useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { 
  Stethoscope, 
  CheckCircle2, 
  XCircle, 
  SkipForward, 
  ChevronRight,
  Lightbulb,
  BookOpen,
  FlaskConical,
  Cpu,
  AlertCircle,
  Trophy,
  Target,
  Brain,
  TrendingUp,
  Clock
} from 'lucide-react'
import { cn } from '@/lib/utils'
import questionBankData from '@/data/processed/question-bank.json'
import type { AssessmentItem } from '@/lib/types'
import { db, getOrCreateUserId } from '@/lib/db'

// ============================================================================
// Types
// ============================================================================

interface DiagnosticQuestion extends AssessmentItem {
  status: 'unanswered' | 'correct' | 'incorrect' | 'skipped'
  selectedAnswer?: string
  timeMs?: number
}

interface DiagnosticSession {
  questions: DiagnosticQuestion[]
  currentIndex: number
  startedAt: string
  completedAt?: string
  selectedTopics: string[]
  // Adaptive tracking
  currentDifficulty: number
  streak: number
  // Mistake patterns
  mistakePatterns: MistakePattern[]
  // Topic performance for adaptive selection
  topicPerformance: Record<string, { correct: number; total: number }>
}

interface MistakePattern {
  patternId: string
  description: string
  indicators: string[]
  count: number
  affectedConcepts: string[]
}

interface DiagnosticReport {
  totalQuestions: number
  correctCount: number
  incorrectCount: number
  skippedCount: number
  accuracy: number
  duration: number
  topicBreakdown: Record<string, { total: number; correct: number; accuracy: number }>
  conceptBreakdown: Record<string, { total: number; correct: number; accuracy: number }>
  identifiedPatterns: MistakePattern[]
  weakAreas: WeakArea[]
  recommendations: RemediationRef[]
}

interface WeakArea {
  type: 'topic' | 'concept' | 'instruction'
  id: string
  name: string
  accuracy: number
  suggestion: string
}

interface RemediationRef {
  type: 'lecture' | 'section' | 'example' | 'worksheet' | 'instruction'
  id: string
  description: string
  link: string
}

// ============================================================================
// Constants
// ============================================================================

const INITIAL_DIFFICULTY = 3
const MAX_DIFFICULTY = 5
const MIN_DIFFICULTY = 1
const QUESTIONS_PER_TOPIC = 3 // Target questions per topic for diagnostic

// Mistake pattern definitions based on common assembly misconceptions
const MISTAKE_PATTERNS: Record<string, { description: string; indicators: string[]; misconceptionTag: string }> = {
  'signed-unsigned': {
    description: 'Signed vs Unsigned Interpretation',
    indicators: ['CF misinterpretation', 'overflow flag', 'negative numbers', 'sign extension'],
    misconceptionTag: 'misconception:signed-unsigned'
  },
  'register-naming': {
    description: 'Register Naming Confusion',
    indicators: ['AH vs AL', 'AX vs EAX', 'partial registers', 'register size'],
    misconceptionTag: 'misconception:register-naming'
  },
  'memory-addressing': {
    description: 'Memory Addressing Modes',
    indicators: ['[BX+SI]', 'indirect addressing', 'base registers', 'index registers'],
    misconceptionTag: 'misconception:memory-addressing'
  },
  'flag-effects': {
    description: 'Flag Effect Prediction',
    indicators: ['flags affected', 'ZF after operation', 'SF interpretation', 'OF vs CF'],
    misconceptionTag: 'misconception:flag-effects'
  },
  'arithmetic-overflow': {
    description: 'Arithmetic Overflow Detection',
    indicators: ['overflow detection', 'carry flag vs overflow flag', 'signed overflow'],
    misconceptionTag: 'misconception:overflow'
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function getDifficultyLabel(difficulty: number): string {
  switch (difficulty) {
    case 1: return 'Beginner'
    case 2: return 'Easy'
    case 3: return 'Medium'
    case 4: return 'Hard'
    case 5: return 'Expert'
    default: return 'Unknown'
  }
}

// ============================================================================
// DiagnosticMode Component
// ============================================================================

export function DiagnosticMode() {
  // Session state
  const [session, setSession] = useState<DiagnosticSession | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [questionStartTime, setQuestionStartTime] = useState<number>(() => Date.now())
  const [report, setReport] = useState<DiagnosticReport | null>(null)
  
  // Use ref to always have access to current session for async callbacks
  const sessionRef = useRef<DiagnosticSession | null>(session)
  sessionRef.current = session
  
  // Use ref to store finishDiagnostic to avoid forward reference issues
  const finishDiagnosticRef = useRef<(() => Promise<void>) | null>(null)
  
  // Topic selection state
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])
  
  // Get question bank
  const questionBank = questionBankData.questions as AssessmentItem[]
  
  // Get unique topics from question bank (mapped from lectures)
  const uniqueTopics = useMemo(() => {
    const topics = new Set<string>()
    questionBank.forEach(q => topics.add(q.topic))
    return Array.from(topics).sort()
  }, [questionBank])

  // Toggle topic selection
  const toggleTopic = useCallback((topic: string) => {
    setSelectedTopics(prev => 
      prev.includes(topic) 
        ? prev.filter(t => t !== topic)
        : [...prev, topic]
    )
  }, [])

  // Select all topics
  const selectAllTopics = useCallback(() => {
    setSelectedTopics([...uniqueTopics])
  }, [uniqueTopics])

  // Clear all topics
  const clearAllTopics = useCallback(() => {
    setSelectedTopics([])
  }, [])

  // Adaptive question selection based on current difficulty and performance
  const selectNextQuestion = useCallback((): DiagnosticQuestion | null => {
    if (!session) return null

    // Filter questions by selected topics and adjust difficulty
    const availableQuestions = questionBank.filter(q => {
      if (!session.selectedTopics.includes(q.topic)) return false
      // Don't ask the same question twice
      if (session.questions.some(sq => sq.id === q.id)) return false
      // Allow some flexibility around target difficulty (+/- 1)
      const diff = q.difficulty
      const target = session.currentDifficulty
      if (diff < target - 1 || diff > target + 1) return false
      return true
    })

    if (availableQuestions.length === 0) return null

    // Weight selection towards topics/concepts that need more assessment
    const weighted = availableQuestions.map(q => {
      let weight = 1
      // Boost questions for weak topics
      Object.entries(session.topicPerformance).forEach(([topic, perf]) => {
        if (q.topic === topic && perf.total > 0) {
          // Lower accuracy = higher weight
          weight += Math.max(0, (1 - perf.correct / perf.total) * 2)
        }
      })
      return { question: q, weight }
    })

    // Random selection with weights
    const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0)
    let random = Math.random() * totalWeight
    for (const w of weighted) {
      random -= w.weight
      if (random <= 0) return { ...w.question, status: 'unanswered' as const }
    }

    return { ...weighted[0].question, status: 'unanswered' as const }
  }, [session, questionBank])

  // Start diagnostic session
  const startDiagnostic = useCallback(async () => {
    if (selectedTopics.length === 0) return

    // Get initial questions - mix of difficulties
    const initialQuestions: DiagnosticQuestion[] = []
    const shuffled = shuffleArray(questionBank.filter(q => selectedTopics.includes(q.topic)))
    
    // Select initial set with varied difficulties
    for (let diff = MIN_DIFFICULTY; diff <= MAX_DIFFICULTY && initialQuestions.length < selectedTopics.length * QUESTIONS_PER_TOPIC; diff++) {
      const diffQuestions = shuffled.filter(q => 
        q.difficulty === diff && 
        !initialQuestions.some(iq => iq.id === q.id) &&
        selectedTopics.includes(q.topic)
      ).slice(0, Math.ceil(QUESTIONS_PER_TOPIC / 2))
      initialQuestions.push(...diffQuestions.map(q => ({ ...q, status: 'unanswered' as const })))
    }

    // Initialize topic performance tracking
    const topicPerformance: Record<string, { correct: number; total: number }> = {}
    selectedTopics.forEach(topic => {
      topicPerformance[topic] = { correct: 0, total: 0 }
    })

    const newSession: DiagnosticSession = {
      questions: initialQuestions.slice(0, Math.min(initialQuestions.length, 15)), // Cap at 15 questions
      currentIndex: 0,
      startedAt: new Date().toISOString(),
      selectedTopics,
      currentDifficulty: INITIAL_DIFFICULTY,
      streak: 0,
      mistakePatterns: [],
      topicPerformance
    }

    setSession(newSession)
    setSelectedAnswer(null)
    setShowFeedback(false)
    setQuestionStartTime(Date.now())
    setReport(null)
  }, [selectedTopics, questionBank])

  // Handle answer selection
  const handleSelectAnswer = useCallback((answer: string) => {
    if (showFeedback) return
    setSelectedAnswer(answer)
  }, [showFeedback])

  // Detect mistake patterns based on question and answer
  const detectMistakePatterns = useCallback((
    question: DiagnosticQuestion,
    _selectedAnswer: string,
    isCorrect: boolean
  ): MistakePattern[] => {
    if (isCorrect) return []
    
    const detectedPatterns: MistakePattern[] = []
    const misconceptionTags = question.misconceptionTags || []
    
    // Check each known mistake pattern
    Object.entries(MISTAKE_PATTERNS).forEach(([patternId, patternDef]) => {
      // Check if question has misconception tag matching this pattern
      const hasMatchingTag = misconceptionTags.some(tag => 
        tag.includes(patternId.replace('-', '-')) || 
        patternDef.misconceptionTag.includes(tag)
      )
      
      // Also check if question topic/concepts indicate this pattern area
      const topicMatch = Object.values(patternDef.indicators).some(indicator =>
        question.topic.toLowerCase().includes(indicator.toLowerCase()) ||
        question.subtopic.toLowerCase().includes(indicator.toLowerCase()) ||
        question.concepts.some(c => c.toLowerCase().includes(indicator.toLowerCase()))
      )
      
      if (hasMatchingTag || topicMatch) {
        detectedPatterns.push({
          patternId,
          description: patternDef.description,
          indicators: patternDef.indicators,
          count: 1,
          affectedConcepts: question.concepts
        })
      }
    })
    
    return detectedPatterns
  }, [])

  // Handle submit
  const handleSubmit = useCallback(async () => {
    if (!session || selectedAnswer === null) return

    const currentQuestion = session.questions[session.currentIndex]
    const isCorrect = selectedAnswer === currentQuestion.answer
    const timeMs = Date.now() - questionStartTime

    // Detect mistake patterns
    const detectedPatterns = detectMistakePatterns(currentQuestion, selectedAnswer, isCorrect)

    // Update session
    setSession(prev => {
      if (!prev) return prev
      
      const updatedQuestions = [...prev.questions]
      updatedQuestions[prev.currentIndex] = {
        ...updatedQuestions[prev.currentIndex],
        status: isCorrect ? 'correct' : 'incorrect',
        selectedAnswer,
        timeMs,
      }

      // Update topic performance
      const topicPerf = { ...prev.topicPerformance }
      if (topicPerf[currentQuestion.topic]) {
        topicPerf[currentQuestion.topic] = {
          ...topicPerf[currentQuestion.topic],
          total: topicPerf[currentQuestion.topic].total + 1,
          correct: topicPerf[currentQuestion.topic].correct + (isCorrect ? 1 : 0)
        }
      }

      // Merge detected patterns
      const mergedPatterns = [...prev.mistakePatterns]
      detectedPatterns.forEach(dp => {
        const existing = mergedPatterns.find(p => p.patternId === dp.patternId)
        if (existing) {
          existing.count++
          existing.affectedConcepts = [...new Set([...existing.affectedConcepts, ...dp.affectedConcepts])]
        } else {
          mergedPatterns.push(dp)
        }
      })

      // Adaptive difficulty adjustment
      let newDifficulty = prev.currentDifficulty
      if (isCorrect) {
        prev.streak++
        if (prev.streak >= 2 && prev.currentDifficulty < MAX_DIFFICULTY) {
          newDifficulty = prev.currentDifficulty + 1
        }
      } else {
        prev.streak = 0
        if (prev.currentDifficulty > MIN_DIFFICULTY) {
          newDifficulty = prev.currentDifficulty - 1
        }
      }

      // Select next question adaptively
      const nextQ = selectNextQuestion()
      if (nextQ) {
        updatedQuestions.push(nextQ)
      }

      return { 
        ...prev, 
        questions: updatedQuestions, 
        currentDifficulty: newDifficulty,
        streak: prev.streak,
        mistakePatterns: mergedPatterns,
        topicPerformance: topicPerf
      }
    })

    setShowFeedback(true)

    // Save answer to IndexedDB
    try {
      const userId = await getOrCreateUserId()
      await db.answers.add({
        userId,
        questionId: currentQuestion.id,
        answeredAt: new Date().toISOString(),
        correct: isCorrect,
        timeMs,
        selectedOption: selectedAnswer,
      })
    } catch (e) {
      console.warn('Failed to save answer to IndexedDB:', e)
    }
  }, [session, selectedAnswer, questionStartTime, detectMistakePatterns, selectNextQuestion])

  // Handle skip
  // Uses sessionRef.current to avoid stale closure issues
  const handleSkip = useCallback(() => {
    // Use sessionRef.current to get the current session
    const currentSession = sessionRef.current
    if (!currentSession) return

    const timeMs = Date.now() - questionStartTime
    const currentQuestion = currentSession.questions[currentSession.currentIndex]

    // Determine if there's a next question BEFORE updating state
    const hasNextQuestion = currentSession.currentIndex < currentSession.questions.length - 1

    setSession(prev => {
      if (!prev) return prev
      
      const updatedQuestions = [...prev.questions]
      updatedQuestions[prev.currentIndex] = {
        ...updatedQuestions[prev.currentIndex],
        status: 'skipped',
        selectedAnswer: undefined,
        timeMs,
      }

      // Update topic performance (skip counts as incorrect for diagnostic purposes)
      const topicPerf = { ...prev.topicPerformance }
      if (topicPerf[currentQuestion.topic]) {
        topicPerf[currentQuestion.topic] = {
          ...topicPerf[currentQuestion.topic],
          total: topicPerf[currentQuestion.topic].total + 1,
        }
      }

      // Select next question
      const nextQ = selectNextQuestion()
      if (nextQ) {
        updatedQuestions.push(nextQ)
      }

      return { 
        ...prev, 
        questions: updatedQuestions, 
        mistakePatterns: prev.mistakePatterns,
        topicPerformance: topicPerf
      }
    })

    // Move to next if there's more questions - use the pre-computed value
    if (hasNextQuestion) {
      setSelectedAnswer(null)
      setShowFeedback(false)
      setQuestionStartTime(Date.now())
      setSession(prev => prev ? { ...prev, currentIndex: prev.currentIndex + 1 } : prev)
    } else {
      // End diagnostic - use the ref to call finishDiagnostic
      // This ensures we get the latest version with updated sessionRef.current
      if (finishDiagnosticRef.current) {
        finishDiagnosticRef.current()
      }
    }
  }, [questionStartTime, selectNextQuestion])

  // Finish diagnostic and generate report
  // Uses sessionRef.current to ensure we always have the latest session state
  const finishDiagnostic = useCallback(async () => {
    // Use sessionRef.current to get the current session (avoids stale closure issue)
    const currentSession = sessionRef.current
    if (!currentSession) return

    const completedAt = new Date().toISOString()
    const duration = new Date(completedAt).getTime() - new Date(currentSession.startedAt).getTime()

    // Calculate topic breakdown
    const topicBreakdown: Record<string, { total: number; correct: number; accuracy: number }> = {}
    currentSession.selectedTopics.forEach(topic => {
      topicBreakdown[topic] = { total: 0, correct: 0, accuracy: 0 }
    })

    // Calculate concept breakdown
    const conceptBreakdown: Record<string, { total: number; correct: number; accuracy: number }> = {}

    currentSession.questions.forEach(q => {
      // Topic breakdown
      if (topicBreakdown[q.topic]) {
        topicBreakdown[q.topic].total++
        if (q.status === 'correct') {
          topicBreakdown[q.topic].correct++
        }
      }

      // Concept breakdown
      q.concepts.forEach(concept => {
        if (!conceptBreakdown[concept]) {
          conceptBreakdown[concept] = { total: 0, correct: 0, accuracy: 0 }
        }
        conceptBreakdown[concept].total++
        if (q.status === 'correct') {
          conceptBreakdown[concept].correct++
        }
      })
    })

    // Calculate accuracies
    Object.keys(topicBreakdown).forEach(topic => {
      const tb = topicBreakdown[topic]
      tb.accuracy = tb.total > 0 ? Math.round((tb.correct / tb.total) * 100) : 0
    })
    Object.keys(conceptBreakdown).forEach(concept => {
      const cb = conceptBreakdown[concept]
      cb.accuracy = cb.total > 0 ? Math.round((cb.correct / cb.total) * 100) : 0
    })

    // Identify weak areas
    const weakAreas: WeakArea[] = []
    
    // Topics below 70% are weak
    Object.entries(topicBreakdown).forEach(([topic, data]) => {
      if (data.accuracy < 70) {
        weakAreas.push({
          type: 'topic',
          id: topic,
          name: topic,
          accuracy: data.accuracy,
          suggestion: `Review ${topic} concepts - scored ${data.accuracy}%`
        })
      }
    })

    // Concepts below 60% are weak
    Object.entries(conceptBreakdown).forEach(([concept, data]) => {
      if (data.accuracy < 60 && data.total >= 2) {
        weakAreas.push({
          type: 'concept',
          id: concept,
          name: concept,
          accuracy: data.accuracy,
          suggestion: `Practice ${concept} - scored ${data.accuracy}%`
        })
      }
    })

    // Sort weak areas by accuracy (lowest first)
    weakAreas.sort((a, b) => a.accuracy - b.accuracy)

    // Generate recommendations based on weak areas
    const recommendations: RemediationRef[] = []
    const addedRefs = new Set<string>()
    
    weakAreas.slice(0, 5).forEach(area => {
      // Find remediation references from questions
      currentSession.questions
        .filter(q => 
          (area.type === 'topic' && q.topic === area.id) ||
          (area.type === 'concept' && q.concepts.includes(area.id))
        )
        .flatMap(q => q.remediationRefs || [])
        .forEach(ref => {
          if (!addedRefs.has(`${ref.type}-${ref.id}`)) {
            addedRefs.add(`${ref.type}-${ref.id}`)
            recommendations.push({
              ...ref,
              link: ref.type === 'lecture' ? `#/lecture/${ref.id}` : '#/course-map'
            })
          }
        })
    })

    // Calculate totals
    const totalQuestions = currentSession.questions.length
    const correctCount = currentSession.questions.filter(q => q.status === 'correct').length
    const incorrectCount = currentSession.questions.filter(q => q.status === 'incorrect').length
    const skippedCount = currentSession.questions.filter(q => q.status === 'skipped').length
    const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0

    const newReport: DiagnosticReport = {
      totalQuestions,
      correctCount,
      incorrectCount,
      skippedCount,
      accuracy,
      duration,
      topicBreakdown,
      conceptBreakdown,
      identifiedPatterns: currentSession.mistakePatterns,
      weakAreas,
      recommendations
    }

    setReport(newReport)
    setSession(prev => prev ? { ...prev, completedAt: completedAt } : prev)

    // Save diagnostic session to IndexedDB
    try {
      const userId = await getOrCreateUserId()
      await db.sessions.add({
        userId,
        startedAt: currentSession.startedAt,
        endedAt: completedAt,
        mode: 'diagnostic',
        topics: currentSession.selectedTopics,
        itemsCompleted: totalQuestions,
        correctCount
      })
    } catch (e) {
      console.warn('Failed to save diagnostic session to IndexedDB:', e)
    }
    
    // Store reference for callers that need the current function
    finishDiagnosticRef.current = finishDiagnostic
  }, []) // No dependencies - uses sessionRef.current internally

  // Handle next question
  const handleNext = useCallback(() => {
    if (!session) return

    if (session.currentIndex < session.questions.length - 1) {
      setSession(prev => prev ? { ...prev, currentIndex: prev.currentIndex + 1 } : prev)
      setSelectedAnswer(null)
      setShowFeedback(false)
      setQuestionStartTime(Date.now())
    } else {
      // No more questions, finish diagnostic - use ref
      if (finishDiagnosticRef.current) {
        finishDiagnosticRef.current()
      }
    }
  }, [session])

  // Reset to topic selection
  const resetDiagnostic = useCallback(() => {
    setSession(null)
    setSelectedAnswer(null)
    setShowFeedback(false)
    setReport(null)
    setSelectedTopics([])
  }, [])

  // Get current question
  const currentQuestion = session?.questions[session.currentIndex]

  // ========================================================================
  // SCREEN 1: Topic Selection
  // ========================================================================
  if (!session && !report) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-sm font-medium">
            <Stethoscope className="h-4 w-4" />
            Assessment
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Diagnostic Assessment</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Identify your strengths and weaknesses. Select topics to assess and receive a personalized report with remediation recommendations.
          </p>
        </div>

        {/* Topic Selection */}
        <div className="border rounded-xl bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-muted-foreground" />
              <span className="font-semibold text-lg">Select Topics to Assess</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={selectAllTopics}
                className="text-sm text-primary hover:underline"
              >
                Select All
              </button>
              <span className="text-muted-foreground">|</span>
              <button
                onClick={clearAllTopics}
                className="text-sm text-muted-foreground hover:underline"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="text-sm text-muted-foreground mb-4">
            {selectedTopics.length} topic{selectedTopics.length !== 1 ? 's' : ''} selected
          </div>

          {/* Topic Grid */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {uniqueTopics.map(topic => {
              const isSelected = selectedTopics.includes(topic)
              const topicQuestions = questionBank.filter(q => q.topic === topic).length
              
              return (
                <button
                  key={topic}
                  onClick={() => toggleTopic(topic)}
                  className={cn(
                    'p-4 rounded-lg border text-left transition-all',
                    isSelected 
                      ? 'border-primary bg-primary/10 ring-2 ring-primary' 
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5',
                      isSelected 
                        ? 'border-primary bg-primary' 
                        : 'border-muted-foreground/30'
                    )}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{topic}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {topicQuestions} questions available
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Start Button */}
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={startDiagnostic}
            disabled={selectedTopics.length === 0}
            className={cn(
              'inline-flex items-center gap-2 px-8 py-4 rounded-lg font-medium text-lg transition-colors',
              selectedTopics.length > 0
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            )}
          >
            <Stethoscope className="h-5 w-5" />
            Start Diagnostic ({selectedTopics.length > 0 ? `~${Math.min(selectedTopics.length * QUESTIONS_PER_TOPIC, 15)} questions` : '0 questions'})
          </button>
          
          {selectedTopics.length === 0 && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Select at least one topic to begin the diagnostic.
            </p>
          )}
        </div>

        {/* Info Box */}
        <div className="border rounded-lg bg-muted/30 p-4">
          <div className="flex items-start gap-3">
            <Brain className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-sm mb-1">How Diagnostic Mode Works</div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Questions adapt to your performance level</li>
                <li>• Correct answers may increase difficulty</li>
                <li>• Incorrect answers help identify weak areas</li>
                <li>• You'll receive a detailed report with remediation suggestions</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ========================================================================
  // SCREEN 2: Diagnostic Report
  // ========================================================================
  if (report) {
    const formatDuration = (ms: number): string => {
      const seconds = Math.floor(ms / 1000)
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60
      if (minutes > 0) {
        return `${minutes}m ${remainingSeconds}s`
      }
      return `${seconds}s`
    }

    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        {/* Report Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-medium">
            <Trophy className="h-4 w-4" />
            Diagnostic Complete
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Your Performance Report</h1>
        </div>

        {/* Overall Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="border rounded-xl bg-card p-4 text-center">
            <div className="text-3xl font-bold text-primary">{report.totalQuestions}</div>
            <div className="text-sm text-muted-foreground">Questions</div>
          </div>
          <div className="border rounded-xl bg-card p-4 text-center">
            <div className="text-3xl font-bold text-green-600">{report.correctCount}</div>
            <div className="text-sm text-muted-foreground">Correct</div>
          </div>
          <div className="border rounded-xl bg-card p-4 text-center">
            <div className="text-3xl font-bold text-red-600">{report.incorrectCount}</div>
            <div className="text-sm text-muted-foreground">Incorrect</div>
          </div>
          <div className="border rounded-xl bg-card p-4 text-center">
            <div className="text-3xl font-bold">{report.accuracy}%</div>
            <div className="text-sm text-muted-foreground">Accuracy</div>
          </div>
        </div>

        {/* Duration */}
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Completed in {formatDuration(report.duration)}</span>
        </div>

        {/* Identified Patterns */}
        {report.identifiedPatterns.length > 0 && (
          <div className="border rounded-xl bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <h2 className="font-semibold">Identified Mistake Patterns</h2>
            </div>
            <div className="space-y-2">
              {report.identifiedPatterns.map((pattern, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <div className="font-medium text-sm text-amber-900 dark:text-amber-200">
                    {pattern.description}
                  </div>
                  <div className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    Affected {pattern.count} time{pattern.count !== 1 ? 's' : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weak Areas */}
        {report.weakAreas.length > 0 && (
          <div className="border rounded-xl bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-5 w-5 text-red-600" />
              <h2 className="font-semibold">Areas for Improvement</h2>
            </div>
            <div className="space-y-3">
              {report.weakAreas.slice(0, 5).map((area, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full font-medium',
                        area.type === 'topic' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                        area.type === 'concept' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' :
                        'bg-muted text-muted-foreground'
                      )}>
                        {area.type}
                      </span>
                      <span className="font-medium text-sm">{area.name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{area.suggestion}</div>
                  </div>
                  <div className="text-2xl font-bold text-red-600">{area.accuracy}%</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Topic Breakdown */}
        <div className="border rounded-xl bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Performance by Topic</h2>
          </div>
          <div className="space-y-3">
            {Object.entries(report.topicBreakdown).map(([topic, data]) => (
              <div key={topic} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{topic}</span>
                  <span className="text-muted-foreground">
                    {data.correct}/{data.total} ({data.accuracy}%)
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      'h-full transition-all',
                      data.accuracy >= 80 ? 'bg-green-500' : 
                      data.accuracy >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    )}
                    style={{ width: `${data.accuracy}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        {report.recommendations.length > 0 && (
          <div className="border rounded-xl bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <h2 className="font-semibold">Remediation Recommendations</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {report.recommendations.map((rec, idx) => (
                <a
                  key={idx}
                  href={rec.link}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  {rec.type === 'lecture' && <BookOpen className="h-4 w-4" />}
                  {rec.type === 'example' && <FlaskConical className="h-4 w-4" />}
                  {rec.type === 'instruction' && <Cpu className="h-4 w-4" />}
                  {rec.description}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={resetDiagnostic}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
          >
            <Stethoscope className="h-4 w-4" />
            Take Another Diagnostic
          </button>
          <Link
            to="/course-map"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border hover:bg-muted transition-colors font-medium"
          >
            <BookOpen className="h-4 w-4" />
            Back to Course Map
          </Link>
        </div>
      </div>
    )
  }

  // ========================================================================
  // SCREEN 3: Active Diagnostic Session
  // ========================================================================
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Progress Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-purple-600" />
            <span className="text-muted-foreground">Diagnostic Mode</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full font-medium',
              session!.currentDifficulty <= 2 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
              session!.currentDifficulty <= 3 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
              'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
            )}>
              Level: {getDifficultyLabel(session!.currentDifficulty)}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Question {session!.currentIndex + 1} of {session!.questions.length}
          </span>
          <span className="text-muted-foreground">
            {session!.questions.filter(q => q.status !== 'unanswered').length} answered
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-purple-500 transition-all"
            style={{ width: `${((session!.currentIndex + 1) / session!.questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      {currentQuestion && (
        <div className="border rounded-xl bg-card overflow-hidden">
          {/* Question Header */}
          <div className="p-4 border-b bg-muted/30">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium">
                {currentQuestion.topic}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                {currentQuestion.subtopic}
              </span>
              <span className={cn(
                'text-xs px-2 py-0.5 rounded font-medium',
                currentQuestion.difficulty <= 2 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                currentQuestion.difficulty <= 3 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
              )}>
                {getDifficultyLabel(currentQuestion.difficulty)}
              </span>
            </div>
            {currentQuestion.instructions.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {currentQuestion.instructions.map(instr => (
                  <span key={instr} className="text-xs px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                    {instr}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Question Prompt */}
          <div className="p-6">
            <h2 className="text-lg font-medium mb-4">{currentQuestion.prompt}</h2>

            {/* Options */}
            {currentQuestion.options && currentQuestion.options.length > 0 && (
              <div className="space-y-2">
                {currentQuestion.options.map((option, idx) => {
                  const isSelected = selectedAnswer === option
                  const isCorrect = option === currentQuestion.answer
                  
                  let optionStyle = 'border-border hover:border-primary/50'
                  if (showFeedback) {
                    if (isCorrect) {
                      optionStyle = 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    } else if (isSelected && !isCorrect) {
                      optionStyle = 'border-red-500 bg-red-50 dark:bg-red-900/20'
                    }
                  } else if (isSelected) {
                    optionStyle = 'border-primary bg-primary/10'
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectAnswer(option)}
                      disabled={showFeedback}
                      className={cn(
                        'w-full flex items-center gap-3 p-4 rounded-lg border text-left transition-colors',
                        optionStyle,
                        !showFeedback && 'cursor-pointer'
                      )}
                    >
                      <span className={cn(
                        'flex items-center justify-center w-8 h-8 rounded-full border text-sm font-medium shrink-0',
                        isSelected && !showFeedback ? 'border-primary bg-primary text-primary-foreground' :
                        isSelected && showFeedback && isCorrect ? 'border-green-500 bg-green-500 text-white' :
                        isSelected && showFeedback && !isCorrect ? 'border-red-500 bg-red-500 text-white' :
                        'border-muted-foreground/30'
                      )}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="flex-1">{option}</span>
                      {showFeedback && isCorrect && (
                        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                      )}
                      {showFeedback && isSelected && !isCorrect && (
                        <XCircle className="h-5 w-5 text-red-600 shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {/* True/False Question */}
            {currentQuestion.type === 'true-false' && (
              <div className="flex gap-3">
                {['True', 'False'].map(option => {
                  const isSelected = selectedAnswer === option
                  const isCorrect = option === currentQuestion.answer
                  
                  let optionStyle = 'border-border'
                  if (showFeedback) {
                    if (isCorrect) {
                      optionStyle = 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    } else if (isSelected && !isCorrect) {
                      optionStyle = 'border-red-500 bg-red-50 dark:bg-red-900/20'
                    }
                  } else if (isSelected) {
                    optionStyle = 'border-primary bg-primary/10'
                  }

                  return (
                    <button
                      key={option}
                      onClick={() => handleSelectAnswer(option)}
                      disabled={showFeedback}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border font-medium transition-colors',
                        optionStyle,
                        !showFeedback && 'hover:border-primary/50 cursor-pointer'
                      )}
                    >
                      {option}
                      {showFeedback && isCorrect && (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      )}
                      {showFeedback && isSelected && !isCorrect && (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Feedback Section */}
          {showFeedback && (
            <div className="border-t bg-muted/30 p-4 space-y-4">
              {/* Feedback Message */}
              <div className={cn(
                'p-4 rounded-lg',
                currentQuestion.status === 'correct' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' :
                currentQuestion.status === 'incorrect' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' :
                'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
              )}>
                <div className="flex items-center gap-2 font-semibold">
                  {currentQuestion.status === 'correct' && (
                    <>
                      <CheckCircle2 className="h-5 w-5" />
                      Correct! (Difficulty: {getDifficultyLabel(session!.currentDifficulty)})
                    </>
                  )}
                  {currentQuestion.status === 'incorrect' && (
                    <>
                      <XCircle className="h-5 w-5" />
                      Incorrect. The correct answer was: {currentQuestion.answer}
                    </>
                  )}
                  {currentQuestion.status === 'skipped' && (
                    <>
                      <SkipForward className="h-5 w-5" />
                      Skipped
                    </>
                  )}
                </div>
              </div>

              {/* Explanation */}
              <div className="p-4 rounded-lg bg-card border">
                <div className="flex items-center gap-2 font-semibold mb-2">
                  <Lightbulb className="h-5 w-5 text-amber-600" />
                  Explanation
                </div>
                <p className="text-sm text-muted-foreground">{currentQuestion.explanation}</p>
              </div>

              {/* Remediation Links */}
              {currentQuestion.remediationRefs && currentQuestion.remediationRefs.length > 0 && (
                <div className="p-4 rounded-lg bg-card border">
                  <div className="flex items-center gap-2 font-semibold mb-2">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                    Review Material
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {currentQuestion.remediationRefs.map((ref, idx) => (
                      <a
                        key={idx}
                        href={ref.type === 'lecture' ? `#/lecture/${ref.id}` : '#/course-map'}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm hover:bg-primary/20 transition-colors"
                      >
                        {ref.type === 'lecture' && <BookOpen className="h-4 w-4" />}
                        {ref.type === 'example' && <FlaskConical className="h-4 w-4" />}
                        {ref.type === 'instruction' && <Cpu className="h-4 w-4" />}
                        {ref.description}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleSkip}
          disabled={showFeedback}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50"
        >
          <SkipForward className="h-4 w-4" />
          Skip
        </button>

        <div className="flex gap-3">
          {!showFeedback ? (
            <button
              onClick={handleSubmit}
              disabled={selectedAnswer === null}
              className={cn(
                'inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors',
                selectedAnswer !== null
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              )}
            >
              Submit Answer
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-colors"
            >
              {session!.currentIndex < session!.questions.length - 1 ? (
                <>
                  Next Question
                  <ChevronRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  View Report
                  <Trophy className="h-4 w-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Adaptive Info */}
      <div className="text-center text-xs text-muted-foreground">
        {session!.streak > 0 && (
          <span className="text-green-600 dark:text-green-400">
            🔥 {session!.streak} streak! Next question may be harder.
          </span>
        )}
        {session!.currentDifficulty > INITIAL_DIFFICULTY && (
          <span className="text-primary ml-2">
            Showing harder questions based on your performance.
          </span>
        )}
      </div>
    </div>
  )
}
