/**
 * Flag Display Component
 * Shows all 8086 CPU flags with their current states.
 */

import { useMemo } from 'react';
import type { Flags } from '@/lib/simulator/cpu';

interface FlagDisplayProps {
  flags: Flags;
  modifiedFlags?: Partial<Flags>;
}

interface FlagInfo {
  name: keyof Flags;
  shortName: string;
  description: string;
  value: boolean;
  isModified: boolean;
}

const FLAG_DEFINITIONS: Array<{ name: keyof Flags; shortName: string; description: string }> = [
  { name: 'CF', shortName: 'CF', description: 'Carry Flag' },
  { name: 'PF', shortName: 'PF', description: 'Parity Flag' },
  { name: 'AF', shortName: 'AF', description: 'Auxiliary Carry' },
  { name: 'ZF', shortName: 'ZF', description: 'Zero Flag' },
  { name: 'SF', shortName: 'SF', description: 'Sign Flag' },
  { name: 'TF', shortName: 'TF', description: 'Trap Flag' },
  { name: 'IF', shortName: 'IF', description: 'Interrupt Enable' },
  { name: 'DF', shortName: 'DF', description: 'Direction Flag' },
  { name: 'OF', shortName: 'OF', description: 'Overflow Flag' },
];

export function FlagDisplay({ flags, modifiedFlags = {} }: FlagDisplayProps) {
  const flagInfos = useMemo((): FlagInfo[] => {
    return FLAG_DEFINITIONS.map(def => ({
      ...def,
      value: flags[def.name],
      isModified: def.name in modifiedFlags,
    }));
  }, [flags, modifiedFlags]);
  
  // Group flags for better display
  const statusFlags = flagInfos.slice(0, 5); // CF, PF, AF, ZF, SF
  const controlFlags = flagInfos.slice(5);   // TF, IF, DF, OF
  
  const getFlagValueClass = (isModified: boolean, value: boolean) => {
    if (isModified) {
      return value 
        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700' 
        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700';
    }
    return value
      ? 'bg-primary/10 text-primary border-primary/30'
      : 'bg-muted/30 text-muted-foreground border-border';
  };
  
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-muted/50 px-4 py-2 border-b">
        <h3 className="text-sm font-medium">Flags</h3>
      </div>
      <div className="p-4">
        {/* Status Flags */}
        <div className="mb-4">
          <div className="text-xs text-muted-foreground mb-2 font-medium">Status Flags</div>
          <div className="flex flex-wrap gap-2">
            {statusFlags.map((flag) => (
              <div
                key={flag.name}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors
                  ${getFlagValueClass(flag.isModified, flag.value)}
                `}
                title={flag.description}
              >
                <span className="font-bold text-sm">{flag.shortName}</span>
                <span className={`text-lg font-mono ${flag.value ? 'opacity-100' : 'opacity-30'}`}>
                  {flag.value ? '1' : '0'}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Control Flags */}
        <div>
          <div className="text-xs text-muted-foreground mb-2 font-medium">Control Flags</div>
          <div className="flex flex-wrap gap-2">
            {controlFlags.map((flag) => (
              <div
                key={flag.name}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors
                  ${getFlagValueClass(flag.isModified, flag.value)}
                `}
                title={flag.description}
              >
                <span className="font-bold text-sm">{flag.shortName}</span>
                <span className={`text-lg font-mono ${flag.value ? 'opacity-100' : 'opacity-30'}`}>
                  {flag.value ? '1' : '0'}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Flag Legend */}
        <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div><span className="font-medium">CF:</span> Set when unsigned overflow occurs</div>
            <div><span className="font-medium">PF:</span> Set when result has even parity</div>
            <div><span className="font-medium">AF:</span> Set for BCD arithmetic adjustments</div>
            <div><span className="font-medium">ZF:</span> Set when result is zero</div>
            <div><span className="font-medium">SF:</span> Set when result is negative</div>
            <div><span className="font-medium">OF:</span> Set when signed overflow occurs</div>
          </div>
        </div>
      </div>
    </div>
  );
}
