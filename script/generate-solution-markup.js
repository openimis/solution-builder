const axios = require('axios');
const fs = require('fs');
const { createConfig } = require('./confluence-utils');

const solutionName = process.argv[2];
if (!solutionName) {
  console.error('Usage: node generate-solution-markup.js <solutionName> [labels]');
  process.exit(1);
}

const solutions = {
  'coreMIS': './solution/solutions/coreMIS.json',
  'SHI': './solution/solutions/HF.json',
  'claimai': './solution/solutions/HF.json',
  'full': './solution/solutions/full.json',
  'SR': './solution/solutions/SR.json',
  'IBR': './solution/solutions/IBR.json'
};

let filterLabels;
if (process.argv[3]) {
  // Labels provided as comma-separated string
  filterLabels = process.argv[3].split(',');
} else {
  // Load from solution JSON using mapped path
  const solutionPath = solutions[solutionName];
  if (!solutionPath || !fs.existsSync(solutionPath)) {
    console.error(`Solution file not found: ${solutionPath}`);
    process.exit(1);
  }
  const solution = JSON.parse(fs.readFileSync(solutionPath, 'utf8'));
  filterLabels = Object.keys(solution.modules || {});
}

const CONFIG = createConfig(filterLabels, solutionName);

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
    params: { status: 'any', limit: 200, expand: 'metadata.labels,title' }
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
  markup += `{excerpt:${CONFIG.spaceKey}:${page.title}|name=content}\n\n`;

  const children = await getAllChildren(page.id, depth + 1);
  const cleanChildren = children.filter(c => !isModulePage(c));

  for (const child of cleanChildren) {
    markup += await generateMarkupForPage(child, child.depth);
  }

  return markup;
}

async function generateRelevantTreeMarkup(pageId, depth, matchingIds, visited = new Set()) {
  if (visited.has(pageId)) return '';
  visited.add(pageId);

  const pageRes = await api.get(`/rest/api/content/${pageId}?expand=metadata.labels,title`);
  const page = pageRes.data;

  const hasMatchHere = hasMatchingLabel(page);
  let subtreeHasMatch = hasMatchHere;
  let markup = '';

  const childRes = await api.get(`/rest/api/content/${pageId}/child/page`, {
    params: { status: 'any', limit: 200, expand: 'metadata.labels,title' }
  });
  const children = childRes.data.results;

  for (const child of children) {
    const childMarkup = await generateRelevantTreeMarkup(child.id, depth + 1, matchingIds, visited);
    if (childMarkup) {
      subtreeHasMatch = true;
      markup += childMarkup;
    }
  }

  if (hasMatchHere || subtreeHasMatch) {
    const pageMarkup = depth == 0 ? '' : `h${Math.min(depth + 1, 6)}. ${page.title}\n{excerpt:${CONFIG.spaceKey}:${page.title}|name=content}\n\n`;
    return pageMarkup + markup;
  } else {
    return '';
  }
}

async function main() {
  // Find or create solution page
  const pageTitle = `Solution Overview - ${solutionName}`;
  const pageSearchRes = await api.get('/rest/api/content/search', {
    params: {
      cql: `type = page and space.key = "${CONFIG.spaceKey}" and ancestor = ${CONFIG.rootPageId} and title = "${pageTitle}" and label = "solution-${solutionName}"`,
      expand: 'id,title',
      limit: 1
    }
  });

  let targetPageId;
  if (pageSearchRes.data.results.length > 0) {
    targetPageId = pageSearchRes.data.results[0].id;
    console.log(`📄 Found existing page: ${pageTitle} (ID: ${targetPageId})`);
  } else {
    console.log(`📄 Creating new page: ${pageTitle}`);
    const createRes = await api.post('/rest/api/content', {
      type: 'page',
      title: pageTitle,
      space: { key: CONFIG.spaceKey },
      ancestors: [{ id: CONFIG.rootPageId }],
      status: 'draft',
      metadata: {
        labels: [{ name: `solution-${solutionName}` }]
      },
      body: {
        storage: {
          value: '<p>Initial draft</p>',
          representation: 'storage'
        }
      }
    });
    targetPageId = createRes.data.id;
    console.log(`📄 Created page: ${pageTitle} (ID: ${targetPageId})`);
  }

  console.log(`🔍 Searching for pages with filter labels for solution ${solutionName}...`);

  const chunkSize = 10;
  const chunks = [];
  for (let i = 0; i < CONFIG.filterLabels.length; i += chunkSize) {
    chunks.push(CONFIG.filterLabels.slice(i, i + chunkSize));
  }

  const allResults = [];
  for (const chunk of chunks) {
    const labelConditions = chunk.map(l => `"module-${l}"`).join(', ');
    const cql = `type = page and space.key = "${CONFIG.spaceKey}" and ancestor = ${CONFIG.rootPageId} and label in (${labelConditions})`;
    console.log('CQL chunk:', cql);

    const searchRes = await api.get('/rest/api/content/search', {
      params: {
        cql,
        expand: 'ancestors,metadata.labels,title,space',
        limit: 500
      }
    });

    allResults.push(...searchRes.data.results);
  }

  // Remove duplicates based on id
  const uniqueResults = allResults.filter((page, index, self) =>
    index === self.findIndex(p => p.id === page.id)
  );

  const matchingPages = uniqueResults;
  console.log(`✅ Found ${matchingPages.length} matching pages`);

  const matchingIds = new Set(matchingPages.map(p => p.id));

  let markup = `h1. Solution Overview - ${solutionName}\n\n{toc}\n\nh2. Modules\n${CONFIG.filterLabels.map(label => `* ${label}`).join('\n')}\n\n`;

  const treeMarkup = await generateRelevantTreeMarkup(targetPageId, 0, matchingIds);
  markup += treeMarkup;

  fs.writeFileSync(CONFIG.outputFile, markup);
  console.log(`🎉 Markup generated → ${CONFIG.outputFile}`);

  // === CONVERT WIKI → STORAGE (this is the fix) ===
  console.log('🔄 Converting markup to Confluence storage format...');
  const convertRes = await api.post('/rest/api/contentbody/convert/storage', {
    value: markup,
    representation: 'wiki'
  });
  const storageValue = convertRes.data.value;

  // === UPDATE PAGE ===
  console.log('📤 Publishing page...');
  const pageRes = await api.get(`/rest/api/content/${targetPageId}?expand=version&status=any`);
  const currentVersion = pageRes.data.version.number;

  await api.put(`/rest/api/content/${targetPageId}`, {
    id: targetPageId,
    type: 'page',
    title: pageTitle,
    space: { key: CONFIG.spaceKey },
    version: { number: currentVersion + 1 },
    status: 'current',                    // ← changed from 'draft' so content actually shows
    body: {
      storage: {
        value: storageValue,
        representation: 'storage'
      }
    }
  });

  console.log(`🎉 SUCCESS! Page updated → ${CONFIG.baseUrl}/spaces/${CONFIG.spaceKey}/pages/${targetPageId}`);
  console.log('Refresh the page in your browser — the full hierarchy + includes should now appear.');
}

main().catch(err => {
  console.error('❌ Error:', err.response?.data || err.message);
});