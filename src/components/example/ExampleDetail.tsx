import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { 
  ArrowLeft, 
  Copy, 
  CheckCheck, 
  Cpu, 
  BookOpen,
  AlertTriangle,
  Lightbulb,
  ChevronRight,
  ExternalLink,
  FlaskConical
} from 'lucide-react'
import { cn } from '@/lib/utils'
import examplesData from '@/data/processed/examples.json'

type Example = {
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
  provenance: {
    sourceFile: string
    sourceType: string
    extractedBy: string
    extractionConfidence: number
    reviewedStatus: string
  }
}

interface ExampleDetailProps {
  exampleId: string
}

export function ExampleDetail({ exampleId }: ExampleDetailProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [selectedLine, setSelectedLine] = useState<number | null>(null)

  const examples = examplesData.examples as Example[]
  const example = examples.find(e => e.id === exampleId)

  if (!example) {
    return (
      <div className="text-center py-12 space-y-4">
        <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground" />
        <h2 className="text-xl font-semibold">Example Not Found</h2>
        <p className="text-muted-foreground">The example you're looking for doesn't exist.</p>
        <Link 
          to="/examples" 
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Examples
        </Link>
      </div>
    )
  }

  const copyCode = async () => {
    await navigator.clipboard.writeText(example.code)
    setCopiedId('code')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const getDifficultyStyles = (difficulty: Example['difficulty']) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
      case 'intermediate':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
      case 'advanced':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
    }
  }

  // Syntax highlighting for assembly code
  const highlightCode = (line: string, lineNum: number) => {
    const hasAnnotation = example.annotations.some(a => a.line === lineNum)
    const annotation = example.annotations.find(a => a.line === lineNum)
    
    const result = line
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    // Comments
    const commentIndex = result.indexOf(';')
    let comment = ''
    let codePart = result
    if (commentIndex !== -1) {
      comment = result.slice(commentIndex)
      codePart = result.slice(0, commentIndex)
    }

    // Registers
    const registers = ['AX', 'BX', 'CX', 'DX', 'SI', 'DI', 'BP', 'SP', 'CS', 'DS', 'ES', 'SS', 'IP', 'FLAGS', 'AH', 'AL', 'BH', 'BL', 'CH', 'CL', 'DH', 'DL']
    registers.forEach(reg => {
      const regex = new RegExp(`\\b(${reg})\\b`, 'gi')
      codePart = codePart.replace(regex, '<span class="text-blue-600 dark:text-blue-400 font-semibold">$1</span>')
    })

    // Instructions
    const instructions = ['MOV', 'ADD', 'SUB', 'CMP', 'JMP', 'JE', 'JNE', 'JL', 'JLE', 'JG', 'JGE', 'JA', 'JB', 'LOOP', 'LOOPE', 'LOOPNE', 'CALL', 'RET', 'PUSH', 'POP', 'INC', 'DEC', 'NEG', 'MUL', 'DIV', 'LEA', 'XCHG', 'INT', 'IRET', 'NOP', 'HLT', 'CMC', 'CLC', 'STC', 'CLD', 'STD', 'ADC', 'SBB', 'IMUL', 'IDIV', 'CBW', 'CWD']
    instructions.forEach(instr => {
      const regex = new RegExp(`\\b(${instr})\\b`, 'gi')
      codePart = codePart.replace(regex, '<span class="text-purple-600 dark:text-purple-400 font-semibold">$1</span>')
    })

    // Numbers
    codePart = codePart.replace(/(\d+[hH]|\d+)/g, '<span class="text-amber-600 dark:text-amber-400">$1</span>')

    // Labels and segments
    codePart = codePart.replace(/(\$[a-zA-Z_][a-zA-Z0-9_]*|[a-zA-Z_][a-zA-Z0-9_]*:)/g, '<span class="text-green-600 dark:text-green-400">$1</span>')

    // Memory references
    codePart = codePart.replace(/\[([^\]]+)\]/g, '<span class="text-cyan-600 dark:text-cyan-400">[$1]</span>')

    // Directives
    codePart = codePart.replace(/(\.\w+)/g, '<span class="text-orange-600 dark:text-orange-400">$1</span>')

    const highlightedLine = codePart + (comment ? `<span class="text-muted-foreground italic">${comment}</span>` : '')

    return {
      html: highlightedLine,
      hasAnnotation,
      annotation
    }
  }

  // Compute related examples based on shared instructions, concepts, and lectures
  const relatedExamples = examples
    .filter(ex => ex.id !== example.id) // Exclude current example
    .map(ex => {
      // Calculate relevance score based on overlap
      const instructionOverlap = ex.instructions.filter(i => example.instructions.includes(i)).length
      const conceptOverlap = ex.concepts.filter(c => example.concepts.includes(c)).length
      const lectureOverlap = ex.lectureIds.filter(l => example.lectureIds.includes(l)).length
      
      // Weighted scoring: instructions are most important, then concepts, then lectures
      const score = (instructionOverlap * 3) + (conceptOverlap * 2) + lectureOverlap
      
      return { ...ex, score }
    })
    .filter(ex => ex.score > 0) // Only include if there's some relevance
    .sort((a, b) => b.score - a.score) // Sort by relevance score descending
    .slice(0, 6) // Limit to 6 related examples

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        to="/examples"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Examples
      </Link>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">{example.filename}</h1>
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full font-medium',
              getDifficultyStyles(example.difficulty)
            )}>
              {example.difficulty}
            </span>
          </div>
          
          {/* Lectures */}
          <div className="flex flex-wrap gap-2 mb-3">
            {example.lectureIds.map(lecId => (
              <Link
                key={lecId}
                to="/lecture/$lectureId"
                params={{ lectureId: String(lecId) }}
                className="inline-flex items-center gap-1 text-sm px-2.5 py-1 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
              >
                <BookOpen className="h-3.5 w-3.5" />
                Lecture {lecId}
                <ChevronRight className="h-3 w-3" />
              </Link>
            ))}
          </div>

          {/* Instructions */}
          <div className="flex flex-wrap gap-1.5">
            {example.instructions.map(instr => (
              <span
                key={instr}
                className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-mono"
              >
                {instr}
              </span>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={copyCode}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-card hover:bg-muted transition-colors text-sm"
          >
            {copiedId === 'code' ? (
              <>
                <CheckCheck className="h-4 w-4 text-green-500" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy Code
              </>
            )}
          </button>
          <button
            onClick={() => {
              const encoded = btoa(example.code)
              window.location.hash = `#/simulator?code=${encodeURIComponent(encoded)}`
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            <Cpu className="h-4 w-4" />
            Run in Simulator
          </button>
        </div>
      </div>

      {/* Code viewer */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-muted/50 px-4 py-2 border-b flex items-center justify-between">
          <span className="text-sm font-medium">{example.filename}</span>
          <span className="text-xs text-muted-foreground">{example.code.split('\n').length} lines</span>
        </div>
        <div className="overflow-x-auto">
          <pre className="p-0">
            <code className="font-mono text-sm">
              {example.code.split('\n').map((line, index) => {
                const lineNum = index + 1
                const { html, hasAnnotation, annotation } = highlightCode(line, lineNum)
                const isSelected = selectedLine === lineNum
                
                return (
                  <div key={index} className="group">
                    <div 
                      className={cn(
                        'flex',
                        isSelected && 'bg-primary/5',
                        hasAnnotation && 'cursor-pointer hover:bg-primary/5'
                      )}
                      onClick={() => hasAnnotation && setSelectedLine(isSelected ? null : lineNum)}
                    >
                      <span className="select-none text-muted-foreground/50 text-right w-12 px-2 py-1 text-xs border-r border-muted bg-muted/30 shrink-0">
                        {lineNum}
                      </span>
                      <span 
                        className="px-4 py-1 whitespace-pre"
                        dangerouslySetInnerHTML={{ __html: html || '&nbsp;' }}
                      />
                      {hasAnnotation && (
                        <span className="px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                        </span>
                      )}
                    </div>
                    
                    {/* Annotation popover */}
                    {isSelected && annotation && (
                      <div className="bg-primary/5 border-l-2 border-primary pl-4 pr-8 py-2 text-sm">
                        <div className="flex items-start gap-2">
                          <span className={cn(
                            'shrink-0 text-xs px-1.5 py-0.5 rounded font-medium',
                            annotation.type === 'instruction' && 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
                            annotation.type === 'register' && 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
                            annotation.type === 'memory' && 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400',
                            annotation.type === 'flag' && 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
                            annotation.type === 'comment' && 'bg-muted text-muted-foreground'
                          )}>
                            {annotation.type}
                          </span>
                          <span>{annotation.text}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </code>
          </pre>
        </div>
      </div>

      {/* Common Mistakes */}
      {example.commonMistakes.length > 0 && (
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Common Mistakes
          </h3>
          <ul className="space-y-2">
            {example.commonMistakes.map((mistake, index) => (
              <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-red-500 mt-0.5">•</span>
                {mistake}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Related Examples */}
      {relatedExamples.length > 0 && (
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <FlaskConical className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Related Examples
          </h3>
          <div className="flex flex-wrap gap-2">
            {relatedExamples.map(relEx => (
              <Link
                key={relEx.id}
                to="/examples/$exampleId"
                params={{ exampleId: relEx.id }}
                className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
              >
                <FlaskConical className="h-3.5 w-3.5" />
                {relEx.filename}
                <span className="text-xs opacity-60">
                  ({relEx.instructions.slice(0, 2).join(', ')}{relEx.instructions.length > 2 ? ` +${relEx.instructions.length - 2}` : ''})
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Related Questions */}
      {example.relatedQuestions.length > 0 && (
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <ExternalLink className="h-4 w-4 text-primary" />
            Related Practice Questions
          </h3>
          <div className="flex flex-wrap gap-2">
            {example.relatedQuestions.map(qId => (
              <Link
                key={qId}
                to="/drills"
                className="text-sm px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                {qId}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Provenance */}
      <div className="text-xs text-muted-foreground border-t pt-4">
        <p>Source: {example.provenance.sourceFile} | Extracted by {example.provenance.extractedBy}</p>
        <p>Confidence: {(example.provenance.extractionConfidence * 100).toFixed(0)}% | Status: {example.provenance.reviewedStatus}</p>
      </div>
    </div>
  )
}
