/**
 * Code Editor Component
 * Displays assembly code with line numbers and current instruction highlighting.
 */

import { useMemo, useState } from 'react';
import type { ParsedInstruction } from '@/lib/simulator/cpu';

interface CodeEditorProps {
  code: string;
  currentLine: number;
  parsedInstructions: ParsedInstruction[];
  onLineClick?: (lineNumber: number) => void;
}

interface LineData {
  lineNumber: number;
  content: string;
  isCurrentInstruction: boolean;
  isExecutable: boolean;
}

export function CodeEditor({ 
  code, 
  currentLine, 
  parsedInstructions,
  onLineClick,
}: CodeEditorProps) {
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);
  
  const lines = useMemo((): LineData[] => {
    const codeLines = code.split('\n');
    const execLines = new Set(parsedInstructions.map(i => i.lineNumber));
    
    return codeLines.map((content, idx) => ({
      lineNumber: idx + 1,
      content,
      isCurrentInstruction: currentLine === idx + 1,
      isExecutable: execLines.has(idx + 1),
    }));
  }, [code, currentLine, parsedInstructions]);
  
  // Syntax highlighting for assembly
  const highlightLine = (line: string): React.ReactNode => {
    // Remove comments for processing
    const commentIdx = line.indexOf(';');
    const codePart = commentIdx >= 0 ? line.slice(0, commentIdx) : line;
    const commentPart = commentIdx >= 0 ? line.slice(commentIdx) : '';
    
    // Tokenize and highlight
    const tokens = codePart.trim().split(/\s+/);
    if (tokens.length === 0 || !tokens[0]) {
      return <>{commentPart && <span className="text-gray-500">{commentPart}</span>}</>;
    }
    
    const mnemonic = tokens[0].toUpperCase();
    const operands = tokens.slice(1).join(' ');
    
    // Instruction keywords
    const instructions = [
      'MOV', 'XCHG', 'LEA', 'PUSH', 'POP', 'LAHF', 'SAHF', 'CBW', 'CWD',
      'ADD', 'ADC', 'SUB', 'SBB', 'INC', 'DEC', 'MUL', 'IMUL', 'DIV', 'IDIV', 'CMP', 'NEG',
      'AND', 'OR', 'XOR', 'NOT', 'TEST',
      'SHL', 'SHR', 'SAL', 'SAR', 'ROL', 'ROR',
      'JMP', 'JE', 'JZ', 'JNE', 'JNZ', 'JL', 'JNGE', 'JLE', 'JNG', 'JG', 'JNLE', 'JGE', 'JNL',
      'JC', 'JNC', 'JO', 'JNO', 'JS', 'JNS',
      'LOOP', 'LOOPE', 'LOOPZ', 'LOOPNE', 'LOOPNZ', 'JCXZ',
      'CALL', 'RET', 'INT', 'HLT', 'NOP',
      'STC', 'CLC', 'STD', 'CLD', 'STI', 'CLI',
    ];
    
    const registers = [
      'AX', 'BX', 'CX', 'DX', 'SI', 'DI', 'BP', 'SP',
      'CS', 'DS', 'ES', 'SS', 'IP',
      'AH', 'AL', 'BH', 'BL', 'CH', 'CL', 'DH', 'DL',
    ];
    
    let highlighted = '';
    
    // Highlight mnemonic
    if (instructions.includes(mnemonic)) {
      highlighted += `<span class="text-purple-600 dark:text-purple-400 font-bold">${tokens[0]}</span>`;
    } else {
      highlighted += `<span class="text-blue-600 dark:text-blue-400">${tokens[0]}</span>`;
    }
    
    // Highlight operands
    if (operands) {
      const parts = operands.split(/([[\],+\-*()])/);
      highlighted += ' ';
      for (const part of parts) {
        if (!part) continue;
        if (part === '[' || part === ']' || part === ',' || part === '+' || part === '-' || part === '*' || part === '(' || part === ')') {
          highlighted += `<span class="text-gray-500">${part}</span>`;
        } else if (registers.includes(part.toUpperCase())) {
          highlighted += `<span class="text-green-600 dark:text-green-400">${part}</span>`;
        } else if (/^0X[0-9A-F]+$/i.test(part) || /^[0-9A-F]+H$/i.test(part) || /^[0-9]+$/.test(part)) {
          highlighted += `<span class="text-orange-600 dark:text-orange-400">${part}</span>`;
        } else {
          highlighted += part;
        }
      }
    }
    
    return (
      <>
        <span dangerouslySetInnerHTML={{ __html: highlighted }} />
        {commentPart && <span className="text-gray-500 italic">{commentPart}</span>}
      </>
    );
  };
  
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-muted/50 px-4 py-2 border-b flex items-center justify-between">
        <span className="text-sm font-medium">Assembly Code</span>
        <span className="text-xs text-muted-foreground">
          {parsedInstructions.length} instruction{parsedInstructions.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="bg-editor dark:bg-editor-dark overflow-auto max-h-[400px]">
        <table className="w-full text-sm font-mono">
          <tbody>
            {lines.map((line) => (
              <tr
                key={line.lineNumber}
                className={`
                  cursor-pointer transition-colors
                  ${line.isCurrentInstruction 
                    ? 'bg-yellow-200 dark:bg-yellow-900/50' 
                    : hoveredLine === line.lineNumber 
                      ? 'bg-muted/50' 
                      : ''
                  }
                  ${line.isExecutable ? '' : 'opacity-50'}
                `}
                onClick={() => line.isExecutable && onLineClick?.(line.lineNumber)}
                onMouseEnter={() => setHoveredLine(line.lineNumber)}
                onMouseLeave={() => setHoveredLine(null)}
              >
                {/* Line Number */}
                <td className="select-none text-right pr-4 pl-2 py-1 text-muted-foreground border-r border-muted/20 w-12">
                  <span className="inline-block w-8 text-right">{line.lineNumber}</span>
                </td>
                {/* Code Content */}
                <td className="pl-4 pr-4 py-1 whitespace-pre">
                  {line.isExecutable ? highlightLine(line.content) : line.content}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {currentLine > 0 && (
        <div className="bg-muted/30 px-4 py-2 border-t text-xs text-muted-foreground">
          Current instruction at line {currentLine}
        </div>
      )}
    </div>
  );
}
