const fs = require('fs');
const axios = require('axios');
const { createConfig, mergeLabels, generateAggregatedMarkup, updateConfluencePage } = require('./confluence-utils');

const solutionName = process.argv[2];
const additionalLabelsArg = process.argv[3];
const shouldPublish = process.argv.includes('--publish');

const additionalLabels = additionalLabelsArg ? additionalLabelsArg.split(',') : [];
const config = require('./config');
const effectiveLabels = mergeLabels(config.filterLabels, additionalLabels);

const CONFIG = createConfig(effectiveLabels, solutionName);
const api = axios.create({
  baseURL: CONFIG.baseUrl,
  auth: { username: CONFIG.email, password: CONFIG.apiToken },
  headers: { Accept: 'application/json' }
});

const outputFile = solutionName ? `${solutionName}-aggregated-markup.txt` : 'confluence-solution-markup.txt';

async function main() {
  const markup = await generateAggregatedMarkup(CONFIG, api, CONFIG.rootPageId, solutionName);

  fs.writeFileSync(outputFile, markup);
  console.log(`🎉 Markup generated → ${outputFile}`);

  if (shouldPublish && solutionName) {
    await updateConfluencePage(CONFIG, api, markup, solutionName);
  } else if (shouldPublish && !solutionName) {
    console.log('🛈 --publish requires a solutionName argument. Skipping Confluence update.');
  } else {
    console.log('Just paste it into Confluence!');
  }
}

main().catch(err => {
  console.error('❌ Error:', err.response?.data || err.message);
});