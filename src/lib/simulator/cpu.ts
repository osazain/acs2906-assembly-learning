/**
 * 8086 CPU State and Types
 * Represents the state of the 8086 microprocessor including registers, flags, and memory.
 */

export type RegisterName = 
  | 'AX' | 'BX' | 'CX' | 'DX'
  | 'SI' | 'DI' | 'BP' | 'SP'
  | 'CS' | 'DS' | 'ES' | 'SS'
  | 'IP' | 'FLAGS';

export type FlagName = 'CF' | 'PF' | 'AF' | 'ZF' | 'SF' | 'TF' | 'IF' | 'DF' | 'OF';

export interface Flags {
  CF: boolean;  // Carry Flag
  PF: boolean;  // Parity Flag
  AF: boolean;  // Auxiliary Carry Flag
  ZF: boolean;  // Zero Flag
  SF: boolean;  // Sign Flag
  TF: boolean;  // Trap Flag
  IF: boolean;  // Interrupt Enable Flag
  DF: boolean;  // Direction Flag
  OF: boolean;  // Overflow Flag
}

export interface CPUState {
  // General Purpose Registers (16-bit)
  AX: number;
  BX: number;
  CX: number;
  DX: number;
  
  // Index Registers
  SI: number;
  DI: number;
  BP: number;
  SP: number;
  
  // Segment Registers
  CS: number;
  DS: number;
  ES: number;
  SS: number;
  
  // Instruction Pointer
  IP: number;
  
  // Flags
  flags: Flags;
  
  // Memory (64KB addressable space, 1 byte per address)
  memory: Uint8Array;
  
  // Halted state
  halted: boolean;
}

export interface ParsedInstruction {
  mnemonic: string;
  operands: string[];
  rawLine: string;
  lineNumber: number;
  address: number;
}

export interface ExecutionResult {
  success: boolean;
  error?: string;
  newIP?: number;
  registersModified?: Record<string, number>;
  flagsModified?: Partial<Flags>;
}

export interface MemoryView {
  address: number;
  value: number;
}

// Default initial CPU state
export function createInitialCPUState(): CPUState {
  return {
    AX: 0,
    BX: 0,
    CX: 0,
    DX: 0,
    SI: 0,
    DI: 0,
    BP: 0,
    SP: 0xFFFE, // Stack typically starts near top of memory
    CS: 0,
    DS: 0,
    ES: 0,
    SS: 0,
    IP: 0,
    flags: {
      CF: false,
      PF: false,
      AF: false,
      ZF: false,
      SF: false,
      TF: false,
      IF: true,
      DF: false,
      OF: false,
    },
    memory: new Uint8Array(65536), // 64KB
    halted: false,
  };
}

// Format register value as 4-digit hex
export function formatHex(value: number, digits: number = 4): string {
  const v = value & ((1 << (digits * 4)) - 1);
  return v.toString(16).toUpperCase().padStart(digits, '0');
}

// Get register value formatted
export function getRegisterDisplay(state: CPUState, name: RegisterName): string {
  if (name === 'FLAGS') {
    return formatFlags(state.flags);
  }
  const value = state[name.toLowerCase() as keyof CPUState] as number;
  return formatHex(value);
}

// Format flags as string
export function formatFlags(flags: Flags): string {
  const f = [
    flags.CF ? 1 : 0,  // Bit 0
    1,                   // Bit 1 (always 1 in FLAGS)
    flags.PF ? 1 : 0,  // Bit 2
    0,                   // Bit 3 (reserved)
    flags.AF ? 1 : 0,  // Bit 4
    0,                   // Bit 5 (reserved)
    flags.ZF ? 1 : 0,  // Bit 6
    flags.SF ? 1 : 0,  // Bit 7
    flags.TF ? 1 : 0,  // Bit 8
    flags.IF ? 1 : 0,  // Bit 9
    flags.DF ? 1 : 0,  // Bit 10
    flags.OF ? 1 : 0,  // Bit 11
  ];
  // FLAGS is a 16-bit register, return as hex
  let flagsValue = 0;
  for (let i = 0; i < 12; i++) {
    if (f[i]) flagsValue |= (1 << i);
  }
  return formatHex(flagsValue);
}

// Create a deep clone of CPU state
export function cloneCPUState(state: CPUState): CPUState {
  return {
    ...state,
    flags: { ...state.flags },
    memory: new Uint8Array(state.memory),
  };
}
