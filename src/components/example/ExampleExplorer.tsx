import { useState, useMemo, useCallback } from 'react'
import { Link } from '@tanstack/react-router'
import { 
  FlaskConical, 
  Grid3X3, 
  List as ListIcon, 
  Search, 
  X, 
  ChevronDown,
  Filter,
  ChevronRight,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import examplesData from '@/data/processed/examples.json'

type ViewMode = 'grid' | 'list'
type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'all'

interface Example {
  id: string
  filename: string
  lectureIds: number[]
  sectionIds: string[]
  concepts: string[]
  instructions: string[]
  code: string
  annotations: Array<{
    line: number
    type: 'comment' | 'instruction' | 'register' | 'memory' | 'flag'
    text: string
    linkedConcept?: string
  }>
  commonMistakes: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  relatedQuestions: string[]
}

interface ExampleExplorerProps {
  onExampleClick?: (example: Example) => void
}

export function ExampleExplorer({ onExampleClick }: ExampleExplorerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selectedLecture, setSelectedLecture] = useState<number | 'all'>('all')
  const [instructionSearch, setInstructionSearch] = useState('')
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('all')
  const [showFilters, setShowFilters] = useState(false)

  const examples = examplesData.examples as Example[]

  // Get unique lectures from examples
  const lectures = useMemo(() => {
    const lectureSet = new Set<number>()
    examples.forEach(ex => ex.lectureIds.forEach(l => lectureSet.add(l)))
    return Array.from(lectureSet).sort((a, b) => a - b)
  }, [examples])

  // Filter examples
  const filteredExamples = useMemo(() => {
    return examples.filter(ex => {
      // Lecture filter
      if (selectedLecture !== 'all' && !ex.lectureIds.includes(selectedLecture)) {
        return false
      }
      
      // Instruction search filter
      if (instructionSearch.trim()) {
        const searchLower = instructionSearch.toLowerCase()
        const matchesInstruction = ex.instructions.some(i => 
          i.toLowerCase().includes(searchLower)
        )
        const matchesFilename = ex.filename.toLowerCase().includes(searchLower)
        if (!matchesInstruction && !matchesFilename) {
          return false
        }
      }
      
      // Difficulty filter
      if (selectedDifficulty !== 'all' && ex.difficulty !== selectedDifficulty) {
        return false
      }
      
      return true
    })
  }, [examples, selectedLecture, instructionSearch, selectedDifficulty])

  const clearFilters = useCallback(() => {
    setSelectedLecture('all')
    setInstructionSearch('')
    setSelectedDifficulty('all')
  }, [])

  const hasActiveFilters = selectedLecture !== 'all' || instructionSearch.trim() !== '' || selectedDifficulty !== 'all'

  const getDifficultyStyles = (difficulty: Example['difficulty']) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
      case 'intermediate':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'
      case 'advanced':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
    }
  }

  const getLectureTitle = (lectureId: number): string => {
    const lectureTitles: Record<number, string> = {
      1: 'Introduction to Assembly Language',
      2: 'Data Representation and Arithmetic',
      3: 'Basic Assembly Programming',
      4: 'Data Transfer and Arithmetic Instructions',
      5: 'Input/Output Operations',
      6: 'Control Flow and Loops',
      7: 'Procedures and Subroutines',
      8: 'String Operations',
      9: 'Arrays and Data Structures',
      10: 'Advanced Topics and Review'
    }
    return lectureTitles[lectureId] || `Lecture ${lectureId}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Examples</h1>
          <p className="text-muted-foreground mt-1">
            {filteredExamples.length === examples.length 
              ? `${examples.length} examples available`
              : `${filteredExamples.length} of ${examples.length} examples`}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border bg-card">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 rounded-l-lg transition-colors',
                viewMode === 'grid' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              )}
              title="Grid view"
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2 rounded-r-lg transition-colors',
                viewMode === 'list' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              )}
              title="List view"
            >
              <ListIcon className="h-4 w-4" />
            </button>
          </div>
          
          {/* Filter toggle (mobile) */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'lg:hidden p-2 rounded-lg border transition-colors',
              showFilters 
                ? 'bg-primary text-primary-foreground border-primary' 
                : 'bg-card text-muted-foreground hover:text-foreground'
            )}
          >
            <Filter className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className={cn(
        'space-y-4 p-4 rounded-lg border bg-card',
        showFilters ? 'block' : 'hidden lg:block'
      )}>
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Lecture filter */}
          <div className="flex-1">
            <label className="text-sm font-medium mb-1.5 block">Lecture</label>
            <div className="relative">
              <select
                value={selectedLecture}
                onChange={(e) => setSelectedLecture(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="w-full appearance-none rounded-lg border bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">All Lectures</option>
                {lectures.map(lectureId => (
                  <option key={lectureId} value={lectureId}>
                    Lecture {lectureId}: {getLectureTitle(lectureId).slice(0, 30)}...
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Instruction search */}
          <div className="flex-1">
            <label className="text-sm font-medium mb-1.5 block">Instruction</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={instructionSearch}
                onChange={(e) => setInstructionSearch(e.target.value)}
                placeholder="Search MOV, ADD, etc..."
                className="w-full rounded-lg border bg-background pl-9 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {instructionSearch && (
                <button
                  onClick={() => setInstructionSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Difficulty filter */}
        <div>
          <label className="text-sm font-medium mb-2 block">Difficulty</label>
          <div className="flex flex-wrap gap-2">
            {(['all', 'beginner', 'intermediate', 'advanced'] as const).map(diff => (
              <button
                key={diff}
                onClick={() => setSelectedDifficulty(diff)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium transition-colors border',
                  selectedDifficulty === diff
                    ? diff === 'all'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : diff === 'beginner'
                        ? 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/50'
                        : diff === 'intermediate'
                          ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/50'
                          : 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/50'
                    : 'bg-card text-muted-foreground border-border hover:text-foreground'
                )}
              >
                {diff === 'all' ? 'All Levels' : diff.charAt(0).toUpperCase() + diff.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <X className="h-3.5 w-3.5" />
            Clear all filters
          </button>
        )}
      </div>

      {/* Results */}
      {filteredExamples.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
          <h2 className="text-xl font-semibold">No examples found</h2>
          <p className="text-muted-foreground max-w-sm mx-auto">
            No examples match your current filters. Try adjusting your search criteria.
          </p>
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <X className="h-4 w-4" />
            Clear filters
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredExamples.map(example => (
            <Link
              key={example.id}
              to="/examples/$exampleId"
              params={{ exampleId: example.id }}
              className="group block p-5 rounded-xl border bg-card hover:bg-muted/50 hover:border-primary/50 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => onExampleClick?.(example)}
            >
              {/* Header */}
              <div className="flex items-start gap-3 mb-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <FlaskConical className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm leading-tight group-hover:text-primary transition-colors truncate">
                    {example.filename}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {example.instructions.slice(0, 3).join(', ')}
                    {example.instructions.length > 3 && ` +${example.instructions.length - 3}`}
                  </p>
                </div>
              </div>

              {/* Lecture badges */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {example.lectureIds.map(lecId => (
                  <span
                    key={lecId}
                    className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground"
                  >
                    L{lecId}
                  </span>
                ))}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded-full font-medium border',
                  getDifficultyStyles(example.difficulty)
                )}>
                  {example.difficulty}
                </span>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>{example.code.split('\n').length} lines</span>
                  <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredExamples.map(example => (
            <Link
              key={example.id}
              to="/examples/$exampleId"
              params={{ exampleId: example.id }}
              className="group flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 hover:border-primary/50 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => onExampleClick?.(example)}
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 shrink-0">
                <FlaskConical className="h-5 w-5" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm group-hover:text-primary transition-colors">
                  {example.filename}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {example.instructions.join(', ')}
                </p>
              </div>

              <div className="hidden sm:flex flex-wrap gap-1.5">
                {example.lectureIds.map(lecId => (
                  <span
                    key={lecId}
                    className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground"
                  >
                    L{lecId}
                  </span>
                ))}
              </div>

              <span className={cn(
                'text-xs px-2 py-0.5 rounded-full font-medium border hidden sm:block',
                getDifficultyStyles(example.difficulty)
              )}>
                {example.difficulty}
              </span>

              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
