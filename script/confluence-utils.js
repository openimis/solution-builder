const config = require('./config');
const fs = require('fs');

function createConfig(filterLabels, solutionName = null) {
  return {
    baseUrl: config.baseUrl,
    email: config.email,
    apiToken: config.apiToken,
    spaceKey: config.spaceKey,
    rootPageId: config.rootPageId,
    targetPageId: config.targetPageId,
    filterLabels: filterLabels,
    modulePrefix: config.modulePrefix || 'module-',
    outputFile: solutionName ? `${solutionName}-solution-markup.txt` : 'confluence-solution-markup.txt'
  };
}

function hasMatchingLabel(CONFIG, page) {
  const labels = page.metadata?.labels?.results || [];
  return labels.some(l => CONFIG.filterLabels.includes(l.name.toLowerCase()));
}

function isModulePage(CONFIG, page) {
  const labels = page.metadata?.labels?.results || [];
  return labels.some(l => l.name.toLowerCase().startsWith(CONFIG.modulePrefix));
}

async function getAllChildren(CONFIG, api, pageId, depth = 0) {
  const childRes = await api.get(`/rest/api/content/${pageId}/child/page`, {
    params: { limit: 200, expand: 'metadata.labels,title' }
  });
  const children = childRes.data.results;
  const result = [];
  for (const child of children) {
    result.push({ ...child, depth });
    if (!isModulePage(CONFIG, child)) {
      const subChildren = await getAllChildren(CONFIG, api, child.id, depth + 1);
      result.push(...subChildren);
    }
  }
  return result;
}

async function generateMarkupForPage(CONFIG, api, page, depth, spaceKey) {
  let markup = `h${Math.min(depth + 1, 6)}. ${page.title}\n`;
  markup += `{excerpt-include:${spaceKey}:${page.title}|excerpt=content|nopanel=true}\n\n`;

  const children = await getAllChildren(CONFIG, api, page.id, depth + 1);
  const cleanChildren = children.filter(c => !isModulePage(CONFIG, c));

  for (const child of cleanChildren) {
    markup += await generateMarkupForPage(CONFIG, api, child, child.depth, spaceKey);
  }

  return markup;
}

function mergeLabels(baseLabels, additionalLabels = []) {
  return [...new Set([...baseLabels, ...additionalLabels])];
}

async function generateAggregatedMarkup(CONFIG, api, rootPageId, solutionName = null) {
  const title = solutionName ? `Aggregated Docs for ${solutionName} Solution` : `Solution Overview - Filtered by Labels (${CONFIG.filterLabels.join(', ')})`;
  let markup = `h1. ${title}\n\n{toc}\n\n`;

  if (solutionName === 'full') {
    // Check if tree file exists, if not, dump it first
    if (!fs.existsSync('confluence-tree-full.json')) {
      console.log('📥 Tree file not found, dumping Confluence tree...');
      const { dumpTree } = require('./dump-confluence-tree');
      const tree = await dumpTree(CONFIG.rootPageId);
      fs.writeFileSync('confluence-tree-full.json', JSON.stringify(tree, null, 2));
      console.log('✅ Tree dumped to confluence-tree-full.json');
    }
    // Load tree
    const tree = JSON.parse(fs.readFileSync('confluence-tree-full.json', 'utf8'));

    function generateFromJson(items, depth = 0) {
      let markup = '';
      for (const item of items) {
        markup += `h${depth + 1}. ${item.title}\n`;
        markup += `{excerpt-include:${CONFIG.spaceKey}:${item.title}|excerpt=content|nopanel=true}\n\n`;
        if (item.children && item.children.length > 0) {
          markup += generateFromJson(item.children, depth + 1);
        }
      }
      return markup;
    }

    markup += generateFromJson(tree.children);
  } else {
    const effectiveLabels = CONFIG.filterLabels;
    console.log(`🔍 Searching for pages with effective labels: ${effectiveLabels.join(', ')}`);

    const labelConditions = effectiveLabels.map(l => `label="module-${l}"`).join(' or ');
    const cql = `type = page and space.key = "${CONFIG.spaceKey}" and ancestor = ${rootPageId} and (${labelConditions})`;

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

    for (const page of matchingPages) {
      const depth = (page.ancestors?.length || 0) - (page.ancestors?.find(a => a.id === rootPageId) ? 1 : 0);
      markup += await generateMarkupForPage(CONFIG, api, page, depth, CONFIG.spaceKey);
    }
  }

  return markup;
}

async function updateConfluencePage(CONFIG, api, markup, solutionName) {
  const pageTitle = `Aggregated Docs for ${solutionName} Solution`;

  // Find or create page
  const pageSearchRes = await api.get('/rest/api/content/search', {
    params: {
      cql: `type = page and space.key = "${CONFIG.spaceKey}" and ancestor = ${CONFIG.targetPageId} and title = "${pageTitle}" and label = "solution-${solutionName}"`,
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
      ancestors: [{ id: CONFIG.targetPageId }],
      status: 'current',
      metadata: {
        labels: [{ name: `solution-${solutionName}` }]
      },
      body: {
        storage: {
          value: '<p>Initial content</p>',
          representation: 'storage'
        }
      }
    });
    targetPageId = createRes.data.id;
    console.log(`📄 Created page: ${pageTitle} (ID: ${targetPageId})`);
  }

  // Convert markup to storage format
  console.log('🔄 Converting markup to Confluence storage format...');
  const convertRes = await api.post('/rest/api/contentbody/convert/storage', {
    value: markup,
    representation: 'wiki'
  });
  const storageValue = convertRes.data.value;

  // Update page
  console.log('📤 Publishing page...');
  const pageRes = await api.get(`/rest/api/content/${targetPageId}?expand=version&status=any`);
  const currentVersion = pageRes.data.version.number;

  await api.put(`/rest/api/content/${targetPageId}`, {
    id: targetPageId,
    type: 'page',
    title: pageTitle,
    space: { key: CONFIG.spaceKey },
    version: { number: currentVersion + 1 },
    status: 'current',
    body: {
      storage: {
        value: storageValue,
        representation: 'storage'
      }
    }
  });

  console.log(`🎉 SUCCESS! Page updated → ${CONFIG.baseUrl}/spaces/${CONFIG.spaceKey}/pages/${targetPageId}`);
}

module.exports = {
  createConfig,
  hasMatchingLabel,
  isModulePage,
  getAllChildren,
  generateMarkupForPage,
  mergeLabels,
  generateAggregatedMarkup,
  updateConfluencePage
};
