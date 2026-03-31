import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import ReactMarkdown from 'react-markdown'
import { BookOpen, Check, Cpu, List, X, Copy, CheckCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { db, getOrCreateUserId } from '@/lib/db'

type CourseMapLecture = {
  id: number
  title: string
  topics: string[]
  examples: number
  examRelevance: 'high' | 'medium' | 'low'
  difficulty: 'foundational' | 'intermediate' | 'advanced'
}

// Assembly code examples for different lectures
const ASSEMBLY_EXAMPLES: Record<number, { title: string; code: string; description: string }[]> = {
  3: [
    {
      title: 'Simple MOV Example',
      code: `; Simple data transfer using MOV
MOV AX, 1234h    ; Load immediate value into AX
MOV BX, AX       ; Copy AX value to BX
MOV CX, 0        ; Clear CX register`,
      description: 'The MOV instruction transfers data between registers and memory.'
    },
    {
      title: 'Memory Addressing',
      code: `; Direct memory addressing
DATA SEGMENT
    myVar DB 10h
DATA ENDS

CODE SEGMENT
    MOV AX, @DATA
    MOV DS, AX
    MOV AL, [myVar]    ; Load byte from memory`,
      description: 'Memory operands use brackets to indicate indirect addressing.'
    }
  ],
  4: [
    {
      title: 'ADD and SUB Instructions',
      code: `; Arithmetic operations
MOV AX, 5        ; AX = 5
MOV BX, 3        ; BX = 3
ADD AX, BX       ; AX = AX + BX = 8
SUB AX, 2        ; AX = AX - 2 = 6
NEG AX           ; AX = -AX = -6`,
      description: 'ADD, SUB, and NEG modify the destination operand and update CPU flags.'
    },
    {
      title: 'CMP Instruction',
      code: `; Comparison using CMP
MOV AX, 10
MOV BX, 20
CMP AX, BX       ; Sets flags based on AX - BX
JE equal         ; Jump if equal (ZF = 1)
JL smaller       ; Jump if AX < BX (SF ≠ OF)
JG larger        ; Jump if AX > BX (ZF = 0 and SF = OF)`,
      description: 'CMP performs subtraction but only updates flags, not the destination.'
    },
    {
      title: 'Hello World',
      code: `; Hello World Program
.MODEL SMALL
.STACK 100h
.DATA
    msg DB 'Hello, World!$'
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX
    MOV AH, 09h
    LEA DX, msg
    INT 21h
    MOV AH, 4Ch
    INT 21h
MAIN ENDP
END MAIN`,
      description: 'Classic Hello World using DOS interrupt 21h function 09h.'
    }
  ],
  6: [
    {
      title: 'Conditional Jump',
      code: `; If-else structure in assembly
MOV AX, 10
MOV BX, 20
CMP AX, BX
JE equal_handler
JL less_handler
; Greater handler (fall-through)
MOV CX, 1
JMP done
equal_handler:
    MOV CX, 0
    JMP done
less_handler:
    MOV CX, -1
done:
    ; CX contains comparison result`,
      description: 'Conditional jumps implement decision structures.'
    },
    {
      title: 'Loop Example',
      code: `; Countdown loop
MOV CX, 5        ; Counter in CX
loop_start:
    ; Do something each iteration
    DEC CX         ; Decrement counter
    JNZ loop_start ; Continue if not zero`,
      description: 'The LOOP instruction decrements CX and jumps if not zero.'
    }
  ],
  7: [
    {
      title: 'Procedure Call',
      code: `; Procedure definition and call
.CODE
MAIN PROC
    MOV AX, 5
    PUSH AX        ; Pass parameter
    CALL square
    ; Result in AX
    POP            ; Clean stack
    RET
MAIN ENDP

square PROC
    PUSH BP
    MOV BP, SP
    MOV AX, [BP+4] ; Get parameter
    MUL AX         ; AX = AX * AX
    POP BP
    RET
square ENDP`,
      description: 'Procedures (functions) use PUSH/POP to save/restore registers.'
    }
  ]
}

// Generate section content from topic
function generateSectionContent(topic: string, lectureId: number): { content: string; hasCode: boolean } {
  const topicLower = topic.toLowerCase()
  
  // Check if this topic has an associated code example
  const examples = ASSEMBLY_EXAMPLES[lectureId] || []
  
  // Find relevant example based on topic
  let relevantExample = examples.find(e => 
    e.title.toLowerCase().includes(topicLower.split(' ')[0]) ||
    e.description.toLowerCase().includes(topicLower.split(' ')[0])
  )
  
  // If lecture has examples but none match, use the first one
  if (!relevantExample && examples.length > 0 && lectureId === 4) {
    relevantExample = examples[0]
  }
  
  let content = `**${topic}**\n\n`
  content += `This section covers ${topic} in the context of 8086 assembly language programming.\n\n`
  
  if (relevantExample) {
    content += `### Example: ${relevantExample.title}\n\n`
    content += `${relevantExample.description}\n\n`
    content += '```asm\n' + relevantExample.code + '\n```\n\n'
    content += `> 💡 **Tip:** Try modifying the values in the code above and observe how the registers change.\n\n`
    return { content, hasCode: true }
  }
  
  content += `Understanding ${topic} is essential for mastering assembly language programming. `
  content += `In 8086 assembly, this concept forms the foundation for writing efficient programs.\n\n`
  
  // Add generic code example for MOV-related topics
  if (topicLower.includes('mov') || topicLower.includes('data transfer')) {
    content += '```asm\n; Example\nMOV AX, 1234h\nMOV BX, AX\n```\n\n'
    return { content, hasCode: true }
  }
  
  return { content, hasCode: false }
}

interface LectureReaderProps {
  lecture: CourseMapLecture
}

interface Section {
  id: string
  title: string
  content: string
  hasCode: boolean
}

export function LectureReader({ lecture }: LectureReaderProps) {
  const [activeSection, setActiveSection] = useState<string>('')
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set())
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map())
  const userIdRef = useRef<string>('')
  
  // Generate sections from topics using useMemo
  const sections = useMemo<Section[]>(() => {
    return lecture.topics.map((topic, index) => {
      const { content, hasCode } = generateSectionContent(topic, lecture.id)
      return {
        id: `section-${index + 1}`,
        title: topic,
        content,
        hasCode
      }
    })
  }, [lecture])
  
  // Compute effective active section (falls back to first section if not set)
  const effectiveActiveSection = activeSection || sections[0]?.id || ''
  
  // Load user progress
  useEffect(() => {
    async function loadProgress() {
      userIdRef.current = await getOrCreateUserId()
      try {
        const records = await db.mastery
          .where('[userId+topicType+topicId]')
          .between(
            [userIdRef.current, 'section', `${lecture.id}-`],
            [userIdRef.current, 'section', `${lecture.id}-\uffff`],
            true,
            true
          )
          .toArray()
        
        const completed = new Set<string>()
        records.forEach(r => {
          if (r.strengthLevel !== 'beginning') {
            completed.add(r.topicId)
          }
        })
        setCompletedSections(completed)
      } catch {
        // No progress yet
      }
    }
    loadProgress()
  }, [lecture.id])
  
  // Intersection Observer for scroll spy
  useEffect(() => {
    if (sections.length === 0) return
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        })
      },
      {
        rootMargin: '-20% 0px -70% 0px',
        threshold: 0
      }
    )
    
    sectionRefs.current.forEach((element) => {
      observer.observe(element)
    })
    
    return () => observer.disconnect()
  }, [sections])
  
  const scrollToSection = useCallback((sectionId: string) => {
    const element = sectionRefs.current.get(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveSection(sectionId)
      setSidebarOpen(false)
    }
  }, [])
  
  const markSectionComplete = async (sectionId: string) => {
    const newCompleted = new Set(completedSections)
    if (newCompleted.has(sectionId)) {
      newCompleted.delete(sectionId)
    } else {
      newCompleted.add(sectionId)
      // Save to IndexedDB
      try {
        await db.mastery.add({
          userId: userIdRef.current,
          topicType: 'section',
          topicId: `${lecture.id}-${sectionId}`,
          metrics: {
            attempts: 1,
            correct: 1,
            accuracy: 1,
            confidence: 1,
            averageTimeMs: 0,
            lastAttempt: new Date().toISOString(),
            firstAttempt: new Date().toISOString()
          },
          mistakePatterns: [],
          strengthLevel: 'developing',
          recommendationRefs: []
        })
      } catch {
        // Ignore errors
      }
    }
    setCompletedSections(newCompleted)
  }
  
  const copyCode = async (code: string, id: string) => {
    await navigator.clipboard.writeText(code)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
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
    <div className="flex gap-6 h-full">
      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed bottom-4 right-4 z-30 p-3 rounded-full bg-primary text-primary-foreground shadow-lg lg:hidden"
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <List className="h-5 w-5" />}
      </button>
      
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 z-20 h-screen lg:h-auto w-64 bg-card border-r lg:bg-transparent lg:border-0 p-4 lg:p-0 transform transition-transform lg:transform-none',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="lg:sticky lg:top-4 space-y-4">
          {/* Back link */}
          <Link
            to="/course-map"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <BookOpen className="h-4 w-4" />
            Back to Course Map
          </Link>
          
          {/* Lecture header */}
          <div className="hidden lg:block space-y-2 pb-4 border-b">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary font-bold text-sm">
                {lecture.id}
              </div>
              <h2 className="font-semibold text-sm line-clamp-2">{lecture.title}</h2>
            </div>
            <div className="flex flex-wrap gap-1">
              <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', getDifficultyStyles(lecture.difficulty))}>
                {lecture.difficulty}
              </span>
              <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                lecture.examRelevance === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                lecture.examRelevance === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              )}>
                {getExamRelevanceLabel(lecture.examRelevance)}
              </span>
            </div>
          </div>
          
          {/* Section navigation */}
          <nav className="space-y-1">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
              Sections
            </h3>
            {sections.map((section, index) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={cn(
                  'w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors flex items-center gap-2',
                  effectiveActiveSection === section.id
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <span className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0',
                  completedSections.has(section.id)
                    ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                    : effectiveActiveSection === section.id
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
                )}>
                  {completedSections.has(section.id) ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="truncate">{section.title}</span>
              </button>
            ))}
          </nav>
          
          {/* Simulate button */}
          <Link
            to="/simulator"
            className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors mt-4"
          >
            <Cpu className="h-4 w-4" />
            Try in Simulator
          </Link>
        </div>
      </aside>
      
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-10 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Main content */}
      <main className="flex-1 min-w-0 pb-12">
        {/* Mobile header */}
        <div className="lg:hidden space-y-4 mb-6 sticky top-0 bg-background z-10 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary font-bold">
              {lecture.id}
            </div>
            <div>
              <h1 className="font-bold">{lecture.title}</h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={cn('text-xs px-2 py-1 rounded-full font-medium', getDifficultyStyles(lecture.difficulty))}>
              {lecture.difficulty}
            </span>
            <span className={cn('text-xs px-2 py-1 rounded-full font-medium',
              lecture.examRelevance === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
              lecture.examRelevance === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
              'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
            )}>
              {getExamRelevanceLabel(lecture.examRelevance)}
            </span>
          </div>
        </div>
        
        {/* Sections */}
        <div className="space-y-8">
          {sections.map((section, index) => (
            <section
              key={section.id}
              id={section.id}
              ref={(el) => {
                if (el) sectionRefs.current.set(section.id, el)
              }}
              className="scroll-mt-20"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-start gap-3">
                  <span className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 mt-0.5',
                    completedSections.has(section.id)
                      ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                      : effectiveActiveSection === section.id
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground'
                  )}>
                    {completedSections.has(section.id) ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <h2 className="text-xl font-bold">{section.title}</h2>
                </div>
                <button
                  onClick={() => markSectionComplete(section.id)}
                  className={cn(
                    'shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors',
                    completedSections.has(section.id)
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  {completedSections.has(section.id) ? (
                    <span className="flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Completed
                    </span>
                  ) : (
                    'Mark as Read'
                  )}
                </button>
              </div>
              
              <div className="pl-11">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown
                    components={{
                      code({ className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '')
                        const code = String(children).replace(/\n$/, '')
                        const isInline = !match
                        
                        if (isInline) {
                          return (
                            <code
                              className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm"
                              {...props}
                            >
                              {children}
                            </code>
                          )
                        }
                        
                        // Assembly code block
                        if (match[1] === 'asm') {
                          const codeId = `${section.id}-code-${index}`
                          return (
                            <div className="relative group">
                              <pre className="bg-card border rounded-lg p-4 overflow-x-auto text-sm">
                                <code className="font-mono text-foreground">
                                  {code.split('\n').map((line, lineIndex) => {
                                    // Simple syntax highlighting
                                    const highlighted = highlightAssembly(line)
                                    return (
                                      <div key={lineIndex} dangerouslySetInnerHTML={{ __html: highlighted }} />
                                    )
                                  })}
                                </code>
                              </pre>
                              <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => copyCode(code, codeId)}
                                  className="p-1.5 rounded bg-muted hover:bg-accent text-muted-foreground transition-colors"
                                  title="Copy code"
                                >
                                  {copiedId === codeId ? (
                                    <CheckCheck className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </button>
                                <Link
                                  to="/simulator"
                                  className="p-1.5 rounded bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                                  title="Try in Simulator"
                                >
                                  <Cpu className="h-4 w-4" />
                                </Link>
                              </div>
                            </div>
                          )
                        }
                        
                        // Default code block
                        return (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        )
                      },
                      h3({ children }) {
                        return <h3 className="text-lg font-semibold mt-6 mb-2">{children}</h3>
                      },
                      p({ children }) {
                        return <p className="mb-4 leading-relaxed">{children}</p>
                      },
                      ul({ children }) {
                        return <ul className="list-disc pl-6 mb-4 space-y-1">{children}</ul>
                      },
                      ol({ children }) {
                        return <ol className="list-decimal pl-6 mb-4 space-y-1">{children}</ol>
                      },
                      li({ children }) {
                        return <li className="leading-relaxed">{children}</li>
                      },
                      blockquote({ children }) {
                        return (
                          <blockquote className="border-l-4 border-primary/30 pl-4 italic text-muted-foreground my-4">
                            {children}
                          </blockquote>
                        )
                      },
                      strong({ children }) {
                        return <strong className="font-semibold">{children}</strong>
                      }
                    }}
                  >
                    {section.content}
                  </ReactMarkdown>
                </div>
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  )
}

// Simple assembly syntax highlighting
function highlightAssembly(line: string): string {
  // Escape HTML
  const result = line
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  
  // Comments (semicolon to end of line)
  const commentIndex = result.indexOf(';')
  let comment = ''
  let codePart = result
  if (commentIndex !== -1) {
    comment = result.slice(commentIndex)
    codePart = result.slice(0, commentIndex)
  }
  
  // Highlight registers (AX, BX, CX, DX, SI, DI, BP, SP, CS, DS, ES, SS, etc.)
  const registers = ['AX', 'BX', 'CX', 'DX', 'SI', 'DI', 'BP', 'SP', 'CS', 'DS', 'ES', 'SS', 'IP', 'FLAGS', 'AH', 'AL', 'BH', 'BL', 'CH', 'CL', 'DH', 'DL']
  registers.forEach(reg => {
    const regex = new RegExp(`\\b(${reg})\\b`, 'gi')
    codePart = codePart.replace(regex, '<span class="text-blue-600 dark:text-blue-400 font-semibold">$1</span>')
  })
  
  // Highlight instructions (MOV, ADD, SUB, CMP, JMP, JE, JNE, etc.)
  const instructions = ['MOV', 'ADD', 'SUB', 'CMP', 'JMP', 'JE', 'JNE', 'JL', 'JLE', 'JG', 'JGE', 'JA', 'JB', 'LOOP', 'LOOPE', 'LOOPNE', 'CALL', 'RET', 'PUSH', 'POP', 'INC', 'DEC', 'NEG', 'MUL', 'DIV', 'LEA', 'XCHG', 'INT', 'IRET', 'NOP', 'HLT', 'CMC', 'CLC', 'STC', 'CLD', 'STD']
  instructions.forEach(instr => {
    const regex = new RegExp(`\\b(${instr})\\b`, 'gi')
    codePart = codePart.replace(regex, '<span class="text-purple-600 dark:text-purple-400 font-semibold">$1</span>')
  })
  
  // Highlight numbers (hex with h suffix, decimal)
  codePart = codePart.replace(/(\d+[hH]|\d+)/g, '<span class="text-amber-600 dark:text-amber-400">$1</span>')
  
  // Highlight segments and labels
  codePart = codePart.replace(/(\$[a-zA-Z_][a-zA-Z0-9_]*|[a-zA-Z_][a-zA-Z0-9_]*:)/g, '<span class="text-green-600 dark:text-green-400">$1</span>')
  
  // Highlight brackets for memory references
  codePart = codePart.replace(/\[([^\]]+)\]/g, '<span class="text-cyan-600 dark:text-cyan-400">[$1]</span>')
  
  return codePart + (comment ? `<span class="text-muted-foreground italic">${comment}</span>` : '')
}
