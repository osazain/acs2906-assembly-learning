import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { BookOpen, Gamepad2, FlaskConical, Cpu, BarChart3, Settings, Sun, Moon, ArrowRight, FileText, Target, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

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
  const lectures = [
    { id: 1, title: 'Computer Systems Overview', topics: ['Information is Bits + Context', 'ASCII Encoding', 'Program Compilation'], examples: 0, examRelevance: 'medium' },
    { id: 2, title: 'Data Representation & Arithmetic', topics: ['Number Systems', 'Conversions', 'Bit-level Operations'], examples: 0, examRelevance: 'high' },
    { id: 3, title: 'Floating Point', topics: ['Binary Fractions', 'IEEE 754 Format', 'Special Values'], examples: 0, examRelevance: 'high' },
    { id: 4, title: 'Assembly Language Basics', topics: ['x86/IA-32 Architecture', 'CPU Registers', 'Flag Register', 'MOV Instruction'], examples: 13, examRelevance: 'high' },
    { id: 5, title: 'I/O and Addressing Modes', topics: ['DOS Interrupts', 'INT 21h Functions', 'Addressing Modes'], examples: 0, examRelevance: 'high' },
    { id: 6, title: 'Control Flow & Logic', topics: ['CMP Instruction', 'Conditional Jumps', 'Loops'], examples: 5, examRelevance: 'high' },
    { id: 7, title: 'Procedures & Stack', topics: ['PUSH/POP', 'CALL/RET', 'Recursion'], examples: 1, examRelevance: 'high' },
  ]

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Course Atlas</h1>
        <p className="text-muted-foreground">Explore the full ACS2906 course structure</p>
      </div>
      <div className="grid gap-4">
        {lectures.map((lecture) => (
          <div key={lecture.id} className="p-6 rounded-xl border bg-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary font-bold">{lecture.id}</div>
              <div>
                <h3 className="font-semibold">{lecture.title}</h3>
                <span className={cn('text-xs px-2 py-0.5 rounded-full', lecture.examRelevance === 'high' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700')}>
                  {lecture.examRelevance === 'high' ? 'High Exam Relevance' : lecture.examRelevance}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {lecture.topics.slice(0, 4).map((topic) => (
                <span key={topic} className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">{topic}</span>
              ))}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{lecture.examples} examples</span>
            </div>
          </div>
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
