/**
 * 8086 Instruction Executor
 * Executes 8086 assembly instructions and updates CPU state.
 */

import type { CPUState, Flags, ParsedInstruction } from './cpu';
import { getOperandValue, setOperandValue, getEffectiveAddress } from './parser';

// Flag calculation helpers
function updateParityFlag(value: number): boolean {
  // Parity is 1 if number of 1 bits is even
  let count = 0;
  for (let i = 0; i < 8; i++) {
    if (value & (1 << i)) count++;
  }
  return count % 2 === 0;
}

function updateSignFlag(value: number): boolean {
  // Sign is 1 if bit 15 (for 16-bit) or bit 7 (for 8-bit) is set
  return (value & 0x80) !== 0;
}

function updateZeroFlag(value: number): boolean {
  return value === 0;
}

function updateCarryAdd(a: number, b: number, _result: number, size: number): boolean {
  const mask = 1 << size;
  return (a + b) >= mask;
}

function updateOverflowAdd(a: number, b: number, result: number): boolean {
  // Overflow if operands have same sign but result has different sign
  const signA = (a >> 15) & 1;
  const signB = (b >> 15) & 1;
  const signR = (result >> 15) & 1;
  return (signA === signB) && (signR !== signA);
}

function updateOverflowSub(a: number, b: number, result: number): boolean {
  // Overflow if operands have different signs and result sign differs from a's sign
  const signA = (a >> 15) & 1;
  const signB = (b >> 15) & 1;
  const signR = (result >> 15) & 1;
  return (signA !== signB) && (signR !== signA);
}

export interface ExecuteResult {
  success: boolean;
  error?: string;
  ipChanged: boolean;
  registersModified: Record<string, { oldValue: number; newValue: number }>;
  flagsModified: Partial<Flags>;
  halted?: boolean;
}

// Execute a single instruction
export function executeInstruction(
  instruction: ParsedInstruction,
  state: CPUState,
  labels: Map<string, number>,
): ExecuteResult {
  const mnemonic = instruction.mnemonic.toUpperCase();
  const operands = instruction.operands;
  
  const result: ExecuteResult = {
    success: true,
    ipChanged: false,
    registersModified: {},
    flagsModified: {},
  };
  
  const recordFlag = (name: keyof Flags, value: boolean) => {
    (result.flagsModified as Record<string, boolean>)[name] = value;
  };
  
  try {
    switch (mnemonic) {
      // ===== DATA TRANSFER =====
      case 'MOV': {
        // MOV dest, src - copy src to dest
        if (operands.length !== 2) {
          result.success = false;
          result.error = 'MOV requires 2 operands';
          return result;
        }
        const [dest, src] = operands;
        const srcVal = getOperandValue(src, state);
        if (srcVal === null) {
          result.success = false;
          result.error = `Invalid source operand: ${src}`;
          return result;
        }
        if (!setOperandValue(dest, srcVal, state)) {
          // Memory destination
          const addr = getEffectiveAddress(dest, state);
          if (addr !== null) {
            state.memory[addr] = srcVal & 0xFF;
          } else {
            result.success = false;
            result.error = `Invalid destination operand: ${dest}`;
            return result;
          }
        }
        break;
      }
      
      case 'XCHG': {
        // XCHG op1, op2 - exchange values
        if (operands.length !== 2) {
          result.success = false;
          result.error = 'XCHG requires 2 operands';
          return result;
        }
        const [op1, op2] = operands;
        const val1 = getOperandValue(op1, state);
        const val2 = getOperandValue(op2, state);
        if (val1 === null || val2 === null) {
          result.success = false;
          result.error = 'Invalid operands for XCHG';
          return result;
        }
        setOperandValue(op1, val2, state);
        setOperandValue(op2, val1, state);
        break;
      }
      
      case 'LEA': {
        // LEA dest, src - load effective address
        if (operands.length !== 2) {
          result.success = false;
          result.error = 'LEA requires 2 operands';
          return result;
        }
        const [dest, src] = operands;
        const addr = getEffectiveAddress(src, state);
        if (addr === null) {
          result.success = false;
          result.error = `Invalid memory operand: ${src}`;
          return result;
        }
        if (!setOperandValue(dest, addr, state)) {
          result.success = false;
          result.error = `Invalid destination: ${dest}`;
          return result;
        }
        break;
      }
      
      case 'PUSH': {
        // PUSH src - push onto stack
        if (operands.length !== 1) {
          result.success = false;
          result.error = 'PUSH requires 1 operand';
          return result;
        }
        const val = getOperandValue(operands[0], state);
        if (val === null) {
          result.success = false;
          result.error = `Invalid operand: ${operands[0]}`;
          return result;
        }
        state.SP = (state.SP - 2) & 0xFFFF;
        state.memory[state.SP] = val & 0xFF;
        state.memory[(state.SP + 1) & 0xFFFF] = (val >> 8) & 0xFF;
        break;
      }
      
      case 'POP': {
        // POP dest - pop from stack
        if (operands.length !== 1) {
          result.success = false;
          result.error = 'POP requires 1 operand';
          return result;
        }
        const val = state.memory[state.SP] | (state.memory[(state.SP + 1) & 0xFFFF] << 8);
        if (!setOperandValue(operands[0], val, state)) {
          result.success = false;
          result.error = `Invalid destination: ${operands[0]}`;
          return result;
        }
        state.SP = (state.SP + 2) & 0xFFFF;
        break;
      }
      
      case 'LAHF': {
        // LAHF - load AH from flags
        let flags = 0;
        if (state.flags.CF) flags |= 1;
        if (state.flags.PF) flags |= 4;
        if (state.flags.AF) flags |= 16;
        if (state.flags.ZF) flags |= 64;
        if (state.flags.SF) flags |= 128;
        state.AX = (state.AX & 0xFF00) | flags;
        break;
      }
      
      case 'SAHF': {
        // SAHF - store AH into flags
        const flags = state.AX & 0xFF;
        state.flags.CF = (flags & 1) !== 0;
        state.flags.PF = (flags & 4) !== 0;
        state.flags.AF = (flags & 16) !== 0;
        state.flags.ZF = (flags & 64) !== 0;
        state.flags.SF = (flags & 128) !== 0;
        break;
      }
      
      case 'CBW': {
        // CBW - convert byte to word (sign extend AL to AX)
        if ((state.AX & 0x80) !== 0) {
          state.AX = state.AX | 0xFF00;
        } else {
          state.AX = state.AX & 0x00FF;
        }
        break;
      }
      
      case 'CWD': {
        // CWD - convert word to doubleword (sign extend AX to DX:AX)
        if ((state.AX & 0x8000) !== 0) {
          state.DX = 0xFFFF;
        } else {
          state.DX = 0;
        }
        break;
      }
      
      // ===== ARITHMETIC =====
      case 'ADD': {
        if (operands.length !== 2) {
          result.success = false;
          result.error = 'ADD requires 2 operands';
          return result;
        }
        const [dest, src] = operands;
        const destVal = getOperandValue(dest, state) ?? 0;
        const srcVal = getOperandValue(src, state);
        if (srcVal === null) {
          result.success = false;
          result.error = `Invalid source: ${src}`;
          return result;
        }
        const newVal = (destVal + srcVal) & 0xFFFF;
        if (!setOperandValue(dest, newVal, state)) {
          const addr = getEffectiveAddress(dest, state);
          if (addr !== null) {
            state.memory[addr] = newVal & 0xFF;
          }
        }
        recordFlag('CF', updateCarryAdd(destVal, srcVal, newVal, 16));
        recordFlag('OF', updateOverflowAdd(destVal, srcVal, newVal));
        recordFlag('SF', updateSignFlag(newVal));
        recordFlag('ZF', updateZeroFlag(newVal));
        recordFlag('PF', updateParityFlag(newVal));
        recordFlag('AF', ((destVal & 0xF) + (srcVal & 0xF)) > 0xF);
        break;
      }
      
      case 'ADC': {
        // ADC dest, src - add with carry
        if (operands.length !== 2) {
          result.success = false;
          result.error = 'ADC requires 2 operands';
          return result;
        }
        const [dest, src] = operands;
        const destVal = getOperandValue(dest, state) ?? 0;
        const srcVal = getOperandValue(src, state);
        if (srcVal === null) {
          result.success = false;
          result.error = `Invalid source: ${src}`;
          return result;
        }
        const carry = state.flags.CF ? 1 : 0;
        const newVal = (destVal + srcVal + carry) & 0xFFFF;
        if (!setOperandValue(dest, newVal, state)) {
          const addr = getEffectiveAddress(dest, state);
          if (addr !== null) {
            state.memory[addr] = newVal & 0xFF;
          }
        }
        recordFlag('CF', updateCarryAdd(destVal, srcVal + carry, newVal, 16));
        recordFlag('OF', updateOverflowAdd(destVal, srcVal + carry, newVal));
        recordFlag('SF', updateSignFlag(newVal));
        recordFlag('ZF', updateZeroFlag(newVal));
        recordFlag('PF', updateParityFlag(newVal));
        break;
      }
      
      case 'SUB': {
        if (operands.length !== 2) {
          result.success = false;
          result.error = 'SUB requires 2 operands';
          return result;
        }
        const [dest, src] = operands;
        const destVal = getOperandValue(dest, state) ?? 0;
        const srcVal = getOperandValue(src, state);
        if (srcVal === null) {
          result.success = false;
          result.error = `Invalid source: ${src}`;
          return result;
        }
        const newVal = (destVal - srcVal) & 0xFFFF;
        if (!setOperandValue(dest, newVal, state)) {
          const addr = getEffectiveAddress(dest, state);
          if (addr !== null) {
            state.memory[addr] = newVal & 0xFF;
          }
        }
        recordFlag('CF', destVal < srcVal);
        recordFlag('OF', updateOverflowSub(destVal, srcVal, newVal));
        recordFlag('SF', updateSignFlag(newVal));
        recordFlag('ZF', updateZeroFlag(newVal));
        recordFlag('PF', updateParityFlag(newVal));
        recordFlag('AF', ((destVal & 0xF) - (srcVal & 0xF)) < 0);
        break;
      }
      
      case 'SBB': {
        // SBB dest, src - subtract with borrow
        if (operands.length !== 2) {
          result.success = false;
          result.error = 'SBB requires 2 operands';
          return result;
        }
        const [dest, src] = operands;
        const destVal = getOperandValue(dest, state) ?? 0;
        const srcVal = getOperandValue(src, state);
        if (srcVal === null) {
          result.success = false;
          result.error = `Invalid source: ${src}`;
          return result;
        }
        const borrow = state.flags.CF ? 1 : 0;
        const newVal = (destVal - srcVal - borrow) & 0xFFFF;
        if (!setOperandValue(dest, newVal, state)) {
          const addr = getEffectiveAddress(dest, state);
          if (addr !== null) {
            state.memory[addr] = newVal & 0xFF;
          }
        }
        recordFlag('CF', destVal < srcVal + borrow);
        recordFlag('OF', updateOverflowSub(destVal, srcVal + borrow, newVal));
        recordFlag('SF', updateSignFlag(newVal));
        recordFlag('ZF', updateZeroFlag(newVal));
        recordFlag('PF', updateParityFlag(newVal));
        break;
      }
      
      case 'INC': {
        // INC dest - increment by 1
        if (operands.length !== 1) {
          result.success = false;
          result.error = 'INC requires 1 operand';
          return result;
        }
        const destVal = getOperandValue(operands[0], state) ?? 0;
        const newVal = (destVal + 1) & 0xFFFF;
        if (!setOperandValue(operands[0], newVal, state)) {
          const addr = getEffectiveAddress(operands[0], state);
          if (addr !== null) {
            state.memory[addr] = newVal & 0xFF;
          }
        }
        recordFlag('OF', (destVal === 0x7FFF));
        recordFlag('SF', updateSignFlag(newVal));
        recordFlag('ZF', updateZeroFlag(newVal));
        recordFlag('PF', updateParityFlag(newVal));
        recordFlag('AF', (destVal & 0xF) === 0xF);
        break;
      }
      
      case 'DEC': {
        // DEC dest - decrement by 1
        if (operands.length !== 1) {
          result.success = false;
          result.error = 'DEC requires 1 operand';
          return result;
        }
        const destVal = getOperandValue(operands[0], state) ?? 0;
        const newVal = (destVal - 1) & 0xFFFF;
        if (!setOperandValue(operands[0], newVal, state)) {
          const addr = getEffectiveAddress(operands[0], state);
          if (addr !== null) {
            state.memory[addr] = newVal & 0xFF;
          }
        }
        recordFlag('OF', (destVal === 0x8000));
        recordFlag('SF', updateSignFlag(newVal));
        recordFlag('ZF', updateZeroFlag(newVal));
        recordFlag('PF', updateParityFlag(newVal));
        recordFlag('AF', (destVal & 0xF) === 0);
        break;
      }
      
      case 'MUL': {
        // MUL src - unsigned multiply
        if (operands.length !== 1) {
          result.success = false;
          result.error = 'MUL requires 1 operand';
          return result;
        }
        const srcVal = getOperandValue(operands[0], state);
        if (srcVal === null) {
          result.success = false;
          result.error = `Invalid operand: ${operands[0]}`;
          return result;
        }
        // AL * src -> AX
        const axVal = state.AX & 0xFF;
        const product = axVal * srcVal;
        state.AX = product & 0xFFFF;
        // CF and OF set if upper half is non-zero
        recordFlag('CF', (product >> 16) !== 0);
        recordFlag('OF', (product >> 16) !== 0);
        break;
      }
      
      case 'IMUL': {
        // IMUL src - signed multiply (simplified)
        if (operands.length !== 1) {
          result.success = false;
          result.error = 'IMUL requires 1 operand';
          return result;
        }
        const srcVal = getOperandValue(operands[0], state);
        if (srcVal === null) {
          result.success = false;
          result.error = `Invalid operand: ${operands[0]}`;
          return result;
        }
        const axVal = (state.AX << 16) >> 16; // Sign extend
        const product = axVal * srcVal;
        state.AX = product & 0xFFFF;
        recordFlag('CF', (product >> 16) !== 0 && (product >> 16) !== 0xFFFF);
        recordFlag('OF', (product >> 16) !== 0 && (product >> 16) !== 0xFFFF);
        break;
      }
      
      case 'DIV': {
        // DIV src - unsigned divide
        if (operands.length !== 1) {
          result.success = false;
          result.error = 'DIV requires 1 operand';
          return result;
        }
        const srcVal = getOperandValue(operands[0], state);
        if (srcVal === null || srcVal === 0) {
          result.success = false;
          result.error = `Invalid operand: ${operands[0]}`;
          return result;
        }
        const dividend = state.AX;
        const quotient = Math.floor(dividend / srcVal);
        const remainder = dividend % srcVal;
        if (quotient > 0xFF) {
          result.success = false;
          result.error = 'Division overflow';
          return result;
        }
        state.AX = (remainder << 8) | (quotient & 0xFF);
        break;
      }
      
      case 'IDIV': {
        // IDIV src - signed divide (simplified)
        if (operands.length !== 1) {
          result.success = false;
          result.error = 'IDIV requires 1 operand';
          return result;
        }
        const srcVal = getOperandValue(operands[0], state);
        if (srcVal === null || srcVal === 0) {
          result.success = false;
          result.error = `Invalid operand: ${operands[0]}`;
          return result;
        }
        const dividend = (state.AX << 16) >> 16;
        const quotient = Math.floor(dividend / srcVal);
        const remainder = dividend % srcVal;
        if (quotient > 127 && quotient < 0xFF80) {
          result.success = false;
          result.error = 'Division overflow';
          return result;
        }
        state.AX = ((remainder << 16) >> 16) & 0xFFFF;
        break;
      }
      
      case 'CMP': {
        // CMP dest, src - compare (subtract without storing)
        if (operands.length !== 2) {
          result.success = false;
          result.error = 'CMP requires 2 operands';
          return result;
        }
        const [dest, src] = operands;
        const destVal = getOperandValue(dest, state) ?? 0;
        const srcVal = getOperandValue(src, state);
        if (srcVal === null) {
          result.success = false;
          result.error = `Invalid source: ${src}`;
          return result;
        }
        const diff = (destVal - srcVal) & 0xFFFF;
        recordFlag('CF', destVal < srcVal);
        recordFlag('OF', updateOverflowSub(destVal, srcVal, diff));
        recordFlag('SF', updateSignFlag(diff));
        recordFlag('ZF', updateZeroFlag(diff));
        recordFlag('PF', updateParityFlag(diff));
        recordFlag('AF', ((destVal & 0xF) - (srcVal & 0xF)) < 0);
        break;
      }
      
      case 'NEG': {
        // NEG dest - two's complement negation
        if (operands.length !== 1) {
          result.success = false;
          result.error = 'NEG requires 1 operand';
          return result;
        }
        const destVal = getOperandValue(operands[0], state) ?? 0;
        const newVal = (-destVal) & 0xFFFF;
        if (!setOperandValue(operands[0], newVal, state)) {
          const addr = getEffectiveAddress(operands[0], state);
          if (addr !== null) {
            state.memory[addr] = newVal & 0xFF;
          }
        }
        recordFlag('CF', destVal !== 0);
        recordFlag('OF', destVal === 0x8000);
        recordFlag('SF', updateSignFlag(newVal));
        recordFlag('ZF', updateZeroFlag(newVal));
        recordFlag('PF', updateParityFlag(newVal));
        recordFlag('AF', newVal !== 0 && ((newVal & 0xF) !== 0));
        break;
      }
      
      // ===== LOGICAL =====
      case 'AND': {
        if (operands.length !== 2) {
          result.success = false;
          result.error = 'AND requires 2 operands';
          return result;
        }
        const [dest, src] = operands;
        const destVal = getOperandValue(dest, state) ?? 0;
        const srcVal = getOperandValue(src, state);
        if (srcVal === null) {
          result.success = false;
          result.error = `Invalid source: ${src}`;
          return result;
        }
        const newVal = destVal & srcVal;
        if (!setOperandValue(dest, newVal, state)) {
          const addr = getEffectiveAddress(dest, state);
          if (addr !== null) {
            state.memory[addr] = newVal & 0xFF;
          }
        }
        recordFlag('CF', false); // Always cleared
        recordFlag('OF', false); // Always cleared
        recordFlag('SF', updateSignFlag(newVal));
        recordFlag('ZF', updateZeroFlag(newVal));
        recordFlag('PF', updateParityFlag(newVal));
        break;
      }
      
      case 'OR': {
        if (operands.length !== 2) {
          result.success = false;
          result.error = 'OR requires 2 operands';
          return result;
        }
        const [dest, src] = operands;
        const destVal = getOperandValue(dest, state) ?? 0;
        const srcVal = getOperandValue(src, state);
        if (srcVal === null) {
          result.success = false;
          result.error = `Invalid source: ${src}`;
          return result;
        }
        const newVal = destVal | srcVal;
        if (!setOperandValue(dest, newVal, state)) {
          const addr = getEffectiveAddress(dest, state);
          if (addr !== null) {
            state.memory[addr] = newVal & 0xFF;
          }
        }
        recordFlag('CF', false);
        recordFlag('OF', false);
        recordFlag('SF', updateSignFlag(newVal));
        recordFlag('ZF', updateZeroFlag(newVal));
        recordFlag('PF', updateParityFlag(newVal));
        break;
      }
      
      case 'XOR': {
        if (operands.length !== 2) {
          result.success = false;
          result.error = 'XOR requires 2 operands';
          return result;
        }
        const [dest, src] = operands;
        const destVal = getOperandValue(dest, state) ?? 0;
        const srcVal = getOperandValue(src, state);
        if (srcVal === null) {
          result.success = false;
          result.error = `Invalid source: ${src}`;
          return result;
        }
        const newVal = destVal ^ srcVal;
        if (!setOperandValue(dest, newVal, state)) {
          const addr = getEffectiveAddress(dest, state);
          if (addr !== null) {
            state.memory[addr] = newVal & 0xFF;
          }
        }
        recordFlag('CF', false);
        recordFlag('OF', false);
        recordFlag('SF', updateSignFlag(newVal));
        recordFlag('ZF', updateZeroFlag(newVal));
        recordFlag('PF', updateParityFlag(newVal));
        break;
      }
      
      case 'NOT': {
        // NOT dest - one's complement
        if (operands.length !== 1) {
          result.success = false;
          result.error = 'NOT requires 1 operand';
          return result;
        }
        const destVal = getOperandValue(operands[0], state) ?? 0;
        const newVal = (~destVal) & 0xFFFF;
        if (!setOperandValue(operands[0], newVal, state)) {
          const addr = getEffectiveAddress(operands[0], state);
          if (addr !== null) {
            state.memory[addr] = newVal & 0xFF;
          }
        }
        // No flags affected
        break;
      }
      
      case 'TEST': {
        // TEST dest, src - logical AND without storing result
        if (operands.length !== 2) {
          result.success = false;
          result.error = 'TEST requires 2 operands';
          return result;
        }
        const [dest, src] = operands;
        const destVal = getOperandValue(dest, state) ?? 0;
        const srcVal = getOperandValue(src, state);
        if (srcVal === null) {
          result.success = false;
          result.error = `Invalid source: ${src}`;
          return result;
        }
        const newVal = destVal & srcVal;
        recordFlag('CF', false);
        recordFlag('OF', false);
        recordFlag('SF', updateSignFlag(newVal));
        recordFlag('ZF', updateZeroFlag(newVal));
        recordFlag('PF', updateParityFlag(newVal));
        break;
      }
      
      // ===== SHIFT =====
      case 'SHL': {
        // SHL dest, count - shift logical left
        if (operands.length !== 2) {
          result.success = false;
          result.error = 'SHL requires 2 operands';
          return result;
        }
        const [dest, countStr] = operands;
        const destVal = getOperandValue(dest, state) ?? 0;
        const count = getOperandValue(countStr, state) ?? 1;
        let newVal = destVal << count;
        const lastBit = (destVal >> (16 - count)) & 1;
        newVal = newVal & 0xFFFF;
        if (!setOperandValue(dest, newVal, state)) {
          const addr = getEffectiveAddress(dest, state);
          if (addr !== null) {
            state.memory[addr] = newVal & 0xFF;
          }
        }
        recordFlag('CF', lastBit !== 0);
        recordFlag('OF', count === 1 && ((destVal >> 15) !== (newVal >> 15)));
        recordFlag('SF', updateSignFlag(newVal));
        recordFlag('ZF', updateZeroFlag(newVal));
        recordFlag('PF', updateParityFlag(newVal));
        break;
      }
      
      case 'SHR': {
        // SHR dest, count - shift logical right
        if (operands.length !== 2) {
          result.success = false;
          result.error = 'SHR requires 2 operands';
          return result;
        }
        const [dest, countStr] = operands;
        const destVal = getOperandValue(dest, state) ?? 0;
        const count = getOperandValue(countStr, state) ?? 1;
        let newVal = destVal >> count;
        const lastBit = (destVal >> (count - 1)) & 1;
        newVal = newVal & 0xFFFF;
        if (!setOperandValue(dest, newVal, state)) {
          const addr = getEffectiveAddress(dest, state);
          if (addr !== null) {
            state.memory[addr] = newVal & 0xFF;
          }
        }
        recordFlag('CF', lastBit !== 0);
        recordFlag('OF', count === 1 && ((destVal >> 15) !== (newVal >> 15)));
        recordFlag('SF', updateSignFlag(newVal));
        recordFlag('ZF', updateZeroFlag(newVal));
        recordFlag('PF', updateParityFlag(newVal));
        break;
      }
      
      case 'SAL':
      case 'SHL_ALT': {
        // SAL dest, count - arithmetic shift left (same as SHL)
        if (operands.length !== 2) {
          result.success = false;
          result.error = 'SAL requires 2 operands';
          return result;
        }
        const [dest, countStr] = operands;
        const destVal = getOperandValue(dest, state) ?? 0;
        const count = getOperandValue(countStr, state) ?? 1;
        let newVal = destVal << count;
        newVal = newVal & 0xFFFF;
        if (!setOperandValue(dest, newVal, state)) {
          const addr = getEffectiveAddress(dest, state);
          if (addr !== null) {
            state.memory[addr] = newVal & 0xFF;
          }
        }
        recordFlag('CF', count > 0 && ((destVal & (1 << (16 - count))) !== 0));
        recordFlag('OF', count === 1 && ((destVal >> 15) !== (newVal >> 15)));
        recordFlag('SF', updateSignFlag(newVal));
        recordFlag('ZF', updateZeroFlag(newVal));
        recordFlag('PF', updateParityFlag(newVal));
        break;
      }
      
      case 'SAR': {
        // SAR dest, count - arithmetic shift right
        if (operands.length !== 2) {
          result.success = false;
          result.error = 'SAR requires 2 operands';
          return result;
        }
        const [dest, countStr] = operands;
        const destVal = getOperandValue(dest, state) ?? 0;
        const count = getOperandValue(countStr, state) ?? 1;
        // Preserve sign bit
        const signBit = destVal & 0x8000;
        let newVal = (destVal >> count) | signBit;
        newVal = newVal & 0xFFFF;
        if (!setOperandValue(dest, newVal, state)) {
          const addr = getEffectiveAddress(dest, state);
          if (addr !== null) {
            state.memory[addr] = newVal & 0xFF;
          }
        }
        recordFlag('CF', count > 0 && ((destVal & (1 << (count - 1))) !== 0));
        recordFlag('OF', false); // Always cleared for SAR
        recordFlag('SF', updateSignFlag(newVal));
        recordFlag('ZF', updateZeroFlag(newVal));
        recordFlag('PF', updateParityFlag(newVal));
        break;
      }
      
      case 'ROL': {
        // ROL dest, count - rotate left
        if (operands.length !== 2) {
          result.success = false;
          result.error = 'ROL requires 2 operands';
          return result;
        }
        const [dest, countStr] = operands;
        const destVal = getOperandValue(dest, state) ?? 0;
        const count = getOperandValue(countStr, state) ?? 1;
        const c = count & 0xF; // Limit rotation count
        let newVal = destVal;
        for (let i = 0; i < c; i++) {
          const msb = (newVal >> 15) & 1;
          newVal = ((newVal << 1) | msb) & 0xFFFF;
        }
        if (!setOperandValue(dest, newVal, state)) {
          const addr = getEffectiveAddress(dest, state);
          if (addr !== null) {
            state.memory[addr] = newVal & 0xFF;
          }
        }
        recordFlag('CF', c > 0 && (((newVal >> 15) & 1) !== 0));
        recordFlag('OF', c === 1 && ((destVal >> 15) !== (newVal >> 15)));
        break;
      }
      
      case 'ROR': {
        // ROR dest, count - rotate right
        if (operands.length !== 2) {
          result.success = false;
          result.error = 'ROR requires 2 operands';
          return result;
        }
        const [dest, countStr] = operands;
        const destVal = getOperandValue(dest, state) ?? 0;
        const count = getOperandValue(countStr, state) ?? 1;
        const c = count & 0xF;
        let newVal = destVal;
        for (let i = 0; i < c; i++) {
          const lsb = newVal & 1;
          newVal = ((newVal >> 1) | (lsb << 15)) & 0xFFFF;
        }
        if (!setOperandValue(dest, newVal, state)) {
          const addr = getEffectiveAddress(dest, state);
          if (addr !== null) {
            state.memory[addr] = newVal & 0xFF;
          }
        }
        recordFlag('CF', c > 0 && ((newVal & 0x8000) !== 0));
        recordFlag('OF', c === 1 && (((newVal >> 15) & 1) !== ((newVal >> 14) & 1)));
        break;
      }
      
      // ===== CONTROL FLOW =====
      case 'JMP': {
        // JMP target - unconditional jump
        if (operands.length !== 1) {
          result.success = false;
          result.error = 'JMP requires 1 operand';
          return result;
        }
        const target = operands[0].toUpperCase();
        if (labels.has(target)) {
          state.IP = labels.get(target)!;
          result.ipChanged = true;
        } else {
          const addr = getOperandValue(target, state);
          if (addr !== null) {
            state.IP = addr;
            result.ipChanged = true;
          }
        }
        break;
      }
      
      case 'JE':
      case 'JZ': {
        // JE/JZ - jump if equal/zero
        if (operands.length !== 1) {
          result.success = false;
          result.error = 'JE requires 1 operand';
          return result;
        }
        if (state.flags.ZF) {
          const target = operands[0].toUpperCase();
          if (labels.has(target)) {
            state.IP = labels.get(target)!;
            result.ipChanged = true;
          }
        }
        break;
      }
      
      case 'JNE':
      case 'JNZ': {
        // JNE/JNZ - jump if not equal/non-zero
        if (operands.length !== 1) {
          result.success = false;
          result.error = 'JNE requires 1 operand';
          return result;
        }
        if (!state.flags.ZF) {
          const target = operands[0].toUpperCase();
          if (labels.has(target)) {
            state.IP = labels.get(target)!;
            result.ipChanged = true;
          }
        }
        break;
      }
      
      case 'JL':
      case 'JNGE': {
        // JL - jump if less (SF != OF)
        if (operands.length !== 1) {
          result.success = false;
          result.error = 'JL requires 1 operand';
          return result;
        }
        if (state.flags.SF !== state.flags.OF) {
          const target = operands[0].toUpperCase();
          if (labels.has(target)) {
            state.IP = labels.get(target)!;
            result.ipChanged = true;
          }
        }
        break;
      }
      
      case 'JLE':
      case 'JNG': {
        // JLE - jump if less or equal (ZF=1 or SF != OF)
        if (operands.length !== 1) {
          result.success = false;
          result.error = 'JLE requires 1 operand';
          return result;
        }
        if (state.flags.ZF || (state.flags.SF !== state.flags.OF)) {
          const target = operands[0].toUpperCase();
          if (labels.has(target)) {
            state.IP = labels.get(target)!;
            result.ipChanged = true;
          }
        }
        break;
      }
      
      case 'JG':
      case 'JNLE': {
        // JG - jump if greater (ZF=0 and SF=OF)
        if (operands.length !== 1) {
          result.success = false;
          result.error = 'JG requires 1 operand';
          return result;
        }
        if (!state.flags.ZF && (state.flags.SF === state.flags.OF)) {
          const target = operands[0].toUpperCase();
          if (labels.has(target)) {
            state.IP = labels.get(target)!;
            result.ipChanged = true;
          }
        }
        break;
      }
      
      case 'JGE':
      case 'JNL': {
        // JGE - jump if greater or equal (SF=OF)
        if (operands.length !== 1) {
          result.success = false;
          result.error = 'JGE requires 1 operand';
          return result;
        }
        if (state.flags.SF === state.flags.OF) {
          const target = operands[0].toUpperCase();
          if (labels.has(target)) {
            state.IP = labels.get(target)!;
            result.ipChanged = true;
          }
        }
        break;
      }
      
      case 'JC': {
        // JC - jump if carry
        if (operands.length !== 1) {
          result.success = false;
          result.error = 'JC requires 1 operand';
          return result;
        }
        if (state.flags.CF) {
          const target = operands[0].toUpperCase();
          if (labels.has(target)) {
            state.IP = labels.get(target)!;
            result.ipChanged = true;
          }
        }
        break;
      }
      
      case 'JNC': {
        // JNC - jump if not carry
        if (operands.length !== 1) {
          result.success = false;
          result.error = 'JNC requires 1 operand';
          return result;
        }
        if (!state.flags.CF) {
          const target = operands[0].toUpperCase();
          if (labels.has(target)) {
            state.IP = labels.get(target)!;
            result.ipChanged = true;
          }
        }
        break;
      }
      
      case 'JO': {
        // JO - jump if overflow
        if (operands.length !== 1) {
          result.success = false;
          result.error = 'JO requires 1 operand';
          return result;
        }
        if (state.flags.OF) {
          const target = operands[0].toUpperCase();
          if (labels.has(target)) {
            state.IP = labels.get(target)!;
            result.ipChanged = true;
          }
        }
        break;
      }
      
      case 'JNO': {
        // JNO - jump if not overflow
        if (operands.length !== 1) {
          result.success = false;
          result.error = 'JNO requires 1 operand';
          return result;
        }
        if (!state.flags.OF) {
          const target = operands[0].toUpperCase();
          if (labels.has(target)) {
            state.IP = labels.get(target)!;
            result.ipChanged = true;
          }
        }
        break;
      }
      
      case 'JS': {
        // JS - jump if sign (negative)
        if (operands.length !== 1) {
          result.success = false;
          result.error = 'JS requires 1 operand';
          return result;
        }
        if (state.flags.SF) {
          const target = operands[0].toUpperCase();
          if (labels.has(target)) {
            state.IP = labels.get(target)!;
            result.ipChanged = true;
          }
        }
        break;
      }
      
      case 'JNS': {
        // JNS - jump if not sign (non-negative)
        if (operands.length !== 1) {
          result.success = false;
          result.error = 'JNS requires 1 operand';
          return result;
        }
        if (!state.flags.SF) {
          const target = operands[0].toUpperCase();
          if (labels.has(target)) {
            state.IP = labels.get(target)!;
            result.ipChanged = true;
          }
        }
        break;
      }
      
      case 'LOOP': {
        // LOOP - decrement CX and jump if CX != 0
        if (operands.length !== 1) {
          result.success = false;
          result.error = 'LOOP requires 1 operand';
          return result;
        }
        state.CX = (state.CX - 1) & 0xFFFF;
        if (state.CX !== 0) {
          const target = operands[0].toUpperCase();
          if (labels.has(target)) {
            state.IP = labels.get(target)!;
            result.ipChanged = true;
          }
        }
        break;
      }
      
      case 'LOOPE':
      case 'LOOPZ': {
        // LOOPE/LOOPZ - loop while equal/zero (CX-- and ZF=1 and CX!=0)
        if (operands.length !== 1) {
          result.success = false;
          result.error = 'LOOPE requires 1 operand';
          return result;
        }
        state.CX = (state.CX - 1) & 0xFFFF;
        if (state.CX !== 0 && state.flags.ZF) {
          const target = operands[0].toUpperCase();
          if (labels.has(target)) {
            state.IP = labels.get(target)!;
            result.ipChanged = true;
          }
        }
        break;
      }
      
      case 'LOOPNE':
      case 'LOOPNZ': {
        // LOOPNE/LOOPNZ - loop while not equal/non-zero
        if (operands.length !== 1) {
          result.success = false;
          result.error = 'LOOPNE requires 1 operand';
          return result;
        }
        state.CX = (state.CX - 1) & 0xFFFF;
        if (state.CX !== 0 && !state.flags.ZF) {
          const target = operands[0].toUpperCase();
          if (labels.has(target)) {
            state.IP = labels.get(target)!;
            result.ipChanged = true;
          }
        }
        break;
      }
      
      case 'JCXZ': {
        // JCXZ - jump if CX = 0
        if (operands.length !== 1) {
          result.success = false;
          result.error = 'JCXZ requires 1 operand';
          return result;
        }
        if (state.CX === 0) {
          const target = operands[0].toUpperCase();
          if (labels.has(target)) {
            state.IP = labels.get(target)!;
            result.ipChanged = true;
          }
        }
        break;
      }
      
      case 'CALL': {
        // CALL target - call procedure
        if (operands.length !== 1) {
          result.success = false;
          result.error = 'CALL requires 1 operand';
          return result;
        }
        // Push return address
        state.SP = (state.SP - 2) & 0xFFFF;
        state.memory[state.SP] = state.IP & 0xFF;
        state.memory[(state.SP + 1) & 0xFFFF] = (state.IP >> 8) & 0xFF;
        // Jump to target
        const target = operands[0].toUpperCase();
        if (labels.has(target)) {
          state.IP = labels.get(target)!;
          result.ipChanged = true;
        }
        break;
      }
      
      case 'RET': {
        // RET - return from procedure
        // Pop return address
        const low = state.memory[state.SP];
        const high = state.memory[(state.SP + 1) & 0xFFFF];
        state.IP = low | (high << 8);
        state.SP = (state.SP + 2) & 0xFFFF;
        result.ipChanged = true;
        break;
      }
      
      case 'INT': {
        // INT n - software interrupt
        if (operands.length !== 1) {
          result.success = false;
          result.error = 'INT requires 1 operand';
          return result;
        }
        const intNum = getOperandValue(operands[0], state);
        if (intNum === 0x21) {
          // DOS interrupt - simplified handling
          const ah = (state.AX >> 8) & 0xFF;
          if (ah === 0x4C) {
            // Exit program
            state.halted = true;
            result.halted = true;
          }
          // Other INT 21h functions could be handled here
        }
        break;
      }
      
      case 'HLT': {
        // HLT - halt CPU
        state.halted = true;
        result.halted = true;
        break;
      }
      
      case 'NOP': {
        // NOP - no operation
        break;
      }
      
      case 'STC': {
        // STC - set carry flag
        recordFlag('CF', true);
        break;
      }
      
      case 'CLC': {
        // CLC - clear carry flag
        recordFlag('CF', false);
        break;
      }
      
      case 'STD': {
        // STD - set direction flag
        recordFlag('DF', true);
        break;
      }
      
      case 'CLD': {
        // CLD - clear direction flag
        recordFlag('DF', false);
        break;
      }
      
      case 'STI': {
        // STI - set interrupt flag
        recordFlag('IF', true);
        break;
      }
      
      case 'CLI': {
        // CLI - clear interrupt flag
        recordFlag('IF', false);
        break;
      }
      
      default:
        result.success = false;
        result.error = `Unknown instruction: ${mnemonic}`;
        return result;
    }
    
    // If IP wasn't changed by a control flow instruction, advance it
    if (!result.ipChanged && !result.halted) {
      state.IP = (state.IP + 1) & 0xFFFF;
    }
    
    // Apply flag modifications
    for (const [flagName, value] of Object.entries(result.flagsModified)) {
      if (flagName in state.flags) {
        (state.flags as unknown as Record<string, boolean>)[flagName] = value;
      }
    }
    
  } catch (err) {
    result.success = false;
    result.error = err instanceof Error ? err.message : 'Unknown execution error';
  }
  
  return result;
}
