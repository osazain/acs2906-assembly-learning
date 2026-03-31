/**
 * 8086 Assembly Parser
 * Parses simple 8086 assembly code into executable instructions.
 */

import type { ParsedInstruction, CPUState } from './cpu';

interface ParseResult {
  instructions: ParsedInstruction[];
  labels: Map<string, number>;  // label name -> instruction index
  errors: string[];
}

// Register patterns
const REGISTER_16BIT = ['AX', 'BX', 'CX', 'DX', 'SI', 'DI', 'BP', 'SP', 'CS', 'DS', 'ES', 'SS', 'IP'];
const REGISTER_8BIT_HIGH = ['AH', 'BH', 'CH', 'DH'];
const REGISTER_8BIT_LOW = ['AL', 'BL', 'CL', 'DL'];
const ALL_REGISTERS = [...REGISTER_16BIT, ...REGISTER_8BIT_HIGH, ...REGISTER_8BIT_LOW];

// Remove comments and normalize line
function preprocessLine(line: string): string {
  // Remove comments (semicolon to end of line)
  const withoutComment = line.split(';')[0];
  // Normalize whitespace
  return withoutComment.trim().toUpperCase();
}

// Check if token is a register
function isRegister(token: string): boolean {
  return ALL_REGISTERS.includes(token);
}

// Check if token is a number (hex or decimal)
function parseNumber(token: string): number | null {
  // Hex (0x prefix or H suffix)
  if (token.startsWith('0X') || token.endsWith('H')) {
    const hex = token.startsWith('0X') ? token.slice(2) : token.slice(0, -1);
    const val = parseInt(hex, 16);
    return isNaN(val) ? null : val;
  }
  // Decimal
  const val = parseInt(token, 10);
  return isNaN(val) ? null : val;
}

// Parse operands from operand string
function parseOperands(operandStr: string): string[] {
  if (!operandStr.trim()) return [];
  
  // Split by comma, handling brackets
  const operands: string[] = [];
  let current = '';
  let bracketDepth = 0;
  
  for (const char of operandStr) {
    if (char === '[') bracketDepth++;
    if (char === ']') bracketDepth--;
    if (char === ',' && bracketDepth === 0) {
      operands.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) {
    operands.push(current.trim());
  }
  
  return operands;
}

// Parse a single line into a parsed instruction
function parseLine(line: string, lineNumber: number, currentAddress: number): { instruction: ParsedInstruction | null; label: string | null; addressAdvance: number } {
  const processed = preprocessLine(line);
  
  if (!processed) {
    return { instruction: null, label: null, addressAdvance: 0 };
  }
  
  // Check for label definition (ends with :)
  if (processed.endsWith(':')) {
    const label = processed.slice(0, -1).trim();
    return { instruction: null, label, addressAdvance: 0 };
  }
  
  // Split mnemonic and operands
  const parts = processed.split(/\s+/);
  const mnemonic = parts[0];
  const operandStr = parts.slice(1).join(' ');
  
  // Skip directives (like .MODEL, .DATA, .CODE, etc.)
  if (mnemonic.startsWith('.')) {
    return { instruction: null, label: null, addressAdvance: 0 };
  }
  
  // Skip empty lines
  if (!mnemonic) {
    return { instruction: null, label: null, addressAdvance: 0 };
  }
  
  const operands = parseOperands(operandStr);
  
  return {
    instruction: {
      mnemonic,
      operands,
      rawLine: line,
      lineNumber,
      address: currentAddress,
    },
    label: null,
    addressAdvance: 1, // Each instruction takes 1 "word" for simplicity
  };
}

// Main parser function
export function parseAssembly(code: string): ParseResult {
  const result: ParseResult = {
    instructions: [],
    labels: new Map(),
    errors: [],
  };
  
  const lines = code.split('\n');
  let currentAddress = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const { instruction, label, addressAdvance } = parseLine(line, i + 1, currentAddress);
    
    if (label) {
      result.labels.set(label, currentAddress);
    }
    
    if (instruction) {
      result.instructions.push(instruction);
      currentAddress += addressAdvance;
    }
  }
  
  return result;
}

// Get operand value from CPU state
export function getOperandValue(op: string, state: CPUState): number | null {
  const trimmed = op.trim().toUpperCase();
  
  // 8-bit registers
  switch (trimmed) {
    case 'AL': return state.AX & 0xFF;
    case 'AH': return (state.AX >> 8) & 0xFF;
    case 'BL': return state.BX & 0xFF;
    case 'BH': return (state.BX >> 8) & 0xFF;
    case 'CL': return state.CX & 0xFF;
    case 'CH': return (state.CX >> 8) & 0xFF;
    case 'DL': return state.DX & 0xFF;
    case 'DH': return (state.DX >> 8) & 0xFF;
  }
  
  // 16-bit registers
  switch (trimmed) {
    case 'AX': return state.AX;
    case 'BX': return state.BX;
    case 'CX': return state.CX;
    case 'DX': return state.DX;
    case 'SI': return state.SI;
    case 'DI': return state.DI;
    case 'BP': return state.BP;
    case 'SP': return state.SP;
    case 'CS': return state.CS;
    case 'DS': return state.DS;
    case 'ES': return state.ES;
    case 'SS': return state.SS;
    case 'IP': return state.IP;
  }
  
  // Hex number (0x prefix)
  if (trimmed.startsWith('0X')) {
    return parseInt(trimmed.slice(2), 16);
  }
  
  // Hex number with H suffix
  if (trimmed.endsWith('H')) {
    return parseInt(trimmed.slice(0, -1), 16);
  }
  
  // Decimal
  const num = parseInt(trimmed, 10);
  if (!isNaN(num)) return num;
  
  return null;
}

// Set operand value in CPU state
export function setOperandValue(op: string, value: number, state: CPUState): boolean {
  const trimmed = op.trim().toUpperCase();
  
  // 8-bit registers (only low registers for simplicity in writing)
  switch (trimmed) {
    case 'AL':
      state.AX = (state.AX & 0xFF00) | (value & 0xFF);
      return true;
    case 'AH':
      state.AX = (state.AX & 0x00FF) | ((value & 0xFF) << 8);
      return true;
    case 'BL':
      state.BX = (state.BX & 0xFF00) | (value & 0xFF);
      return true;
    case 'BH':
      state.BX = (state.BX & 0x00FF) | ((value & 0xFF) << 8);
      return true;
    case 'CL':
      state.CX = (state.CX & 0xFF00) | (value & 0xFF);
      return true;
    case 'CH':
      state.CX = (state.CX & 0x00FF) | ((value & 0xFF) << 8);
      return true;
    case 'DL':
      state.DX = (state.DX & 0xFF00) | (value & 0xFF);
      return true;
    case 'DH':
      state.DX = (state.DX & 0x00FF) | ((value & 0xFF) << 8);
      return true;
  }
  
  // 16-bit registers
  switch (trimmed) {
    case 'AX': state.AX = value & 0xFFFF; return true;
    case 'BX': state.BX = value & 0xFFFF; return true;
    case 'CX': state.CX = value & 0xFFFF; return true;
    case 'DX': state.DX = value & 0xFFFF; return true;
    case 'SI': state.SI = value & 0xFFFF; return true;
    case 'DI': state.DI = value & 0xFFFF; return true;
    case 'BP': state.BP = value & 0xFFFF; return true;
    case 'SP': state.SP = value & 0xFFFF; return true;
    case 'CS': state.CS = value & 0xFFFF; return true;
    case 'DS': state.DS = value & 0xFFFF; return true;
    case 'ES': state.ES = value & 0xFFFF; return true;
    case 'SS': state.SS = value & 0xFFFF; return true;
    case 'IP': state.IP = value & 0xFFFF; return true;
  }
  
  return false;
}

// Get effective address for memory operand
export function getEffectiveAddress(op: string, state: CPUState): number | null {
  if (!op.startsWith('[') || !op.endsWith(']')) {
    return null;
  }
  
  const inner = op.slice(1, -1).trim().toUpperCase();
  
  // Simple register dereference
  if (isRegister(inner)) {
    switch (inner) {
      case 'BX': return state.BX;
      case 'SI': return state.SI;
      case 'DI': return state.DI;
      case 'BP': return state.BP;
    }
  }
  
  // Expression like BX+SI
  const parts = inner.split('+').map(p => p.trim());
  let base = 0;
  let offset = 0;
  
  for (const part of parts) {
    if (isRegister(part)) {
      base += getOperandValue(part, state) || 0;
    } else {
      offset += parseNumber(part) || 0;
    }
  }
  
  return (base + offset) & 0xFFFF;
}
