import { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  Keyboard, 
  RotateCcw, 
  Trophy, 
  Zap,
  CheckCircle2,
  XCircle,
  Lightbulb,
  ChevronLeft
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { updateGameScore } from '@/lib/gameScores'
import instructionIndexData from '@/data/processed/instruction-index.json'
import type { InstructionEntry } from '@/lib/types'

// ============================================================================
// Types
// ============================================================================

interface HangmanState {
  targetInstruction: string
  targetEntry: InstructionEntry
  maskedSyntax: string
  guessedLetters: Set<string>
  wrongGuesses: number
  gameStatus: 'playing' | 'won' | 'lost'
  score: number
  totalScore: number
  streak: number
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

const MAX_WRONG_GUESSES = 6
const POINTS_PER_CORRECT = 100
const STREAK_BONUS = 25

// ============================================================================
// Utility Functions
// ============================================================================

function getCategoryHint(category: InstructionEntry['category']): string {
  const hints: Record<InstructionEntry['category'], string> = {
    'data-transfer': 'Moves data between registers and memory',
    'arithmetic': 'Performs mathematical operations',
    'logical': 'Bitwise and logical operations',
    'control-flow': 'Controls program flow (jumps, loops)',
    'shift': 'Shifts and rotates bits',
    'procedure': 'Procedure and interrupt handling',
    'io': 'Input/Output operations',
  }
  return hints[category]
}

function maskSyntax(syntax: string, guessedLetters: Set<string>): string {
  // Replace unmapped letters with underscores
  return syntax.split('').map(char => {
    if (char === ' ' || char === ',' || char === '(' || char === ')') {
      return char
    }
    if (/[a-zA-Z0-9_]/.test(char)) {
      const lower = char.toLowerCase()
      if (guessedLetters.has(lower)) {
        return char
      }
      return '_'
    }
    return char
  }).join('')
}

function extractLetters(text: string): string[] {
  return [...new Set(text.toLowerCase().split('').filter(c => /[a-z]/.test(c)))]
}

function loadGameStats(): GameStats {
  try {
    const stored = localStorage.getItem('acs2906_hangman_stats')
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
    localStorage.setItem('acs2906_hangman_stats', JSON.stringify(stats))
  } catch {
    // Ignore
  }
}

// ============================================================================
// HangmanKeyboard Component
// ============================================================================

interface HangmanKeyboardProps {
  guessedLetters: Set<string>
  onGuess: (letter: string) => void
  disabled: boolean
}

function HangmanKeyboard({ guessedLetters, onGuess, disabled }: HangmanKeyboardProps) {
  const rows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
  ]

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <Keyboard className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Type a letter to guess</span>
      </div>
      <div className="space-y-1.5">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-center gap-1">
            {row.map(letter => {
              const lower = letter.toLowerCase()
              const isGuessed = guessedLetters.has(lower)
              const isCorrect = isGuessed
              return (
                <button
                  key={letter}
                  onClick={() => onGuess(lower)}
                  disabled={disabled || isGuessed}
                  className={cn(
                    'w-8 h-10 sm:w-9 sm:h-11 rounded-lg font-medium text-sm transition-all',
                    'focus:outline-none focus:ring-2 focus:ring-ring',
                    isGuessed
                      ? isCorrect
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      : 'bg-muted hover:bg-muted/80 text-foreground'
                  )}
                >
                  {letter}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// HangmanFigure Component
// ============================================================================

interface HangmanFigureProps {
  wrongGuesses: number
}

function HangmanFigure({ wrongGuesses }: HangmanFigureProps) {
  return (
    <div className="flex items-center justify-center">
      <svg width="120" height="140" viewBox="0 0 120 140" className="text-foreground">
        {/* Gallows */}
        <line x1="20" y1="130" x2="100" y2="130" stroke="currentColor" strokeWidth="3" />
        <line x1="40" y1="130" x2="40" y2="20" stroke="currentColor" strokeWidth="3" />
        <line x1="40" y1="20" x2="80" y2="20" stroke="currentColor" strokeWidth="3" />
        <line x1="80" y1="20" x2="80" y2="40" stroke="currentColor" strokeWidth="3" />
        
        {/* Head */}
        {wrongGuesses >= 1 && (
          <circle cx="80" cy="50" r="15" fill="none" stroke="currentColor" strokeWidth="3" />
        )}
        
        {/* Body */}
        {wrongGuesses >= 2 && (
          <line x1="80" y1="65" x2="80" y2="95" stroke="currentColor" strokeWidth="3" />
        )}
        
        {/* Left arm */}
        {wrongGuesses >= 3 && (
          <line x1="80" y1="75" x2="60" y2="85" stroke="currentColor" strokeWidth="3" />
        )}
        
        {/* Right arm */}
        {wrongGuesses >= 4 && (
          <line x1="80" y1="75" x2="100" y2="85" stroke="currentColor" strokeWidth="3" />
        )}
        
        {/* Left leg */}
        {wrongGuesses >= 5 && (
          <line x1="80" y1="95" x2="60" y2="115" stroke="currentColor" strokeWidth="3" />
        )}
        
        {/* Right leg */}
        {wrongGuesses >= 6 && (
          <line x1="80" y1="95" x2="100" y2="115" stroke="currentColor" strokeWidth="3" />
        )}
      </svg>
    </div>
  )
}

// ============================================================================
// InstructionHangman Component
// ============================================================================

interface InstructionHangmanProps {
  className?: string
  onBack?: () => void
}

export function InstructionHangman({ className, onBack }: InstructionHangmanProps) {
  // Get instructions from the index
  const instructions = useMemo(() => {
    const index = instructionIndexData as unknown as Record<string, InstructionEntry>
    return Object.entries(index)
      .filter(([, entry]) => entry.syntax && entry.operation)
      .map(([mnemonic, entry]) => ({
        mnemonic: mnemonic.toUpperCase(),
        entry,
        letters: extractLetters(mnemonic),
      }))
      .filter(i => i.letters.length > 0)
  }, [])

  // Initialize state using lazy initialization - compute initial state once
  const [state, setState] = useState<HangmanState | null>(() => {
    // This only runs once on mount
    const initialStats = loadGameStats()
    if (instructions.length > 0) {
      const randomIndex = Math.floor(Math.random() * instructions.length)
      const { mnemonic, entry } = instructions[randomIndex]
      return {
        targetInstruction: mnemonic,
        targetEntry: entry,
        maskedSyntax: maskSyntax(entry.syntax, new Set()),
        guessedLetters: new Set(),
        wrongGuesses: 0,
        gameStatus: 'playing',
        score: 0,
        totalScore: initialStats.highScore,
        streak: 0,
      }
    }
    return null
  })
  const [stats, setStats] = useState<GameStats>(() => loadGameStats())

  // Select random instruction - pass highScore as parameter
  const selectNewInstruction = useCallback((highScore: number) => {
    if (instructions.length === 0) return
    
    const randomIndex = Math.floor(Math.random() * instructions.length)
    const { mnemonic, entry } = instructions[randomIndex]
    
    setState({
      targetInstruction: mnemonic,
      targetEntry: entry,
      maskedSyntax: maskSyntax(entry.syntax, new Set()),
      guessedLetters: new Set(),
      wrongGuesses: 0,
      gameStatus: 'playing',
      score: 0,
      totalScore: highScore,
      streak: 0,
    })
  }, [instructions])

  // Handle keyboard input
  const handleGuess = useCallback((letter: string) => {
    if (!state || state.gameStatus !== 'playing') return
    
    const lower = letter.toLowerCase()
    if (state.guessedLetters.has(lower)) return
    
    const newGuessed = new Set(state.guessedLetters)
    newGuessed.add(lower)
    
    const targetLetters = extractLetters(state.targetInstruction)
    const isCorrect = targetLetters.includes(lower)
    const newWrongGuesses = isCorrect ? state.wrongGuesses : state.wrongGuesses + 1
    
    // Check if won
    const remainingLetters = targetLetters.filter(l => !newGuessed.has(l))
    const hasWon = remainingLetters.length === 0
    
    // Check if lost
    const hasLost = newWrongGuesses >= MAX_WRONG_GUESSES
    
    let newStreak = state.streak
    let scoreChange = 0
    
    if (hasWon) {
      scoreChange = POINTS_PER_CORRECT + (newStreak * STREAK_BONUS)
      newStreak = state.streak + 1
    } else if (hasLost) {
      newStreak = 0
    }
    
    const newState: HangmanState = {
      ...state,
      guessedLetters: newGuessed,
      wrongGuesses: newWrongGuesses,
      gameStatus: hasWon ? 'won' : hasLost ? 'lost' : 'playing',
      score: state.score + (hasWon ? scoreChange : 0),
      streak: newStreak,
    }
    
    setState(newState)
    
    // Update stats after game ends (win or lose)
    if (hasWon || hasLost) {
      const newStats: GameStats = {
        ...stats,
        gamesPlayed: stats.gamesPlayed + 1,
        highScore: Math.max(stats.highScore, newState.score),
        totalCorrect: stats.totalCorrect + (isCorrect ? 1 : 0),
        totalWrong: stats.totalWrong + (isCorrect ? 0 : 1),
      }
      setStats(newStats)
      saveGameStats(newStats)
      
      // Update unified game scores for dashboard
      updateGameScore('instruction-hangman', newState.score, {
        totalCorrect: isCorrect ? 1 : 0,
        totalWrong: isCorrect ? 0 : 1,
      })
    }
  }, [state, stats])

  // Keyboard event listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!state || state.gameStatus !== 'playing') return
      if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
        e.preventDefault()
        handleGuess(e.key.toLowerCase())
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [state, handleGuess])

  // Next game (after win/lose)
  const handleNextGame = useCallback(() => {
    selectNewInstruction(stats.highScore)
  }, [selectNewInstruction, stats.highScore])

  if (!state) {
    return (
      <div className={cn('flex items-center justify-center min-h-[400px]', className)}>
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  const targetLetters = extractLetters(state.targetInstruction)
  const revealedLetters = targetLetters.filter(l => state.guessedLetters.has(l))
  const maskedCount = targetLetters.length - revealedLetters.length

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Keyboard className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">Instruction Hangman</h1>
        </div>
        <div className="flex items-center gap-4 text-sm">
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

      {/* Game Area */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Hangman Figure and Hint */}
        <div className="space-y-6">
          <HangmanFigure wrongGuesses={state.wrongGuesses} />
          
          {/* Category Hint */}
          <div className={cn(
            'p-4 rounded-xl border',
            state.gameStatus === 'won' && 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800',
            state.gameStatus === 'lost' && 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',
            state.gameStatus === 'playing' && 'bg-muted/50'
          )}>
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Category Hint</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {getCategoryHint(state.targetEntry.category)}
            </p>
            <p className="text-xs text-muted-foreground mt-1 capitalize">
              {state.targetEntry.category.replace('-', ' ')}
            </p>
          </div>

          {/* Operation Hint (shown after loss) */}
          {state.gameStatus === 'lost' && (
            <div className="p-4 rounded-xl border bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium">Operation</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {state.targetEntry.operation}
              </p>
            </div>
          )}
        </div>

        {/* Right: Instruction Display and Keyboard */}
        <div className="space-y-6">
          {/* Instruction Display */}
          <div className={cn(
            'p-6 rounded-xl border text-center',
            state.gameStatus === 'won' && 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700',
            state.gameStatus === 'lost' && 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700',
            state.gameStatus === 'playing' && 'bg-card border-border'
          )}>
            <div className="mb-2">
              <span className="text-sm text-muted-foreground">Guess the instruction:</span>
            </div>
            <div className="font-mono text-2xl sm:text-3xl font-bold tracking-wider mb-4">
              {maskSyntax(state.targetEntry.syntax, state.guessedLetters)}
            </div>
            
            {/* Letters remaining */}
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <span>{maskedCount} letter{maskedCount !== 1 ? 's' : ''} remaining</span>
              {state.wrongGuesses > 0 && (
                <span className="text-red-600 dark:text-red-400">
                  ({state.wrongGuesses}/{MAX_WRONG_GUESSES} wrong)
                </span>
              )}
            </div>
          </div>

          {/* Guessed Letters */}
          <div className="flex flex-wrap gap-2 justify-center">
            {targetLetters.map(letter => (
              <span
                key={letter}
                className={cn(
                  'w-8 h-8 rounded-lg font-mono text-lg font-bold flex items-center justify-center',
                  state.guessedLetters.has(letter)
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {state.guessedLetters.has(letter) ? letter.toUpperCase() : '_'}
              </span>
            ))}
          </div>

          {/* Keyboard */}
          <HangmanKeyboard
            guessedLetters={state.guessedLetters}
            onGuess={handleGuess}
            disabled={state.gameStatus !== 'playing'}
          />
        </div>
      </div>

      {/* Result Message */}
      {state.gameStatus !== 'playing' && (
        <div className={cn(
          'p-4 rounded-xl border text-center',
          state.gameStatus === 'won' && 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
        )}>
          {state.gameStatus === 'won' ? (
            <div className="flex items-center justify-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="font-semibold text-lg">Correct! It was {state.targetInstruction}</p>
                <p className="text-sm text-muted-foreground">
                  +{POINTS_PER_CORRECT + (state.streak * STREAK_BONUS)} points
                  {state.streak > 1 && ` (${state.streak}x streak bonus!)`}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3">
              <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              <div>
                <p className="font-semibold text-lg">Game Over!</p>
                <p className="text-sm text-muted-foreground">
                  The instruction was <span className="font-mono font-bold">{state.targetInstruction}</span>
                </p>
              </div>
            </div>
          )}
          
          <button
            onClick={handleNextGame}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            {state.gameStatus === 'won' ? 'Next Instruction' : 'Try Again'}
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
