import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { BookOpen, Gamepad2, FlaskConical, Cpu, BarChart3, Settings, Sun, Moon, ArrowRight, FileText, Target, Zap, ChevronRight, GraduationCap } from 'lucide-react'
import { cn } from '@/lib/utils'
import courseMapData from './data/processed/course-map.json'

type CourseMapLecture = typeof courseMapData.lectures[number]

const rootRoute = createRootRoute()

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: IndexPage,
})

function IndexPage() {
  const features = [
    { title: '10 Lectures', description: 'Comprehensive coverage from data representation to advanced procedures', icon: BookOpen, href: '/lectures', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
    { title: '50+ Examples', description: 'Hand-crafted assembly examples with annotations and simulator presets', icon: FlaskConical, href: '/examples', color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
    { title: 'Interactive Simulator', description: 'Run 8086 assembly code step-by-step with register visualization', icon: Cpu, href: '/simulator', color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
    { title: 'Practice Drills', description: 'Targeted practice with instant feedback and remediation', icon: Target, href: '/drills', color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
    { title: 'Learning Games', description: 'Gamified practice for instructions, registers, and flags', icon: Gamepad2, href: '/games', color: 'text-pink-600 dark:text-pink-400', bgColor: 'bg-pink-100 dark:bg-pink-900/30' },
    { title: 'Mastery Tracking', description: 'Track your progress and identify areas for improvement', icon: BarChart3, href: '/progress', color: 'text-cyan-600 dark:text-cyan-400', bgColor: 'bg-cyan-100 dark:bg-cyan-900/30' },
  ]

  return (
    <div className="space-y-12">
      <section className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
          <Zap className="h-4 w-4" />
          Master 8086 Assembly Language
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">ACS2906 Learning Platform</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          A source-grounded, mastery-based study system for Assembly Language Programming.
        </p>
        <div className="flex gap-3 justify-center pt-4">
          <Link to="/course-map" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
            <BookOpen className="h-4 w-4" />
            Start Learning
          </Link>
          <Link to="/simulator" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-border font-medium hover:bg-muted transition-colors">
            <Cpu className="h-4 w-4" />
            Try Simulator
          </Link>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-center mb-8">What You Will Learn</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Link key={feature.title} to={feature.href} className="group block p-6 rounded-xl border bg-card hover:bg-muted/50 transition-colors">
              <div className={cn('inline-flex p-3 rounded-lg mb-4', feature.bgColor)}>
                <feature.icon className={cn('h-6 w-6', feature.color)} />
              </div>
              <h3 className="font-semibold mb-1 group-hover:underline">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="text-center space-y-4">
        <h2 className="text-2xl font-bold">Ready to Master Assembly?</h2>
        <p className="text-muted-foreground">
          Start with the Course Map to see how all the pieces fit together.
        </p>
        <Link to="/course-map" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
          <BookOpen className="h-4 w-4" />
          Explore Course Map
        </Link>
      </section>
    </div>
  )
}

const courseMapRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/course-map',
  component: CourseMapPage,
})

const lectureDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/lecture/$lectureId',
  component: LectureDetailPage,
})

function LectureDetailPage() {
  const { lectureId } = lectureDetailRoute.useParams()
  const lecture = courseMapData.lectures.find(l => l.id === Number(lectureId))

  if (!lecture) {
    return (
      <div className="text-center py-12 space-y-4">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
        <h2 className="text-xl font-semibold">Lecture Not Found</h2>
        <p className="text-muted-foreground">The lecture you're looking for doesn't exist.</p>
        <Link to="/course-map" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
          <ArrowRight className="h-4 w-4" />
          Back to Course Map
        </Link>
      </div>
    )
  }

  const getExamRelevanceLabel = (relevance: CourseMapLecture['examRelevance']) => {
    switch (relevance) {
      case 'high': return 'High Exam Relevance'
      case 'medium': return 'Medium Exam Relevance'
      case 'low': return 'Low Exam Relevance'
    }
  }

  const getDifficultyStyles = (difficulty: CourseMapLecture['difficulty']) => {
    switch (difficulty) {
      case 'foundational':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
      case 'intermediate':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
      case 'advanced':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
    }
  }

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link to="/course-map" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <BookOpen className="h-4 w-4" />
        Back to Course Map
      </Link>

      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary font-bold text-lg">
            {lecture.id}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{lecture.title}</h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium', getDifficultyStyles(lecture.difficulty))}>
            {lecture.difficulty}
          </span>
          <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium',
            lecture.examRelevance === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
            lecture.examRelevance === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
            'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
          )}>
            {getExamRelevanceLabel(lecture.examRelevance)}
          </span>
          <span className="text-xs text-muted-foreground">
            {lecture.examples} examples
          </span>
        </div>
      </div>

      {/* Topics Section */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Key Topics
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {lecture.topics.map((topic, index) => (
            <div key={index} className="flex items-start gap-2 p-3 rounded-lg bg-card border">
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium shrink-0">
                {index + 1}
              </div>
              <span className="text-sm">{topic}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Coming Soon Placeholder */}
      <section className="text-center py-8 px-4 rounded-xl border border-dashed bg-muted/30">
        <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <h3 className="font-semibold mb-1">Lecture Content Coming Soon</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Full lecture content, examples, and assessments will be available in Phase 2.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Link
            to="/examples"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <FlaskConical className="h-4 w-4" />
            View Examples
          </Link>
          <Link
            to="/simulator"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            <Cpu className="h-4 w-4" />
            Try Simulator
          </Link>
        </div>
      </section>
    </div>
  )
}

const lecturesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/lectures',
  component: LecturesPage,
})

const examplesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/examples',
  component: ExamplesPage,
})

const drillsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/drills',
  component: DrillsPage,
})

const gamesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/games',
  component: GamesPage,
})

const simulatorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/simulator',
  component: SimulatorPage,
})

const progressRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/progress',
  component: ProgressPage,
})

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsPage,
})

function CourseMapPage() {
  const lectures = courseMapData.lectures as CourseMapLecture[]

  const getExamRelevanceStyles = (relevance: CourseMapLecture['examRelevance']) => {
    switch (relevance) {
      case 'high':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
      case 'medium':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
      case 'low':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
    }
  }

  const getDifficultyStyles = (difficulty: CourseMapLecture['difficulty']) => {
    switch (difficulty) {
      case 'foundational':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
      case 'intermediate':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
      case 'advanced':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
    }
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
          <GraduationCap className="h-4 w-4" />
          ACS2906 Assembly Language
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Course Map</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Navigate through 10 comprehensive lectures covering everything from data representation to advanced assembly programming.
        </p>
      </div>

      {/* Stats Bar */}
      <div className="flex flex-wrap justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <span><strong>{lectures.length}</strong> Lectures</span>
        </div>
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-emerald-600" />
          <span><strong>{lectures.reduce((sum, l) => sum + l.examples, 0)}</strong> Examples</span>
        </div>
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-orange-600" />
          <span><strong>{lectures.filter(l => l.examRelevance === 'high').length}</strong> High-Exam-Relevance</span>
        </div>
      </div>

      {/* Lecture Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {lectures.map((lecture) => (
          <Link
            key={lecture.id}
            to="/lecture/$lectureId"
            params={{ lectureId: String(lecture.id) }}
            className="group block p-5 rounded-xl border bg-card hover:bg-muted/50 hover:border-primary/50 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring"
          >
            {/* Card Header */}
            <div className="flex items-start gap-3 mb-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary font-bold shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                {lecture.id}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm sm:text-base leading-tight group-hover:text-primary transition-colors">
                  {lecture.title}
                </h3>
              </div>
            </div>

            {/* Topics */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {lecture.topics.slice(0, 3).map((topic) => (
                <span
                  key={topic}
                  className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground truncate max-w-[150px]"
                  title={topic}
                >
                  {topic}
                </span>
              ))}
              {lecture.topics.length > 3 && (
                <span className="text-xs text-muted-foreground">+{lecture.topics.length - 3} more</span>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="flex items-center gap-2">
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', getExamRelevanceStyles(lecture.examRelevance))}>
                  {lecture.examRelevance === 'high' ? 'High Exam' : lecture.examRelevance}
                </span>
                <span className={cn('text-xs px-2 py-0.5 rounded-full', getDifficultyStyles(lecture.difficulty))}>
                  {lecture.difficulty}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>{lecture.examples} examples</span>
                <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function LecturesPage() {
  return (
    <div className="text-center py-12 space-y-4">
      <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
      <h2 className="text-xl font-semibold">Lectures Coming Soon</h2>
      <p className="text-muted-foreground">Lecture content will be available after Phase 1.</p>
      <Link to="/course-map" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
        <ArrowRight className="h-4 w-4" />
        Back to Course Map
      </Link>
    </div>
  )
}

function ExamplesPage() {
  return (
    <div className="text-center py-12 space-y-4">
      <FlaskConical className="h-12 w-12 mx-auto text-muted-foreground" />
      <h2 className="text-xl font-semibold">Examples Coming Soon</h2>
      <p className="text-muted-foreground">Examples will be organized and searchable after Phase 1.</p>
      <Link to="/course-map" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
        <ArrowRight className="h-4 w-4" />
        Back to Course Map
      </Link>
    </div>
  )
}

function DrillsPage() {
  return (
    <div className="text-center py-12 space-y-4">
      <Target className="h-12 w-12 mx-auto text-muted-foreground" />
      <h2 className="text-xl font-semibold">Drills Coming Soon</h2>
      <p className="text-muted-foreground">Practice drills will be available after Phase 1.</p>
      <Link to="/course-map" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
        <ArrowRight className="h-4 w-4" />
        Back to Course Map
      </Link>
    </div>
  )
}

function GamesPage() {
  return (
    <div className="text-center py-12 space-y-4">
      <Gamepad2 className="h-12 w-12 mx-auto text-muted-foreground" />
      <h2 className="text-xl font-semibold">Games Coming Soon</h2>
      <p className="text-muted-foreground">Learning games will be available after Phase 4.</p>
      <Link to="/course-map" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
        <ArrowRight className="h-4 w-4" />
        Back to Course Map
      </Link>
    </div>
  )
}

function SimulatorPage() {
  return (
    <div className="text-center py-12 space-y-4">
      <Cpu className="h-12 w-12 mx-auto text-muted-foreground" />
      <h2 className="text-xl font-semibold">Simulator Coming Soon</h2>
      <p className="text-muted-foreground">The 8086 simulator will be available after Phase 5.</p>
      <Link to="/course-map" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
        <ArrowRight className="h-4 w-4" />
        Back to Course Map
      </Link>
    </div>
  )
}

function ProgressPage() {
  return (
    <div className="text-center py-12 space-y-4">
      <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground" />
      <h2 className="text-xl font-semibold">Progress Tracking Coming Soon</h2>
      <p className="text-muted-foreground">Mastery dashboard will be available after Phase 6.</p>
      <Link to="/course-map" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
        <ArrowRight className="h-4 w-4" />
        Back to Course Map
      </Link>
    </div>
  )
}

function SettingsPage() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark')
    } else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }, [theme])

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Appearance</h2>
        <div className="flex gap-2">
          <button onClick={() => setTheme('light')} className={cn('flex items-center gap-2 px-4 py-2 rounded-lg border', theme === 'light' ? 'border-primary bg-primary/10' : 'border-border')}>
            <Sun className="h-4 w-4" /> Light
          </button>
          <button onClick={() => setTheme('dark')} className={cn('flex items-center gap-2 px-4 py-2 rounded-lg border', theme === 'dark' ? 'border-primary bg-primary/10' : 'border-border')}>
            <Moon className="h-4 w-4" /> Dark
          </button>
          <button onClick={() => setTheme('system')} className={cn('flex items-center gap-2 px-4 py-2 rounded-lg border', theme === 'system' ? 'border-primary bg-primary/10' : 'border-border')}>
            <Settings className="h-4 w-4" /> System
          </button>
        </div>
      </section>
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">About</h2>
        <p className="text-sm text-muted-foreground">ACS2906 Assembly Language Learning Platform v0.1.0</p>
      </section>
    </div>
  )
}

const routeTree = rootRoute.addChildren([
  indexRoute,
  courseMapRoute,
  lectureDetailRoute,
  lecturesRoute,
  examplesRoute,
  drillsRoute,
  gamesRoute,
  simulatorRoute,
  progressRoute,
  settingsRoute,
])

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

export { router }
