import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Search, BookOpen, FlaskConical, Cpu, Lightbulb, Clock, ArrowRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import courseMapData from '@/data/processed/course-map.json'
import examplesData from '@/data/processed/examples.json'
import instructionIndex from '@/data/processed/instruction-index.json'
import conceptTaxonomy from '@/data/processed/concept-taxonomy.json'
import type { CourseMapLecture } from '@/lib/types'

// ============================================================================
// Types
// ============================================================================

export type SearchResultType = 'lecture' | 'example' | 'instruction' | 'concept'

export interface SearchResult {
  id: string
  type: SearchResultType
  title: string
  subtitle?: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  keywords: string[]
}

interface RecentSearch {
  query: string
  timestamp: number
  result?: SearchResult
}

// JSON Import Types
interface InstructionEntry {
  name: string
  category: string
  syntax: string
  flagsAffected: string[]
  operation: string
  relatedInstructions: string[]
  examples: string[]
  lectureRefs: { lecture: number; page?: number }[]
}

interface ConceptEntry {
  name: string
  categoryId: string
  description: string
  lectureIds: number[]
  exampleIds: string[]
  assessmentItemIds: string[]
  relatedConcepts: string[]
}

// ============================================================================
// Constants
// ============================================================================

const RECENT_ITEMS_KEY = 'acs2906_recent'
const MAX_RECENT_ITEMS = 5
const MAX_RESULTS = 10

// ============================================================================
// Search Index Building
// ============================================================================

function buildSearchIndex(): SearchResult[] {
  const results: SearchResult[] = []

  // Index lectures
  const lectures = courseMapData.lectures as CourseMapLecture[]
  for (const lecture of lectures) {
    results.push({
      id: `lecture-${lecture.id}`,
      type: 'lecture',
      title: lecture.title,
      subtitle: lecture.topics.slice(0, 2).join(', '),
      href: `/lecture/${lecture.id}`,
      icon: BookOpen,
      keywords: [
        ...lecture.topics,
        `Lecture ${lecture.id}`,
        lecture.title,
        lecture.difficulty,
        lecture.examRelevance,
      ],
    })
  }

  // Index examples
  const examples = examplesData.examples
  for (const example of examples) {
    results.push({
      id: `example-${example.id}`,
      type: 'example',
      title: example.filename,
      subtitle: example.instructions.join(', '),
      href: `/examples/${example.id}`,
      icon: FlaskConical,
      keywords: [
        example.filename,
        ...example.instructions,
        ...example.concepts,
        example.difficulty,
        example.id,
      ],
    })
  }

  // Index instructions
  const instructionEntries = Object.entries(instructionIndex) as [string, InstructionEntry][]
  for (const [mnemonic, entry] of instructionEntries) {
    results.push({
      id: `instruction-${mnemonic}`,
      type: 'instruction',
      title: mnemonic,
      subtitle: entry.operation.slice(0, 80),
      href: `/drills?instruction=${mnemonic}`,
      icon: Cpu,
      keywords: [
        mnemonic,
        entry.name,
        entry.category,
        entry.operation,
        ...entry.relatedInstructions,
        ...(entry.examples || []),
      ],
    })
  }

  // Index concepts
  const conceptEntries = Object.entries(conceptTaxonomy.concepts) as [string, ConceptEntry][]
  for (const [conceptId, concept] of conceptEntries) {
    results.push({
      id: `concept-${conceptId}`,
      type: 'concept',
      title: concept.name,
      subtitle: conceptTaxonomy.categories.find((c) => c.id === concept.categoryId)?.name,
      href: `/drills?concept=${conceptId}`,
      icon: Lightbulb,
      keywords: [
        concept.name,
        conceptId,
        concept.description,
        ...(concept.relatedConcepts || []),
      ],
    })
  }

  return results
}

// ============================================================================
// Utility Functions
// ============================================================================

function normalizeQuery(query: string): string {
  return query.toLowerCase().trim()
}

function scoreResult(result: SearchResult, query: string): number {
  const q = normalizeQuery(query)
  const titleLower = result.title.toLowerCase()
  const subtitleLower = (result.subtitle || '').toLowerCase()

  // Exact match in title gets highest score
  if (titleLower === q) return 100
  // Title starts with query
  if (titleLower.startsWith(q)) return 80
  // Title contains query
  if (titleLower.includes(q)) return 60
  // Subtitle contains query
  if (subtitleLower.includes(q)) return 40
  // Keywords contain query
  for (const keyword of result.keywords) {
    if (keyword.toLowerCase() === q) return 50
    if (keyword.toLowerCase().includes(q)) return 30
  }
  return 0
}

function searchResults(query: string, index: SearchResult[]): SearchResult[] {
  if (!query.trim()) return []

  const q = normalizeQuery(query)
  const scored = index
    .map(result => ({ result, score: scoreResult(result, q) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS)
    .map(({ result }) => result)

  return scored
}

// ============================================================================
// Local Storage Helpers
// ============================================================================

function getRecentSearches(): RecentSearch[] {
  try {
    const stored = localStorage.getItem(RECENT_ITEMS_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    // Ignore parse errors
  }
  return []
}

function saveRecentSearch(query: string, result?: SearchResult): void {
  const recent = getRecentSearches()
  const newEntry: RecentSearch = {
    query,
    timestamp: Date.now(),
    result,
  }

  // Remove duplicates and add new entry at front
  const filtered = recent.filter(r => r.query !== query)
  const updated = [newEntry, ...filtered].slice(0, MAX_RECENT_ITEMS)

  try {
    localStorage.setItem(RECENT_ITEMS_KEY, JSON.stringify(updated))
  } catch {
    // Ignore storage errors
  }
}

// ============================================================================
// Component
// ============================================================================

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  // Initialize recent searches from localStorage - this is intentional to read on mount
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>(() => getRecentSearches())

  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Build search index once
  const searchIndex = useMemo(() => buildSearchIndex(), [])

  // Search results based on query
  const results = useMemo(() => {
    if (!query.trim()) return []
    return searchResults(query, searchIndex)
  }, [query, searchIndex])

  // Keyboard event handler for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(timer)
    } else {
      // Reset state when closing - intentional UI state reset
      // eslint-disable-next-line react-hooks/set-state-in-effect -- This is a one-time state reset when modal closes, not a recurring update
      setQuery('')
      setSelectedIndex(0)
    }
  }, [isOpen])

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Compute items fresh to ensure consistency
      const items = results.length > 0 ? results : recentSearches.map(r => r.result).filter(Boolean) as SearchResult[]
      
      // Ensure selectedIndex is within bounds
      const safeIndex = items.length > 0 ? Math.min(selectedIndex, items.length - 1) : 0

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          if (items.length > 0) {
            setSelectedIndex(prev => Math.min(prev + 1, items.length - 1))
          }
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => Math.max(prev - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (items.length > 0 && items[safeIndex]) {
            const selected = items[safeIndex]
            saveRecentSearch(query, selected)
            setRecentSearches(getRecentSearches())
            setIsOpen(false)
            // Use window.location for reliable navigation with hash-based routing
            window.location.hash = `#${selected.href}`
          }
          break
        case 'Escape':
          e.preventDefault()
          setIsOpen(false)
          break
      }
    },
    [results, recentSearches, selectedIndex, query]
  )

  // Handle recent search click
  const handleRecentClick = useCallback(
    (search: RecentSearch) => {
      if (search.result) {
        setIsOpen(false)
        window.location.hash = `#${search.result.href}`
      }
    },
    []
  )

  // Clear recent searches
  const clearRecentSearches = useCallback(() => {
    localStorage.removeItem(RECENT_ITEMS_KEY)
    setRecentSearches([])
  }, [])

  // Get icon for result type
  const getResultTypeLabel = (type: SearchResultType): string => {
    switch (type) {
      case 'lecture':
        return 'Lecture'
      case 'example':
        return 'Example'
      case 'instruction':
        return 'Instruction'
      case 'concept':
        return 'Concept'
    }
  }

  // Get icon background color for result type
  const getResultTypeStyles = (type: SearchResultType): string => {
    switch (type) {
      case 'lecture':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
      case 'example':
        return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
      case 'instruction':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
      case 'concept':
        return 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground bg-muted/50 hover:bg-muted rounded-lg border border-transparent hover:border-border transition-colors min-h-[44px] min-w-[44px] justify-center"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-mono bg-background rounded border border-border">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Search Palette */}
      <div
        ref={containerRef}
        className="relative w-full max-w-xl mx-4 bg-card rounded-xl border shadow-2xl overflow-hidden"
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 border-b">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search lectures, examples, instructions, concepts..."
            className="flex-1 py-4 bg-transparent outline-none text-base placeholder:text-muted-foreground"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center px-2 py-1 text-xs font-mono bg-muted rounded border border-border">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {query.trim() === '' && recentSearches.length > 0 && (
            <div className="p-2">
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Recent Searches
                </div>
                <button
                  onClick={clearRecentSearches}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear
                </button>
              </div>
              {recentSearches.map((search, index) => (
                <button
                  key={search.timestamp}
                  onClick={() => handleRecentClick(search)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors',
                    selectedIndex === index ? 'bg-muted' : 'hover:bg-muted/50'
                  )}
                >
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{search.query}</div>
                    {search.result && (
                      <div className="text-xs text-muted-foreground truncate">
                        {search.result.title}
                      </div>
                    )}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          )}

          {query.trim() !== '' && results.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">No results found for "{query}"</p>
              <p className="text-sm text-muted-foreground mt-1">
                Try searching for a lecture title, example name, instruction, or concept
              </p>
            </div>
          )}

          {results.length > 0 && (
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
                {results.length} result{results.length !== 1 ? 's' : ''}
              </div>
              {results.map((result, index) => (
                <button
                  key={result.id}
                  onClick={() => {
                    saveRecentSearch(query, result)
                    setRecentSearches(getRecentSearches())
                    setIsOpen(false)
                    window.location.hash = `#${result.href}`
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors',
                    selectedIndex === index ? 'bg-muted' : 'hover:bg-muted/50'
                  )}
                >
                  <div className={cn('p-2 rounded-lg shrink-0', getResultTypeStyles(result.type))}>
                    <result.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{result.title}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                        {getResultTypeLabel(result.type)}
                      </span>
                    </div>
                    {result.subtitle && (
                      <div className="text-xs text-muted-foreground truncate mt-0.5">
                        {result.subtitle}
                      </div>
                    )}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-background rounded border border-border font-mono">↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-background rounded border border-border font-mono">↵</kbd>
              Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-background rounded border border-border font-mono">ESC</kbd>
              Close
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
