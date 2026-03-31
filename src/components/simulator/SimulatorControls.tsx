/**
 * Simulator Controls Component
 * Step, Run, and Halt buttons for execution control.
 */

import { Play, SkipForward, Square, RotateCcw, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ExecutionSpeed = 'step' | 'slow' | 'normal' | 'fast';

interface SimulatorControlsProps {
  isRunning: boolean;
  isHalted: boolean;
  canStep: boolean;
  speed: ExecutionSpeed;
  onStep: () => void;
  onRun: () => void;
  onHalt: () => void;
  onReset: () => void;
  onSpeedChange: (speed: ExecutionSpeed) => void;
}

export function SimulatorControls({
  isRunning,
  isHalted,
  canStep,
  speed,
  onStep,
  onRun,
  onHalt,
  onReset,
  onSpeedChange,
}: SimulatorControlsProps) {
  const stepButtonClass = cn(
    'flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors',
    canStep && !isRunning && !isHalted
      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 border border-blue-300 dark:border-blue-700'
      : 'bg-muted text-muted-foreground border border-border',
    'disabled:opacity-50 disabled:cursor-not-allowed'
  );

  const runButtonClass = cn(
    'flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors',
    !isHalted
      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 border border-green-300 dark:border-green-700'
      : 'bg-muted text-muted-foreground border border-border',
    'disabled:opacity-50 disabled:cursor-not-allowed'
  );

  const pauseButtonClass = cn(
    'flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors',
    'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/50 border border-orange-300 dark:border-orange-700'
  );

  const haltButtonClass = cn(
    'flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors',
    !isHalted
      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 border border-red-300 dark:border-red-700'
      : 'bg-muted text-muted-foreground border border-border',
    'disabled:opacity-50 disabled:cursor-not-allowed'
  );

  const resetButtonClass = cn(
    'flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors',
    'bg-muted hover:bg-muted/80 text-foreground border border-border'
  );

  const speedButtonClass = (isActive: boolean) => cn(
    'px-3 py-1 rounded text-xs font-medium transition-colors',
    isActive
      ? 'bg-primary text-primary-foreground'
      : 'bg-muted hover:bg-muted/80 text-muted-foreground',
    isRunning && 'disabled:opacity-50 disabled:cursor-not-allowed'
  );

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-muted/50 px-4 py-2 border-b">
        <h3 className="text-sm font-medium">Execution Controls</h3>
      </div>
      <div className="p-4 space-y-4">
        {/* Main Control Buttons */}
        <div className="flex flex-wrap gap-2">
          {/* Step Button */}
          <button
            onClick={onStep}
            disabled={!canStep || isRunning || isHalted}
            className={stepButtonClass}
            title="Execute one instruction"
          >
            <SkipForward className="h-4 w-4" />
            Step
          </button>
          
          {/* Run/Pause Button */}
          {!isRunning ? (
            <button
              onClick={onRun}
              disabled={isHalted}
              className={runButtonClass}
              title="Run continuously"
            >
              <Play className="h-4 w-4" />
              Run
            </button>
          ) : (
            <button
              onClick={onHalt}
              className={pauseButtonClass}
              title="Pause execution"
            >
              <Pause className="h-4 w-4" />
              Pause
            </button>
          )}
          
          {/* Halt Button */}
          <button
            onClick={onHalt}
            disabled={!isRunning && isHalted}
            className={haltButtonClass}
            title="Halt execution"
          >
            <Square className="h-4 w-4" />
            Halt
          </button>
          
          {/* Reset Button */}
          <button
            onClick={onReset}
            className={resetButtonClass}
            title="Reset CPU state"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        </div>
        
        {/* Speed Control */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Speed:</span>
          <div className="flex gap-1">
            {(['step', 'slow', 'normal', 'fast'] as ExecutionSpeed[]).map((s) => (
              <button
                key={s}
                onClick={() => onSpeedChange(s)}
                disabled={isRunning}
                className={speedButtonClass(speed === s)}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
        
        {/* Execution Status */}
        <div className="text-sm">
          {isHalted ? (
            <span className="text-red-600 dark:text-red-400 font-medium">CPU Halted</span>
          ) : isRunning ? (
            <span className="text-green-600 dark:text-green-400 font-medium">Running...</span>
          ) : (
            <span className="text-muted-foreground">Ready</span>
          )}
        </div>
      </div>
    </div>
  );
}
