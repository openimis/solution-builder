const axios = require('axios');
const fs = require('fs');
const config = require('./config'); // ← credentials loaded from git-ignored file

const CONFIG = {
  baseUrl: config.baseUrl,
  email: config.email,
  apiToken: config.apiToken,
  spaceKey: config.spaceKey,
  rootPageId: config.rootPageId,
  filterLabels: config.filterLabels,
  modulePrefix: config.modulePrefix || 'module-',
  outputFile: 'confluence-solution-markup.txt'
};

const api = axios.create({
  baseURL: CONFIG.baseUrl,
  auth: { username: CONFIG.email, password: CONFIG.apiToken },
  headers: { Accept: 'application/json' }
});

function hasMatchingLabel(page) {
  const labels = page.metadata?.labels?.results || [];
  return labels.some(l => CONFIG.filterLabels.includes(l.name.toLowerCase()));
}

function isModulePage(page) {
  const labels = page.metadata?.labels?.results || [];
  return labels.some(l => l.name.toLowerCase().startsWith(CONFIG.modulePrefix));
}

async function getAllChildren(pageId, depth = 0) {
  const childRes = await api.get(`/rest/api/content/${pageId}/child/page`, {
    params: { limit: 200, expand: 'metadata.labels,title' }
  });
  const children = childRes.data.results;
  const result = [];
  for (const child of children) {
    result.push({ ...child, depth });
    if (!isModulePage(child)) {
      const subChildren = await getAllChildren(child.id, depth + 1);
      result.push(...subChildren);
    }
  }
  return result;
}

async function generateMarkupForPage(page, depth) {
  let markup = `h${Math.min(depth + 1, 6)}. ${page.title}\n`;
  markup += `{include:${CONFIG.spaceKey}:${page.title}}\n\n`;

  const children = await getAllChildren(page.id, depth + 1);
  const cleanChildren = children.filter(c => !isModulePage(c));

  for (const child of cleanChildren) {
    markup += await generateMarkupForPage(child, child.depth);
  }

  return markup;
}

async function main() {
  console.log('🔍 Searching for pages with filter labels...');

  const labelConditions = CONFIG.filterLabels.map(l => `label="module-${l}"`).join(' or ');
  const cql = `type = page and space.key = "${CONFIG.spaceKey}" and ancestor = ${CONFIG.rootPageId} and (${labelConditions})`;

  const searchRes = await api.get('/rest/api/content/search', {
    params: {
      cql,
      expand: 'ancestors,metadata.labels,title,space',
      limit: 500
    }
  });

  const matchingPages = searchRes.data.results;
  console.log(`✅ Found ${matchingPages.length} matching pages`);

  // Sort pages by their ancestry depth to ensure proper ordering
  matchingPages.sort((a, b) => (a.ancestors?.length || 0) - (b.ancestors?.length || 0));

  let markup = `h1. Solution Overview - Filtered by Labels (${CONFIG.filterLabels.join(', ')})\n\n{toc}\n\n`;

  for (const page of matchingPages) {
    const depth = (page.ancestors?.length || 0) - (page.ancestors?.find(a => a.id === CONFIG.rootPageId) ? 1 : 0);
    markup += await generateMarkupForPage(page, depth + 1);
  }

  fs.writeFileSync(CONFIG.outputFile, markup);
  console.log(`🎉 Markup generated → ${CONFIG.outputFile}`);
  console.log('Just paste it into Confluence!');
}

main().catch(err => {
  console.error('❌ Error:', err.response?.data || err.message);
});