import fs from 'node:fs';
import path from 'node:path';
import { generateUnifiedBusinessPlan } from '../lib/finance/plan';
import { generatePlanPdfDoc } from '../lib/export/pdf';

async function main() {
  console.log('--- Generating Corrected Business Plan for Sharma Dairy Farm ---');

  const plan = generateUnifiedBusinessPlan({
    entrepreneurName: 'Anita Sharma',
    businessName: 'Sharma Dairy Farm',
    location: 'Warangal, Telangana',
    category: 'Dairy Farming',
    gender: 'female',
    socialCategory: 'OBC',
    marginCapital: 150000,
    projectCost: 1500000,
    loanAmount: 1350000,
    selectedSchemeId: 'stand-up-india',
    hasUdyamRegistration: false,
  });

  console.log('Unified Plan Generated:');
  console.log(`  Enterprise Name:      ${plan.enterpriseName}`);
  console.log(`  Selected Scheme:      ${plan.selectedSchemeName}`);
  console.log(`  Total Project Cost:   ₹${plan.totalProjectCost.toLocaleString('en-IN')}`);
  console.log(`  Promoter Margin:      ₹${plan.promoterMargin.toLocaleString('en-IN')} (${plan.promoterMarginPercent}%)`);
  console.log(`  Sanctioned Loan:      ₹${plan.requestedLoanAmount.toLocaleString('en-IN')}`);
  console.log(`  Interest Rate:        ${plan.interestRateAnnual}% p.a.`);
  console.log(`  Udyam Registered:     ${plan.hasUdyamRegistration}`);
  console.log(`  Invariant Check:      ₹${plan.promoterMargin.toLocaleString('en-IN')} + ₹${plan.requestedLoanAmount.toLocaleString('en-IN')} = ₹${(plan.promoterMargin + plan.requestedLoanAmount).toLocaleString('en-IN')}`);

  const doc = generatePlanPdfDoc(plan, false);
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

  const outputPath = path.resolve(process.cwd(), 'Business_Plan_Sharma_Dairy_Farm.pdf');
  fs.writeFileSync(outputPath, pdfBuffer);

  console.log(`\nSuccessfully generated and saved PDF to: ${outputPath} (${pdfBuffer.length} bytes)`);
}

main().catch((err) => {
  console.error('Error generating PDF:', err);
  process.exit(1);
});
