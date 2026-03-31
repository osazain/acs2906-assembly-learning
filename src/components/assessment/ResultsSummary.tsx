import { useState, useMemo, useCallback } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Trophy,
  CheckCircle2,
  RotateCcw,
  BookOpen,
  FlaskConical,
  Cpu,
  AlertTriangle,
  Brain,
  ListChecks,
  Share2,
  Download,
  Plus,
  Target,
  TrendingUp,
  ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { db, getOrCreateUserId } from '@/lib/db'
import type { AssessmentItem } from '@/lib/types'

// ============================================================================
// Types
// ============================================================================

interface QuestionResult {
  question: AssessmentItem
  status: 'unanswered' | 'correct' | 'incorrect' | 'skipped'
  selectedAnswer?: string
  timeMs?: number
}

export interface DrillSessionResults {
  questions: QuestionResult[]
  startedAt: string
  completedAt: string
  mode: 'drill' | 'diagnostic'
}

export interface ConceptAccuracy {
  concept: string
  total: number
  correct: number
  accuracy: number
  questions: QuestionResult[]
}

export interface MisconceptionInfo {
  tag: string
  description: string
  count: number
  affectedConcepts: string[]
  indicators: string[]
  relatedQuestions: string[]
}

export interface RemediationItem {
  type: 'lecture' | 'section' | 'example' | 'worksheet' | 'instruction'
  id: string
  description: string
  priority: number
  reason: string
  accuracy: number
}

export interface ReviewQueueItem {
  id?: number
  userId: string
  conceptId: string
  conceptName: string
  addedAt: string
  reason: 'manual' | 'poor-performance' | 'misconception'
  sourceSession: 'drill' | 'diagnostic'
}

// ============================================================================
// Misconception Definitions
// ============================================================================

const MISCONCEPTION_DESCRIPTIONS: Record<string, { description: string; indicators: string[] }> = {
  'misconception:binary-conversion': {
    description: 'Binary/Hexadecimal Conversion Errors',
    indicators: ['Incorrect digit grouping', 'Wrong base values', 'Digit substitution errors']
  },
  'misconception:twos-complement': {
    description: 'Two\'s Complement Misinterpretation',
    indicators: ['Sign bit confusion', 'Range errors', 'Negative number representation']
  },
  'misconception:signed-numbers': {
    description: 'Signed vs Unsigned Number Confusion',
    indicators: ['CF misinterpretation', 'Overflow flag', 'Sign extension errors']
  },
  'misconception:little-endian': {
    description: 'Little Endian Byte Order Confusion',
    indicators: ['Byte order reversal', 'Word storage', 'Address interpretation']
  },
  'misconception:register-naming': {
    description: 'Register Naming and Size Confusion',
    indicators: ['AH vs AL confusion', 'AX vs EAX', 'Partial register access']
  },
  'misconception:memory-addressing': {
    description: 'Memory Addressing Mode Errors',
    indicators: ['[BX+SI] mode', 'Indirect addressing', 'Base+index calculations']
  },
  'misconception:flag-effects': {
    description: 'Flag Effect Prediction Errors',
    indicators: ['ZF after operation', 'SF interpretation', 'OF vs CF confusion']
  },
  'misconception:overflow': {
    description: 'Arithmetic Overflow Detection Errors',
    indicators: ['Carry vs overflow', 'Signed overflow detection', 'Flag interpretation']
  },
  'misconception:word-size': {
    description: 'Word Size and Data Size Confusion',
    indicators: ['8-bit vs 16-bit', 'Byte vs word', 'Size prefixes']
  },
  'misconception:shift-operations': {
    description: 'Shift Operation Errors',
    indicators: ['Logical vs arithmetic shift', 'Rotate vs shift', 'Bit fill behavior']
  },
  'misconception:logical-operations': {
    description: 'Logical Operation Errors',
    indicators: ['AND/OR/NOT truth tables', 'Bitwise operations', 'Masking']
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`
  }
  return `${seconds}s`
}

function getStrengthColor(accuracy: number): { bg: string; text: string; bar: string } {
  if (accuracy >= 80) return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', bar: 'bg-green-500' }
  if (accuracy >= 50) return { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', bar: 'bg-yellow-500' }
  return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', bar: 'bg-red-500' }
}

// ============================================================================
// ResultsSummary Component
// ============================================================================

interface ResultsSummaryProps {
  results: DrillSessionResults
  onRetry?: () => void
  onBackToMap?: () => void
  showRetry?: boolean
}

export function ResultsSummary({ results, onRetry, onBackToMap, showRetry = true }: ResultsSummaryProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'concepts' | 'misconceptions' | 'remediation'>('overview')
  const [addedToQueue, setAddedToQueue] = useState<Set<string>>(new Set())

  // Calculate basic stats
  const stats = useMemo(() => {
    const total = results.questions.length
    const correct = results.questions.filter(q => q.status === 'correct').length
    const incorrect = results.questions.filter(q => q.status === 'incorrect').length
    const skipped = results.questions.filter(q => q.status === 'skipped').length
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0
    const duration = new Date(results.completedAt).getTime() - new Date(results.startedAt).getTime()

    return { total, correct, incorrect, skipped, accuracy, duration }
  }, [results])

  // Calculate per-concept accuracy
  const conceptAccuracies = useMemo((): ConceptAccuracy[] => {
    const conceptMap = new Map<string, QuestionResult[]>()

    results.questions.forEach(q => {
      if (q.status === 'unanswered') return
      q.question.concepts.forEach(concept => {
        const existing = conceptMap.get(concept) || []
        conceptMap.set(concept, [...existing, q])
      })
    })

    const accuracies: ConceptAccuracy[] = []
    conceptMap.forEach((questions, concept) => {
      const correct = questions.filter(q => q.status === 'correct').length
      const total = questions.length
      accuracies.push({
        concept,
        total,
        correct,
        accuracy: Math.round((correct / total) * 100),
        questions
      })
    })

    return accuracies.sort((a, b) => a.accuracy - b.accuracy)
  }, [results])

  // Detect misconceptions
  const misconceptions = useMemo((): MisconceptionInfo[] => {
    const misconceptionMap = new Map<string, {
      count: number
      affectedConcepts: Set<string>
      relatedQuestions: Set<string>
    }>()

    results.questions
      .filter(q => q.status === 'incorrect')
      .forEach(q => {
        q.question.misconceptionTags.forEach(tag => {
          const existing = misconceptionMap.get(tag) || {
            count: 0,
            affectedConcepts: new Set<string>(),
            relatedQuestions: new Set<string>()
          }
          existing.count++
          q.question.concepts.forEach(c => existing.affectedConcepts.add(c))
          existing.relatedQuestions.add(q.question.id)
          misconceptionMap.set(tag, existing)
        })
      })

    const infos: MisconceptionInfo[] = []
    misconceptionMap.forEach((data, tag) => {
      const description = MISCONCEPTION_DESCRIPTIONS[tag]?.description || tag.replace('misconception:', '')
      const indicators = MISCONCEPTION_DESCRIPTIONS[tag]?.indicators || []
      infos.push({
        tag,
        description,
        count: data.count,
        affectedConcepts: Array.from(data.affectedConcepts),
        indicators,
        relatedQuestions: Array.from(data.relatedQuestions)
      })
    })

    return infos.sort((a, b) => b.count - a.count)
  }, [results])

  // Generate remediation queue
  const remediationQueue = useMemo((): RemediationItem[] => {
    const remediationMap = new Map<string, RemediationItem>()

    // Add items from incorrect questions
    results.questions
      .filter(q => q.status === 'incorrect')
      .forEach(q => {
        q.question.remediationRefs.forEach(ref => {
          const key = `${ref.type}:${ref.id}`
          const conceptAccuracy = conceptAccuracies.find(c =>
            c.questions.some(qc => qc.question.id === q.question.id)
          )?.accuracy || 0

          if (!remediationMap.has(key)) {
            remediationMap.set(key, {
              ...ref,
              priority: 100 - conceptAccuracy,
              reason: `Incorrect answer on: ${q.question.topic}`,
              accuracy: conceptAccuracy
            })
          }
        })
      })

    // Add low-performing concepts
    conceptAccuracies
      .filter(c => c.accuracy < 70)
      .forEach(c => {
        c.questions.forEach(q => {
          if (q.status !== 'incorrect') return
          q.question.remediationRefs.forEach(ref => {
            const key = `${ref.type}:${ref.id}`
            if (!remediationMap.has(key)) {
              remediationMap.set(key, {
                ...ref,
                priority: 100 - c.accuracy,
                reason: `Concept "${c.concept}" at ${c.accuracy}% accuracy`,
                accuracy: c.accuracy
              })
            }
          })
        })
      })

    return Array.from(remediationMap.values()).sort((a, b) => a.priority - b.priority)
  }, [results, conceptAccuracies])

  // Add to review queue
  const addToReviewQueue = useCallback(async (conceptId: string, conceptName: string, reason: ReviewQueueItem['reason']) => {
    try {
      const userId = await getOrCreateUserId()
      const item: ReviewQueueItem = {
        userId,
        conceptId,
        conceptName,
        addedAt: new Date().toISOString(),
        reason,
        sourceSession: results.mode
      }
      await db.reviewQueue.add(item)
      setAddedToQueue(prev => new Set([...prev, conceptId]))
    } catch (error) {
      console.error('Failed to add to review queue:', error)
    }
  }, [results.mode])

  // Add all weak concepts to review queue
  const addAllWeakToQueue = useCallback(async () => {
    try {
      const userId = await getOrCreateUserId()
      const weakConcepts = conceptAccuracies.filter(c => c.accuracy < 70)

      for (const concept of weakConcepts) {
        const exists = await db.reviewQueue
          .where({ userId, conceptId: concept.concept })
          .first()

        if (!exists) {
          await db.reviewQueue.add({
            userId,
            conceptId: concept.concept,
            conceptName: concept.concept,
            addedAt: new Date().toISOString(),
            reason: 'poor-performance',
            sourceSession: results.mode
          })
        }
        setAddedToQueue(prev => new Set([...prev, concept.concept]))
      }
    } catch (error) {
      console.error('Failed to add weak concepts to review queue:', error)
    }
  }, [conceptAccuracies, results.mode])

  // Export results
  const exportResults = useCallback(() => {
    const exportData = {
      sessionType: results.mode,
      completedAt: results.completedAt,
      duration: stats.duration,
      summary: {
        total: stats.total,
        correct: stats.correct,
        incorrect: stats.incorrect,
        skipped: stats.skipped,
        accuracy: stats.accuracy
      },
      conceptAccuracies: conceptAccuracies.map(c => ({
        concept: c.concept,
        accuracy: c.accuracy,
        total: c.total,
        correct: c.correct
      })),
      misconceptions: misconceptions.map(m => ({
        type: m.tag,
        description: m.description,
        count: m.count
      })),
      remediationQueue: remediationQueue.map(r => ({
        type: r.type,
        id: r.id,
        description: r.description,
        priority: r.priority
      }))
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `drill-results-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [results, stats, conceptAccuracies, misconceptions, remediationQueue])

  // Share results as text
  const shareResults = useCallback(() => {
    const text = `
🎯 Drill Results - ACS2906

📊 Score: ${stats.correct}/${stats.total} (${stats.accuracy}%)
⏱️ Time: ${formatDuration(stats.duration)}

${results.mode === 'diagnostic' ? '🔬 Diagnostic Assessment' : '🎯 Practice Drill'}

${misconceptions.length > 0 ? `\n⚠️ Misconceptions Detected:\n${misconceptions.map(m => `• ${m.description} (${m.count} errors)`).join('\n')}` : ''}

Weak Areas:
${conceptAccuracies.filter(c => c.accuracy < 70).map(c => `• ${c.concept}: ${c.accuracy}%`).join('\n') || '• None - Great job!'}

Generated by ACS2906 Assembly Learning Platform
    `.trim()

    if (navigator.share) {
      navigator.share({ text }).catch(() => {
        navigator.clipboard.writeText(text)
      })
    } else {
      navigator.clipboard.writeText(text)
    }
  }, [stats, misconceptions, conceptAccuracies, results.mode])

  const weakConcepts = conceptAccuracies.filter(c => c.accuracy < 70)

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-medium">
          <Trophy className="h-4 w-4" />
          {results.mode === 'diagnostic' ? 'Diagnostic Complete!' : 'Drill Complete!'}
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Results Summary</h1>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="border rounded-xl bg-card p-4 text-center">
          <div className="text-3xl font-bold text-primary">{stats.total}</div>
          <div className="text-sm text-muted-foreground">Total Questions</div>
        </div>
        <div className="border rounded-xl bg-card p-4 text-center">
          <div className="text-3xl font-bold text-green-600">{stats.correct}</div>
          <div className="text-sm text-muted-foreground">Correct</div>
        </div>
        <div className="border rounded-xl bg-card p-4 text-center">
          <div className="text-3xl font-bold text-red-600">{stats.incorrect}</div>
          <div className="text-sm text-muted-foreground">Incorrect</div>
        </div>
        <div className="border rounded-xl bg-card p-4 text-center">
          <div className="text-3xl font-bold text-yellow-600">{stats.skipped}</div>
          <div className="text-sm text-muted-foreground">Skipped</div>
        </div>
      </div>

      {/* Accuracy and Duration */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="border rounded-xl bg-card p-4 text-center">
          <div className="text-4xl font-bold">{stats.accuracy}%</div>
          <div className="text-sm text-muted-foreground mt-1">Overall Accuracy</div>
          <div className="mt-2 h-3 bg-muted rounded-full overflow-hidden">
            <div
              className={cn('h-full transition-all', getStrengthColor(stats.accuracy).bar)}
              style={{ width: `${stats.accuracy}%` }}
            />
          </div>
        </div>
        <div className="border rounded-xl bg-card p-4 text-center">
          <div className="text-4xl font-bold">{formatDuration(stats.duration)}</div>
          <div className="text-sm text-muted-foreground mt-1">Time Taken</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border rounded-xl bg-card overflow-hidden">
        <div className="flex border-b overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'concepts', label: 'By Concept', icon: Target },
            { id: 'misconceptions', label: 'Misconceptions', icon: Brain },
            { id: 'remediation', label: 'Remediation', icon: ListChecks }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                'flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-primary/10 text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {weakConcepts.length > 0 && (
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-2 font-semibold text-red-800 dark:text-red-200 mb-2">
                    <AlertTriangle className="h-5 w-5" />
                    Areas Needing Improvement
                  </div>
                  <div className="space-y-2">
                    {weakConcepts.slice(0, 5).map(c => (
                      <div key={c.concept} className="flex items-center justify-between text-sm">
                        <span className="text-red-700 dark:text-red-300">{c.concept}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-red-200 dark:bg-red-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-red-500"
                              style={{ width: `${c.accuracy}%` }}
                            />
                          </div>
                          <span className="text-red-600 dark:text-red-400 font-medium w-12 text-right">{c.accuracy}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {weakConcepts.length === 0 && stats.accuracy >= 70 && (
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-center">
                  <Trophy className="h-12 w-12 mx-auto text-green-600 mb-2" />
                  <div className="font-semibold text-green-800 dark:text-green-200">Excellent Work!</div>
                  <p className="text-sm text-green-600 dark:text-green-400">You demonstrated strong understanding across all concepts.</p>
                </div>
              )}

              {misconceptions.length > 0 && (
                <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-200 mb-2">
                    <Brain className="h-5 w-5" />
                    Misconceptions Detected: {misconceptions.length}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {misconceptions.slice(0, 3).map(m => (
                      <span key={m.tag} className="text-xs px-2 py-1 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
                        {m.description}
                      </span>
                    ))}
                    {misconceptions.length > 3 && (
                      <button
                        onClick={() => setActiveTab('misconceptions')}
                        className="text-xs px-2 py-1 text-amber-600 dark:text-amber-400 hover:underline"
                      >
                        +{misconceptions.length - 3} more
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  onClick={addAllWeakToQueue}
                  disabled={weakConcepts.length === 0}
                  className={cn(
                    'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    weakConcepts.length > 0
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'bg-muted text-muted-foreground cursor-not-allowed'
                  )}
                >
                  <Plus className="h-4 w-4" />
                  Add Weak Areas to Review Queue
                </button>
                <button
                  onClick={exportResults}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm font-medium transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Export JSON
                </button>
                <button
                  onClick={shareResults}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm font-medium transition-colors"
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </button>
              </div>
            </div>
          )}

          {/* Concepts Tab */}
          {activeTab === 'concepts' && (
            <div className="space-y-4">
              {conceptAccuracies.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No concept data available
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Performance by Concept</span>
                    <button
                      onClick={addAllWeakToQueue}
                      disabled={weakConcepts.length === 0}
                      className={cn(
                        'text-xs px-2 py-1 rounded',
                        weakConcepts.length > 0
                          ? 'text-primary hover:bg-primary/10'
                          : 'text-muted-foreground cursor-not-allowed'
                      )}
                    >
                      Add weak to queue
                    </button>
                  </div>
                  <div className="space-y-3">
                    {conceptAccuracies.map(c => {
                      const colors = getStrengthColor(c.accuracy)
                      return (
                        <div key={c.concept} className="p-3 rounded-lg border">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{c.concept}</span>
                              {c.accuracy < 70 && !addedToQueue.has(c.concept) && (
                                <button
                                  onClick={() => addToReviewQueue(c.concept, c.concept, 'poor-performance')}
                                  className="text-xs text-primary hover:bg-primary/10 px-2 py-0.5 rounded flex items-center gap-1"
                                >
                                  <Plus className="h-3 w-3" />
                                  Add to queue
                                </button>
                              )}
                              {addedToQueue.has(c.concept) && (
                                <span className="text-xs text-green-600 flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  In queue
                                </span>
                              )}
                            </div>
                            <div className={cn('text-sm font-medium', colors.text)}>
                              {c.correct}/{c.total} ({c.accuracy}%)
                            </div>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn('h-full transition-all', colors.bar)}
                              style={{ width: `${c.accuracy}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Misconceptions Tab */}
          {activeTab === 'misconceptions' && (
            <div className="space-y-4">
              {misconceptions.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-2" />
                  <div className="font-semibold">No Misconceptions Detected!</div>
                  <p className="text-sm text-muted-foreground">Your answers didn't show any common misconception patterns.</p>
                </div>
              ) : (
                <>
                  <div className="text-sm text-muted-foreground mb-2">
                    Based on your incorrect answers, we identified the following misconception patterns:
                  </div>
                  <div className="space-y-3">
                    {misconceptions.map(m => (
                      <div key={m.tag} className="p-4 rounded-lg border bg-card">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                            <Brain className="h-5 w-5 text-amber-600" />
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold mb-1">{m.description}</div>
                            <div className="text-xs text-muted-foreground mb-2">
                              Found in {m.count} question{m.count > 1 ? 's' : ''}
                            </div>
                            <div className="flex flex-wrap gap-1 mb-2">
                              {m.indicators.map((indicator, idx) => (
                                <span key={idx} className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                                  {indicator}
                                </span>
                              ))}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Affected concepts: {m.affectedConcepts.join(', ')}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Remediation Tab */}
          {activeTab === 'remediation' && (
            <div className="space-y-4">
              {remediationQueue.length === 0 ? (
                <div className="text-center py-8">
                  <ListChecks className="h-12 w-12 mx-auto text-green-500 mb-2" />
                  <div className="font-semibold">No Remediation Needed!</div>
                  <p className="text-sm text-muted-foreground">Great job! You didn't need any review materials.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Prioritized Study Queue</span>
                    <span className="text-xs text-muted-foreground">
                      {remediationQueue.length} items
                    </span>
                  </div>
                  <div className="space-y-2">
                    {remediationQueue.slice(0, 10).map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                        <div className={cn(
                          'flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold',
                          item.priority > 50 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          item.priority > 30 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        )}>
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {item.type === 'lecture' && <BookOpen className="h-4 w-4 text-blue-600 shrink-0" />}
                            {item.type === 'example' && <FlaskConical className="h-4 w-4 text-emerald-600 shrink-0" />}
                            {item.type === 'instruction' && <Cpu className="h-4 w-4 text-purple-600 shrink-0" />}
                            <span className="font-medium text-sm truncate">{item.description}</span>
                          </div>
                          <div className="text-xs text-muted-foreground truncate">{item.reason}</div>
                        </div>
                        <Link
                          to={item.type === 'lecture' ? `/lecture/$lectureId` : '/course-map'}
                          params={item.type === 'lecture' ? { lectureId: item.id } : {}}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm hover:bg-primary/20 transition-colors shrink-0"
                        >
                          Study
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    ))}
                  </div>
                  {remediationQueue.length > 10 && (
                    <div className="text-center text-sm text-muted-foreground pt-2">
                      +{remediationQueue.length - 10} more items
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {showRetry && onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
          >
            <RotateCcw className="h-4 w-4" />
            Try Again
          </button>
        )}
        {onBackToMap && (
          <Link
            to="/course-map"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border hover:bg-muted transition-colors font-medium"
          >
            <BookOpen className="h-4 w-4" />
            Back to Course Map
          </Link>
        )}
      </div>
    </div>
  )
}

export default ResultsSummary
