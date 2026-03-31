import Dexie, { type Table } from 'dexie'

export interface Provenance {
  sourceFile: string
  sourceType: 'pdf' | 'asm' | 'markdown' | 'js' | 'generated'
  sourceSectionOrLineRange?: string
  extractedBy: string
  extractionConfidence: number
  reviewedStatus: 'pending' | 'reviewed' | 'verified'
  lastReviewed?: string
  notes?: string
}

export interface RemediationRef {
  type: 'lecture' | 'section' | 'example' | 'worksheet' | 'instruction'
  id: string
  description: string
}

export interface MasteryRecord {
  id?: number
  userId: string
  topicType: 'concept' | 'instruction' | 'section'
  topicId: string
  metrics: {
    attempts: number
    correct: number
    accuracy: number
    confidence: number
    averageTimeMs: number
    lastAttempt: string
    firstAttempt: string
  }
  mistakePatterns: string[]
  strengthLevel: 'mastered' | 'proficient' | 'developing' | 'beginning'
  recommendationRefs: RemediationRef[]
  streak?: number
  lastPracticed?: string
}

export interface StudySession {
  id?: number
  userId: string
  startedAt: string
  endedAt?: string
  mode: 'lecture' | 'drill' | 'diagnostic' | 'game' | 'test' | 'simulator'
  topics: string[]
  itemsCompleted: number
  correctCount: number
}

export interface UserPreferences {
  id?: number
  userId: string
  theme: 'light' | 'dark' | 'system'
  soundEnabled: boolean
  reducedMotion: boolean
}

export interface AnswerRecord {
  id?: number
  userId: string
  questionId: string
  answeredAt: string
  correct: boolean
  timeMs: number
  selectedOption?: string
  sessionId?: number
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

class ACS2906Database extends Dexie {
  mastery!: Table<MasteryRecord>
  sessions!: Table<StudySession>
  preferences!: Table<UserPreferences>
  answers!: Table<AnswerRecord>
  reviewQueue!: Table<ReviewQueueItem>

  constructor() {
    super('ACS2906Learning')
    this.version(1).stores({
      mastery: '++id, userId, topicType, topicId, [userId+topicType+topicId], strengthLevel',
      sessions: '++id, userId, startedAt, mode',
      preferences: '++id, userId',
      answers: '++id, userId, questionId, answeredAt, [userId+questionId]',
      reviewQueue: '++id, userId, conceptId, [userId+conceptId], addedAt',
    })
  }
}

export const db = new ACS2906Database()

export async function getOrCreateUserId(): Promise<string> {
  const stored = localStorage.getItem('acs2906_userId')
  if (stored) return stored
  
  const newId = crypto.randomUUID()
  localStorage.setItem('acs2906_userId', newId)
  return newId
}

export async function getUserPreferences(userId: string): Promise<UserPreferences> {
  const prefs = await db.preferences.where('userId').equals(userId).first()
  if (prefs) return prefs
  
  const newPrefs: UserPreferences = {
    userId,
    theme: 'system',
    soundEnabled: false,
    reducedMotion: false,
  }
  await db.preferences.add(newPrefs)
  return newPrefs
}

export async function updateMastery(
  userId: string,
  topicType: MasteryRecord['topicType'],
  topicId: string,
  correct: boolean,
  timeMs: number
): Promise<void> {
  const now = new Date().toISOString()
  
  // Query using the compound index [userId+topicType+topicId]
  const existing = await db.mastery
    .where('[userId+topicType+topicId]')
    .equals([userId, topicType, topicId])
    .first()
  
  if (existing) {
    const metrics = existing.metrics
    metrics.attempts += 1
    if (correct) metrics.correct += 1
    metrics.accuracy = metrics.correct / metrics.attempts
    metrics.averageTimeMs = (metrics.averageTimeMs * (metrics.attempts - 1) + timeMs) / metrics.attempts
    metrics.lastAttempt = now
    
    await db.mastery.update(existing.id!, {
      metrics,
      mistakePatterns: existing.mistakePatterns,
      strengthLevel: calculateStrengthLevel(metrics.accuracy, metrics.attempts),
      lastPracticed: now,
    })
  } else {
    const newRecord: MasteryRecord = {
      userId,
      topicType,
      topicId,
      metrics: {
        attempts: 1,
        correct: correct ? 1 : 0,
        accuracy: correct ? 1 : 0,
        confidence: 0,
        averageTimeMs: timeMs,
        lastAttempt: now,
        firstAttempt: now,
      },
      mistakePatterns: [],
      recommendationRefs: [],
      strengthLevel: correct ? 'developing' : 'beginning',
      lastPracticed: now,
    }
    await db.mastery.add(newRecord)
  }
}

function calculateStrengthLevel(
  accuracy: number,
  attempts: number
): MasteryRecord['strengthLevel'] {
  if (accuracy >= 0.9 && attempts >= 5) return 'mastered'
  if (accuracy >= 0.75) return 'proficient'
  if (accuracy >= 0.5) return 'developing'
  return 'beginning'
}

export async function getMasteryRecord(
  userId: string,
  topicType: MasteryRecord['topicType'],
  topicId: string
): Promise<MasteryRecord | undefined> {
  return db.mastery
    .where('[userId+topicType+topicId]')
    .equals([userId, topicType, topicId])
    .first()
}

export async function addMistakePattern(
  userId: string,
  topicType: MasteryRecord['topicType'],
  topicId: string,
  patterns: string[]
): Promise<void> {
  const record = await getMasteryRecord(userId, topicType, topicId)
  if (record && record.id) {
    const updatedPatterns = [...new Set([...record.mistakePatterns, ...patterns])]
    await db.mastery.update(record.id, {
      mistakePatterns: updatedPatterns
    })
  }
}

export async function getAllMasteryRecords(userId: string): Promise<MasteryRecord[]> {
  return db.mastery.where('userId').equals(userId).toArray()
}

export async function getMasteryByType(
  userId: string,
  topicType: MasteryRecord['topicType']
): Promise<MasteryRecord[]> {
  return db.mastery.where('userId').equals(userId).and(r => r.topicType === topicType).toArray()
}
