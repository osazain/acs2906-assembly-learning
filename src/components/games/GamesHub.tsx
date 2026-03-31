import { useMemo } from 'react'
import { 
  Gamepad2, 
  Keyboard, 
  Cpu,
  Flag,
  Trophy,
  Clock,
  ChevronRight,
  Play,
  Lock,
  Zap,
  Target,
  RotateCcw,
  BarChart3
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Link } from '@tanstack/react-router'

// ============================================================================
// Types
// ============================================================================

export type GameStatus = 'available' | 'coming-soon' | 'locked'

export interface Game {
  id: string
  title: string
  description: string
  icon: 'hangman' | 'rally' | 'frenzy'
  status: GameStatus
  estimatedMinutes?: number
  concepts?: string[]
  highScore?: number
  lastPlayed?: string
}

// ============================================================================
// Game Definitions
// ============================================================================

const GAMES: Game[] = [
  {
    id: 'instruction-hangman',
    title: 'Instruction Hangman',
    description: 'Guess assembly instructions with category hints. Practice recognizing mnemonics and their purposes.',
    icon: 'hangman',
    status: 'available',
    estimatedMinutes: 5,
    concepts: ['instruction-set', 'mnemonics', 'operands'],
  },
  {
    id: 'register-rally',
    title: 'Register Rally',
    description: 'Match registers to their use cases. Learn the purpose of each 8086 register.',
    icon: 'rally',
    status: 'coming-soon',
    estimatedMinutes: 5,
    concepts: ['registers', 'ax', 'bx', 'cx', 'dx', 'sp', 'bp', 'si', 'di'],
  },
  {
    id: 'flag-frenzy',
    title: 'Flag Frenzy',
    description: 'Predict CPU flag states after operations. Master ZF, SF, CF, OF, and more.',
    icon: 'frenzy',
    status: 'coming-soon',
    estimatedMinutes: 5,
    concepts: ['flags', 'zf', 'sf', 'cf', 'of', 'pf', 'af', 'df'],
  },
]

// ============================================================================
// Utility Functions
// ============================================================================

function getGameIcon(icon: Game['icon'], className?: string) {
  switch (icon) {
    case 'hangman':
      return <Keyboard className={cn('h-8 w-8', className)} />
    case 'rally':
      return <Cpu className={cn('h-8 w-8', className)} />
    case 'frenzy':
      return <Flag className={cn('h-8 w-8', className)} />
  }
}

function getStatusStyles(status: GameStatus): { badge: string; text: string; icon: 'lock' | 'clock' | 'check' } {
  switch (status) {
    case 'available':
      return {
        badge: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
        text: 'Available',
        icon: 'check',
      }
    case 'coming-soon':
      return {
        badge: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
        text: 'Coming Soon',
        icon: 'clock',
      }
    case 'locked':
      return {
        badge: 'bg-muted text-muted-foreground',
        text: 'Locked',
        icon: 'lock',
      }
  }
}

// ============================================================================
// LocalStorage Helpers
// ============================================================================

interface GameScore {
  gameId: string
  highScore: number
  lastPlayed: string
  gamesPlayed: number
}

function loadGameScores(): Record<string, GameScore> {
  try {
    const stored = localStorage.getItem('acs2906_gameScores')
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

// ============================================================================
// GameCard Component
// ============================================================================

interface GameCardProps {
  game: Game
  scores: Record<string, GameScore>
  onLaunch?: (gameId: string) => void
}

function GameCard({ game, scores, onLaunch }: GameCardProps) {
  const statusStyles = getStatusStyles(game.status)

  const gameScore = scores[game.id]
  const isPlayable = game.status === 'available'

  return (
    <div className="group relative border rounded-xl bg-card overflow-hidden transition-all duration-200 hover:border-primary/50 hover:shadow-md">
      {/* Card Header */}
      <div className="p-6">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={cn(
            'shrink-0 p-3 rounded-xl transition-colors',
            isPlayable 
              ? 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground' 
              : 'bg-muted text-muted-foreground'
          )}>
            {getGameIcon(game.icon)}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg">{game.title}</h3>
              <span className={cn(
                'text-xs px-2 py-0.5 rounded-full font-medium',
                statusStyles.badge
              )}>
                {statusStyles.text}
              </span>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {game.description}
            </p>
          </div>
        </div>

        {/* Meta Info */}
        <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
          {game.estimatedMinutes && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>~{game.estimatedMinutes} min</span>
            </div>
          )}
          {gameScore && (
            <div className="flex items-center gap-1">
              <Trophy className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <span>High: {gameScore.highScore}</span>
            </div>
          )}
          {gameScore && (
            <div className="flex items-center gap-1">
              <RotateCcw className="h-4 w-4" />
              <span>Played {gameScore.gamesPlayed}x</span>
            </div>
          )}
        </div>

        {/* Concepts */}
        {game.concepts && game.concepts.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {game.concepts.slice(0, 4).map((concept) => (
              <span
                key={concept}
                className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground"
              >
                {concept}
              </span>
            ))}
            {game.concepts.length > 4 && (
              <span className="text-xs text-muted-foreground">
                +{game.concepts.length - 4}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Card Footer */}
      <div className="px-6 py-4 border-t bg-muted/30">
        <button
          onClick={() => isPlayable && onLaunch?.(game.id)}
          disabled={!isPlayable}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-all',
            isPlayable
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          )}
        >
          {isPlayable ? (
            <>
              <Play className="h-4 w-4" />
              Launch Game
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" />
              Coming Soon
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// GamesHub Component
// ============================================================================

interface GamesHubProps {
  className?: string
}

export function GamesHub({ className }: GamesHubProps) {
  // Load scores once using useMemo to avoid useEffect + setState pattern
  const scores = useMemo(() => loadGameScores(), [])

  const handleLaunchGame = (gameId: string) => {
    // Navigate to the game route
    window.location.hash = `#/games/${gameId}`
  }

  // Calculate total stats
  const totalGamesPlayed = Object.values(scores).reduce((sum, s) => sum + s.gamesPlayed, 0)
  const totalHighScores = Object.values(scores).reduce((sum, s) => sum + s.highScore, 0)

  return (
    <div className={cn('space-y-8', className)}>
      {/* Header Section */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400 text-sm font-medium">
          <Gamepad2 className="h-4 w-4" />
          Learning Games
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Games Hub</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Master assembly language through gamified practice. Each game targets specific concepts and skills.
        </p>
      </div>

      {/* Stats Bar */}
      {totalGamesPlayed > 0 && (
        <div className="flex flex-wrap justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <Gamepad2 className="h-4 w-4 text-pink-600" />
            <span><strong>{totalGamesPlayed}</strong> Games Played</span>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-600" />
            <span><strong>{totalHighScores}</strong> Total High Score</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <span><strong>{Object.keys(scores).length}</strong> Games Tried</span>
          </div>
        </div>
      )}

      {/* Games Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GAMES.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            scores={scores}
            onLaunch={handleLaunchGame}
          />
        ))}
      </div>

      {/* Info Section */}
      <div className="border rounded-xl bg-muted/30 p-6">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          How Games Work
        </h2>
        <div className="grid gap-4 sm:grid-cols-3 text-sm">
          <div className="flex gap-3">
            <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
              1
            </div>
            <div>
              <p className="font-medium">Choose a Game</p>
              <p className="text-muted-foreground">Select from Instruction Hangman, Register Rally, or Flag Frenzy</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
              2
            </div>
            <div>
              <p className="font-medium">Play & Learn</p>
              <p className="text-muted-foreground">Answer questions and build your mastery</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
              3
            </div>
            <div>
              <p className="font-medium">Track Progress</p>
              <p className="text-muted-foreground">Scores sync to your mastery dashboard</p>
            </div>
          </div>
        </div>
      </div>

      {/* Related Activities */}
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          to="/drills"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-muted transition-colors"
        >
          <Target className="h-4 w-4" />
          Practice Drills
        </Link>
        <Link
          to="/progress"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-muted transition-colors"
        >
          <BarChart3 className="h-4 w-4" />
          View Progress
        </Link>
        <Link
          to="/course-map"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-muted transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
          Course Map
        </Link>
      </div>
    </div>
  )
}


