import { useState, useEffect, useMemo } from 'react'
import { 
  BarChart3, 
  TrendingUp, 
  Target,
  AlertTriangle,
  BookOpen,
  Cpu,
  CheckCircle2,
  Clock,
  Brain,
  ChevronRight,
  Gamepad2,
  Trophy
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getOrCreateUserId, getAllMasteryRecords, type MasteryRecord } from '@/lib/db'
import { loadGameScores, type GameScore } from '@/lib/gameScores'
import { Link } from '@tanstack/react-router'
import courseMapData from '@/data/processed/course-map.json'
import type { CourseMapLecture } from '@/lib/types'

// ============================================================================
// Types
// ============================================================================

interface StrengthStats {
  mastered: number
  proficient: number
  developing: number
  beginning: number
}

interface ConceptMastery {
  concept: string
  lectureId?: number
  lectureTitle?: string
  metrics: MasteryRecord['metrics']
  strengthLevel: MasteryRecord['strengthLevel']
  mistakePatterns: string[]
}

interface InstructionMastery {
  instruction: string
  metrics: MasteryRecord['metrics']
  strengthLevel: MasteryRecord['strengthLevel']
  mistakePatterns: string[]
}

// ============================================================================
// Utility Functions
// ============================================================================

function getStrengthColor(level: MasteryRecord['strengthLevel']): { bg: string; text: string; bar: string; label: string } {
  switch (level) {
    case 'mastered':
      return { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', bar: 'bg-emerald-500', label: 'Mastered' }
    case 'proficient':
      return { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', bar: 'bg-blue-500', label: 'Proficient' }
    case 'developing':
      return { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', bar: 'bg-yellow-500', label: 'Developing' }
    case 'beginning':
      return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', bar: 'bg-red-500', label: 'Beginning' }
  }
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

function getLectureIdForConcept(concept: string, lectures: CourseMapLecture[]): number | undefined {
  // Find lecture that contains this concept in its topics
  for (const lecture of lectures) {
    if (lecture.topics.some(t => t.toLowerCase().includes(concept.toLowerCase()))) {
      return lecture.id
    }
  }
  return undefined
}

// ============================================================================
// MasteryDashboard Component
// ============================================================================

interface MasteryDashboardProps {
  className?: string
}

export function MasteryDashboard({ className }: MasteryDashboardProps) {
  const [masteryRecords, setMasteryRecords] = useState<MasteryRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'concepts' | 'instructions' | 'weaknesses'>('overview')
  const [gameScores, setGameScores] = useState<GameScore[]>([])

  const lectures = courseMapData.lectures as CourseMapLecture[]

  // Load mastery data on mount
  useEffect(() => {
    async function loadMastery() {
      try {
        const userId = await getOrCreateUserId()
        const records = await getAllMasteryRecords(userId)
        setMasteryRecords(records)
        
        // Load game scores from localStorage
        const scores = loadGameScores()
        const scoresArray = Object.values(scores)
        setGameScores(scoresArray)
      } catch (error) {
        console.error('Failed to load mastery records:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadMastery()
  }, [])

  // Calculate strength stats
  const strengthStats = useMemo((): StrengthStats => {
    const stats: StrengthStats = { mastered: 0, proficient: 0, developing: 0, beginning: 0 }
    masteryRecords.forEach(r => {
      if (r.strengthLevel in stats) {
        stats[r.strengthLevel]++
      }
    })
    return stats
  }, [masteryRecords])

  // Calculate overall accuracy
  const overallAccuracy = useMemo(() => {
    if (masteryRecords.length === 0) return 0
    const totalAttempts = masteryRecords.reduce((sum, r) => sum + r.metrics.attempts, 0)
    const totalCorrect = masteryRecords.reduce((sum, r) => sum + r.metrics.correct, 0)
    return totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0
  }, [masteryRecords])

  // Get concept mastery records
  const conceptMasteries = useMemo((): ConceptMastery[] => {
    return masteryRecords
      .filter(r => r.topicType === 'concept')
      .map(r => ({
        concept: r.topicId,
        lectureId: getLectureIdForConcept(r.topicId, lectures),
        lectureTitle: lectures.find(l => l.id === getLectureIdForConcept(r.topicId, lectures))?.title,
        metrics: r.metrics,
        strengthLevel: r.strengthLevel,
        mistakePatterns: r.mistakePatterns,
      }))
      .sort((a, b) => a.metrics.accuracy - b.metrics.accuracy)
  }, [masteryRecords, lectures])

  // Get instruction mastery records
  const instructionMasteries = useMemo((): InstructionMastery[] => {
    return masteryRecords
      .filter(r => r.topicType === 'instruction')
      .map(r => ({
        instruction: r.topicId,
        metrics: r.metrics,
        strengthLevel: r.strengthLevel,
        mistakePatterns: r.mistakePatterns,
      }))
      .sort((a, b) => a.metrics.accuracy - b.metrics.accuracy)
  }, [masteryRecords])

  // Get weak areas (concepts with accuracy < 60%)
  const weakAreas = useMemo(() => {
    return [...conceptMasteries, ...instructionMasteries]
      .filter(m => m.metrics.accuracy < 60 && m.metrics.attempts >= 1)
      .sort((a, b) => a.metrics.accuracy - b.metrics.accuracy)
  }, [conceptMasteries, instructionMasteries])

  // Get recent activity (last 5 practiced topics)
  const recentActivity = useMemo(() => {
    return masteryRecords
      .filter(r => r.lastPracticed)
      .sort((a, b) => new Date(b.lastPracticed!).getTime() - new Date(a.lastPracticed!).getTime())
      .slice(0, 5)
  }, [masteryRecords])

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading mastery data...</p>
        </div>
      </div>
    )
  }

  // Show "No Mastery Data" only when both mastery records and game scores are empty
  if (masteryRecords.length === 0 && gameScores.length === 0) {
    return (
      <div className={cn('text-center py-12 border rounded-xl bg-card', className)}>
        <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Mastery Data Yet</h2>
        <p className="text-muted-foreground max-w-md mx-auto mb-6">
          Complete drills, diagnostics, and games to track your mastery of assembly language concepts and instructions.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/drills"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
          >
            <Target className="h-4 w-4" />
            Start a Drill
          </Link>
          <Link
            to="/games"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border hover:bg-muted transition-colors font-medium"
          >
            <Gamepad2 className="h-4 w-4" />
            Play Games
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Overview Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="border rounded-xl bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">Overall Accuracy</span>
          </div>
          <div className="text-3xl font-bold">{overallAccuracy}%</div>
          <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn('h-full transition-all', getStrengthColor(
                overallAccuracy >= 80 ? 'mastered' :
                overallAccuracy >= 60 ? 'proficient' :
                overallAccuracy >= 40 ? 'developing' : 'beginning'
              ).bar)}
              style={{ width: `${overallAccuracy}%` }}
            />
          </div>
        </div>

        <div className="border rounded-xl bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-5 w-5 text-emerald-600" />
            <span className="text-sm text-muted-foreground">Mastered</span>
          </div>
          <div className="text-3xl font-bold text-emerald-600">{strengthStats.mastered}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {strengthStats.mastered + strengthStats.proficient} total proficient+
          </div>
        </div>

        <div className="border rounded-xl bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="h-5 w-5 text-yellow-600" />
            <span className="text-sm text-muted-foreground">Topics Tracked</span>
          </div>
          <div className="text-3xl font-bold">{conceptMasteries.length + instructionMasteries.length}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {conceptMasteries.length} concepts, {instructionMasteries.length} instructions
          </div>
        </div>

        <div className="border rounded-xl bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <span className="text-sm text-muted-foreground">Weak Areas</span>
          </div>
          <div className="text-3xl font-bold text-red-600">{weakAreas.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Need improvement</div>
        </div>
      </div>

      {/* Strength Level Breakdown */}
      <div className="border rounded-xl bg-card p-4">
        <h3 className="font-semibold mb-4">Strength Level Distribution</h3>
        <div className="flex gap-2 h-3 rounded-full overflow-hidden">
          {strengthStats.mastered > 0 && (
            <div 
              className="bg-emerald-500 transition-all" 
              style={{ width: `${(strengthStats.mastered / masteryRecords.length) * 100}%` }} 
            />
          )}
          {strengthStats.proficient > 0 && (
            <div 
              className="bg-blue-500 transition-all" 
              style={{ width: `${(strengthStats.proficient / masteryRecords.length) * 100}%` }} 
            />
          )}
          {strengthStats.developing > 0 && (
            <div 
              className="bg-yellow-500 transition-all" 
              style={{ width: `${(strengthStats.developing / masteryRecords.length) * 100}%` }} 
            />
          )}
          {strengthStats.beginning > 0 && (
            <div 
              className="bg-red-500 transition-all" 
              style={{ width: `${(strengthStats.beginning / masteryRecords.length) * 100}%` }} 
            />
          )}
        </div>
        <div className="flex flex-wrap gap-4 mt-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span>Mastered ({strengthStats.mastered})</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span>Proficient ({strengthStats.proficient})</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span>Developing ({strengthStats.developing})</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>Beginning ({strengthStats.beginning})</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border rounded-xl bg-card overflow-hidden">
        <div className="flex border-b overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'concepts', label: 'Concepts', icon: BookOpen },
            { id: 'instructions', label: 'Instructions', icon: Cpu },
            { id: 'weaknesses', label: 'Weaknesses', icon: AlertTriangle }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                'flex-1 min-w-[100px] flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
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
              {/* Recent Activity */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Recent Activity
                </h3>
                {recentActivity.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                ) : (
                  <div className="space-y-2">
                    {recentActivity.map((record, idx) => {
                      const colors = getStrengthColor(record.strengthLevel)
                      return (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-3">
                            {record.topicType === 'concept' ? (
                              <BookOpen className="h-4 w-4 text-blue-600" />
                            ) : (
                              <Cpu className="h-4 w-4 text-purple-600" />
                            )}
                            <div>
                              <div className="font-medium text-sm">{record.topicId}</div>
                              <div className="text-xs text-muted-foreground">
                                Last practiced: {new Date(record.lastPracticed!).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className={cn('text-sm font-medium', colors.text)}>
                              {Math.round(record.metrics.accuracy * 100)}%
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Game Activity */}
              {gameScores.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Gamepad2 className="h-4 w-4" />
                    Game Activity
                  </h3>
                  <div className="space-y-2">
                    {gameScores
                      .sort((a, b) => new Date(b.lastPlayed).getTime() - new Date(a.lastPlayed).getTime())
                      .slice(0, 5)
                      .map((score) => (
                        <div key={score.gameId} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-3">
                            <Trophy className="h-4 w-4 text-yellow-600" />
                            <div>
                              <div className="font-medium text-sm">
                                {score.gameId === 'flag-frenzy' && 'Flag Frenzy'}
                                {score.gameId === 'instruction-hangman' && 'Instruction Hangman'}
                                {score.gameId === 'register-rally' && 'Register Rally'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Played {score.gamesPlayed} time{score.gamesPlayed !== 1 ? 's' : ''} • Last: {new Date(score.lastPlayed).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-sm font-medium">
                              <Trophy className="h-4 w-4 text-yellow-600 inline mr-1" />
                              {score.highScore}
                            </div>
                            <Link
                              to="/games"
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm hover:bg-primary/20 transition-colors"
                            >
                              Play
                              <ChevronRight className="h-3 w-3" />
                            </Link>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  to="/drills"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
                >
                  <Target className="h-4 w-4" />
                  Practice Weak Areas
                </Link>
                <Link
                  to="/games"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-muted transition-colors text-sm font-medium"
                >
                  <Gamepad2 className="h-4 w-4" />
                  Play Games
                </Link>
              </div>
            </div>
          )}

          {/* Concepts Tab */}
          {activeTab === 'concepts' && (
            <div className="space-y-3">
              {conceptMasteries.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No concept mastery data yet</p>
              ) : (
                conceptMasteries.map((item, idx) => {
                  const colors = getStrengthColor(item.strengthLevel)
                  return (
                    <div key={idx} className="p-3 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-blue-600 shrink-0" />
                          <span className="font-medium text-sm">{item.concept}</span>
                          {item.lectureId && (
                            <Link
                              to="/lecture/$lectureId"
                              params={{ lectureId: String(item.lectureId) }}
                              className="text-xs text-primary hover:underline"
                            >
                              Lecture {item.lectureId}
                            </Link>
                          )}
                        </div>
                        <div className={cn('text-sm font-medium', colors.text)}>
                          {Math.round(item.metrics.accuracy * 100)}%
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                        <span>{item.metrics.correct}/{item.metrics.attempts} correct</span>
                        <span>Avg: {formatDuration(item.metrics.averageTimeMs)}</span>
                        <span className={cn('px-2 py-0.5 rounded-full text-xs', colors.bg, colors.text)}>
                          {colors.label}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn('h-full transition-all', colors.bar)}
                          style={{ width: `${item.metrics.accuracy * 100}%` }}
                        />
                      </div>
                      {item.mistakePatterns.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {item.mistakePatterns.slice(0, 3).map((pattern, pIdx) => (
                            <span key={pIdx} className="text-xs px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                              {pattern.replace('misconception:', '')}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* Instructions Tab */}
          {activeTab === 'instructions' && (
            <div className="space-y-3">
              {instructionMasteries.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No instruction mastery data yet</p>
              ) : (
                instructionMasteries.map((item, idx) => {
                  const colors = getStrengthColor(item.strengthLevel)
                  return (
                    <div key={idx} className="p-3 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Cpu className="h-4 w-4 text-purple-600 shrink-0" />
                          <span className="font-medium text-sm font-mono">{item.instruction}</span>
                        </div>
                        <div className={cn('text-sm font-medium', colors.text)}>
                          {Math.round(item.metrics.accuracy * 100)}%
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                        <span>{item.metrics.correct}/{item.metrics.attempts} correct</span>
                        <span>Avg: {formatDuration(item.metrics.averageTimeMs)}</span>
                        <span className={cn('px-2 py-0.5 rounded-full text-xs', colors.bg, colors.text)}>
                          {colors.label}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn('h-full transition-all', colors.bar)}
                          style={{ width: `${item.metrics.accuracy * 100}%` }}
                        />
                      </div>
                      {item.mistakePatterns.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {item.mistakePatterns.slice(0, 3).map((pattern, pIdx) => (
                            <span key={pIdx} className="text-xs px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                              {pattern.replace('misconception:', '')}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* Weaknesses Tab */}
          {activeTab === 'weaknesses' && (
            <div className="space-y-3">
              {weakAreas.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-2" />
                  <div className="font-semibold">No Weak Areas!</div>
                  <p className="text-sm text-muted-foreground">Great job! All your tracked topics are performing well.</p>
                </div>
              ) : (
                <>
                  <div className="text-sm text-muted-foreground mb-2">
                    Topics that need more practice (sorted by accuracy):
                  </div>
                  {weakAreas.map((item, idx) => {
                    const colors = getStrengthColor(item.strengthLevel)
                    const isConcept = 'concept' in item
                    return (
                      <div key={idx} className="p-3 rounded-lg border border-red-200 dark:border-red-900/50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {isConcept ? (
                              <BookOpen className="h-4 w-4 text-blue-600" />
                            ) : (
                              <Cpu className="h-4 w-4 text-purple-600" />
                            )}
                            <span className="font-medium text-sm">
                              {'concept' in item ? item.concept : item.instruction}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={cn('text-sm font-bold', colors.text)}>
                              {Math.round(item.metrics.accuracy * 100)}%
                            </div>
                            <Link
                              to="/drills"
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm hover:bg-primary/20 transition-colors"
                            >
                              Practice
                              <ChevronRight className="h-3 w-3" />
                            </Link>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{item.metrics.correct}/{item.metrics.attempts} correct</span>
                          <span>Avg: {formatDuration(item.metrics.averageTimeMs)}</span>
                        </div>
                        {'mistakePatterns' in item && item.mistakePatterns.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {item.mistakePatterns.slice(0, 3).map((pattern, pIdx) => (
                              <span key={pIdx} className="text-xs px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                                {pattern.replace('misconception:', '')}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MasteryDashboard
