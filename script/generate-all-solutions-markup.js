const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const solutionsDir = 'solution/solutions';
const solutions = fs.readdirSync(solutionsDir)
  .filter(file => file.endsWith('.json'))
  .map(file => path.basename(file, '.json'));

console.log(`🔄 Generating markup for ${solutions.length} solutions...`);

for (const solution of solutions) {
  console.log(`\n📝 Processing solution: ${solution}`);
  try {
    execSync(`node script/generate-solution-markup.js ${solution}`, { stdio: 'inherit' });
  } catch (error) {
    console.error(`❌ Failed to generate markup for ${solution}: ${error.message}`);
  }
}

console.log('\n🎉 All solutions processed!');