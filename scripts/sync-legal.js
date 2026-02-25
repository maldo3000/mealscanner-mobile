const fs = require('fs');
const path = require('path');

function syncFile(sourcePath, targetPath, variableName) {
  try {
    const content = fs.readFileSync(sourcePath, 'utf8');
    const escapedContent = content
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')
      .replace(/\$/g, '\\$');
    
    const tsContent = `export const ${variableName} = \`${escapedContent}\`;\n`;
    fs.writeFileSync(targetPath, tsContent);
    console.log(`Synced ${sourcePath} to ${targetPath}`);
  } catch (error) {
    console.error(`Error syncing ${sourcePath}:`, error);
  }
}

const rootDir = path.join(__dirname, '..');
const constantsDir = path.join(rootDir, 'constants');

if (!fs.existsSync(constantsDir)) {
  fs.mkdirSync(constantsDir);
}

syncFile(
  path.join(rootDir, 'PRIVACY_POLICY.md'),
  path.join(constantsDir, 'PrivacyPolicyContent.ts'),
  'PRIVACY_POLICY_CONTENT'
);

syncFile(
  path.join(rootDir, 'TERMS_OF_SERVICE.md'),
  path.join(constantsDir, 'TermsOfServiceContent.ts'),
  'TERMS_OF_SERVICE_CONTENT'
);
