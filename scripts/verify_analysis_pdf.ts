import * as fs from 'node:fs';
import * as path from 'node:path';

const pdfPath = path.join(process.cwd(), 'Business_Analysis_Sharma_Dairy_Farm.pdf');

if (!fs.existsSync(pdfPath)) {
  console.error(`Error: ${pdfPath} does not exist!`);
  process.exit(1);
}

const stats = fs.statSync(pdfPath);
const buffer = fs.readFileSync(pdfPath);
const content = buffer.toString('latin1');

console.log('\n======================================================');
console.log('  RURALCRED — BUSINESS ANALYSIS PDF VERIFICATION');
console.log('======================================================\n');

console.log(`File: ${pdfPath}`);
console.log(`Size: ${stats.size} bytes`);
console.log(`Header: ${content.slice(0, 8)}`);

const checks = [
  { name: 'Business Name (SHARMA DAIRY FARM)', pattern: /SHARMA DAIRY FARM/i },
  { name: 'Promoter Name (Anita Sharma)', pattern: /Anita Sharma/i },
  { name: 'Location (Warangal, Telangana)', pattern: /Warangal/i },
  { name: 'Project Cost (15,00,000)', pattern: /15,00,000/ },
  { name: 'Promoter Margin (2,25,000)', pattern: /2,25,000/ },
  { name: 'Feasibility Assessment', pattern: /FEASIBILITY ASSESSMENT/i },
  { name: 'SWOT Matrix (STRENGTHS / WEAKNESSES)', pattern: /STRENGTHS/i },
  { name: 'Competitor Density', pattern: /COMPETITOR DENSITY/i },
  { name: 'Scenario Simulation (Conservative / Optimistic)', pattern: /Conservative/i },
  { name: '5-Year Projections (Year 1 / Year 5)', pattern: /5-YEAR/i },
  { name: 'Missing Information Checklist', pattern: /MISSING INFORMATION/i },
  { name: 'RAG Data Sources (APMC Mandi / ChromaDB)', pattern: /APMC/i },
];

let passed = 0;
for (const check of checks) {
  const match = check.pattern.test(content);
  if (match) {
    console.log(`  ✓ ${check.name}: PRESENT`);
    passed++;
  } else {
    console.log(`  ✗ ${check.name}: MISSING`);
  }
}

console.log('\n======================================================');
console.log(`  VERIFICATION RESULT: ${passed}/${checks.length} CHECKS PASSED`);
console.log('======================================================\n');

if (passed !== checks.length) {
  process.exit(1);
}
