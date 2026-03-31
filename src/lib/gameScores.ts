// ============================================================================
// Game Score Persistence Utilities
// ============================================================================

export interface GameScore {
  gameId: string
  highScore: number
  lastPlayed: string
  gamesPlayed: number
  totalCorrect?: number
  totalWrong?: number
}

export interface AllGameScores {
  [gameId: string]: GameScore
}

/**
 * Load all game scores from localStorage
 */
export function loadGameScores(): AllGameScores {
  try {
    const stored = localStorage.getItem('acs2906_gameScores')
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

/**
 * Save all game scores to localStorage
 */
export function saveGameScores(scores: AllGameScores): void {
  try {
    localStorage.setItem('acs2906_gameScores', JSON.stringify(scores))
  } catch {
    // Ignore storage errors
  }
}

/**
 * Update game score after a game session ends
 */
export function updateGameScore(
  gameId: string,
  score: number,
  options: {
    totalCorrect?: number
    totalWrong?: number
  } = {}
): GameScore {
  const scores = loadGameScores()
  const existing = scores[gameId]
  
  const updatedScore: GameScore = {
    gameId,
    highScore: Math.max(existing?.highScore ?? 0, score),
    lastPlayed: new Date().toISOString(),
    gamesPlayed: (existing?.gamesPlayed ?? 0) + 1,
    totalCorrect: (existing?.totalCorrect ?? 0) + (options.totalCorrect ?? 0),
    totalWrong: (existing?.totalWrong ?? 0) + (options.totalWrong ?? 0),
  }
  
  scores[gameId] = updatedScore
  saveGameScores(scores)
  
  return updatedScore
}

/**
 * Get score for a specific game
 */
export function getGameScore(gameId: string): GameScore | undefined {
  const scores = loadGameScores()
  return scores[gameId]
}

/**
 * Clear all game scores (for testing/reset)
 */
export function clearGameScores(): void {
  localStorage.removeItem('acs2906_gameScores')
}
