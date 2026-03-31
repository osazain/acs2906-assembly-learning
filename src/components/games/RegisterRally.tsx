import { useState, useEffect, useCallback } from 'react'
import { 
  Cpu,
  RotateCcw,
  Trophy,
  Zap,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  Timer,
  Target
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { updateGameScore } from '@/lib/gameScores'

// ============================================================================
// Types
// ============================================================================

interface RegisterItem {
  name: string
  fullName: string
  description: string
  category: 'general' | 'segment' | 'special'
}

interface MatchedPair {
  register: string
  description: string
  matchedAt: number
}

interface RallyState {
  registers: RegisterItem[]
  selectedRegister: string | null
  selectedDescription: string | null
  matchedPairs: MatchedPair[]
  gameStatus: 'playing' | 'won'
  score: number
  totalScore: number
  startTime: number
  endTime: number
  attempts: number
}

interface GameStats {
  gamesPlayed: number
  highScore: number
  totalCorrect: number
  totalWrong: number
  bestTime: number | null
}

// ============================================================================
// Register Data
// ============================================================================

const ALL_REGISTERS: RegisterItem[] = [
  // General Purpose Registers
  {
    name: 'AX',
    fullName: 'Accumulator',
    description: 'Primary register for arithmetic operations, I/O, and function returns',
    category: 'general'
  },
  {
    name: 'BX',
    fullName: 'Base',
    description: 'Base pointer for memory access, also holds addressing base',
    category: 'general'
  },
  {
    name: 'CX',
    fullName: 'Counter',
    description: 'Loop counter for REP prefixes, also used in shifts and rotates',
    category: 'general'
  },
  {
    name: 'DX',
    fullName: 'Data',
    description: 'I/O port addressing, extended multiplication/division results',
    category: 'general'
  },
  {
    name: 'SP',
    fullName: 'Stack Pointer',
    description: 'Points to the top of the stack, adjusted by PUSH/POP/CALL/RET',
    category: 'general'
  },
  {
    name: 'BP',
    fullName: 'Base Pointer',
    description: 'Frame pointer for accessing stack parameters and local variables',
    category: 'general'
  },
  {
    name: 'SI',
    fullName: 'Source Index',
    description: 'Source address pointer for string operations (MOVS, CMPS, etc.)',
    category: 'general'
  },
  {
    name: 'DI',
    fullName: 'Destination Index',
    description: 'Destination address pointer for string operations (MOVS, STOS, etc.)',
    category: 'general'
  },
  // Segment Registers
  {
    name: 'CS',
    fullName: 'Code Segment',
    description: 'Base address of the current code segment for instruction fetching',
    category: 'segment'
  },
  {
    name: 'DS',
    fullName: 'Data Segment',
    description: 'Default segment for most data access instructions',
    category: 'segment'
  },
  {
    name: 'ES',
    fullName: 'Extra Segment',
    description: 'Additional segment register for string operations destination',
    category: 'segment'
  },
  {
    name: 'SS',
    fullName: 'Stack Segment',
    description: 'Segment register for stack operations (PUSH, POP, CALL, RET)',
    category: 'segment'
  },
  // Special Registers
  {
    name: 'IP',
    fullName: 'Instruction Pointer',
    description: 'Offset of the next instruction to execute (also called PC)',
    category: 'special'
  },
  {
    name: 'FLAGS',
    fullName: 'Flag Register',
    description: 'Contains status bits: CF, PF, AF, ZF, SF, OF, and control flags',
    category: 'special'
  }
]

// ============================================================================
// Utility Functions
// ============================================================================

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function loadGameStats(): GameStats {
  try {
    const stored = localStorage.getItem('acs2906_rally_stats')
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    // Ignore
  }
  return {
    gamesPlayed: 0,
    highScore: 0,
    totalCorrect: 0,
    totalWrong: 0,
    bestTime: null,
  }
}

function saveGameStats(stats: GameStats): void {
  try {
    localStorage.setItem('acs2906_rally_stats', JSON.stringify(stats))
  } catch {
    // Ignore
  }
}

function calculateScore(timeMs: number, attempts: number, matchCount: number): number {
  // Base score for each match
  const baseScore = matchCount * 100
  // Time bonus: faster = more points (max 200 bonus for under 10 seconds)
  const timeBonus = Math.max(0, 200 - Math.floor(timeMs / 1000) * 2)
  // Accuracy bonus: fewer attempts = more points
  const perfectAttempts = matchCount * 2 // minimum attempts needed
  const accuracyRatio = perfectAttempts / attempts
  const accuracyBonus = Math.floor(50 * accuracyRatio)
  
  return baseScore + timeBonus + accuracyBonus
}

// ============================================================================
// RegisterRally Component
// ============================================================================

interface RegisterRallyProps {
  className?: string
  onBack?: () => void
}

export function RegisterRally({ className, onBack }: RegisterRallyProps) {
  // Select a random subset of 8 registers for the game
  const [gameRegisters] = useState<RegisterItem[]>(() => {
    const shuffled = shuffleArray(ALL_REGISTERS)
    return shuffled.slice(0, 8)
  })

  // Shuffled descriptions for the game
  const [shuffledDescriptions] = useState<string[]>(() => {
    return shuffleArray(gameRegisters.map(r => r.description))
  })

  // Initialize state using lazy initialization
  const [state, setState] = useState<RallyState | null>(() => {
    const initialStats = loadGameStats()
    return {
      registers: gameRegisters,
      selectedRegister: null,
      selectedDescription: null,
      matchedPairs: [],
      gameStatus: 'playing',
      score: 0,
      totalScore: initialStats.highScore,
      startTime: Date.now(),
      endTime: 0,
      attempts: 0,
    }
  })
  const [stats, setStats] = useState<GameStats>(() => loadGameStats())
  const [currentTime, setCurrentTime] = useState(() => Date.now())

  // Reset game to play again
  const resetGame = useCallback(() => {
    const initialStats = loadGameStats()
    // Re-shuffle registers for new game
    const shuffledRegs = shuffleArray(ALL_REGISTERS).slice(0, 8)
    setState({
      registers: shuffledRegs,
      selectedRegister: null,
      selectedDescription: null,
      matchedPairs: [],
      gameStatus: 'playing',
      score: 0,
      totalScore: initialStats.highScore,
      startTime: Date.now(),
      endTime: 0,
      attempts: 0,
    })
    setStats(initialStats)
  }, [])

  // Update timer during game
  useEffect(() => {
    if (!state || state.gameStatus !== 'playing') return
    
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)
    
    return () => clearInterval(interval)
  }, [state?.gameStatus])

  // Check if description matches selected register
  const getDescriptionForRegister = useCallback((registerName: string): string | null => {
    const register = gameRegisters.find(r => r.name === registerName)
    return register?.description || null
  }, [gameRegisters])

  // Handle register click
  const handleRegisterClick = useCallback((registerName: string) => {
    if (!state || state.gameStatus !== 'playing') return
    if (state.matchedPairs.some(p => p.register === registerName)) return

    setState(prev => {
      if (!prev) return prev
      return {
        ...prev,
        selectedRegister: prev.selectedRegister === registerName ? null : registerName,
      }
    })
  }, [state])

  // Handle description click
  const handleDescriptionClick = useCallback((description: string) => {
    if (!state || state.gameStatus !== 'playing') return
    if (state.matchedPairs.some(p => p.description === description)) return

    setState(prev => {
      if (!prev) return prev

      // If both register and description are selected, check for match
      if (prev.selectedRegister && prev.selectedDescription) {
        const correctDescription = getDescriptionForRegister(prev.selectedRegister)
        const isCorrect = correctDescription === description
        const newAttempts = prev.attempts + 1

        if (isCorrect) {
          const newMatchedPairs = [
            ...prev.matchedPairs,
            {
              register: prev.selectedRegister,
              description,
              matchedAt: Date.now()
            }
          ]

          // Check if game is won
          if (newMatchedPairs.length === prev.registers.length) {
            const endTime = Date.now()
            const timeMs = endTime - prev.startTime
            const score = calculateScore(timeMs, newAttempts, newMatchedPairs.length)
            
            // Update stats
            const newStats: GameStats = {
              ...stats,
              gamesPlayed: stats.gamesPlayed + 1,
              highScore: Math.max(stats.highScore, score),
              totalCorrect: stats.totalCorrect + newMatchedPairs.length,
              totalWrong: stats.totalWrong + (newAttempts - newMatchedPairs.length),
              bestTime: stats.bestTime ? Math.min(stats.bestTime, timeMs) : timeMs,
            }
            setStats(newStats)
            saveGameStats(newStats)
            
            // Update unified game scores for dashboard
            updateGameScore('register-rally', score, {
              totalCorrect: newMatchedPairs.length,
              totalWrong: newAttempts - newMatchedPairs.length,
            })

            return {
              ...prev,
              selectedRegister: null,
              selectedDescription: null,
              matchedPairs: newMatchedPairs,
              gameStatus: 'won',
              score,
              endTime: timeMs,
            }
          }

          return {
            ...prev,
            selectedRegister: null,
            selectedDescription: null,
            matchedPairs: newMatchedPairs,
            attempts: newAttempts,
          }
        } else {
          // Wrong match
          return {
            ...prev,
            selectedRegister: null,
            selectedDescription: null,
            attempts: newAttempts,
          }
        }
      }

      return {
        ...prev,
        selectedDescription: prev.selectedDescription === description ? null : description,
      }
    })
  }, [state, stats, getDescriptionForRegister])

  // Keyboard handler for deselecting
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!state || state.gameStatus !== 'playing') return
      if (e.key === 'Escape') {
        setState(prev => prev ? {
          ...prev,
          selectedRegister: null,
          selectedDescription: null,
        } : prev)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [state])

  if (!state) {
    return (
      <div className={cn('flex items-center justify-center min-h-[400px]', className)}>
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  const elapsedTime = state.gameStatus === 'won' 
    ? state.endTime 
    : currentTime - state.startTime

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Cpu className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">Register Rally</h1>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Timer className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{formatTime(elapsedTime)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{state.matchedPairs.length}/{state.registers.length}</span>
          </div>
          <div className="flex items-center gap-1">
            <Trophy className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <span className="font-medium">{state.score}</span>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
        <p>Match each register to its correct description. Click a register, then click its matching description. Press <kbd className="px-1.5 py-0.5 rounded bg-muted border text-xs font-mono">Esc</kbd> to deselect.</p>
      </div>

      {/* Game Area */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Registers Column */}
        <div className="space-y-3">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            Registers
          </h2>
          <div className="space-y-2">
            {state.registers.map((register) => {
              const isMatched = state.matchedPairs.some(p => p.register === register.name)
              const isSelected = state.selectedRegister === register.name
              
              return (
                <button
                  key={register.name}
                  onClick={() => handleRegisterClick(register.name)}
                  disabled={isMatched}
                  className={cn(
                    'w-full p-4 rounded-xl border text-left transition-all',
                    'focus:outline-none focus:ring-2 focus:ring-ring',
                    isMatched && 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700 opacity-60',
                    isSelected && !isMatched && 'bg-primary/10 border-primary ring-2 ring-primary',
                    !isMatched && !isSelected && 'bg-card border-border hover:border-primary/50 hover:bg-muted/50'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-lg">{register.name}</span>
                      <span className="text-sm text-muted-foreground ml-2">({register.fullName})</span>
                    </div>
                    {isMatched && <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Descriptions Column */}
        <div className="space-y-3">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            Descriptions
          </h2>
          <div className="space-y-2">
            {shuffledDescriptions.map((description, index) => {
              const isMatched = state.matchedPairs.some(p => p.description === description)
              const isSelected = state.selectedDescription === description
              
              return (
                <button
                  key={`${description}-${index}`}
                  onClick={() => handleDescriptionClick(description)}
                  disabled={isMatched}
                  className={cn(
                    'w-full p-4 rounded-xl border text-left transition-all',
                    'focus:outline-none focus:ring-2 focus:ring-ring',
                    isMatched && 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700 opacity-60',
                    isSelected && !isMatched && 'bg-primary/10 border-primary ring-2 ring-primary',
                    !isMatched && !isSelected && 'bg-card border-border hover:border-primary/50 hover:bg-muted/50'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm">{description}</p>
                    {isMatched && <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 ml-2" />}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Result Message */}
      {state.gameStatus === 'won' && (
        <div className="p-6 rounded-xl border bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="font-semibold text-xl">Congratulations!</p>
              <p className="text-sm text-muted-foreground">You matched all registers correctly!</p>
            </div>
          </div>
          
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-600" />
              <span>Score: <strong>{state.score}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-muted-foreground" />
              <span>Time: <strong>{formatTime(elapsedTime)}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-muted-foreground" />
              <span>Attempts: <strong>{state.attempts}</strong></span>
            </div>
            {state.score > stats.highScore && (
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-orange-600" />
                <span className="text-orange-600 font-semibold">New High Score!</span>
              </div>
            )}
          </div>
          
          <button
            onClick={resetGame}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            Play Again
          </button>
        </div>
      )}

      {/* Stats Bar */}
      <div className="flex flex-wrap justify-center gap-6 text-sm border-t pt-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-yellow-600" />
          <span>High Score: <strong>{stats.highScore}</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>Correct: <strong>{stats.totalCorrect}</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <XCircle className="h-4 w-4 text-red-600" />
          <span>Wrong: <strong>{stats.totalWrong}</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-orange-600" />
          <span>Played: <strong>{stats.gamesPlayed}</strong></span>
        </div>
        {stats.bestTime && (
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-purple-600" />
            <span>Best Time: <strong>{formatTime(stats.bestTime)}</strong></span>
          </div>
        )}
      </div>

      {/* Back Button */}
      {onBack && (
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Games Hub
        </button>
      )}
    </div>
  )
}
