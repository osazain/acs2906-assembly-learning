#!/usr/bin/env npx tsx
/**
 * Build instruction-index.json
 * 
 * Parses cross-reference documents and generates a comprehensive 8086 instruction index.
 * This script extracts:
 * - All valid instructions from lectures
 * - Instruction to example mappings
 * - Syntax, flags affected, and lecture references
 * 
 * Usage: npx tsx scripts/build-instruction-index.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import type { InstructionIndex, InstructionEntry } from '../src/lib/types';

// Complete 8086 instruction set categorized by function
const INSTRUCTION_DEFINITIONS: Record<string, Omit<InstructionEntry, 'examples' | 'lectureRefs'>> = {
  // Data Transfer Instructions
  MOV: {
    name: 'Move',
    category: 'data-transfer',
    syntax: 'MOV dest, src',
    flagsAffected: [],
    operation: 'Copies data from source to destination. Both operands must be same size.',
    relatedInstructions: ['XCHG', 'MOVSX', 'MOVZX', 'LEA', 'LAHF', 'SAHF'],
  },
  XCHG: {
    name: 'Exchange',
    category: 'data-transfer',
    syntax: 'XCHG operand1, operand2',
    flagsAffected: [],
    operation: 'Exchanges values between two operands.',
    relatedInstructions: ['MOV', 'XCHG'],
  },
  PUSH: {
    name: 'Push to Stack',
    category: 'data-transfer',
    syntax: 'PUSH source',
    flagsAffected: [],
    operation: 'Decrements SP by 2 and copies source to top of stack.',
    relatedInstructions: ['POP', 'PUSHF', 'POPF'],
  },
  POP: {
    name: 'Pop from Stack',
    category: 'data-transfer',
    syntax: 'POP destination',
    flagsAffected: [],
    operation: 'Copies top of stack to destination and increments SP by 2.',
    relatedInstructions: ['PUSH', 'POPF'],
  },
  LEA: {
    name: 'Load Effective Address',
    category: 'data-transfer',
    syntax: 'LEA destination, source',
    flagsAffected: [],
    operation: 'Loads offset address of source into destination register.',
    relatedInstructions: ['MOV', ' LDS', 'LES'],
  },
  LAHF: {
    name: 'Load AH from Flags',
    category: 'data-transfer',
    syntax: 'LAHF',
    flagsAffected: [],
    operation: 'Copies SF, ZF, AF, PF, CF to AH bits 0-4.',
    relatedInstructions: ['SAHF'],
  },
  SAHF: {
    name: 'Store AH into Flags',
    category: 'data-transfer',
    syntax: 'SAHF',
    flagsAffected: ['SF', 'ZF', 'AF', 'PF', 'CF'],
    operation: 'Stores AH bits 0-4 into the flag register.',
    relatedInstructions: ['LAHF'],
  },
  CBW: {
    name: 'Convert Byte to Word',
    category: 'data-transfer',
    syntax: 'CBW',
    flagsAffected: [],
    operation: 'Extends AL into AH by sign extension.',
    relatedInstructions: ['CWD', 'CWDE', 'CDQ'],
  },
  CWD: {
    name: 'Convert Word to Doubleword',
    category: 'data-transfer',
    syntax: 'CWD',
    flagsAffected: [],
    operation: 'Extends AX into DX:AX by sign extension.',
    relatedInstructions: ['CBW', 'CWDE', 'CDQ'],
  },
  IN: {
    name: 'Input from Port',
    category: 'io',
    syntax: 'IN accumulator, port',
    flagsAffected: [],
    operation: 'Transfers data from I/O port to AL, AX, or EAX.',
    relatedInstructions: ['OUT'],
  },
  OUT: {
    name: 'Output to Port',
    category: 'io',
    syntax: 'OUT port, accumulator',
    flagsAffected: [],
    operation: 'Transfers data from AL, AX, or EAX to I/O port.',
    relatedInstructions: ['IN'],
  },
  
  // Arithmetic Instructions
  ADD: {
    name: 'Add',
    category: 'arithmetic',
    syntax: 'ADD dest, src',
    flagsAffected: ['OF', 'SF', 'ZF', 'AF', 'CF', 'PF'],
    operation: 'Adds source to destination and stores result in destination.',
    relatedInstructions: ['ADC', 'SUB', 'INC', 'NEG'],
  },
  ADC: {
    name: 'Add with Carry',
    category: 'arithmetic',
    syntax: 'ADC dest, src',
    flagsAffected: ['OF', 'SF', 'ZF', 'AF', 'CF', 'PF'],
    operation: 'Adds source and CF to destination.',
    relatedInstructions: ['ADD', 'SBB'],
  },
  SUB: {
    name: 'Subtract',
    category: 'arithmetic',
    syntax: 'SUB dest, src',
    flagsAffected: ['OF', 'SF', 'ZF', 'AF', 'CF', 'PF'],
    operation: 'Subtracts source from destination.',
    relatedInstructions: ['ADD', 'SBB', 'DEC', 'NEG'],
  },
  SBB: {
    name: 'Subtract with Borrow',
    category: 'arithmetic',
    syntax: 'SBB dest, src',
    flagsAffected: ['OF', 'SF', 'ZF', 'AF', 'CF', 'PF'],
    operation: 'Subtracts source and CF from destination.',
    relatedInstructions: ['SUB', 'ADC'],
  },
  INC: {
    name: 'Increment',
    category: 'arithmetic',
    syntax: 'INC destination',
    flagsAffected: ['OF', 'SF', 'ZF', 'AF', 'PF'],
    operation: 'Adds 1 to destination.',
    relatedInstructions: ['DEC', 'ADD'],
  },
  DEC: {
    name: 'Decrement',
    category: 'arithmetic',
    syntax: 'DEC destination',
    flagsAffected: ['OF', 'SF', 'ZF', 'AF', 'PF'],
    operation: 'Subtracts 1 from destination.',
    relatedInstructions: ['INC', 'SUB'],
  },
  MUL: {
    name: 'Unsigned Multiply',
    category: 'arithmetic',
    syntax: 'MUL source',
    flagsAffected: ['CF', 'OF'],
    operation: 'Unsigned multiplication: AL*src -> AX, AX*src -> DX:AX',
    relatedInstructions: ['IMUL', 'DIV', 'IDIV'],
  },
  IMUL: {
    name: 'Signed Multiply',
    category: 'arithmetic',
    syntax: 'IMUL source',
    flagsAffected: ['CF', 'OF'],
    operation: 'Signed multiplication.',
    relatedInstructions: ['MUL', 'IMUL', 'DIV', 'IDIV'],
  },
  DIV: {
    name: 'Unsigned Divide',
    category: 'arithmetic',
    syntax: 'DIV source',
    flagsAffected: ['CF', 'OF', 'SF', 'ZF', 'AF', 'PF'],
    operation: 'Unsigned division: AX/src -> AL:AH, DX:AX/src -> AX:DX',
    relatedInstructions: ['IDIV', 'MUL', 'IMUL'],
  },
  IDIV: {
    name: 'Signed Divide',
    category: 'arithmetic',
    syntax: 'IDIV source',
    flagsAffected: ['CF', 'OF', 'SF', 'ZF', 'AF', 'PF'],
    operation: 'Signed integer division.',
    relatedInstructions: ['DIV', 'MUL', 'IMUL'],
  },
  CMP: {
    name: 'Compare',
    category: 'arithmetic',
    syntax: 'CMP dest, src',
    flagsAffected: ['OF', 'SF', 'ZF', 'AF', 'CF', 'PF'],
    operation: 'Subtracts source from destination without storing result. Used for conditional jumps.',
    relatedInstructions: ['TEST', 'SUB'],
  },
  NEG: {
    name: 'Negate',
    category: 'arithmetic',
    syntax: 'NEG destination',
    flagsAffected: ['OF', 'SF', 'ZF', 'AF', 'CF', 'PF'],
    operation: 'Two\'s complement negation.',
    relatedInstructions: ['NOT', 'SUB'],
  },
  AAS: {
    name: 'ASCII Adjust After Subtraction',
    category: 'arithmetic',
    syntax: 'AAS',
    flagsAffected: ['CF', 'AF'],
    operation: 'Adjusts AL after unpacked BCD subtraction.',
    relatedInstructions: ['AAA', 'DAS', 'AAM'],
  },
  AAM: {
    name: 'ASCII Adjust After Multiply',
    category: 'arithmetic',
    syntax: 'AAM',
    flagsAffected: ['SF', 'ZF', 'PF'],
    operation: 'Adjusts AX after unpacked BCD multiplication.',
    relatedInstructions: ['AAD', 'AAA', 'AAS'],
  },
  AAD: {
    name: 'ASCII Adjust Before Division',
    category: 'arithmetic',
    syntax: 'AAD',
    flagsAffected: ['SF', 'ZF', 'PF'],
    operation: 'Adjusts AX before unpacked BCD division.',
    relatedInstructions: ['AAM', 'AAA', 'AAS'],
  },
  AAA: {
    name: 'ASCII Adjust After Addition',
    category: 'arithmetic',
    syntax: 'AAA',
    flagsAffected: ['CF', 'AF'],
    operation: 'Adjusts AL after unpacked BCD addition.',
    relatedInstructions: ['AAS', 'DAS', 'AAM'],
  },
  DAA: {
    name: 'Decimal Adjust After Addition',
    category: 'arithmetic',
    syntax: 'DAA',
    flagsAffected: ['CF', 'AF', 'SF', 'ZF', 'PF'],
    operation: 'Adjusts AL after packed BCD addition.',
    relatedInstructions: ['DAS', 'AAA', 'AAS'],
  },
  DAS: {
    name: 'Decimal Adjust After Subtraction',
    category: 'arithmetic',
    syntax: 'DAS',
    flagsAffected: ['CF', 'AF', 'SF', 'ZF', 'PF'],
    operation: 'Adjusts AL after packed BCD subtraction.',
    relatedInstructions: ['DAA', 'AAS', 'AAA'],
  },
  
  // Logical Instructions
  AND: {
    name: 'Logical AND',
    category: 'logical',
    syntax: 'AND dest, src',
    flagsAffected: ['OF', 'CF', 'SF', 'ZF', 'PF', 'AF'],
    operation: 'Bitwise AND between destination and source.',
    relatedInstructions: ['OR', 'XOR', 'NOT', 'TEST'],
  },
  OR: {
    name: 'Logical OR',
    category: 'logical',
    syntax: 'OR dest, src',
    flagsAffected: ['OF', 'CF', 'SF', 'ZF', 'PF', 'AF'],
    operation: 'Bitwise OR between destination and source.',
    relatedInstructions: ['AND', 'XOR', 'NOT', 'TEST'],
  },
  XOR: {
    name: 'Logical XOR',
    category: 'logical',
    syntax: 'XOR dest, src',
    flagsAffected: ['OF', 'CF', 'SF', 'ZF', 'PF', 'AF'],
    operation: 'Bitwise XOR between destination and source.',
    relatedInstructions: ['AND', 'OR', 'NOT'],
  },
  NOT: {
    name: 'Logical NOT',
    category: 'logical',
    syntax: 'NOT destination',
    flagsAffected: [],
    operation: 'Bitwise NOT (one\'s complement).',
    relatedInstructions: ['AND', 'OR', 'XOR'],
  },
  TEST: {
    name: 'Test (Logical Compare)',
    category: 'logical',
    syntax: 'TEST dest, src',
    flagsAffected: ['OF', 'CF', 'SF', 'ZF', 'PF', 'AF'],
    operation: 'Performs AND operation without storing result. Used for flag testing.',
    relatedInstructions: ['CMP', 'AND'],
  },
  
  // Shift and Rotate Instructions
  SHL: {
    name: 'Shift Logical Left',
    category: 'shift',
    syntax: 'SHL dest, count',
    flagsAffected: ['CF', 'OF', 'SF', 'ZF', 'PF'],
    operation: 'Shifts bits left, fills with zeros. CF = last bit shifted out.',
    relatedInstructions: ['SHR', 'SAL', 'SAR', 'ROL', 'ROR'],
  },
  SHR: {
    name: 'Shift Logical Right',
    category: 'shift',
    syntax: 'SHR dest, count',
    flagsAffected: ['CF', 'OF', 'SF', 'ZF', 'PF'],
    operation: 'Shifts bits right, fills with zeros. CF = last bit shifted out.',
    relatedInstructions: ['SHL', 'SAR', 'SAL', 'ROL', 'ROR'],
  },
  SAL: {
    name: 'Shift Arithmetic Left',
    category: 'shift',
    syntax: 'SAL dest, count',
    flagsAffected: ['CF', 'OF', 'SF', 'ZF', 'PF'],
    operation: 'Same as SHL. Preserves sign for arithmetic operations.',
    relatedInstructions: ['SHL', 'SHR', 'SAR'],
  },
  SAR: {
    name: 'Shift Arithmetic Right',
    category: 'shift',
    syntax: 'SAR dest, count',
    flagsAffected: ['CF', 'OF', 'SF', 'ZF', 'PF'],
    operation: 'Shifts bits right, fills with sign bit. CF = last bit shifted out.',
    relatedInstructions: ['SHL', 'SHR', 'SAL'],
  },
  ROL: {
    name: 'Rotate Left',
    category: 'shift',
    syntax: 'ROL dest, count',
    flagsAffected: ['CF', 'OF'],
    operation: 'Rotates bits left, wraps to LSB.',
    relatedInstructions: ['ROR', 'RCL', 'RCR'],
  },
  ROR: {
    name: 'Rotate Right',
    category: 'shift',
    syntax: 'ROR dest, count',
    flagsAffected: ['CF', 'OF'],
    operation: 'Rotates bits right, wraps to MSB.',
    relatedInstructions: ['ROL', 'RCL', 'RCR'],
  },
  RCL: {
    name: 'Rotate Through Carry Left',
    category: 'shift',
    syntax: 'RCL dest, count',
    flagsAffected: ['CF', 'OF'],
    operation: 'Rotates through CF: CF <- MSB <- ... <- LSB <- CF.',
    relatedInstructions: ['RCR', 'ROL', 'ROR'],
  },
  RCR: {
    name: 'Rotate Through Carry Right',
    category: 'shift',
    syntax: 'RCR dest, count',
    flagsAffected: ['CF', 'OF'],
    operation: 'Rotates through CF: CF -> MSB -> ... -> LSB -> CF.',
    relatedInstructions: ['RCL', 'ROL', 'ROR'],
  },
  
  // Control Flow Instructions
  JMP: {
    name: 'Unconditional Jump',
    category: 'control-flow',
    syntax: 'JMP target',
    flagsAffected: [],
    operation: 'Transfers control to target address unconditionally.',
    relatedInstructions: ['JE', 'JNE', 'JL', 'JLE', 'JG', 'JGE', 'JA', 'JB'],
  },
  JE: {
    name: 'Jump if Equal',
    category: 'control-flow',
    syntax: 'JE target',
    flagsAffected: [],
    operation: 'Jumps if ZF = 1.',
    relatedInstructions: ['JNE', 'JZ', 'JNZ'],
  },
  JNE: {
    name: 'Jump if Not Equal',
    category: 'control-flow',
    syntax: 'JNE target',
    flagsAffected: [],
    operation: 'Jumps if ZF = 0.',
    relatedInstructions: ['JE', 'JZ', 'JNZ'],
  },
  JZ: {
    name: 'Jump if Zero',
    category: 'control-flow',
    syntax: 'JZ target',
    flagsAffected: [],
    operation: 'Jumps if ZF = 1.',
    relatedInstructions: ['JNZ', 'JE', 'JNE'],
  },
  JNZ: {
    name: 'Jump if Not Zero',
    category: 'control-flow',
    syntax: 'JNZ target',
    flagsAffected: [],
    operation: 'Jumps if ZF = 0.',
    relatedInstructions: ['JZ', 'JNE', 'JE'],
  },
  JL: {
    name: 'Jump if Less (Signed)',
    category: 'control-flow',
    syntax: 'JL target',
    flagsAffected: [],
    operation: 'Jumps if SF != OF.',
    relatedInstructions: ['JGE', 'JNGE', 'JLE', 'JG'],
  },
  JLE: {
    name: 'Jump if Less or Equal (Signed)',
    category: 'control-flow',
    syntax: 'JLE target',
    flagsAffected: [],
    operation: 'Jumps if ZF = 1 or SF != OF.',
    relatedInstructions: ['JG', 'JL', 'JGE', 'JNLE'],
  },
  JG: {
    name: 'Jump if Greater (Signed)',
    category: 'control-flow',
    syntax: 'JG target',
    flagsAffected: [],
    operation: 'Jumps if ZF = 0 and SF = OF.',
    relatedInstructions: ['JLE', 'JL', 'JGE', 'JNLE'],
  },
  JGE: {
    name: 'Jump if Greater or Equal (Signed)',
    category: 'control-flow',
    syntax: 'JGE target',
    flagsAffected: [],
    operation: 'Jumps if SF = OF.',
    relatedInstructions: ['JL', 'JNGE', 'JLE', 'JG'],
  },
  JA: {
    name: 'Jump if Above (Unsigned)',
    category: 'control-flow',
    syntax: 'JA target',
    flagsAffected: [],
    operation: 'Jumps if CF = 0 and ZF = 0.',
    relatedInstructions: ['JBE', 'JB', 'JAE'],
  },
  JB: {
    name: 'Jump if Below (Unsigned)',
    category: 'control-flow',
    syntax: 'JB target',
    flagsAffected: [],
    operation: 'Jumps if CF = 1.',
    relatedInstructions: ['JAE', 'JA', 'JBE'],
  },
  JAE: {
    name: 'Jump if Above or Equal (Unsigned)',
    category: 'control-flow',
    syntax: 'JAE target',
    flagsAffected: [],
    operation: 'Jumps if CF = 0.',
    relatedInstructions: ['JB', 'JA', 'JBE'],
  },
  JBE: {
    name: 'Jump if Below or Equal (Unsigned)',
    category: 'control-flow',
    syntax: 'JBE target',
    flagsAffected: [],
    operation: 'Jumps if CF = 1 or ZF = 1.',
    relatedInstructions: ['JA', 'JB', 'JAE'],
  },
  JC: {
    name: 'Jump if Carry',
    category: 'control-flow',
    syntax: 'JC target',
    flagsAffected: [],
    operation: 'Jumps if CF = 1.',
    relatedInstructions: ['JNC', 'JB'],
  },
  JNC: {
    name: 'Jump if Not Carry',
    category: 'control-flow',
    syntax: 'JNC target',
    flagsAffected: [],
    operation: 'Jumps if CF = 0.',
    relatedInstructions: ['JC', 'JAE'],
  },
  JO: {
    name: 'Jump if Overflow',
    category: 'control-flow',
    syntax: 'JO target',
    flagsAffected: [],
    operation: 'Jumps if OF = 1.',
    relatedInstructions: ['JNO'],
  },
  JNO: {
    name: 'Jump if Not Overflow',
    category: 'control-flow',
    syntax: 'JNO target',
    flagsAffected: [],
    operation: 'Jumps if OF = 0.',
    relatedInstructions: ['JO'],
  },
  JS: {
    name: 'Jump if Sign',
    category: 'control-flow',
    syntax: 'JS target',
    flagsAffected: [],
    operation: 'Jumps if SF = 1 (negative).',
    relatedInstructions: ['JNS'],
  },
  JNS: {
    name: 'Jump if Not Sign',
    category: 'control-flow',
    syntax: 'JNS target',
    flagsAffected: [],
    operation: 'Jumps if SF = 0 (positive or zero).',
    relatedInstructions: ['JS'],
  },
  LOOP: {
    name: 'Loop',
    category: 'control-flow',
    syntax: 'LOOP target',
    flagsAffected: [],
    operation: 'Decrements CX and jumps if CX != 0.',
    relatedInstructions: ['LOOPE', 'LOOPNE', 'LOOPZ', 'LOOPNZ'],
  },
  LOOPE: {
    name: 'Loop if Equal',
    category: 'control-flow',
    syntax: 'LOOPE target',
    flagsAffected: [],
    operation: 'Decrements CX, jumps if CX != 0 and ZF = 1.',
    relatedInstructions: ['LOOPNE', 'LOOPZ', 'LOOP'],
  },
  LOOPNE: {
    name: 'Loop if Not Equal',
    category: 'control-flow',
    syntax: 'LOOPNE target',
    flagsAffected: [],
    operation: 'Decrements CX, jumps if CX != 0 and ZF = 0.',
    relatedInstructions: ['LOOPE', 'LOOPNZ', 'LOOP'],
  },
  LOOPZ: {
    name: 'Loop if Zero',
    category: 'control-flow',
    syntax: 'LOOPZ target',
    flagsAffected: [],
    operation: 'Same as LOOPE.',
    relatedInstructions: ['LOOPNZ', 'LOOPE', 'LOOP'],
  },
  LOOPNZ: {
    name: 'Loop if Not Zero',
    category: 'control-flow',
    syntax: 'LOOPNZ target',
    flagsAffected: [],
    operation: 'Same as LOOPNE.',
    relatedInstructions: ['LOOPZ', 'LOOPNE', 'LOOP'],
  },
  JCXZ: {
    name: 'Jump if CX is Zero',
    category: 'control-flow',
    syntax: 'JCXZ target',
    flagsAffected: [],
    operation: 'Jumps if CX = 0 (regardless of other flags).',
    relatedInstructions: ['JECXZ', 'LOOP'],
  },
  CALL: {
    name: 'Call Procedure',
    category: 'procedure',
    syntax: 'CALL target',
    flagsAffected: [],
    operation: 'Pushes return address to stack and jumps to target.',
    relatedInstructions: ['RET', 'INT', 'IRET'],
  },
  RET: {
    name: 'Return from Procedure',
    category: 'procedure',
    syntax: 'RET',
    flagsAffected: [],
    operation: 'Pops return address from stack and jumps back.',
    relatedInstructions: ['CALL', 'RETF'],
  },
  INT: {
    name: 'Software Interrupt',
    category: 'procedure',
    syntax: 'INT number',
    flagsAffected: [],
    operation: 'Calls interrupt handler.',
    relatedInstructions: ['INTO', 'IRET'],
  },
  INTO: {
    name: 'Interrupt on Overflow',
    category: 'procedure',
    syntax: 'INTO',
    flagsAffected: [],
    operation: 'Calls INT 4 if OF = 1.',
    relatedInstructions: ['INT', 'IRET'],
  },
  IRET: {
    name: 'Return from Interrupt',
    category: 'procedure',
    syntax: 'IRET',
    flagsAffected: ['all'],
    operation: 'Returns from interrupt handler, restores flags.',
    relatedInstructions: ['INT', 'CALL', 'RET'],
  },
  
  // Processor Control Instructions
  NOP: {
    name: 'No Operation',
    category: 'procedure',
    syntax: 'NOP',
    flagsAffected: [],
    operation: 'Does nothing. Used for padding or timing.',
    relatedInstructions: [],
  },
  HLT: {
    name: 'Halt',
    category: 'procedure',
    syntax: 'HLT',
    flagsAffected: [],
    operation: 'Halts CPU until interrupt or reset.',
    relatedInstructions: [],
  },
  WAIT: {
    name: 'Wait',
    category: 'procedure',
    syntax: 'WAIT',
    flagsAffected: [],
    operation: 'Makes CPU wait until BUSY pin is inactive.',
    relatedInstructions: [],
  },
  ESC: {
    name: 'Escape',
    category: 'procedure',
    syntax: 'ESC opcode, source',
    flagsAffected: [],
    operation: 'Provides access to coprocessor.',
    relatedInstructions: [],
  },
  LOCK: {
    name: 'Lock Prefix',
    category: 'procedure',
    syntax: 'LOCK instruction',
    flagsAffected: [],
    operation: 'Asserts LOCK pin during instruction execution.',
    relatedInstructions: [],
  },
  REP: {
    name: 'Repeat Prefix',
    category: 'procedure',
    syntax: 'REP instruction',
    flagsAffected: [],
    operation: 'Repeats string instruction CX times.',
    relatedInstructions: ['REPE', 'REPNE', 'MOVS', 'CMPS', 'SCAS', 'LODS', 'STOS'],
  },
  REPE: {
    name: 'Repeat if Equal',
    category: 'procedure',
    syntax: 'REPE instruction',
    flagsAffected: [],
    operation: 'Repeats while ZF = 1 and CX != 0.',
    relatedInstructions: ['REPNE', 'REP', 'CMPS'],
  },
  REPNE: {
    name: 'Repeat if Not Equal',
    category: 'procedure',
    syntax: 'REPNE instruction',
    flagsAffected: [],
    operation: 'Repeats while ZF = 0 and CX != 0.',
    relatedInstructions: ['REPE', 'REP', 'CMPS'],
  },
  
  // String Instructions
  MOVS: {
    name: 'Move String',
    category: 'data-transfer',
    syntax: 'MOVS dest, src',
    flagsAffected: [],
    operation: 'Copies byte or word from source to destination.',
    relatedInstructions: ['MOVSB', 'MOVSW', 'REP'],
  },
  MOVSB: {
    name: 'Move String (Byte)',
    category: 'data-transfer',
    syntax: 'MOVSB',
    flagsAffected: [],
    operation: 'Copies byte from DS:SI to ES:DI.',
    relatedInstructions: ['MOVSW', 'MOVS', 'REP'],
  },
  MOVSW: {
    name: 'Move String (Word)',
    category: 'data-transfer',
    syntax: 'MOVSW',
    flagsAffected: [],
    operation: 'Copies word from DS:SI to ES:DI.',
    relatedInstructions: ['MOVSB', 'MOVS', 'REP'],
  },
  CMPS: {
    name: 'Compare Strings',
    category: 'logical',
    syntax: 'CMPS dest, src',
    flagsAffected: ['OF', 'SF', 'ZF', 'AF', 'CF', 'PF'],
    operation: 'Compares byte or word at DS:SI with ES:DI.',
    relatedInstructions: ['CMPSB', 'CMPSW', 'SCAS'],
  },
  CMPSB: {
    name: 'Compare Strings (Byte)',
    category: 'logical',
    syntax: 'CMPSB',
    flagsAffected: ['OF', 'SF', 'ZF', 'AF', 'CF', 'PF'],
    operation: 'Compares byte at DS:SI with ES:DI.',
    relatedInstructions: ['CMPSW', 'CMPS', 'REPE', 'REPNE'],
  },
  CMPSW: {
    name: 'Compare Strings (Word)',
    category: 'logical',
    syntax: 'CMPSW',
    flagsAffected: ['OF', 'SF', 'ZF', 'AF', 'CF', 'PF'],
    operation: 'Compares word at DS:SI with ES:DI.',
    relatedInstructions: ['CMPSB', 'CMPS', 'REPE', 'REPNE'],
  },
  SCAS: {
    name: 'Scan String',
    category: 'logical',
    syntax: 'SCAS dest',
    flagsAffected: ['OF', 'SF', 'ZF', 'AF', 'CF', 'PF'],
    operation: 'Scans for AL/AX value in ES:DI.',
    relatedInstructions: ['SCASB', 'SCASW', 'REPE', 'REPNE'],
  },
  SCASB: {
    name: 'Scan String (Byte)',
    category: 'logical',
    syntax: 'SCASB',
    flagsAffected: ['OF', 'SF', 'ZF', 'AF', 'CF', 'PF'],
    operation: 'Scans for AL value in ES:DI.',
    relatedInstructions: ['SCASW', 'SCAS', 'REPE', 'REPNE'],
  },
  SCASW: {
    name: 'Scan String (Word)',
    category: 'logical',
    syntax: 'SCASW',
    flagsAffected: ['OF', 'SF', 'ZF', 'AF', 'CF', 'PF'],
    operation: 'Scans for AX value in ES:DI.',
    relatedInstructions: ['SCASB', 'SCAS', 'REPE', 'REPNE'],
  },
  LODS: {
    name: 'Load String',
    category: 'data-transfer',
    syntax: 'LODS source',
    flagsAffected: [],
    operation: 'Loads byte/word from DS:SI into AL/AX.',
    relatedInstructions: ['LODSB', 'LODSW', 'STOS'],
  },
  LODSB: {
    name: 'Load String (Byte)',
    category: 'data-transfer',
    syntax: 'LODSB',
    flagsAffected: [],
    operation: 'Loads byte from DS:SI into AL.',
    relatedInstructions: ['LODSW', 'LODS', 'STOSB'],
  },
  LODSW: {
    name: 'Load String (Word)',
    category: 'data-transfer',
    syntax: 'LODSW',
    flagsAffected: [],
    operation: 'Loads word from DS:SI into AX.',
    relatedInstructions: ['LODSB', 'LODS', 'STOSW'],
  },
  STOS: {
    name: 'Store String',
    category: 'data-transfer',
    syntax: 'STOS dest',
    flagsAffected: [],
    operation: 'Stores AL/AX at ES:DI.',
    relatedInstructions: ['STOSB', 'STOSW', 'LODS'],
  },
  STOSB: {
    name: 'Store String (Byte)',
    category: 'data-transfer',
    syntax: 'STOSB',
    flagsAffected: [],
    operation: 'Stores AL at ES:DI.',
    relatedInstructions: ['STOSW', 'STOS', 'LODSB'],
  },
  STOSW: {
    name: 'Store String (Word)',
    category: 'data-transfer',
    syntax: 'STOSW',
    flagsAffected: [],
    operation: 'Stores AX at ES:DI.',
    relatedInstructions: ['STOSB', 'STOS', 'LODSW'],
  },
};

// Default instruction-to-example mappings from course materials
const INSTRUCTION_EXAMPLE_MAPPINGS: Record<string, { examples: string[], lectureRefs: { lecture: number, page?: number }[] }> = {
  MOV: {
    examples: ['HelloWorld.asm', 'Template.asm', 'Addition.asm', 'Buff2.asm', 'Buffered.asm', 'demo.asm'],
    lectureRefs: [{ lecture: 4, page: 25 }, { lecture: 4, page: 52 }],
  },
  ADD: {
    examples: ['Addition.asm', 'demo.asm'],
    lectureRefs: [{ lecture: 4 }, { lecture: 6 }],
  },
  SUB: {
    examples: ['demo.asm'],
    lectureRefs: [{ lecture: 6 }],
  },
  PUSH: {
    examples: ['proc.asm'],
    lectureRefs: [{ lecture: 7 }],
  },
  POP: {
    examples: ['proc.asm'],
    lectureRefs: [{ lecture: 7 }],
  },
  CMP: {
    examples: ['ifelse.asm'],
    lectureRefs: [{ lecture: 6 }],
  },
  JMP: {
    examples: ['forloop.asm', 'ifelse.asm', 'recurs.asm'],
    lectureRefs: [{ lecture: 6 }],
  },
  JE: {
    examples: ['ifelse.asm', 'sort.asm'],
    lectureRefs: [{ lecture: 6 }],
  },
  JNE: {
    examples: ['ifelse.asm'],
    lectureRefs: [{ lecture: 6 }],
  },
  LOOP: {
    examples: ['forloop.asm'],
    lectureRefs: [{ lecture: 6 }],
  },
  CALL: {
    examples: ['proc.asm', 'recurs.asm'],
    lectureRefs: [{ lecture: 7 }],
  },
  RET: {
    examples: ['proc.asm', 'recurs.asm'],
    lectureRefs: [{ lecture: 7 }],
  },
};

function buildInstructionIndex(): InstructionIndex {
  const index: InstructionIndex = {};
  
  for (const [mnemonic, definition] of Object.entries(INSTRUCTION_DEFINITIONS)) {
    const mapping = INSTRUCTION_EXAMPLE_MAPPINGS[mnemonic.toUpperCase()];
    
    index[mnemonic] = {
      ...definition,
      examples: mapping?.examples || [],
      lectureRefs: mapping?.lectureRefs || [],
    };
  }
  
  return index;
}

function main() {
  console.log('Building instruction index...');
  
  const instructionIndex = buildInstructionIndex();
  
  // Output
  const outputDir = path.join(process.cwd(), 'data', 'processed');
  fs.mkdirSync(outputDir, { recursive: true });
  
  const outputPath = path.join(outputDir, 'instruction-index.json');
  fs.writeFileSync(outputPath, JSON.stringify(instructionIndex, null, 2));
  
  console.log(`✓ Created ${outputPath}`);
  console.log(`  Total instructions: ${Object.keys(instructionIndex).length}`);
  
  // Summary by category
  const categories = new Set<string>();
  for (const inst of Object.values(instructionIndex)) {
    categories.add(inst.category);
  }
  
  console.log('\nInstructions by category:');
  for (const cat of categories) {
    const count = Object.values(instructionIndex).filter(i => i.category === cat).length;
    console.log(`  ${cat}: ${count}`);
  }
}

main();
