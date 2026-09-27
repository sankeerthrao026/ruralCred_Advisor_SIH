import { parseSpokenTransaction, extractCleanNote } from '../lib/voice/speech';

function runVoiceExtractionTests() {
  console.log('========================================================================');
  console.log('RURALCRED VOICE INPUT AMOUNT & NOTE EXTRACTION TEST SUITE');
  console.log('========================================================================\n');

  const testCases = [
    {
      name: 'Case B: Telugu structured voice command with comma -> Empty Note',
      transcript: '50,000 సేల్స్ ఖాతాలో ఆడ్ చేయి',
      expectedAmount: 50000,
      expectedType: 'income',
      expectedCategory: 'Sales',
      expectedNote: '',
    },
    {
      name: 'Case B: Telugu structured voice command unformatted -> Empty Note',
      transcript: '50000 సేల్స్లో యాడ్ చేయి',
      expectedAmount: 50000,
      expectedType: 'income',
      expectedCategory: 'Sales',
      expectedNote: '',
    },
    {
      name: 'Case B: Telugu voice command with ₹ symbol and verb -> Empty Note',
      transcript: '₹50,000 సేల్స్ ఖాతాలో జోడించు',
      expectedAmount: 50000,
      expectedType: 'income',
      expectedCategory: 'Sales',
      expectedNote: '',
    },
    {
      name: 'Case A: English structured voice command unformatted -> Empty Note',
      transcript: 'Add 50000 to sales',
      expectedAmount: 50000,
      expectedType: 'income',
      expectedCategory: 'Sales',
      expectedNote: '',
    },
    {
      name: 'Case A: English structured voice command with comma -> Empty Note',
      transcript: 'Add 50,000 to sales',
      expectedAmount: 50000,
      expectedType: 'income',
      expectedCategory: 'Sales',
      expectedNote: '',
    },
    {
      name: 'Case C: English voice command with explicit description -> Clean Note',
      transcript: "Add 50000 sales for today's milk delivery",
      expectedAmount: 50000,
      expectedType: 'income',
      expectedCategory: 'Sales',
      expectedNote: "Today's milk delivery",
    },
    {
      name: 'Case C: English quantity and total sentence -> Meaningful Note',
      transcript: 'Sold 20 litres milk for 1200 rupees',
      expectedAmount: 1200,
      expectedType: 'income',
      expectedCategory: 'Sales',
      expectedNote: 'Sold 20 litres milk',
    },
    {
      name: 'Case C: Telugu cattle feed expense phrase -> Meaningful Note',
      transcript: 'మేత కొనుగోలు 1500 రూపాయలు',
      expectedAmount: 1500,
      expectedType: 'expense',
      expectedCategory: 'Feed / Supplies',
      expectedNote: 'మేత కొనుగోలు',
    },
    {
      name: 'Case C: Hindi structured command -> Empty Note',
      transcript: '50,000 बिक्री खाते में जोड़ें',
      expectedAmount: 50000,
      expectedType: 'income',
      expectedCategory: 'Sales',
      expectedNote: '',
    },
    {
      name: 'Case C: Hindi structured command with ऐड -> Empty Note',
      transcript: '50000 सेल्स में ऐड करो',
      expectedAmount: 50000,
      expectedType: 'income',
      expectedCategory: 'Sales',
      expectedNote: '',
    },
    {
      name: 'Indian numbering: 1 Lakh structured command -> Empty Note',
      transcript: '1,00,000 సేల్స్ ఖాతాలో',
      expectedAmount: 100000,
      expectedType: 'income',
      expectedCategory: 'Sales',
      expectedNote: '',
    },
    {
      name: 'Indian numbering: 2.5 Lakhs -> Clean Note',
      transcript: '2,50,000 పాల అమ్మకాలు',
      expectedAmount: 250000,
      expectedType: 'income',
      expectedCategory: 'Sales',
      expectedNote: 'పాల',
    },
    {
      name: 'Indian numbering: 10 Lakhs -> Clean Note',
      transcript: '10,00,000 వ్యాపార ఆదాయం',
      expectedAmount: 1000000,
      expectedType: 'income',
      expectedCategory: 'Sales',
      expectedNote: 'వ్యాపార',
    },
    {
      name: 'Telugu words and numbers: 50 వేలు సేల్స్ -> Empty Note',
      transcript: '50 వేలు సేల్స్',
      expectedAmount: 50000,
      expectedType: 'income',
      expectedCategory: 'Sales',
      expectedNote: '',
    },
    {
      name: 'English lakh scale word: 1.5 lakh dairy sales -> Empty Note',
      transcript: '1.5 lakh dairy sales',
      expectedAmount: 150000,
      expectedType: 'income',
      expectedCategory: 'Cooperative Payout',
      expectedNote: '',
    },
    {
      name: 'Telugu full words: రెండు లక్షల యాభై వేలు ఆదాయం -> Empty Note',
      transcript: 'రెండు లక్షల యాభై వేలు ఆదాయం',
      expectedAmount: 250000,
      expectedType: 'income',
      expectedCategory: 'Sales',
      expectedNote: '',
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    const res = parseSpokenTransaction(tc.transcript);
    const amountOk = res.amount === tc.expectedAmount;
    const typeOk = res.type === tc.expectedType;
    const catOk = res.category === tc.expectedCategory;
    const noteOk = res.note === tc.expectedNote;
    const isOk = amountOk && typeOk && catOk && noteOk;

    if (isOk) {
      console.log(`[PASS] ${tc.name}`);
      console.log(`       Input: "${tc.transcript}"`);
      console.log(`       -> Amount: ₹${res.amount}, Type: ${res.type}, Category: ${res.category}, Note: "${res.note}"`);
      passed++;
    } else {
      console.error(`[FAIL] ${tc.name}`);
      console.error(`       Input: "${tc.transcript}"`);
      console.error(`       Expected: amount=${tc.expectedAmount}, type=${tc.expectedType}, category=${tc.expectedCategory}, note="${tc.expectedNote}"`);
      console.error(`       Actual:   amount=${res.amount}, type=${res.type}, category=${res.category}, note="${res.note}"`);
      failed++;
    }
  }

  console.log(`\n========================================================================`);
  console.log(`FINAL RESULT: ${passed}/${testCases.length} TESTS PASSED (${failed} failed)`);
  console.log(`========================================================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runVoiceExtractionTests();
