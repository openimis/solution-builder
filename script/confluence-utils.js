const config = require('./config');
const fs = require('fs');
const path = require('path');
const {
  getSolutionPageMeta,
  buildSolutionBundlePageStorage,
  buildModuleCatalogueCql,
  buildManualCatalogueCql,
  aggregatedDocsTitle,
} = require('./solution-pages');

function createConfig(filterLabels, solutionName = null) {
  return {
    baseUrl: config.baseUrl,
    email: config.email,
    apiToken: config.apiToken,
    spaceKey: config.spaceKey,
    rootPageId: config.rootPageId,
    targetPageId: config.targetPageId,
    targetSpaceKey: config.targetSpaceKey || config.targetspaceKey || 'OP',
    solutionCataloguePageId: config.solutionCataloguePageId || '5355012104',
    moduleCataloguePageId: config.moduleCataloguePageId || '589561955',
    manualRootPageId: config.manualRootPageId || config.rootPageId,
    filterLabels: filterLabels,
    modulePrefix: config.modulePrefix || 'module-',
    outputFile: solutionName ? `${solutionName}-solution-markup.txt` : 'confluence-solution-markup.txt'
  };
}

function hasMatchingLabel(CONFIG, page) {
  const labels = page.metadata?.labels?.results || [];
  const wanted = CONFIG.filterLabels.map(l => toConfluenceLabelName(l, CONFIG.modulePrefix).toLowerCase());
  return labels.some(l => wanted.includes(l.name.toLowerCase()));
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

function toConfluenceLabelName(label, prefix = 'module-') {
  const value = String(label || '').trim();
  if (!value) return '';
  return value.toLowerCase().startsWith(prefix.toLowerCase()) ? value : `${prefix}${value}`;
}

function moduleConfluenceLabels(filterLabels, prefix = 'module-') {
  const raw = (filterLabels || []).map((label) => String(label || '').trim()).filter(Boolean);
  const prefixed = raw.filter((label) => label.toLowerCase().startsWith(prefix.toLowerCase()));
  const source = prefixed.length ? prefixed : raw;
  return [...new Set(source.map((label) => toConfluenceLabelName(label, prefix)).filter(Boolean))];
}

function stripSolutionLabelNotes(html) {
  return html.replace(
    /<ac:structured-macro ac:name="note"[\s\S]*?<\/ac:structured-macro>/g,
    (block) => /properly labelled as/i.test(block) ? '' : block
  );
}

function replaceModuleReportCql(html, moduleCql, manualCql) {
  return html.replace(
    /<ac:structured-macro ac:name="detailssummary"[\s\S]*?<\/ac:structured-macro>/g,
    (block) => {
      const headingsMatch = block.match(/<ac:parameter ac:name="headings">([\s\S]*?)<\/ac:parameter>/i);
      const headings = headingsMatch ? headingsMatch[1] : '';
      const cqlMatch = block.match(/<ac:parameter ac:name="cql">([\s\S]*?)<\/ac:parameter>/i);
      if (!cqlMatch) return block;
      const decoded = cqlMatch[1]
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
      if (!/label\s*=\s*"module"/i.test(decoded) && !/label\s+in\s*\(/i.test(decoded) && !/label\s*=\s*"module-/i.test(decoded)) {
        return block;
      }
      const nextCql = /User Manual/i.test(headings) ? manualCql : moduleCql;
      return block.replace(
        /(<ac:parameter ac:name="cql">)([\s\S]*?)(<\/ac:parameter>)/i,
        `$1${escapeCqlForStorage(nextCql)}$3`
      );
    }
  );
}

function escapeCqlForStorage(cql) {
  return String(cql)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function syncSolutionPageModuleReports(api, pageId, confluenceLabels, reportRoots = {}) {
  const labels = moduleConfluenceLabels(confluenceLabels);
  if (!labels.length) return;
  const moduleCql = buildModuleCatalogueCql(labels, reportRoots.moduleCataloguePageId);
  const manualCql = buildManualCatalogueCql(labels, reportRoots.manualRootPageId);
  const pageRes = await api.get(`/rest/api/content/${pageId}`, {
    params: { expand: 'body.storage,version,title,space' }
  });
  const page = pageRes.data;
  const original = page.body?.storage?.value || '';
  const updated = replaceModuleReportCql(stripSolutionLabelNotes(original), moduleCql, manualCql);
  if (updated === original) {
    console.log(`🛈 Solution page reports already up to date: ${page.title}`);
    return page;
  }
  await api.put(`/rest/api/content/${pageId}`, {
    id: pageId,
    type: 'page',
    title: page.title,
    space: { key: page.space?.key },
    version: { number: page.version.number + 1 },
    status: 'current',
    body: {
      storage: {
        value: updated,
        representation: 'storage'
      }
    }
  });
  console.log(`✔️ Updated Page Properties Report CQL on ${page.title}`);
  return page;
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

    const labelConditions = effectiveLabels
      .map(l => toConfluenceLabelName(l, CONFIG.modulePrefix))
      .filter(Boolean)
      .map(l => `label="${l}"`)
      .join(' or ');
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

async function searchFirstPage(api, cql) {
  const res = await api.get('/rest/api/content/search', {
    params: { cql, expand: 'id,title,space', limit: 1 }
  });
  return res.data.results[0] || null;
}

async function attachLogoIfPresent(api, pageId, logoFile) {
  if (!logoFile) return;
  const logoPath = path.isAbsolute(logoFile) ? logoFile : path.resolve(process.cwd(), logoFile);
  if (!fs.existsSync(logoPath)) {
    console.warn(`⚠️ Logo not found at ${logoPath}, skipping attachment`);
    return;
  }
  const FormData = require('form-data');
  const form = new FormData();
  form.append('file', fs.createReadStream(logoPath), path.basename(logoPath));
  try {
    await api.post(`/rest/api/content/${pageId}/child/attachment`, form, {
      headers: {
        ...form.getHeaders(),
        'X-Atlassian-Token': 'nocheck'
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    console.log(`✔️ Attached logo ${path.basename(logoPath)} to page ${pageId}`);
  } catch (error) {
    const status = error.response?.status;
    if (status === 400) {
      console.log(`🛈 Logo ${path.basename(logoPath)} already attached or rejected (${status})`);
    } else {
      console.warn(`⚠️ Failed to attach logo: ${error.response?.data?.message || error.message}`);
    }
  }
}

async function findOrCreateSolutionBundlePage(CONFIG, api, solutionName, confluenceLabels = []) {
  const meta = getSolutionPageMeta(solutionName);
  const spaceKey = CONFIG.targetSpaceKey || CONFIG.spaceKey;
  const catalogueId = CONFIG.solutionCataloguePageId;
  const labels = moduleConfluenceLabels(confluenceLabels.length ? confluenceLabels : CONFIG.filterLabels);

  let page = null;

  if (meta.pageId) {
    try {
      const existing = await api.get(`/rest/api/content/${meta.pageId}`, {
        params: { expand: 'space,title,metadata.labels' }
      });
      if (existing.data?.id) {
        console.log(`📄 Found existing solution page: ${existing.data.title} (${existing.data.id})`);
        page = existing.data;
      }
    } catch (error) {
      console.warn(`⚠️ Known solution page ${meta.pageId} not reachable: ${error.response?.status || error.message}`);
    }
  }

  if (!page) {
    const titleCql = `type = page and space.key = "${spaceKey}" and ancestor = ${catalogueId} and title = "${meta.title.replace(/"/g, '\\"')}"`;
    page = await searchFirstPage(api, titleCql);
    if (page) console.log(`📄 Found existing solution page by title: ${page.title} (${page.id})`);
  }

  if (!page) {
    const labelCql = `type = page and space.key = "${spaceKey}" and ancestor = ${catalogueId} and label = "${meta.solutionLabel}"`;
    page = await searchFirstPage(api, labelCql);
    if (page) console.log(`📄 Found existing solution page by label: ${page.title} (${page.id})`);
  }

  if (!page) {
    console.log(`📄 Creating solution page: ${meta.title}`);
    const createRes = await api.post('/rest/api/content', {
      type: 'page',
      title: meta.title,
      space: { key: spaceKey },
      ancestors: [{ id: catalogueId }],
      status: 'current',
      metadata: {
        labels: [
          { name: 'solution-bundle' },
          { name: 'solution_package' },
          { name: meta.solutionLabel },
        ]
      },
      body: {
        storage: {
          value: buildSolutionBundlePageStorage(meta, labels, {
            moduleCataloguePageId: CONFIG.moduleCataloguePageId,
            manualRootPageId: CONFIG.manualRootPageId,
          }),
          representation: 'storage'
        }
      }
    });
    page = createRes.data;
    console.log(`📄 Created solution page: ${page.title} (ID: ${page.id})`);
    await attachLogoIfPresent(api, page.id, meta.logoFile);
  } else if (labels.length) {
    await syncSolutionPageModuleReports(api, page.id, labels, {
      moduleCataloguePageId: CONFIG.moduleCataloguePageId,
      manualRootPageId: CONFIG.manualRootPageId,
    });
  }

  return page;
}

async function updateConfluencePage(CONFIG, api, markup, solutionName) {
  const solutionPage = await findOrCreateSolutionBundlePage(CONFIG, api, solutionName, CONFIG.filterLabels);
  const pageTitle = aggregatedDocsTitle(solutionName);
  const spaceKey = CONFIG.targetSpaceKey || CONFIG.spaceKey;
  const docsLabel = getSolutionPageMeta(solutionName).solutionLabel;

  const pageSearchRes = await api.get('/rest/api/content/search', {
    params: {
      cql: `type = page and space.key = "${spaceKey}" and parent = ${solutionPage.id} and title = "${pageTitle}"`,
      expand: 'id,title',
      limit: 1
    }
  });

  let targetPageId;
  if (pageSearchRes.data.results.length > 0) {
    targetPageId = pageSearchRes.data.results[0].id;
    console.log(`📄 Found existing docs page: ${pageTitle} (ID: ${targetPageId})`);
  } else {
    console.log(`📄 Creating docs page under ${solutionPage.title}: ${pageTitle}`);
    const createRes = await api.post('/rest/api/content', {
      type: 'page',
      title: pageTitle,
      space: { key: spaceKey },
      ancestors: [{ id: solutionPage.id }],
      status: 'current',
      metadata: {
        labels: [
          { name: docsLabel },
          { name: 'aggregated-docs' },
        ]
      },
      body: {
        storage: {
          value: '<p>Initial content</p>',
          representation: 'storage'
        }
      }
    });
    targetPageId = createRes.data.id;
    console.log(`📄 Created docs page: ${pageTitle} (ID: ${targetPageId})`);
  }

  console.log('🔄 Converting markup to Confluence storage format...');
  const convertRes = await api.post('/rest/api/contentbody/convert/storage', {
    value: markup,
    representation: 'wiki'
  });
  const storageValue = convertRes.data.value;

  console.log('📤 Publishing docs page...');
  const pageRes = await api.get(`/rest/api/content/${targetPageId}?expand=version&status=any`);
  const currentVersion = pageRes.data.version.number;

  await api.put(`/rest/api/content/${targetPageId}`, {
    id: targetPageId,
    type: 'page',
    title: pageTitle,
    space: { key: spaceKey },
    version: { number: currentVersion + 1 },
    status: 'current',
    body: {
      storage: {
        value: storageValue,
        representation: 'storage'
      }
    }
  });

  console.log(`🎉 SUCCESS! Docs page updated → ${CONFIG.baseUrl}/spaces/${spaceKey}/pages/${targetPageId}`);
  console.log(`   Parent solution page → ${CONFIG.baseUrl}/spaces/${spaceKey}/pages/${solutionPage.id}`);
}

module.exports = {
  createConfig,
  hasMatchingLabel,
  isModulePage,
  getAllChildren,
  generateMarkupForPage,
  mergeLabels,
  toConfluenceLabelName,
  generateAggregatedMarkup,
  updateConfluencePage,
  findOrCreateSolutionBundlePage,
  moduleConfluenceLabels,
  syncSolutionPageModuleReports
};
