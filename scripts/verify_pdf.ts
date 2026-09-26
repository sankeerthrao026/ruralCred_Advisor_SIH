import fs from 'node:fs';

const pdfContent = fs.readFileSync('Business_Plan_Sharma_Dairy_Farm.pdf', 'utf8');

console.log('=== PDF CONTENT VERIFICATION ===');
console.log('1. Total Project Cost (15,00,000):', pdfContent.includes('15,00,000') ? 'PRESENT (✓)' : 'MISSING (✗)');
console.log('2. Promoter Margin (2,25,000):', pdfContent.includes('2,25,000') ? 'PRESENT (✓)' : 'MISSING (✗)');
console.log('3. Sanctioned Loan (12,75,000):', pdfContent.includes('12,75,000') ? 'PRESENT (✓)' : 'MISSING (✗)');
console.log('4. Interest Rate (8.5% p.a.):', pdfContent.includes('8.5%') ? 'PRESENT (✓)' : 'MISSING (✗)');
console.log('5. Statutory Status (Udyam Registration Pending):', pdfContent.includes('Udyam Registration Pending') ? 'PRESENT (✓)' : 'MISSING (✗)');
console.log('6. Hardcoded "Udyam MSME Registered":', pdfContent.includes('Statutory Status: Udyam MSME Registered') ? 'PRESENT (BUG!)' : 'ABSENT (✓)');

if (
  pdfContent.includes('15,00,000') &&
  pdfContent.includes('2,25,000') &&
  pdfContent.includes('12,75,000') &&
  pdfContent.includes('8.5%') &&
  pdfContent.includes('Udyam Registration Pending') &&
  !pdfContent.includes('Statutory Status: Udyam MSME Registered')
) {
  console.log('\n>>> ALL PDF VERIFICATION CHECKS PASSED PERFECTLY! <<<');
} else {
  console.error('\n>>> SOME CHECKS FAILED! <<<');
  process.exit(1);
}
