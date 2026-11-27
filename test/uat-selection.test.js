// Checks of the UAT selection functions of solutionBuilder.js (uat.json).
// Run: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseUatModulesHeader, selectUatSpecs, solutionModules, buildUatJson } = require('../solutionBuilder.js');

test('parseUatModulesHeader reads be and fe lists from the leading comments', () => {
    const text = [
        '// @modules be: social_protection, individual  fe: SocialProtectionModule, IndividualModule',
        "import { baseline } from '../support/baseline';",
        '// @modules be: claim',
    ].join('\n');
    assert.deepEqual(parseUatModulesHeader(text), {
        be: ['individual', 'social_protection'],
        fe: ['IndividualModule', 'SocialProtectionModule'],
    });
});

test('parseUatModulesHeader: "-" is an empty list, lines add up, no header is null', () => {
    assert.deepEqual(parseUatModulesHeader('// @modules be: -  fe: -\nimport x;'), { be: [], fe: [] });
    assert.deepEqual(parseUatModulesHeader('// @modules be: a\n// @modules fe: A\n// be: ignored'), { be: ['a'], fe: ['A'] });
    assert.equal(parseUatModulesHeader("import x from 'y';\n// @modules be: a"), null);
    assert.equal(parseUatModulesHeader(''), null);
});

test('selectUatSpecs excludes specs with missing modules and runs undeclared ones', () => {
    const headers = [
        { spec: 'cypress/e2e/b.cy.js', modules: { be: ['insuree'], fe: ['InsureeModule'] } },
        { spec: 'cypress/e2e/a.cy.js', modules: { be: ['individual'], fe: [] } },
        { spec: 'cypress/e2e/c.cy.js', modules: null },
        { spec: 'cypress/e2e/d.cy.js', modules: { be: [], fe: [] } },
    ];
    const selection = selectUatSpecs(headers, { be: ['individual', 'core'], fe: ['CoreModule'] });
    assert.deepEqual(selection.specs, ['cypress/e2e/a.cy.js', 'cypress/e2e/c.cy.js', 'cypress/e2e/d.cy.js']);
    assert.deepEqual(selection.excluded, [
        { spec: 'cypress/e2e/b.cy.js', missing: { be: ['insuree'], fe: ['InsureeModule'] } },
    ]);
    assert.deepEqual(selection.undeclared, ['cypress/e2e/c.cy.js']);
});

test('buildUatJson takes the modules from the generated package lists', () => {
    const output = {
        'be-openimis.json': { modules: [{ name: 'core', pip: 'x' }, { name: 'insuree', pip: 'y' }] },
        'fe-openimis.json': { modules: [{ name: 'InsureeModule', npm: 'z' }], locales: [] },
    };
    assert.deepEqual(solutionModules(output), { be: ['core', 'insuree'], fe: ['InsureeModule'] });
    const uat = buildUatJson('SHI', output, [
        { spec: 'cypress/e2e/insuree.cy.js', modules: { be: ['insuree'], fe: ['InsureeModule'] } },
        { spec: 'cypress/e2e/programs.cy.js', modules: { be: ['social_protection'], fe: [] } },
    ], { dir: '/tmp/e2e', commit: 'abc' });
    assert.deepEqual(uat, {
        solution: 'SHI',
        modules: { be: ['core', 'insuree'], fe: ['InsureeModule'] },
        specs: ['cypress/e2e/insuree.cy.js'],
        excluded: [{ spec: 'cypress/e2e/programs.cy.js', missing: { be: ['social_protection'], fe: [] } }],
        source: { dir: '/tmp/e2e', commit: 'abc' },
    });
});
