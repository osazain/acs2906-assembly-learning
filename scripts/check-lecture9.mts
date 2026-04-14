import { readFileSync } from 'fs';
import { join } from 'path';

const base = 'C:\\OsaZain_stuff\\edu\\ACS2906\\acs2906-assembly-learning';

// Check lectures.json
const lecturesRaw = readFileSync(join(base, 'data/processed/lectures.json'), 'utf-8');
const lectures = JSON.parse(lecturesRaw);
const l9 = lectures.lectures.find((l: any) => l.id === 'lecture-9');

console.log('=== Lecture 9 Section Coverage ===');
let hasEmptyExamples = false;
let hasEmptyAssessments = false;

for (const s of l9.sections) {
    const eCount = s.examples?.length || 0;
    const aCount = s.assessmentItems?.length || 0;
    console.log(`${s.id}: ${eCount} examples, ${aCount} assessments`);
    if (eCount === 0) hasEmptyExamples = true;
    if (aCount === 0) hasEmptyAssessments = true;
}

console.log(`\nVAL-CONTENT-003 (examples): ${hasEmptyExamples ? 'FAIL - missing examples' : 'PASS'}`);
console.log(`VAL-CONTENT-008 (assessments): ${hasEmptyAssessments ? 'FAIL - missing assessments' : 'PASS'}`);

// Verify all example IDs exist in examples.json
const examplesRaw = readFileSync(join(base, 'data/processed/examples.json'), 'utf-8');
const examplesData = JSON.parse(examplesRaw);
const exampleIds = new Set(examplesData.examples.map((e: any) => e.id));

const allExampleIds = l9.sections.flatMap((s: any) => s.examples || []);
const missingExamples = allExampleIds.filter((id: string) => !exampleIds.has(id));

console.log(`\nExample ID references: ${missingExamples.length === 0 ? 'All exist in examples.json' : 'MISSING: ' + missingExamples.join(', ')}`);

// Verify all assessment IDs exist in question-bank.json
const qbRaw = readFileSync(join(base, 'data/processed/question-bank.json'), 'utf-8');
const qb = JSON.parse(qbRaw);
const questionIds = new Set(qb.questions.map((q: any) => q.id));

const allAssessmentIds = l9.sections.flatMap((s: any) => s.assessmentItems || []);
const missingQuestions = allAssessmentIds.filter((id: string) => !questionIds.has(id));

console.log(`Assessment ID references: ${missingQuestions.length === 0 ? 'All exist in question-bank.json' : 'MISSING: ' + missingQuestions.join(', ')}`);
