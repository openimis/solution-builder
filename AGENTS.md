# AGENTS.md — openIMIS Solution Builder

This repository is the **factory** that assembles custom openIMIS deployments from reusable JSON building blocks. The companion **[openimis/solutions](https://github.com/openimis/solutions)** repo is the **catalog** of finished, ready-to-deploy outputs.

Agents working in this repo should read this file first.

## Purpose

openIMIS is modular. Different programs (national health insurance, cash transfers, social registries, AI-assisted claims, …) need different features, menus, roles, fixtures, and Docker services.

Solution Builder turns a short "shopping list" (a solution JSON) into a complete package:

- Frontend assembly (`fe-openimis.json` — npm/git packages)
- Backend assembly (`be-openimis.json` — pip/git packages)
- Docker Compose (`compose.yml` plus included compose fragments)
- Navigation / core module configuration fixture
- Role and role-right fixtures
- Seed data (languages, lookups, rights, …)
- A `consolidated-solution.json` dump of everything that was merged

Generated artifacts land under `build/<name>/` and `build/<name>.zip`. Publishing (optional) copies them into the `solutions` GitHub repo on a dated branch.

## Architecture: one library, two launchers

```
                    ┌─────────────────────────┐
                    │   solutionBuilder.js    │
                    │  (core library — dual   │
                    │   Node + browser)       │
                    └───────────┬─────────────┘
                                │
              ┌─────────────────┴─────────────────┐
              │                                   │
     ┌────────▼────────┐                 ┌────────▼─────────┐
     │  workbench.js   │                 │ solutionBuilder  │
     │  Node CLI       │                 │ UI.js + index.   │
     │  batch builder  │                 │ html  (web form) │
     └─────────────────┘                 └──────────────────┘
```

### `solutionBuilder.js` — the main file

This is the **core library**. Everything else is a thin launcher around it.

It is written to run in **both** Node.js and the browser:

- Node: `require('fs')`, `require('path')`, `require('jszip')`, `require('js-yaml')`
- Browser: File System Access API (`showDirectoryPicker`) or GitHub Contents API

Public exports (`module.exports`):

| Function | Role |
|---|---|
| `processSolutions(solutionFile, directoryPath, permission_map_path, branch, forceBranch, packageMode)` | Main entry. Recursively merges a solution, then emits the output file map. Returns `{ output, modules }`. `packageMode` emits pip/npm registry specs; `forceBranch` pins every git URL to `branch`. The two are mutually exclusive. |
| `mergeSolutions(...)` | Recursive merge of solutions, bundles, modules, roles, menus, packages, services, locales, fixtures. |
| `createZip(data, filename)` | Writes a ZIP (disk in Node, download in browser). |
| `createSolutionDirectory(baseDir, output)` | Writes the output map as a folder tree. |
| `getAbsolutePath(relativePath, basePath, withFile)` | Path resolution used throughout the merge. |

Important internals:

- `fetchJSON` — loads JSON from a local path, a directory handle, or a GitHub API URL.
- `getBePackageConf` / `getFePackageConf` — turn package definitions into pip/npm install specs. Package mode emits `package~=version` / `package@>=version` (compatible-release, so bugfixes float). Git mode uses `git`+`branch`; `forceBranch` overrides per-package `branch`.
- `getServiceConf` / `transformComposeContent` — assemble Docker Compose includes.
- `mergeMenusData` / `cleanMenuDictionaries` — merge menus by `id`, nest submenus, sort by `position`.
- `mergeRolesData` — merge named roles.
- `transformRolesToFixture` — map role permission *names* through `solution/permissions_map.json` into `core.role` / `core.roleright` fixtures. Permissions not declared on an included module's `rights` array, or missing from the central map, are skipped with a warning.
- `mergeAndSortFixtures` — concatenate and sort fixture files listed in `initData`.
- `injectLogoTheme` — embed logo/theme from `moduleConfiguration` into the core module-configuration fixture.
- Module Confluence labels — each included module contributes a label (module JSON `confluenceLabel` or `label`, otherwise the module key), always stored with the `module-` prefix so it matches Confluence (`module-claim`, `module-core`, …). These are written to `consolidated-solution.json` as `confluenceLabel` and used by `workbench.js` when generating docs.

`processSolutions` output keys typically include:

```
be-openimis.json
fe-openimis.json
compose.yml
module_permissions_map.json
consolidated-solution.json
fixtures/module-configuration-core.json
fixtures/roles.json
fixtures/roles-right.json
fixtures/<copied initData files...>
```

### `workbench.js` — Node CLI launcher

Batch runner. Requires `solutionBuilder.js` and walks a hardcoded map of named solutions:

```js
{
  'coreMIS': './solution/solutions/coreMIS.json',
  'SHI':     './solution/solutions/HF.json',
  'claimai': './solution/solutions/HF.json',   // currently same source as SHI
  'SR':      './solution/solutions/SR.json',
  'IBR':     './solution/solutions/IBR.json',
}
```

For each name it:

1. Calls `processSolutions`.
2. Clones/updates `openimis/openimis-dist_dkr` into `.cache/openimis-dist_dkr` and copies compose include files + `.env.example`s referenced by `compose.yml`.
3. Writes `build/<name>.zip` and `build/<name>/`.
4. Optionally generates Confluence markup (`script/generate-confluence-aggregator.js`).
5. Optionally publishes into a clone of `openimis/solutions`.

```bash
node workbench.js                          # generate only (git, per-module branches)
node workbench.js --packages               # pip/npm specs from source versions (`~=` / `>=`)
node workbench.js --branch=develop --force-branch   # git, every module on that branch
node workbench.js --docs                   # also generate Confluence markup
node workbench.js --publish                # also push to openimis/solutions
node workbench.js --publish --folder=NAME  # --folder is parsed but the loop uses the hardcoded names
```

`--packages` and `--force-branch` are mutually exclusive. With `--packages`, compose fragments are copied from `openimis-dist_dkr` branch `release/26.04` (falls back to `develop`). With `--branch=NAME`, that name is used for dist-dkr as well.

Requires **Node.js v18+** (`Blob` / `arrayBuffer` for ZIP).

### `solutionBuilderUI.js` + `index.html` — web form launcher

Same library, interactive UI.

- Open `index.html` in a browser.
- Choose source: local folder (File System Access API) or GitHub Contents API (optional token).
- Check solutions and modules, optionally edit extra JSON (roles/menus) in the JSONEditor pane.
- Submit → `processSolutions` → browser download of `solution.zip`.

`index.html` loads `solutionBuilder.js` then `solutionBuilderUI.js`. The UI talks to the same `processSolutions` / `fetchJSON` / `createZip` functions.

## Side tools

### `role-permissions-form.html`

Standalone helper for **authoring role JSON**, not part of the assembly pipeline.

1. Upload a permissions map (typically a generated `module_permissions_map.json`, or a module-keyed `{ "module": ["perm.a", "perm.b"] }` object).
2. Enter role code + name.
3. Tick permissions (module-level checkboxes support select-all / indeterminate).
4. Save downloads a role JSON compatible with `solution/roles/<solution>/<code>-role.json`.

Use this when adding or revising roles under `solution/roles/`. After saving, reference the new file from the target solution's `solutions` array.

### `script/` — Confluence / docs helpers

| File | Role |
|---|---|
| `generate-confluence-aggregator.js` | Build aggregated Confluence markup for a solution; `--publish` updates the page. |
| `generate-solution-markup.js` | Related markup generator. |
| `dump-confluence-tree.js` | Dump the Confluence page tree. |
| `confluence-utils.js` | Shared Confluence API helpers. |
| `solution-pages.js` | Titles, summaries, and storage template for Solution Bundle pages in space OP. |
| `config.js` | **Local credentials — gitignored.** Do not commit. |

On `--publish` / `--docs`, the aggregator:

1. Finds the Solution Bundle page under **Solution Bundle Catalogue** (`5355012104` in space `OP`), or creates one from the CoreMIS-style template if it is missing. CoreMIS already exists as [Solution Bundle: CORE-MIS (Cash Transfer)](https://openimis.atlassian.net/wiki/spaces/OP/pages/4088004609); its hand-written content is kept, but Page Properties Report CQL is synced to the solution's `confluenceLabel` values (`module-core`, `module-payroll`, …). Module reports are limited to subpages of [openIMIS Modules](https://openimis.atlassian.net/wiki/spaces/OP/pages/589561955) (`ancestor = 589561955`). User-manual reports stay under the existing manual root (`rootPageId` / `manualRootPageId`). The old “label as `solution-<name>`” notes are removed.
2. Creates or updates **Aggregated Docs for &lt;solution&gt; Solution** as a **child** of that solution page.

`config.js` keys used for this: `targetSpaceKey` (`OP`), `solutionCataloguePageId` (`5355012104`). Module docs are still read from `spaceKey` / `rootPageId` (KB).

Invoked from `workbench.js` when `--docs` or `--publish` is set.

## Catalog layout (`solution/`)

This directory is the **source of truth** the library reads. Paths in JSON are relative to the file that declares them.

```
solution/
├── solutions/          # Named solutions + reusable bundles
│   ├── coreMIS.json
│   ├── HF.json         # Social Health Insurance (published as SHI)
│   ├── IBR.json
│   ├── SR.json
│   ├── claim-ai.json
│   ├── full.json
│   ├── core-bundle.json
│   ├── social-protection-bundle.json
│   ├── healthfinancing-bundle.json
│   ├── formal-sector-bundle.json
│   └── ...
├── modules/            # One JSON per openIMIS feature
├── roles/<solution>/   # Business roles (permissions by name)
├── fixtures/           # Seed data copied into the output
│   └── core/           # roles-*.json, rights-*.json, language, …
├── sources/            # Package registries, menus, logos, themes
│   ├── be-sources.json
│   ├── fe-sources.json
│   ├── main-menus.json
│   ├── logo/
│   └── theme/
├── services/           # Docker service fragments (base, cache, openSearch)
├── localesModules/     # Extra locale files (e.g. fr.json)
└── permissions_map.json  # permission name → numeric right_id
```

### Solution / bundle JSON

A solution file is a shopping list. The same schema is used for top-level solutions **and** reusable bundles. Bundles are just solutions included via the `solutions` array.

Typical keys:

| Key | Meaning |
|---|---|
| `solutions` | Other JSON files to merge recursively (bundles, roles, menus, locales, services). |
| `modules` | Map of `{ logicalName: "relative/path.json" }`. |
| `roles` | Inline role objects (usually roles are included as files via `solutions`). |
| `menus` | Extra menu entries. |
| `fePackages` / `fePackageDefinitions` | Frontend packages to install + their npm/git/version. |
| `bePackages` / `bePackageDefinitions` | Backend packages to install + their pip/git/version. |
| `services` / `serviceDefinitions` | Docker compose includes. |
| `locales` | Frontend locale packs. |
| `initData` | Fixture files to copy into the output. |
| `moduleConfiguration.logo` / `.theme` | Branding injected into the core module-configuration fixture. |

`mergeSolutions` walks `solutions` first (depth-first), then applies the current file's own modules/packages/roles/menus/fixtures. Later files override earlier definitions for the same package/service key.

### Module JSON

A module describes one feature. Typical keys: `menus`, `fePackages`, `bePackages`, `initData`, `services`, `rights`.

Optional `confluenceLabel` or `label` overrides the Confluence filter label for that module (default: the module key in the solution). Collected labels are written to `consolidated-solution.json` as `confluenceLabel` with the `module-` prefix.

`rights` is the list of permission **names** this module contributes. Role assembly only keeps permissions that appear in the union of included modules' `rights`.

### Role JSON

```json
{
  "roles": [{
    "code": "local_admin",
    "name": "Local Admin",
    "permissions": ["core.users", "core.roles", "..."]
  }]
}
```

Permission strings must exist both in some included module's `rights` and in `solution/permissions_map.json`.

### Sources

- `solution/sources/be-sources.json` / `fe-sources.json` — canonical package registries (name → `{ package, git, version, branch? }`). **Version pins are generated** by `openimis-dev-tools/python` (`print_be_solution_builder` / `print_fe_solution_builder` from `gh-make-release-openimis-json.py`); do not hand-edit versions as the source of truth.
- `*-obenma.json` variants — alternate source sets.
- `main-menus.json` — shared top-level menu skeleton, usually included from every solution.

## Ready-made solutions

| Name | Source file | Focus |
|---|---|---|
| coreMIS | `solution/solutions/coreMIS.json` | Social protection / cash transfer |
| SHI | `solution/solutions/HF.json` | Social health insurance (claims, enrollment, formal sector) |
| IBR | `solution/solutions/IBR.json` | Insurance-based registry hybrid |
| SR | `solution/solutions/SR.json` | Social registry |
| claim-ai | `solution/solutions/claim-ai.json` | Health claims + AI quality |
| full | `solution/solutions/full.json` | Maximal reference (not currently in the workbench loop) |

Business-facing write-ups live in `docs/` (`coreMIS.md`, `SHI.md`, …). `docs/solution-builder-explained.md` is the slide source (Marp).

## How to run

```bash
npm install          # jszip, js-yaml, simple-git, unzipper, uuid, axios, glob, mime-types
node workbench.js    # generate build/<name>/ and build/<name>.zip for each mapped solution
```

Web UI: serve the repo root (any static server) and open `index.html`. The File System Access API needs a Chromium-based browser and a secure context.

Role helper: open `role-permissions-form.html` the same way.

## Conventions for changes

- **Logic lives in `solutionBuilder.js`.** Keep `workbench.js` and `solutionBuilderUI.js` as launchers. If a merge/output bug exists, fix the library.
- The library is dual-runtime. Do not introduce Node-only APIs outside `typeof window === 'undefined'` guards, and do not assume `window` / File System Access API in Node paths.
- Prefer adding or editing JSON under `solution/` over hardcoding in JS. New features belong in `solution/modules/`. New flavors belong in `solution/solutions/` plus `solution/roles/<name>/`.
- When adding a solution to the batch CLI, update the `solutions` map in `workbench.js`.
- Roles: author with `role-permissions-form.html` (or by hand), store under `solution/roles/<solution>/`, include the file from the solution JSON, and keep a matching `fixtures/core/roles-*.json` + `rights-*.json` in `initData` if the solution seeds Django fixtures that way.
- `permissions_map.json` is the numeric right-id registry. New permission names need an entry there **and** on the module's `rights` array, or `transformRolesToFixture` will drop them.
- Do not commit `script/config.js`, `.cache/`, `build/`, `output*`, or Confluence dumps (`confluence-tree-full.json`).
- Generated `build/` is gitignored. Treat it as disposable output; the source of truth is `solution/` + the JS library.
- **Keep README.md in sync.** README.md is the user-facing quick start (install, `workbench.js` usage/flags, generated output, solution/module JSON shape, role/package/service schema examples). AGENTS.md is the deeper reference. When a change here touches something README.md documents — exported functions, CLI flags, output file names, the hardcoded `workbench.js` solutions map, package/role/service schema or transform behavior — update README.md in the same change. If you notice README.md has drifted from the code while working on something else, fix it (or flag it to the user) rather than leaving it stale.

## Related repos

| Repo | Role |
|---|---|
| [openimis/solution-builder](https://github.com/openimis/solution-builder) | This repo — factory + catalog of building blocks |
| [openimis/solutions](https://github.com/openimis/solutions) | Published generated solutions |
| [openimis/openimis-dist_dkr](https://github.com/openimis/openimis-dist_dkr) | Docker compose fragments copied into each build |

## Requirements

- Node.js **v18+**
- Chromium-based browser for the web UI (directory picker)
- Network access to GitHub if using `--publish` or the GitHub source mode
