import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { 
  Target, 
  CheckCircle2, 
  XCircle, 
  SkipForward, 
  Settings, 
  ChevronRight,
  AlertCircle,
  Lightbulb,
  BookOpen,
  FlaskConical,
  Cpu,
  Filter,
  X,
  Trophy
} from 'lucide-react'
import { cn } from '@/lib/utils'
import questionBankData from '@/data/processed/question-bank.json'
import type { AssessmentItem } from '@/lib/types'
import { ResultsSummary, type DrillSessionResults } from './ResultsSummary'
import { db, getOrCreateUserId, updateMastery, addMistakePattern, createSession, endSession } from '@/lib/db'
import type { AnswerRecord } from '@/lib/db'

// ============================================================================
// Types
// ============================================================================

interface DrillSettings {
  questionCount: number
  difficultyRange: [number, number]
  includeTopics: string[]
  includeInstructions: string[]
  includeConcepts: string[]
}

interface DrillQuestion extends AssessmentItem {
  status: 'unanswered' | 'correct' | 'incorrect' | 'skipped'
  selectedAnswer?: string
  timeMs?: number
}

interface DrillSession {
  questions: DrillQuestion[]
  currentIndex: number
  startedAt: string
  completedAt?: string
  settings: DrillSettings
  sessionId?: number
}

interface DrillResult {
  total: number
  correct: number
  incorrect: number
  skipped: number
  accuracy: number
  duration: number
  byTopic: Record<string, { total: number; correct: number }>
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_SETTINGS: DrillSettings = {
  questionCount: 10,
  difficultyRange: [1, 5],
  includeTopics: [],
  includeInstructions: [],
  includeConcepts: [],
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
// DrillMode Component
// ============================================================================

export function DrillMode() {
  // Drill state
  const [settings, setSettings] = useState<DrillSettings>(DEFAULT_SETTINGS)
  const [session, setSession] = useState<DrillSession | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [questionStartTime, setQuestionStartTime] = useState<number>(() => Date.now())
  
  // Filter selection state
  const [selectedTopic, setSelectedTopic] = useState<string>('')
  const [selectedConcept, setSelectedConcept] = useState<string>('')
  const [selectedInstruction, setSelectedInstruction] = useState<string>('')
  const [selectedDifficulty, setSelectedDifficulty] = useState<number | null>(null)

  // Get unique topics, concepts, and instructions from question bank
  const questionBank = questionBankData.questions as AssessmentItem[]
  
  const uniqueTopics = useMemo(() => {
    const topics = new Set<string>()
    questionBank.forEach(q => topics.add(q.topic))
    return Array.from(topics).sort()
  }, [questionBank])

  const uniqueConcepts = useMemo(() => {
    const concepts = new Set<string>()
    questionBank.forEach(q => q.concepts.forEach(c => concepts.add(c)))
    return Array.from(concepts).sort()
  }, [questionBank])

  const uniqueInstructions = useMemo(() => {
    const instructions = new Set<string>()
    questionBank.forEach(q => q.instructions.forEach(i => instructions.add(i)))
    return Array.from(instructions).sort()
  }, [questionBank])

  // Filter questions based on current filters
  const filteredQuestions = useMemo(() => {
    return questionBank.filter(q => {
      if (selectedTopic && q.topic !== selectedTopic) return false
      if (selectedConcept && !q.concepts.includes(selectedConcept)) return false
      if (selectedInstruction && !q.instructions.includes(selectedInstruction)) return false
      if (selectedDifficulty !== null && q.difficulty !== selectedDifficulty) return false
      return true
    })
  }, [questionBank, selectedTopic, selectedConcept, selectedInstruction, selectedDifficulty])

  // Move to next question - declared before handlers that use it
  const moveToNext = useCallback(() => {
    setSession(prev => {
      if (!prev) return prev
      if (prev.currentIndex < prev.questions.length - 1) {
        setSelectedAnswer(null)
        setShowFeedback(false)
        setQuestionStartTime(Date.now())
        return { ...prev, currentIndex: prev.currentIndex + 1 }
      } else {
        return { ...prev, completedAt: new Date().toISOString() }
      }
    })
  }, [])

  // Start a new drill session
  const startDrill = useCallback(async () => {
    const shuffled = shuffleArray(filteredQuestions)
    const selected = shuffled.slice(0, Math.min(settings.questionCount, shuffled.length))
    
    const questions: DrillQuestion[] = selected.map(q => ({
      ...q,
      status: 'unanswered',
    }))

    // Create a study session in IndexedDB
    let sessionId: number | undefined
    try {
      const userId = await getOrCreateUserId()
      // Collect unique topics from selected questions
      const topics = [...new Set(selected.map(q => q.topic))]
      sessionId = await createSession(userId, 'drill', topics)
    } catch (error) {
      console.error('Failed to create study session:', error)
    }

    setSession({
      questions,
      currentIndex: 0,
      startedAt: new Date().toISOString(),
      settings,
      sessionId,
    })
    setSelectedAnswer(null)
    setShowFeedback(false)
    setQuestionStartTime(Date.now())
    setShowSettings(false)
  }, [filteredQuestions, settings])

  // Handle answer selection
  const handleSelectAnswer = useCallback((answer: string) => {
    if (showFeedback) return
    setSelectedAnswer(answer)
  }, [showFeedback])

  // Handle submit
  const handleSubmit = useCallback(async () => {
    if (!session || selectedAnswer === null) return

    const currentQuestion = session.questions[session.currentIndex]
    const isCorrect = selectedAnswer === currentQuestion.answer
    const timeMs = Date.now() - questionStartTime

    // Record answer to IndexedDB and update mastery
    try {
      const userId = await getOrCreateUserId()

      // Record the answer
      const answerRecord: AnswerRecord = {
        userId,
        questionId: currentQuestion.id,
        answeredAt: new Date().toISOString(),
        correct: isCorrect,
        timeMs,
        selectedOption: selectedAnswer,
      }
      await db.answers.add(answerRecord)

      // Update mastery for each concept in the question
      for (const concept of currentQuestion.concepts) {
        await updateMastery(userId, 'concept', concept, isCorrect, timeMs)
      }

      // Update mastery for each instruction in the question
      for (const instruction of currentQuestion.instructions) {
        await updateMastery(userId, 'instruction', instruction, isCorrect, timeMs)
      }

      // If incorrect, track mistake patterns
      if (!isCorrect && currentQuestion.misconceptionTags.length > 0) {
        // Track mistake patterns for each concept
        for (const concept of currentQuestion.concepts) {
          await addMistakePattern(userId, 'concept', concept, currentQuestion.misconceptionTags)
        }
      }
    } catch (error) {
      console.error('Failed to record answer to IndexedDB:', error)
    }

    setSession(prev => {
      if (!prev) return prev
      const updatedQuestions = [...prev.questions]
      updatedQuestions[prev.currentIndex] = {
        ...updatedQuestions[prev.currentIndex],
        status: isCorrect ? 'correct' : 'incorrect',
        selectedAnswer,
        timeMs,
      }
      return { ...prev, questions: updatedQuestions }
    })

    setShowFeedback(true)
  }, [session, selectedAnswer, questionStartTime])

  // Handle skip
  const handleSkip = useCallback(() => {
    if (!session) return

    const timeMs = Date.now() - questionStartTime

    setSession(prev => {
      if (!prev) return prev
      const updatedQuestions = [...prev.questions]
      updatedQuestions[prev.currentIndex] = {
        ...updatedQuestions[prev.currentIndex],
        status: 'skipped',
        selectedAnswer: undefined,
        timeMs,
      }
      return { ...prev, questions: updatedQuestions }
    })

    // Move to next after skip
    if (session.currentIndex < session.questions.length - 1) {
      setSelectedAnswer(null)
      setShowFeedback(false)
      setQuestionStartTime(Date.now())
      setSession(prev => prev ? { ...prev, currentIndex: prev.currentIndex + 1 } : prev)
    } else {
      setSession(prev => prev ? { ...prev, completedAt: new Date().toISOString() } : prev)
    }
  }, [session, questionStartTime])

  // Handle next after feedback
  const handleNext = useCallback(() => {
    moveToNext()
  }, [moveToNext])

  // Clear filters
  const clearFilters = useCallback(() => {
    setSelectedTopic('')
    setSelectedConcept('')
    setSelectedInstruction('')
    setSelectedDifficulty(null)
  }, [])

  const hasActiveFilters = selectedTopic || selectedConcept || selectedInstruction || selectedDifficulty !== null

  // Calculate results
  const results: DrillResult | null = useMemo(() => {
    if (!session?.completedAt) return null

    const correct = session.questions.filter(q => q.status === 'correct').length
    const incorrect = session.questions.filter(q => q.status === 'incorrect').length
    const skipped = session.questions.filter(q => q.status === 'skipped').length
    const total = session.questions.length
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0
    const duration = new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime()

    const byTopic: Record<string, { total: number; correct: number }> = {}
    session.questions.forEach(q => {
      if (!byTopic[q.topic]) {
        byTopic[q.topic] = { total: 0, correct: 0 }
      }
      byTopic[q.topic].total++
      if (q.status === 'correct') {
        byTopic[q.topic].correct++
      }
    })

    return { total, correct, incorrect, skipped, accuracy, duration, byTopic }
  }, [session])

  // End session when drill completes
  const sessionEndedRef = useRef(false)
  useEffect(() => {
    if (session?.completedAt && session.sessionId && results && !sessionEndedRef.current) {
      sessionEndedRef.current = true
      const durationSeconds = Math.floor(results.duration / 1000)
      endSession(session.sessionId, results.total, results.correct, durationSeconds).catch(err => {
        console.error('Failed to end study session:', err)
      })
    }
  }, [session?.completedAt, session?.sessionId, results])

  // Get current question
  const currentQuestion = session?.questions[session.currentIndex]

  // If no session, show setup screen
  if (!session) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-sm font-medium">
            <Target className="h-4 w-4" />
            Practice Drill
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Drill Mode</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Test your knowledge with targeted practice questions. Select your filters and start drilling.
          </p>
        </div>

        {/* Settings Panel */}
        <div className="border rounded-xl bg-card">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Drill Settings</span>
            </div>
            <ChevronRight className={cn('h-5 w-5 text-muted-foreground transition-transform', showSettings && 'rotate-90')} />
          </button>
          
          {showSettings && (
            <div className="p-4 pt-0 space-y-4">
              {/* Question Count */}
              <div>
                <label className="text-sm font-medium mb-2 block">Number of Questions</label>
                <select
                  value={settings.questionCount}
                  onChange={(e) => setSettings(s => ({ ...s, questionCount: Number(e.target.value) }))}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                >
                  {[5, 10, 15, 20, 25].map(n => (
                    <option key={n} value={n}>{n} questions</option>
                  ))}
                </select>
              </div>

              {/* Difficulty Range */}
              <div>
                <label className="text-sm font-medium mb-2 block">Difficulty Range</label>
                <div className="flex gap-2">
                  <select
                    value={settings.difficultyRange[0]}
                    onChange={(e) => setSettings(s => ({ ...s, difficultyRange: [Number(e.target.value), s.difficultyRange[1]] }))}
                    className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5].map(d => (
                      <option key={d} value={d}>{getDifficultyLabel(d)}</option>
                    ))}
                  </select>
                  <span className="text-muted-foreground self-center">to</span>
                  <select
                    value={settings.difficultyRange[1]}
                    onChange={(e) => setSettings(s => ({ ...s, difficultyRange: [s.difficultyRange[0], Number(e.target.value)] }))}
                    className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5].map(d => (
                      <option key={d} value={d}>{getDifficultyLabel(d)}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="border rounded-xl bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Filter Questions</span>
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <X className="h-3.5 w-3.5" />
                Clear filters
              </button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Topic Filter */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Topic</label>
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
              >
                <option value="">All Topics</option>
                {uniqueTopics.map(topic => (
                  <option key={topic} value={topic}>{topic}</option>
                ))}
              </select>
            </div>

            {/* Concept Filter */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Concept</label>
              <select
                value={selectedConcept}
                onChange={(e) => setSelectedConcept(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
              >
                <option value="">All Concepts</option>
                {uniqueConcepts.map(concept => (
                  <option key={concept} value={concept}>{concept}</option>
                ))}
              </select>
            </div>

            {/* Instruction Filter */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Instruction</label>
              <select
                value={selectedInstruction}
                onChange={(e) => setSelectedInstruction(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
              >
                <option value="">All Instructions</option>
                {uniqueInstructions.map(instruction => (
                  <option key={instruction} value={instruction}>{instruction}</option>
                ))}
              </select>
            </div>

            {/* Difficulty Filter */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Difficulty</label>
              <select
                value={selectedDifficulty ?? ''}
                onChange={(e) => setSelectedDifficulty(e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
              >
                <option value="">All Levels</option>
                {[1, 2, 3, 4, 5].map(d => (
                  <option key={d} value={d}>{getDifficultyLabel(d)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Question count info */}
          <div className="text-sm text-muted-foreground">
            {filteredQuestions.length} questions match your filters
          </div>
        </div>

        {/* Start Button */}
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={startDrill}
            disabled={filteredQuestions.length === 0}
            className={cn(
              'inline-flex items-center gap-2 px-8 py-4 rounded-lg font-medium text-lg transition-colors',
              filteredQuestions.length > 0
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            )}
          >
            <Target className="h-5 w-5" />
            Start Drill ({Math.min(settings.questionCount, filteredQuestions.length)} questions)
          </button>
          
          {filteredQuestions.length === 0 && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              No questions match your filters. Try adjusting your criteria.
            </p>
          )}
        </div>
      </div>
    )
  }

  // If drill is complete, show results
  if (session.completedAt && results) {
    // Convert to DrillSessionResults format for ResultsSummary
    const sessionResults: DrillSessionResults = {
      questions: session.questions.map(q => ({
        question: q,
        status: q.status,
        selectedAnswer: q.selectedAnswer,
        timeMs: q.timeMs
      })),
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      mode: 'drill'
    }

    return (
      <ResultsSummary
        results={sessionResults}
        onRetry={startDrill}
        onBackToMap={() => {}}
        showRetry={true}
      />
    )
  }

  // Show active drill session
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Question {session.currentIndex + 1} of {session.questions.length}
          </span>
          <span className="text-muted-foreground">
            {session.questions.filter(q => q.status !== 'unanswered').length} answered
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all"
            style={{ width: `${((session.currentIndex + 1) / session.questions.length) * 100}%` }}
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
                      Correct!
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
              {session.currentIndex < session.questions.length - 1 ? (
                <>
                  Next Question
                  <ChevronRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  View Results
                  <Trophy className="h-4 w-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Hints */}
      {currentQuestion?.hints && currentQuestion.hints.length > 0 && !showFeedback && (
        <details className="border rounded-lg bg-card">
          <summary className="p-4 cursor-pointer font-medium text-muted-foreground hover:text-foreground">
            Need a hint?
          </summary>
          <div className="px-4 pb-4 space-y-1">
            {currentQuestion.hints.map((hint, idx) => (
              <p key={idx} className="text-sm text-muted-foreground">• {hint}</p>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
