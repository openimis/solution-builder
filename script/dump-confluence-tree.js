const fs = require('fs');
const axios = require('axios');
const config = require('./config');

const CONFIG = {
  baseUrl: config.baseUrl,
  email: config.email,
  apiToken: config.apiToken,
  spaceKey: config.spaceKey,
  rootPageId: config.rootPageId,
};

const api = axios.create({
  baseURL: CONFIG.baseUrl,
  auth: { username: CONFIG.email, password: CONFIG.apiToken },
  headers: { Accept: 'application/json' }
});

async function dumpTree(pageId, depth = 0) {
  // Fetch page details
  const pageRes = await api.get(`/rest/api/content/${pageId}?expand=title,metadata.labels`);
  const page = pageRes.data;
  const labels = page.metadata?.labels?.results?.map(l => l.name) || [];

  // Fetch children
  const childRes = await api.get(`/rest/api/content/${pageId}/child/page?expand=metadata.labels,title&limit=200`);
  const children = childRes.data.results;

  const node = {
    id: page.id,
    title: page.title,
    labels: labels,
    depth: depth,
    children: []
  };

  for (const child of children) {
    node.children.push(await dumpTree(child.id, depth + 1));
  }

  return node;
}

async function main() {
  console.log('Dumping full Confluence tree...');
  const tree = await dumpTree(CONFIG.rootPageId);
  fs.writeFileSync('confluence-tree-full.json', JSON.stringify(tree, null, 2));
  console.log('✅ Tree dumped to confluence-tree-full.json');
}

main().catch(err => {
  console.error('❌ Error:', err.response?.data || err.message);
});