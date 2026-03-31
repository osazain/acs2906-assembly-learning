/**
 * SimulatorCore Component
 * Main 8086 simulator with instruction execution, register/flag display, and step/run controls.
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { CPUState, ParsedInstruction } from '@/lib/simulator/cpu';
import { createInitialCPUState } from '@/lib/simulator/cpu';
import { parseAssembly } from '@/lib/simulator/parser';
import { executeInstruction, type ExecuteResult } from '@/lib/simulator/executor';
import type { ExecutionSpeed } from './SimulatorControls';
import { SimulatorControls } from './SimulatorControls';
import { RegisterDisplay } from './RegisterDisplay';
import { FlagDisplay } from './FlagDisplay';
import { CodeEditor } from './CodeEditor';
import { MemoryView } from './MemoryView';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

interface SimulatorCoreProps {
  initialCode?: string;
  onExecutionEnd?: () => void;
}

interface ExecutionState {
  result: ExecuteResult | null;
  registersModified: Record<string, { oldValue: number; newValue: number }>;
  flagsModified: Record<string, boolean>;
}

export function SimulatorCore({ initialCode = '', onExecutionEnd }: SimulatorCoreProps) {
  // CPU State
  const [cpuState, setCpuState] = useState<CPUState>(() => {
    const initial = createInitialCPUState();
    // Initialize IP to 0
    initial.IP = 0;
    return initial;
  });
  
  // Code and parsed instructions
  const [code, setCode] = useState(initialCode);
  const [isRunning, setIsRunning] = useState(false);
  const [isHalted, setIsHalted] = useState(false);
  const [executionSpeed, setExecutionSpeed] = useState<ExecutionSpeed>('normal');
  const [executionResult, setExecutionResult] = useState<ExecutionState>({
    result: null,
    registersModified: {},
    flagsModified: {},
  });
  
  // Breakpoint state - Set of line numbers with breakpoints
  const [breakpoints, setBreakpoints] = useState<Set<number>>(new Set());
  
  // Track if we paused due to breakpoint
  const [hitBreakpoint, setHitBreakpoint] = useState<number | null>(null);
  
  // Execution interval ref for continuous running
  const executionIntervalRef = useRef<number | null>(null);
  
  // Ref to track current cpuState to avoid stale closures in run loop
  const cpuStateRef = useRef(cpuState);
  useEffect(() => {
    cpuStateRef.current = cpuState;
  }, [cpuState]);
  
  // Ref to track isRunning to avoid stale closure in run loop
  const isRunningRef = useRef(isRunning);
  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);
  
  // Toggle breakpoint on a line
  const toggleBreakpoint = useCallback((lineNumber: number) => {
    setBreakpoints(prev => {
      const next = new Set(prev);
      if (next.has(lineNumber)) {
        next.delete(lineNumber);
      } else {
        next.add(lineNumber);
      }
      return next;
    });
  }, []);
  
  // Clear all breakpoints
  const clearAllBreakpoints = useCallback(() => {
    setBreakpoints(new Set());
    setHitBreakpoint(null);
  }, []);
  
  // Parse code using useMemo to avoid cascading renders
  const { instructions: parsedInstructions, labels, errors: parseErrors } = useMemo(() => {
    if (!code.trim()) {
      return { instructions: [], labels: new Map(), errors: [] };
    }
    const result = parseAssembly(code);
    return {
      instructions: result.instructions,
      labels: result.labels,
      errors: result.errors,
    };
  }, [code]);
  
  // Get current instruction based on CPU IP
  const getCurrentInstruction = useCallback((): ParsedInstruction | null => {
    if (cpuState.IP >= 0 && cpuState.IP < parsedInstructions.length) {
      return parsedInstructions[cpuState.IP];
    }
    return null;
  }, [cpuState.IP, parsedInstructions]);
  
  // Execute one instruction - returns the updated CPU state
  const step = useCallback((): CPUState => {
    if (isHalted) return cpuState;
    
    const instruction = getCurrentInstruction();
    if (!instruction) {
      setIsHalted(true);
      setIsRunning(false);
      onExecutionEnd?.();
      return cpuState;
    }
    
    // Capture old values before execution
    const oldRegisters: Record<string, number> = {
      AX: cpuState.AX,
      BX: cpuState.BX,
      CX: cpuState.CX,
      DX: cpuState.DX,
      SI: cpuState.SI,
      DI: cpuState.DI,
      BP: cpuState.BP,
      SP: cpuState.SP,
      CS: cpuState.CS,
      DS: cpuState.DS,
      ES: cpuState.ES,
      SS: cpuState.SS,
      IP: cpuState.IP,
    };
    
    const oldFlags = { ...cpuState.flags };
    
    // Execute instruction
    const result = executeInstruction(instruction, cpuState, labels);
    
    // Update the ref synchronously so run() can read the updated state
    cpuStateRef.current = cpuState;
    
    // Calculate what changed
    const registersModified: Record<string, { oldValue: number; newValue: number }> = {};
    for (const [name, oldVal] of Object.entries(oldRegisters)) {
      const newVal = cpuState[name.toLowerCase() as keyof CPUState] as number;
      if (oldVal !== newVal) {
        registersModified[name] = { oldValue: oldVal, newValue: newVal };
      }
    }
    
    const flagsModified: Record<string, boolean> = {};
    for (const [name, oldVal] of Object.entries(oldFlags)) {
      const newVal = cpuState.flags[name as keyof typeof cpuState.flags];
      if (oldVal !== newVal) {
        flagsModified[name] = newVal;
      }
    }
    
    setExecutionResult({ result, registersModified, flagsModified });
    
    if (!result.success) {
      setIsRunning(false);
      return cpuState;
    }
    
    if (result.halted) {
      setIsHalted(true);
      setIsRunning(false);
      onExecutionEnd?.();
    }
    
    return cpuState;
  }, [cpuState, getCurrentInstruction, labels, parsedInstructions, isHalted, onExecutionEnd]);
  
  // Start continuous execution
  const run = useCallback(() => {
    if (isHalted || isRunningRef.current) return;
    
    setIsRunning(true);
    setHitBreakpoint(null);
    
    // Calculate delay based on speed
    const delays: Record<ExecutionSpeed, number> = {
      step: 0,
      slow: 500,
      normal: 100,
      fast: 20,
    };
    
    const runStep = () => {
      // Check if still running (use ref to avoid stale closure)
      if (!isRunningRef.current) return;
      
      // Execute one step and get the updated CPU state
      const currentCpu = step();
      
      // Check if halted or breakpoint hit
      const currentInstruction = currentCpu.IP >= 0 && currentCpu.IP < parsedInstructions.length 
        ? parsedInstructions[currentCpu.IP] 
        : null;
      const currentLine = currentInstruction?.lineNumber ?? 0;
      
      // Check for breakpoint hit (only if not already halting)
      if (!currentCpu.halted && breakpoints.has(currentLine)) {
        setHitBreakpoint(currentLine);
        setIsRunning(false);
        return;
      }
      
      // Continue if not halted
      if (!currentCpu.halted) {
        executionIntervalRef.current = window.setTimeout(runStep, delays[executionSpeed]);
      }
    };
    
    runStep();
  }, [isHalted, executionSpeed, step, parsedInstructions, breakpoints]);
  
  // Halt execution
  const halt = useCallback(() => {
    if (executionIntervalRef.current) {
      clearTimeout(executionIntervalRef.current);
      executionIntervalRef.current = null;
    }
    setIsRunning(false);
    setIsHalted(true);
  }, []);
  
  // Reset CPU
  const reset = useCallback(() => {
    halt();
    const initial = createInitialCPUState();
    initial.IP = 0;
    setCpuState(initial);
    setIsHalted(false);
    setExecutionResult({
      result: null,
      registersModified: {},
      flagsModified: {},
    });
  }, [halt]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (executionIntervalRef.current) {
        clearTimeout(executionIntervalRef.current);
      }
    };
  }, []);
  
  // Handle speed change
  const handleSpeedChange = useCallback((newSpeed: ExecutionSpeed) => {
    setExecutionSpeed(newSpeed);
  }, []);
  
  const currentInstruction = getCurrentInstruction();
  
  return (
    <div className="space-y-6">
      {/* Parse Errors */}
      {parseErrors.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-800 dark:text-red-200">Parse Errors</h4>
              <ul className="mt-1 text-sm text-red-700 dark:text-red-300 space-y-1">
                {parseErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
      
      {/* Execution Result Feedback */}
      {executionResult.result && !executionResult.result.success && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-800 dark:text-red-200">Execution Error</h4>
              <p className="text-sm text-red-700 dark:text-red-300">
                {executionResult.result.error}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Success feedback */}
      {executionResult.result && executionResult.result.success && !isRunning && !isHalted && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-300 text-sm">
            <CheckCircle2 className="h-4 w-4" />
            Instruction executed successfully
          </div>
        </div>
      )}
      
      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Code Editor */}
        <div className="lg:col-span-2 space-y-4">
          <CodeEditor
            code={code}
            currentLine={currentInstruction?.lineNumber ?? 0}
            parsedInstructions={parsedInstructions}
            breakpoints={breakpoints}
            onToggleBreakpoint={toggleBreakpoint}
          />
          
          {/* Current Instruction Display */}
          {currentInstruction && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm">
                <Info className="h-4 w-4 text-primary" />
                <span className="font-medium">Executing:</span>
                <code className="bg-primary/10 px-2 py-0.5 rounded text-primary font-mono">
                  {currentInstruction.mnemonic}
                  {currentInstruction.operands.length > 0 && ` ${currentInstruction.operands.join(', ')}`}
                </code>
              </div>
            </div>
          )}
        </div>
        
        {/* Right Column: Registers, Flags, Controls */}
        <div className="space-y-4">
          {/* Controls */}
          <SimulatorControls
            isRunning={isRunning}
            isHalted={isHalted}
            canStep={parsedInstructions.length > 0 && !isRunning && !isHalted}
            speed={executionSpeed}
            hitBreakpoint={hitBreakpoint}
            breakpointCount={breakpoints.size}
            onStep={step}
            onRun={run}
            onHalt={halt}
            onReset={reset}
            onSpeedChange={handleSpeedChange}
            onClearBreakpoints={clearAllBreakpoints}
          />
          
          {/* Registers */}
          <RegisterDisplay 
            state={cpuState} 
            modifiedRegisters={executionResult.registersModified}
          />
          
          {/* Flags */}
          <FlagDisplay 
            flags={cpuState.flags}
            modifiedFlags={executionResult.flagsModified}
          />
        </div>
      </div>
      
      {/* Memory View */}
      <MemoryView state={cpuState} />
      
      {/* Hidden textarea for code editing when not running */}
      {!isRunning && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted/50 px-4 py-2 border-b">
            <h3 className="text-sm font-medium">Edit Code</h3>
          </div>
          <div className="p-4">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-48 font-mono text-sm bg-muted/30 p-4 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Enter 8086 assembly code here..."
            />
            <div className="mt-2 text-xs text-muted-foreground">
              Supports: MOV, ADD, SUB, INC, DEC, CMP, JMP, JE, JNE, LOOP, PUSH, POP, CALL, RET, and more.
              Labels end with colon (:) and can be used as jump targets.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
