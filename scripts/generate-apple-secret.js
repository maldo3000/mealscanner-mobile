const jwt = require('jsonwebtoken');
const fs = require('fs');

// --- CONFIGURATION ---
const TEAM_ID = 'UNS5K624MV';
const BUNDLE_ID = 'app.mealscanner';
const KEY_ID = '8S3UDS937G';
const P8_FILE = './AuthKey_8S3UDS937G.p8';
// ---------------------

try {
  const privateKey = fs.readFileSync(P8_FILE);
  const token = jwt.sign({}, privateKey, {
    algorithm: 'ES256',
    expiresIn: '150d', // Tokens must expire within 6 months
    audience: 'https://appleid.apple.com',
    issuer: TEAM_ID,
    subject: BUNDLE_ID,
    keyid: KEY_ID,
  });

  console.log('\n--- PASTE THIS INTO SUPABASE SECRET KEY FIELD ---');
  console.log(token);
  console.log('--------------------------------------------------\n');
} catch (e) {
  console.error('Error:', e.message);
}










