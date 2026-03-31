/**
 * Memory View Component
 * Displays memory contents as addresses and hex values.
 */

import { useState, useMemo } from 'react';
import type { CPUState } from '@/lib/simulator/cpu';
import { formatHex } from '@/lib/simulator/cpu';

interface MemoryViewProps {
  state: CPUState;
  startAddress?: number;
  bytesPerRow?: number;
}

type DisplayMode = 'hex' | 'decimal';

export function MemoryView({ 
  state, 
  startAddress = 0, 
  bytesPerRow = 16,
}: MemoryViewProps) {
  const [displayStart, setDisplayStart] = useState(startAddress);
  const [mode, setMode] = useState<DisplayMode>('hex');
  
  const rows = useMemo(() => {
    const result = [];
    for (let row = 0; row < 16; row++) {
      const addr = (displayStart + row * bytesPerRow) & 0xFFFF;
      const values: number[] = [];
      
      for (let col = 0; col < bytesPerRow; col++) {
        const offset = (addr + col) & 0xFFFF;
        values.push(state.memory[offset]);
      }
      
      result.push({ address: addr, values });
    }
    return result;
  }, [state.memory, displayStart, bytesPerRow]);
  
  const formatValue = (value: number): string => {
    if (mode === 'hex') {
      return formatHex(value, 2);
    }
    return value.toString().padStart(3, ' ');
  };
  
  const navigateToAddress = (addr: number) => {
    setDisplayStart(addr & 0xFFF0); // Align to 16-byte boundary
  };
  
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-muted/50 px-4 py-2 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">Memory</h3>
          <span className="text-xs text-muted-foreground">
            DS:{formatHex(state.DS)} 
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setMode('hex')}
            className={`
              px-2 py-1 text-xs rounded transition-colors
              ${mode === 'hex' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted hover:bg-muted/80'
              }
            `}
          >
            Hex
          </button>
          <button
            onClick={() => setMode('decimal')}
            className={`
              px-2 py-1 text-xs rounded transition-colors
              ${mode === 'decimal' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted hover:bg-muted/80'
              }
            `}
          >
            Dec
          </button>
        </div>
      </div>
      <div className="p-4 overflow-auto max-h-[300px]">
        {/* Navigation */}
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => setDisplayStart(Math.max(0, displayStart - 256))}
            className="px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded transition-colors"
          >
            -256
          </button>
          <button
            onClick={() => setDisplayStart(Math.max(0, displayStart - 16))}
            className="px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded transition-colors"
          >
            -16
          </button>
          <input
            type="text"
            value={formatHex(displayStart)}
            onChange={(e) => {
              const val = parseInt(e.target.value, 16);
              if (!isNaN(val)) {
                setDisplayStart(val & 0xFFFF);
              }
            }}
            className="w-16 px-2 py-1 text-xs font-mono bg-background border rounded text-center"
          />
          <button
            onClick={() => setDisplayStart((displayStart + 16) & 0xFFFF)}
            className="px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded transition-colors"
          >
            +16
          </button>
          <button
            onClick={() => setDisplayStart((displayStart + 256) & 0xFFFF)}
            className="px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded transition-colors"
          >
            +256
          </button>
        </div>
        
        {/* Memory Table */}
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="text-muted-foreground border-b">
              <th className="text-left pr-4 w-16">Addr</th>
              {Array.from({ length: bytesPerRow }, (_, i) => (
                <th key={i} className="text-center w-6">
                  {formatHex(i, 1)}
                </th>
              ))}
              <th className="text-left pl-4">ASCII</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.address} className="border-b border-muted/20 hover:bg-muted/30">
                <td className="pr-4 py-1 text-primary font-medium">
                  {formatHex(row.address)}
                </td>
                {row.values.map((value, idx) => (
                  <td 
                    key={idx} 
                    className="text-center py-1"
                    onClick={() => navigateToAddress((row.address + idx) & 0xFFFF)}
                    style={{ cursor: 'pointer' }}
                  >
                    <span className="hover:bg-muted/50 px-0.5 rounded">
                      {formatValue(value)}
                    </span>
                  </td>
                ))}
                <td className="pl-4 py-1 text-muted-foreground">
                  {String.fromCharCode(...row.values.map(v => v >= 32 && v < 127 ? v : 46))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
