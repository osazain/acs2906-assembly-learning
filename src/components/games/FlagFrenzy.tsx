import { useState, useCallback, useMemo } from 'react'
import { 
  Flag,
  RotateCcw,
  Trophy,
  Zap,
  CheckCircle2,
  XCircle,
  Lightbulb,
  ChevronLeft,
  Target
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

type FlagName = 'CF' | 'ZF' | 'SF' | 'OF' | 'PF' | 'AF' | 'DF'

interface FlagState {
  name: FlagName
  description: string
  fullName: string
  predicted: boolean
  actual: boolean | null
}

interface FlagScenario {
  instruction: string
  syntax: string
  operands: { dest: string; src: string }
  flagsAffected: FlagName[]
  explanation: string
  category: string
}

interface FrenzyState {
  currentScenario: FlagScenario | null
  flagStates: FlagState[]
  gameStatus: 'playing' | 'won' | 'lost'
  score: number
  totalScore: number
  streak: number
  scenarioIndex: number
  revealed: boolean
}

interface GameStats {
  gamesPlayed: number
  highScore: number
  totalCorrect: number
  totalWrong: number
}

// ============================================================================
// Constants
// ============================================================================

const FLAGS: FlagState[] = [
  { name: 'CF', description: 'Set if result generates a carry out or borrow into the MSB', fullName: 'Carry Flag', predicted: false, actual: null },
  { name: 'ZF', description: 'Set if result is zero', fullName: 'Zero Flag', predicted: false, actual: null },
  { name: 'SF', description: 'Set if result is negative (MSB = 1)', fullName: 'Sign Flag', predicted: false, actual: null },
  { name: 'OF', description: 'Set if result overflows signed arithmetic', fullName: 'Overflow Flag', predicted: false, actual: null },
  { name: 'PF', description: 'Set if result has even number of 1 bits', fullName: 'Parity Flag', predicted: false, actual: null },
  { name: 'AF', description: 'Set if there is carry out or borrow from bit 3 to bit 4', fullName: 'Auxiliary Carry Flag', predicted: false, actual: null },
  { name: 'DF', description: 'Direction flag: 0 = forward, 1 = backward (string ops)', fullName: 'Direction Flag', predicted: false, actual: null },
]

const POINTS_PER_CORRECT = 100
const STREAK_BONUS = 25
const QUESTIONS_PER_GAME = 10

// ============================================================================
// Scenarios Database
// ============================================================================

// Pre-defined scenarios with operands that produce specific flag results
// We simulate realistic flag outcomes based on the operation

const FLAG_SCENARIOS: FlagScenario[] = [
  // ADD scenarios
  {
    instruction: 'ADD',
    syntax: 'ADD AX, 5',
    operands: { dest: 'AX', src: '5' },
    flagsAffected: ['CF', 'OF', 'SF', 'ZF', 'PF', 'AF'],
    explanation: 'Adding 5 to AX: CF depends on overflow beyond 16 bits, OF on signed overflow, SF on result sign.',
    category: 'arithmetic'
  },
  {
    instruction: 'ADD',
    syntax: 'ADD BX, -1',
    operands: { dest: 'BX', src: '-1 (FFFFh)' },
    flagsAffected: ['CF', 'OF', 'SF', 'ZF', 'PF', 'AF'],
    explanation: 'Adding -1 sets SF if result is negative, ZF if result is zero.',
    category: 'arithmetic'
  },
  {
    instruction: 'ADD',
    syntax: 'ADD AL, BL',
    operands: { dest: 'AL', src: 'BL' },
    flagsAffected: ['CF', 'OF', 'SF', 'ZF', 'PF', 'AF'],
    explanation: 'Adding two 8-bit registers: flags depend on the actual values.',
    category: 'arithmetic'
  },
  // SUB scenarios
  {
    instruction: 'SUB',
    syntax: 'SUB CX, 1',
    operands: { dest: 'CX', src: '1' },
    flagsAffected: ['CF', 'OF', 'SF', 'ZF', 'PF', 'AF'],
    explanation: 'Subtracting 1: CF set if borrow was needed, ZF if result is zero.',
    category: 'arithmetic'
  },
  {
    instruction: 'SUB',
    syntax: 'SUB AX, BX',
    operands: { dest: 'AX', src: 'BX' },
    flagsAffected: ['CF', 'OF', 'SF', 'ZF', 'PF', 'AF'],
    explanation: 'SUB sets CF when BX > AX (borrow). ZF when equal. SF when AX < BX (signed).',
    category: 'arithmetic'
  },
  {
    instruction: 'CMP',
    syntax: 'CMP AX, 0',
    operands: { dest: 'AX', src: '0' },
    flagsAffected: ['CF', 'OF', 'SF', 'ZF', 'PF', 'AF'],
    explanation: 'CMP is SUB without storing result. ZF=1 if AX equals 0, SF if AX < 0.',
    category: 'arithmetic'
  },
  {
    instruction: 'CMP',
    syntax: 'CMP AL, 100',
    operands: { dest: 'AL', src: '100' },
    flagsAffected: ['CF', 'OF', 'SF', 'ZF', 'PF', 'AF'],
    explanation: 'Comparing AL with 100: ZF=1 if AL=100, CF=1 if AL<100 (unsigned).',
    category: 'arithmetic'
  },
  // INC/DEC scenarios
  {
    instruction: 'INC',
    syntax: 'INC DX',
    operands: { dest: 'DX', src: '' },
    flagsAffected: ['OF', 'SF', 'ZF', 'PF', 'AF'],
    explanation: 'INC DX increments DX. Sets ZF if result becomes zero, SF if negative. Does not affect CF.',
    category: 'arithmetic'
  },
  {
    instruction: 'DEC',
    syntax: 'DEC CX',
    operands: { dest: 'CX', src: '' },
    flagsAffected: ['OF', 'SF', 'ZF', 'PF', 'AF'],
    explanation: 'DEC CX decrements CX. Sets ZF if result becomes zero. Does not affect CF.',
    category: 'arithmetic'
  },
  // Logical scenarios
  {
    instruction: 'AND',
    syntax: 'AND AX, BX',
    operands: { dest: 'AX', src: 'BX' },
    flagsAffected: ['CF', 'OF', 'SF', 'ZF', 'PF'],
    explanation: 'AND clears CF and OF to 0. Sets SF, ZF, PF based on result. Does not affect AF.',
    category: 'logical'
  },
  {
    instruction: 'OR',
    syntax: 'OR DL, AL',
    operands: { dest: 'DL', src: 'AL' },
    flagsAffected: ['CF', 'OF', 'SF', 'ZF', 'PF'],
    explanation: 'OR clears CF and OF to 0. Sets SF, ZF, PF based on result. Does not affect AF.',
    category: 'logical'
  },
  {
    instruction: 'XOR',
    syntax: 'XOR AX, AX',
    operands: { dest: 'AX', src: 'AX' },
    flagsAffected: ['CF', 'OF', 'SF', 'ZF', 'PF'],
    explanation: 'XOR with self gives 0, so CF=0, OF=0, ZF=1, SF=0.',
    category: 'logical'
  },
  {
    instruction: 'TEST',
    syntax: 'TEST AX, 1',
    operands: { dest: 'AX', src: '1' },
    flagsAffected: ['CF', 'OF', 'SF', 'ZF', 'PF'],
    explanation: 'TEST is AND without storing result. Sets SF, ZF, PF. Clears CF and OF.',
    category: 'logical'
  },
  // Shift scenarios
  {
    instruction: 'SHL',
    syntax: 'SHL AX, 1',
    operands: { dest: 'AX', src: '1' },
    flagsAffected: ['CF', 'OF', 'SF', 'ZF', 'PF'],
    explanation: 'SHL shifts left. CF gets the last bit shifted out. OF set if CF changes after shift.',
    category: 'shift'
  },
  {
    instruction: 'SHR',
    syntax: 'SHR BX, 1',
    operands: { dest: 'BX', src: '1' },
    flagsAffected: ['CF', 'OF', 'SF', 'ZF', 'PF'],
    explanation: 'SHR shifts right. CF gets the last bit shifted out. OF set to old MSB for 1-bit shift.',
    category: 'shift'
  },
  {
    instruction: 'SAR',
    syntax: 'SAR DX, 1',
    operands: { dest: 'DX', src: '1' },
    flagsAffected: ['CF', 'OF', 'SF', 'ZF', 'PF'],
    explanation: 'SAR arithmetic right shift (sign-extends). CF gets last bit shifted out. OF=0 for SAR.',
    category: 'shift'
  },
  // NEG scenarios
  {
    instruction: 'NEG',
    syntax: 'NEG AL',
    operands: { dest: 'AL', src: '' },
    flagsAffected: ['CF', 'OF', 'SF', 'ZF', 'PF', 'AF'],
    explanation: 'NEG two\'s complement negation. CF=1 unless operand is 0. OF=1 if operand is 80h (-128).',
    category: 'arithmetic'
  },
  {
    instruction: 'NEG',
    syntax: 'NEG AX',
    operands: { dest: 'AX', src: '' },
    flagsAffected: ['CF', 'OF', 'SF', 'ZF', 'PF', 'AF'],
    explanation: 'NEG AX: CF=1 always (negating requires subtract). OF=1 if AX was 8000h.',
    category: 'arithmetic'
  },
  // MUL/DIV scenarios  
  {
    instruction: 'MUL',
    syntax: 'MUL BL',
    operands: { dest: 'AL', src: 'BL' },
    flagsAffected: ['CF', 'OF'],
    explanation: 'MUL unsigned multiply: CF=1 and OF=1 if AH!=0 (result too large for AL).',
    category: 'arithmetic'
  },
  {
    instruction: 'IMUL',
    syntax: 'IMUL CL',
    operands: { dest: 'AL', src: 'CL' },
    flagsAffected: ['CF', 'OF'],
    explanation: 'IMUL signed multiply: CF=1 and OF=1 if result doesn\'t fit in sign bits.',
    category: 'arithmetic'
  },
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
    const stored = localStorage.getItem('acs2906_frenzy_stats')
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
  }
}

function saveGameStats(stats: GameStats): void {
  try {
    localStorage.setItem('acs2906_frenzy_stats', JSON.stringify(stats))
  } catch {
    // Ignore
  }
}

// ============================================================================
// FlagToggle Component
// ============================================================================

interface FlagToggleProps {
  flag: FlagState
  onToggle: (name: FlagName) => void
  disabled: boolean
  showResult?: boolean
}

function FlagToggle({ flag, onToggle, disabled, showResult }: FlagToggleProps) {
  const isPredictedOn = flag.predicted
  const hasActualResult = flag.actual !== null
  
  const getBackgroundClass = () => {
    if (!showResult || !hasActualResult) {
      return isPredictedOn 
        ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
        : 'bg-muted hover:bg-muted/80'
    }
    
    // Show result state
    const wasCorrect = flag.predicted === flag.actual
    if (wasCorrect) {
      return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700'
    } else {
      return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-700'
    }
  }

  return (
    <button
      onClick={() => !disabled && onToggle(flag.name)}
      disabled={disabled}
      className={cn(
        'p-3 rounded-xl border transition-all text-center min-w-[80px]',
        'focus:outline-none focus:ring-2 focus:ring-ring',
        getBackgroundClass(),
        disabled && 'cursor-not-allowed opacity-80'
      )}
    >
      <div className="font-mono font-bold text-lg">{flag.name}</div>
      <div className="text-xs opacity-80 mt-1">{flag.fullName}</div>
      {showResult && hasActualResult && (
        <div className="mt-2 pt-2 border-t border-current/20">
          {flag.actual ? (
            <CheckCircle2 className="h-4 w-4 mx-auto" />
          ) : (
            <XCircle className="h-4 w-4 mx-auto" />
          )}
        </div>
      )}
    </button>
  )
}

// ============================================================================
// FlagFrenzy Component
// ============================================================================

interface FlagFrenzyProps {
  className?: string
  onBack?: () => void
}

export function FlagFrenzy({ className, onBack }: FlagFrenzyProps) {
  // Get scenarios - use shuffle to randomize order
  const scenarios = useMemo(() => shuffleArray(FLAG_SCENARIOS).slice(0, QUESTIONS_PER_GAME), [])
  
  // Initialize state
  const [state, setState] = useState<FrenzyState | null>(() => {
    const initialStats = loadGameStats()
    const firstScenario = scenarios[0]
    return {
      currentScenario: firstScenario,
      flagStates: FLAGS.map(f => ({
        ...f,
        predicted: false,
        actual: firstScenario.flagsAffected.includes(f.name)
      })),
      gameStatus: 'playing',
      score: 0,
      totalScore: initialStats.highScore,
      streak: 0,
      scenarioIndex: 0,
      revealed: false,
    }
  })
  const [stats, setStats] = useState<GameStats>(() => loadGameStats())

  // Handle flag toggle
  const handleFlagToggle = useCallback((flagName: FlagName) => {
    if (!state || state.revealed) return
    
    setState(prev => {
      if (!prev) return prev
      return {
        ...prev,
        flagStates: prev.flagStates.map(f => 
          f.name === flagName ? { ...f, predicted: !f.predicted } : f
        )
      }
    })
  }, [state])

  // Submit prediction
  const handleSubmit = useCallback(() => {
    if (!state || state.revealed) return
    
    setState(prev => {
      if (!prev) return prev
      
      const allCorrect = prev.flagStates.every(f => 
        f.predicted === (prev.currentScenario?.flagsAffected.includes(f.name) ?? false)
      )
      
      const scoreChange = allCorrect ? POINTS_PER_CORRECT + (prev.streak * STREAK_BONUS) : 0
      const newStreak = allCorrect ? prev.streak + 1 : 0
      
      return {
        ...prev,
        score: prev.score + scoreChange,
        streak: newStreak,
        revealed: true,
        gameStatus: allCorrect ? 'won' : 'lost',
      }
    })
  }, [state])

  // Next scenario
  const handleNextScenario = useCallback(() => {
    setState(prev => {
      if (!prev) return prev
      
      const nextIndex = prev.scenarioIndex + 1
      
      // Check if game is over
      if (nextIndex >= scenarios.length) {
        // Update stats
        const newStats: GameStats = {
          ...stats,
          gamesPlayed: stats.gamesPlayed + 1,
          highScore: Math.max(stats.highScore, prev.score),
          totalCorrect: stats.totalCorrect + prev.flagStates.filter(f => 
            f.predicted === (prev.currentScenario?.flagsAffected.includes(f.name) ?? false)
          ).length,
          totalWrong: stats.totalWrong + prev.flagStates.filter(f => 
            f.predicted !== (prev.currentScenario?.flagsAffected.includes(f.name) ?? false)
          ).length,
        }
        setStats(newStats)
        saveGameStats(newStats)
        
        return {
          ...prev,
          gameStatus: 'won',
          totalScore: Math.max(stats.highScore, prev.score),
        }
      }
      
      const nextScenario = scenarios[nextIndex]
      return {
        ...prev,
        currentScenario: nextScenario,
        flagStates: FLAGS.map(f => ({
          ...f,
          predicted: false,
          actual: nextScenario.flagsAffected.includes(f.name)
        })),
        scenarioIndex: nextIndex,
        revealed: false,
        gameStatus: 'playing',
      }
    })
  }, [scenarios, stats])

  // Start new game
  const handleNewGame = useCallback(() => {
    const newScenarios = shuffleArray(FLAG_SCENARIOS).slice(0, QUESTIONS_PER_GAME)
    const initialStats = loadGameStats()
    const firstScenario = newScenarios[0]
    
    setState({
      currentScenario: firstScenario,
      flagStates: FLAGS.map(f => ({
        ...f,
        predicted: false,
        actual: firstScenario.flagsAffected.includes(f.name)
      })),
      gameStatus: 'playing',
      score: 0,
      totalScore: initialStats.highScore,
      streak: 0,
      scenarioIndex: 0,
      revealed: false,
    })
    setStats(initialStats)
  }, [])

  if (!state) {
    return (
      <div className={cn('flex items-center justify-center min-h-[400px]', className)}>
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  const currentScenario = state.currentScenario
  const isGameOver = state.gameStatus === 'won' && state.scenarioIndex >= scenarios.length - 1

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Flag className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">Flag Frenzy</h1>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{state.scenarioIndex + 1}/{scenarios.length}</span>
          </div>
          <div className="flex items-center gap-1">
            <Trophy className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <span className="font-medium">{state.score}</span>
          </div>
          <div className="flex items-center gap-1">
            <Zap className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <span className="font-medium">Streak: {state.streak}</span>
          </div>
        </div>
      </div>

      {/* Scenario Display */}
      <div className="p-6 rounded-xl border bg-card">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm px-2 py-1 rounded bg-primary/10 text-primary font-medium">
            {currentScenario?.instruction}
          </span>
          <span className="text-sm text-muted-foreground capitalize">
            {currentScenario?.category}
          </span>
        </div>
        
        <div className="font-mono text-2xl sm:text-3xl font-bold mb-4">
          {currentScenario?.syntax}
        </div>
        
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
          <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            {currentScenario?.explanation}
          </p>
        </div>
      </div>

      {/* Flag Selection */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Predict which flags will be SET:</h2>
          {!state.revealed && (
            <span className="text-sm text-muted-foreground">
              Click flags to toggle prediction
            </span>
          )}
        </div>
        
        <div className="flex flex-wrap gap-3 justify-center">
          {state.flagStates.map(flag => (
            <FlagToggle
              key={flag.name}
              flag={flag}
              onToggle={handleFlagToggle}
              disabled={state.revealed}
              showResult={state.revealed}
            />
          ))}
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap gap-4 justify-center text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="font-medium">CF</span> = Carry Flag
          </div>
          <div className="flex items-center gap-1">
            <span className="font-medium">ZF</span> = Zero Flag
          </div>
          <div className="flex items-center gap-1">
            <span className="font-medium">SF</span> = Sign Flag
          </div>
          <div className="flex items-center gap-1">
            <span className="font-medium">OF</span> = Overflow Flag
          </div>
          <div className="flex items-center gap-1">
            <span className="font-medium">PF</span> = Parity Flag
          </div>
          <div className="flex items-center gap-1">
            <span className="font-medium">AF</span> = Aux Carry
          </div>
          <div className="flex items-center gap-1">
            <span className="font-medium">DF</span> = Direction
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 justify-center">
        {!state.revealed ? (
          <button
            onClick={handleSubmit}
            className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            Submit Prediction
          </button>
        ) : isGameOver ? (
          <div className="text-center space-y-4">
            <div className="p-4 rounded-xl border bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center justify-center gap-3 mb-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="font-semibold text-xl">Game Complete!</p>
                  <p className="text-sm text-muted-foreground">Final Score: {state.score}</p>
                </div>
              </div>
              {state.score > stats.highScore && (
                <p className="text-sm text-orange-600 font-medium">🎉 New High Score!</p>
              )}
            </div>
            <button
              onClick={handleNewGame}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Play Again
            </button>
          </div>
        ) : (
          <button
            onClick={handleNextScenario}
            className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            Next Scenario →
          </button>
        )}
      </div>

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
