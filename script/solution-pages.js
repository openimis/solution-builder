const path = require('path');

const SOLUTION_BUNDLE_PAGES = {
  coreMIS: {
    title: 'Solution Bundle: CORE-MIS (Cash Transfer)',
    pageId: '4088004609',
    displayName: 'CORE-MIS (Cash Transfer)',
    summary: 'A solution bundle focused on managing cash transfer programs, providing functionalities tailored to the administration of conditional and unconditional cash benefits.',
    useCaseTitle: 'Cash Transfer (CORE-MIS) Solution',
    githubFolder: 'coreMIS',
    seedFile: 'solution/solutions/coreMIS.json',
    logoFile: 'solution/sources/logo/coremis.png',
    solutionLabel: 'solution-coremis',
  },
  SHI: {
    title: 'Solution Bundle: SHI (Social Health Insurance)',
    displayName: 'SHI (Social Health Insurance)',
    summary: 'A solution bundle for social health insurance and health financing schemes, covering enrollment, contributions, claims, providers, and payments.',
    useCaseTitle: 'Social Health Insurance (SHI) Solution',
    githubFolder: 'SHI',
    seedFile: 'solution/solutions/HF.json',
    logoFile: 'solution/sources/logo/SHI.svg',
    solutionLabel: 'solution-shi',
  },
  claimai: {
    title: 'Solution Bundle: Claim AI',
    displayName: 'Claim AI',
    summary: 'A health claims solution with AI-assisted quality and fraud detection layered on a health financing base.',
    useCaseTitle: 'Claim AI Solution',
    githubFolder: 'claimai',
    seedFile: 'solution/solutions/claim-ai.json',
    logoFile: 'solution/sources/logo/openIMIS.png',
    solutionLabel: 'solution-claimai',
  },
  SR: {
    title: 'Solution Bundle: SR (Social Registry)',
    displayName: 'SR (Social Registry)',
    summary: 'A lightweight social / beneficiary registry solution for registration, deduplication, imports, grievances, and analytics.',
    useCaseTitle: 'Social Registry (SR) Solution',
    githubFolder: 'SR',
    seedFile: 'solution/solutions/SR.json',
    logoFile: 'solution/sources/logo/SR.svg',
    solutionLabel: 'solution-sr',
  },
  IBR: {
    title: 'Solution Bundle: IBR (Insurance-Based Registry)',
    displayName: 'IBR (Insurance-Based Registry)',
    summary: 'A registry-centric social protection solution combining a modern client registry with benefit plans, payroll, grievances, and analytics.',
    useCaseTitle: 'Insurance-Based Registry (IBR) Solution',
    githubFolder: 'IBR',
    seedFile: 'solution/solutions/IBR.json',
    logoFile: 'solution/sources/logo/IBR.svg',
    solutionLabel: 'solution-ibr',
  },
};

function solutionSlug(solutionName) {
  return String(solutionName || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function getSolutionPageMeta(solutionName) {
  const known = SOLUTION_BUNDLE_PAGES[solutionName];
  if (known) return { ...known, key: solutionName };
  const slug = solutionSlug(solutionName);
  return {
    key: solutionName,
    title: `Solution Bundle: ${solutionName}`,
    displayName: solutionName,
    summary: `Solution bundle for ${solutionName}.`,
    useCaseTitle: `${solutionName} Solution`,
    githubFolder: solutionName,
    seedFile: `solution/solutions/${solutionName}.json`,
    logoFile: null,
    solutionLabel: `solution-${slug}`,
  };
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function uid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function detailsTable(id, rows) {
  const rowXml = rows.map(([label, cell]) => `
    <tr>
      <th><p><strong>${escapeXml(label)}</strong></p></th>
      <td>${cell}</td>
    </tr>`).join('');
  return `
    <ac:structured-macro ac:name="details" ac:schema-version="1" ac:macro-id="${uid()}">
      <ac:parameter ac:name="id">${escapeXml(id)}</ac:parameter>
      <ac:rich-text-body>
        <table data-layout="default">
          <tbody>${rowXml}</tbody>
        </table>
      </ac:rich-text-body>
    </ac:structured-macro>`;
}

function statusMacro(title, colour) {
  return `<ac:structured-macro ac:name="status" ac:schema-version="1" ac:macro-id="${uid()}">
    <ac:parameter ac:name="title">${escapeXml(title)}</ac:parameter>
    <ac:parameter ac:name="colour">${escapeXml(colour)}</ac:parameter>
  </ac:structured-macro>`;
}

function pageLink(title) {
  return `<ac:link><ri:page ri:content-title="${escapeXml(title)}" /><ac:link-body>${escapeXml(title)}</ac:link-body></ac:link>`;
}

function externalLink(url, text = url) {
  return `<a href="${escapeXml(url)}">${escapeXml(text)}</a>`;
}

function detailsSummary(headings, cql) {
  return `
    <ac:structured-macro ac:name="detailssummary" ac:schema-version="3" data-layout="full-width" ac:macro-id="${uid()}">
      <ac:parameter ac:name="firstcolumn">Wiki Page</ac:parameter>
      <ac:parameter ac:name="headings">${escapeXml(headings)}</ac:parameter>
      <ac:parameter ac:name="cql">${escapeXml(cql)}</ac:parameter>
    </ac:structured-macro>`;
}

const DEFAULT_MODULE_CATALOGUE_PAGE_ID = '589561955';

function buildLabelFilterCql(confluenceLabels) {
  const labels = [...new Set((confluenceLabels || []).map((label) => String(label || '').trim()).filter(Boolean))];
  if (!labels.length) return 'label = "module-"';
  if (labels.length === 1) return `label = "${labels[0]}"`;
  return `label in (${labels.map((label) => `"${label}"`).join(', ')})`;
}

function buildModuleCatalogueCql(confluenceLabels, cataloguePageId = DEFAULT_MODULE_CATALOGUE_PAGE_ID) {
  return `${buildLabelFilterCql(confluenceLabels)} and ancestor = ${cataloguePageId}`;
}

function buildManualCatalogueCql(confluenceLabels, manualRootId) {
  const labelCql = buildLabelFilterCql(confluenceLabels);
  return manualRootId ? `${labelCql} and ancestor = ${manualRootId}` : labelCql;
}

function buildModuleLabelCql(confluenceLabels, ancestorPageId = DEFAULT_MODULE_CATALOGUE_PAGE_ID) {
  return buildModuleCatalogueCql(confluenceLabels, ancestorPageId);
}

function infoMacro(text) {
  return `
    <ac:structured-macro ac:name="info" ac:schema-version="1" ac:macro-id="${uid()}">
      <ac:rich-text-body><p>${text}</p></ac:rich-text-body>
    </ac:structured-macro>`;
}

function buildSolutionBundlePageStorage(meta, confluenceLabels = [], reportRoots = {}) {
  const moduleCql = buildModuleCatalogueCql(confluenceLabels, reportRoots.moduleCataloguePageId);
  const manualCql = buildManualCatalogueCql(confluenceLabels, reportRoots.manualRootPageId);
  const solutionsUrl = `https://github.com/openimis/solutions/tree/develop/${meta.githubFolder}`;
  const overviewUrl = `https://github.com/openimis/solutions/blob/develop/${meta.githubFolder}/consolidated-solution.json`;
  const seedUrl = `https://github.com/openimis/solution-builder/blob/develop/${meta.seedFile}`;
  const logoName = meta.logoFile ? path.basename(meta.logoFile) : null;
  const logoCell = logoName
    ? `<ac:image ac:align="center" ac:layout="center" ac:width="111"><ri:attachment ri:filename="${escapeXml(logoName)}" /></ac:image>`
    : '<p></p>';

  return `
<h1>Content</h1>
<ac:structured-macro ac:name="toc" ac:schema-version="1" ac:macro-id="${uid()}">
  <ac:parameter ac:name="maxLevel">3</ac:parameter>
  <ac:parameter ac:name="minLevel">1</ac:parameter>
  <ac:parameter ac:name="exclude">Content</ac:parameter>
</ac:structured-macro>
<ac:structured-macro ac:name="children" ac:schema-version="2" ac:macro-id="${uid()}">
  <ac:parameter ac:name="all">true</ac:parameter>
</ac:structured-macro>

<h1>Solution Overview</h1>
<h2>Solution Summary</h2>
<ac:structured-macro ac:name="excerpt" ac:schema-version="1" ac:macro-id="${uid()}">
  <ac:parameter ac:name="name">summary</ac:parameter>
  <ac:rich-text-body><p>${escapeXml(meta.summary)}</p></ac:rich-text-body>
</ac:structured-macro>
${detailsTable('summary', [
    ['Use Case', `<p>${pageLink(meta.useCaseTitle)}</p>`],
    ['Reference', '<p></p>'],
    ['Logo', logoCell],
  ])}

<h2>Module Overview</h2>
${detailsSummary('ModuleGroup, Area', moduleCql)}

<h1>User Manuals &amp; Demo</h1>
<h2>Overview</h2>
<p>The following links point to the user manual and the demo server of this solution bundle as it is provided by the maintainer of this solution bundle.</p>
${detailsTable('user-ressources', [
    ['Demo Server', '<p></p>'],
    ['User Manual', '<p></p>'],
  ])}

<h2>User Manuals &amp; Demo per Module</h2>
${infoMacro('The following list points to user manual pages and live user interfaces of the most current version of openIMIS. Details might differ from the version chosen by the maintainer of this solution bundle.')}
${detailsSummary('Icon, User Manual, Menu Item', manualCql)}

<h1>Technical Resources</h1>
<h2>Configuration Details</h2>
${detailsTable('configuration', [
    ['config and init data', `<p>${externalLink(solutionsUrl)}</p>`],
    ['Overview', `<p>${externalLink(overviewUrl)}</p>`],
    ['builder seed', `<p>${externalLink(seedUrl)}</p>`],
  ])}

<h2>Module Definitions &amp; Source</h2>
${infoMacro('The following list points to code resources of openIMIS modules in their most current version. The maintainer of this solution might have chosen specific module versions; verify this from the configuration details above if needed.')}
${detailsSummary('Technical Concepts, Frontend Repositories, Backend Repositories', moduleCql)}

<h1>Solution Maintenance</h1>
${detailsTable('maintenance', [
    ['Maintainer', `<p>${pageLink('Swiss TPH')}</p>`],
    ['Status', `<p>${statusMacro('DRAFT', 'Yellow')}</p>`],
    ['Priority', `<p>${statusMacro('Medium', 'Blue')}</p>`],
  ])}
`;
}

function aggregatedDocsTitle(solutionName) {
  return `Aggregated Docs for ${solutionName} Solution`;
}

module.exports = {
  SOLUTION_BUNDLE_PAGES,
  DEFAULT_MODULE_CATALOGUE_PAGE_ID,
  solutionSlug,
  getSolutionPageMeta,
  buildLabelFilterCql,
  buildModuleCatalogueCql,
  buildManualCatalogueCql,
  buildModuleLabelCql,
  buildSolutionBundlePageStorage,
  aggregatedDocsTitle,
};
