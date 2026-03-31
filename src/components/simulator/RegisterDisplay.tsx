/**
 * Register Display Component
 * Shows all 8086 registers with their current values.
 */

import { useMemo } from 'react';
import type { CPUState } from '@/lib/simulator/cpu';
import { formatHex } from '@/lib/simulator/cpu';

interface RegisterDisplayProps {
  state: CPUState;
  modifiedRegisters?: Record<string, { oldValue: number; newValue: number }>;
}

interface RegisterInfo {
  name: string;
  value: number;
  isHighlighted: boolean;
  highlightColor?: 'green' | 'yellow' | 'red';
}

export function RegisterDisplay({ state, modifiedRegisters = {} }: RegisterDisplayProps) {
  const registers = useMemo((): RegisterInfo[] => {
    const mods = modifiedRegisters;
    const isModified = (name: string) => mods[name] !== undefined;
    
    return [
      // General Purpose Registers
      { name: 'AX', value: state.AX, isHighlighted: isModified('AX') },
      { name: 'BX', value: state.BX, isHighlighted: isModified('BX') },
      { name: 'CX', value: state.CX, isHighlighted: isModified('CX') },
      { name: 'DX', value: state.DX, isHighlighted: isModified('DX') },
      // Index Registers
      { name: 'SI', value: state.SI, isHighlighted: isModified('SI') },
      { name: 'DI', value: state.DI, isHighlighted: isModified('DI') },
      { name: 'BP', value: state.BP, isHighlighted: isModified('BP') },
      { name: 'SP', value: state.SP, isHighlighted: isModified('SP') },
      // Segment Registers
      { name: 'CS', value: state.CS, isHighlighted: isModified('CS') },
      { name: 'DS', value: state.DS, isHighlighted: isModified('DS') },
      { name: 'ES', value: state.ES, isHighlighted: isModified('ES') },
      { name: 'SS', value: state.SS, isHighlighted: isModified('SS') },
      // Instruction Pointer
      { name: 'IP', value: state.IP, isHighlighted: isModified('IP') },
    ];
  }, [state, modifiedRegisters]);
  
  // Also show 8-bit registers as derived values
  const eightBitRegisters = useMemo(() => [
    { name: 'AL', value: state.AX & 0xFF },
    { name: 'AH', value: (state.AX >> 8) & 0xFF },
    { name: 'BL', value: state.BX & 0xFF },
    { name: 'BH', value: (state.BX >> 8) & 0xFF },
    { name: 'CL', value: state.CX & 0xFF },
    { name: 'CH', value: (state.CX >> 8) & 0xFF },
    { name: 'DL', value: state.DX & 0xFF },
    { name: 'DH', value: (state.DX >> 8) & 0xFF },
  ], [state]);
  
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-muted/50 px-4 py-2 border-b">
        <h3 className="text-sm font-medium">Registers</h3>
      </div>
      <div className="p-4">
        {/* 16-bit Registers Grid */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {registers.map((reg) => (
            <div
              key={reg.name}
              className={`
                flex flex-col items-center p-2 rounded border transition-colors
                ${reg.isHighlighted 
                  ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700' 
                  : 'bg-muted/30 border-border'}
              `}
            >
              <span className="text-xs text-muted-foreground font-medium">{reg.name}</span>
              <span className={`
                font-mono text-sm font-bold tabular-nums
                ${reg.isHighlighted ? 'text-green-700 dark:text-green-400' : ''}
              `}>
                {formatHex(reg.value)}
              </span>
            </div>
          ))}
        </div>
        
        {/* Divider */}
        <div className="border-t my-3" />
        
        {/* 8-bit Registers */}
        <div className="text-xs text-muted-foreground mb-2 font-medium">8-bit Registers</div>
        <div className="grid grid-cols-8 gap-1">
          {eightBitRegisters.map((reg) => (
            <div
              key={reg.name}
              className="flex flex-col items-center p-1 rounded bg-muted/20 border border-border"
            >
              <span className="text-muted-foreground">{reg.name}</span>
              <span className="font-mono text-xs tabular-nums">
                {formatHex(reg.value, 2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
