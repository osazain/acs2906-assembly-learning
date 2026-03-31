import { createRootRoute, createRoute, createRouter, Outlet, useLocation, Link } from '@tanstack/react-router'
import { createHashHistory } from '@tanstack/history'
import { useState, useEffect } from 'react'
import { BookOpen, Gamepad2, FlaskConical, Cpu, BarChart3, Settings, Sun, Moon, ArrowRight, FileText, Target, Zap, ChevronRight, GraduationCap, Menu, X, Stethoscope } from 'lucide-react'
import { cn } from '@/lib/utils'
import courseMapData from './data/processed/course-map.json'
import { LectureReader } from '@/components/lecture/LectureReader'
import { ExampleExplorer } from '@/components/example/ExampleExplorer'
import { ExampleDetail } from '@/components/example/ExampleDetail'
import { GlobalSearch } from '@/components/layout/GlobalSearch'
import { DrillMode } from '@/components/assessment/DrillMode'
import { DiagnosticMode } from '@/components/assessment/DiagnosticMode'
import { MasteryDashboard } from '@/components/mastery/MasteryDashboard'
import { GamesHub } from '@/components/games/GamesHub'
import { InstructionHangman } from '@/components/games/InstructionHangman'
import { RegisterRally } from '@/components/games/RegisterRally'
import { FlagFrenzy } from '@/components/games/FlagFrenzy'
import { SimulatorCore } from '@/components/simulator/SimulatorCore'
import type { CourseMapLecture } from '@/lib/types'

// Games layout component that renders Outlet for child routes
function GamesLayout() {
  return <Outlet />
}

const rootRoute = createRootRoute({
  component: AppLayout,
})

function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const navItems = [
    { title: 'Course Map', href: '/course-map', icon: BookOpen },
    { title: 'Lectures', href: '/lectures', icon: FileText },
    { title: 'Examples', href: '/examples', icon: FlaskConical },
    { title: 'Simulator', href: '/simulator', icon: Cpu },
    { title: 'Drills', href: '/drills', icon: Target },
    { title: 'Diagnostics', href: '/diagnostics', icon: Stethoscope },
    { title: 'Games', href: '/games', icon: Gamepad2 },
    { title: 'Progress', href: '/progress', icon: BarChart3 },
    { title: 'Settings', href: '/settings', icon: Settings },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between gap-4">
          {/* Mobile menu button */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="lg:hidden p-3 rounded-md hover:bg-muted transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <Cpu className="h-6 w-6 text-primary" />
            <span className="hidden sm:inline">ACS2906</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="px-4 py-2 text-sm rounded-md hover:bg-muted transition-colors min-h-[44px] flex items-center"
              >
                {item.title}
              </Link>
            ))}
          </nav>

          {/* Search trigger */}
          <GlobalSearch />
        </div>
      </header>

      {/* Mobile sidebar */}
      {isSidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
          <aside className="fixed left-0 top-14 bottom-0 z-40 w-64 border-r bg-background lg:hidden overflow-y-auto">
            <nav className="p-4 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm rounded-md hover:bg-muted transition-colors min-h-[48px]"
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {item.title}
                </Link>
              ))}
            </nav>
          </aside>
        </>
      )}

      {/* Main content */}
      <main className="flex-1 container py-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t py-4 text-center text-sm text-muted-foreground">
        ACS2906 Assembly Language Learning Platform
      </footer>
    </div>
  )
}

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

  return <LectureReader lecture={lecture as CourseMapLecture} />
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

const exampleDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/examples/$exampleId',
  component: ExampleDetailPage,
})

const drillsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/drills',
  component: DrillsPage,
})

const diagnosticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/diagnostics',
  component: DiagnosticsPage,
})

const gamesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/games',
  component: GamesLayout,
})

const gamesIndexRoute = createRoute({
  getParentRoute: () => gamesRoute,
  path: '/',
  component: GamesPage,
})

const instructionHangmanRoute = createRoute({
  getParentRoute: () => gamesRoute,
  path: 'instruction-hangman',
  component: InstructionHangmanPage,
})

const registerRallyRoute = createRoute({
  getParentRoute: () => gamesRoute,
  path: 'register-rally',
  component: RegisterRallyPage,
})

const flagFrenzyRoute = createRoute({
  getParentRoute: () => gamesRoute,
  path: 'flag-frenzy',
  component: FlagFrenzyPage,
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
  return <ExampleExplorer />
}

function ExampleDetailPage() {
  const { exampleId } = exampleDetailRoute.useParams()
  return <ExampleDetail exampleId={exampleId} />
}

function DrillsPage() {
  return <DrillMode />
}

function DiagnosticsPage() {
  return <DiagnosticMode />
}

function GamesPage() {
  return <GamesHub />
}

function InstructionHangmanPage() {
  return <InstructionHangman onBack={() => window.location.hash = '#/games'} />
}

function RegisterRallyPage() {
  return <RegisterRally onBack={() => window.location.hash = '#/games'} />
}

function FlagFrenzyPage() {
  return <FlagFrenzy onBack={() => window.location.hash = '#/games'} />
}

function SimulatorPage() {
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const encodedCode = searchParams.get('code')
  const initialCode = encodedCode ? atob(encodedCode) : ''

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Cpu className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-bold">8086 Simulator</h1>
      </div>

      {/* Simulator Core */}
      <SimulatorCore initialCode={initialCode} />
    </div>
  )
}

function ProgressPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 text-sm font-medium">
          <BarChart3 className="h-4 w-4" />
          Mastery Dashboard
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Your Progress</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Track your mastery of assembly language concepts and instructions. Complete drills to build your progress.
        </p>
      </div>

      {/* Mastery Dashboard */}
      <MasteryDashboard />
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

// Add children to gamesRoute
const gamesRouteTree = gamesRoute.addChildren([
  gamesIndexRoute,
  instructionHangmanRoute,
  registerRallyRoute,
  flagFrenzyRoute,
])

const routeTree = rootRoute.addChildren([
  indexRoute,
  courseMapRoute,
  lectureDetailRoute,
  lecturesRoute,
  examplesRoute,
  exampleDetailRoute,
  drillsRoute,
  diagnosticsRoute,
  gamesRouteTree,
  simulatorRoute,
  progressRoute,
  settingsRoute,
])

const router = createRouter({ routeTree, history: createHashHistory() })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

export { router }
