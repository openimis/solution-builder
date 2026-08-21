# openIMIS Solution Builder

Solution Builder assembles custom **openIMIS** deployments from reusable JSON building blocks. It reads a "shopping list" solution file (e.g. `solution/solutions/coreMIS.json`), recursively merges the modules/bundles/roles/menus it references, and emits a ready-to-deploy package: frontend and backend package manifests, a Docker Compose file, navigation config, role/right fixtures, and seed data.

This is the current, JavaScript-based implementation. For the full architecture reference (library internals, catalog layout, merge semantics, conventions for changes), see **[AGENTS.md](./AGENTS.md)** — it is the source of truth for this repo and is kept in sync with the code. This README is a lighter, task-oriented quick start; when the two disagree, trust AGENTS.md.

## Requirements

- **Node.js v18+** (needed for `Blob` / `arrayBuffer()` support used during ZIP creation)

```bash
node -v
```

## Install

```bash
npm install
```

Installs `jszip`, `js-yaml`, `simple-git`, `unzipper`, `uuid`, `axios`, `glob`, `mime-types`.

## Quick start

```bash
node workbench.js
```

`workbench.js` is the batch CLI launcher. It walks a hardcoded map of named solutions (currently `coreMIS`, `SHI`, `claimai`, `SR`, `IBR` — see the `solutions` object near the top of `main()` in `workbench.js`) and, for each one:

1. Calls `processSolutions()` (from `solutionBuilder.js`) to merge the solution's modules, bundles, roles, menus, packages, services, and fixtures.
2. Clones/updates `openimis/openimis-dist_dkr` into `.cache/openimis-dist_dkr` and copies the Docker Compose include files and `.env.example`s referenced by the generated `compose.yml`.
3. Writes `build/<name>.zip` and the equivalent unpacked folder `build/<name>/`.

### Flags

```bash
node workbench.js --packages  # pip/npm registry specs instead of git URLs
node workbench.js --branch=develop --force-branch   # git, every module on that branch
node workbench.js --docs      # also generate aggregated Confluence markup under build/<name>/docs/
node workbench.js --publish   # also copy the build into a local clone of openimis/solutions
```

- `--packages` writes `be-openimis.json` / `fe-openimis.json` with registry pins (`openimis-be-core~=v1.9.0`, `@openimis/fe-core@>=v1.9.0`) taken from `solution/sources/*-sources.json`. Compatible-release operators (`~=` / `>=`) are intentional so patch/bugfix versions float. Mutually exclusive with `--force-branch`. Compose fragments come from `openimis-dist_dkr` `release/26.04` (falls back to `develop`).
- `--branch=NAME` sets the assembly git branch for non-package builds (and the dist-dkr checkout). Default is each package's own `branch` field, falling back to the assembly definition.
- `--force-branch` ignores per-package `branch` and points every git URL at `--branch` (or the assembly default). Git-only; do not combine with `--packages`.
- `--docs` shells out to `script/generate-confluence-aggregator.js` to build aggregated markup for the solution.
- `--publish` clones `https://github.com/openimis/solutions.git` into `.cache/temp_solutions_repo`, checks out (or reuses) a dated branch `solution/<name>/<yyyy-mm-dd>`, copies `build/<name>/` into a subfolder of that clone, and commits. **The actual `git push` is currently commented out** in `sendToExternalSolutionRepo()` (`workbench.js`), so nothing reaches the remote automatically yet — push the branch from `.cache/temp_solutions_repo` yourself, or re-enable the push line, until that's wired up.
- A `--folder=NAME` flag is parsed but not currently used — the batch loop always runs the hardcoded solution names above.

To add a new solution to the batch run, add an entry to the `solutions` map in `workbench.js` and, if it seeds Django fixtures, matching `fixtures/core/roles-*.json` / `rights-*.json` files under `solution/fixtures/core/`.

## What gets generated

For each solution, `processSolutions()` returns (and `workbench.js` writes under `build/<name>/`):

```
be-openimis.json                       # backend (pip) package manifest
fe-openimis.json                       # frontend (npm) package manifest
compose.yml                            # Docker Compose includes
module_permissions_map.json            # permissions actually used by included modules
consolidated-solution.json             # full dump of everything merged, for inspection/debugging
fixtures/module-configuration-core.json  # core module-configuration fixture (menus, logo, theme)
fixtures/roles.json                    # core.role fixture
fixtures/roles-right.json              # core.roleright fixture
fixtures/<...initData files>           # seed data copied in from the solution's initData list
```

## Other ways to run it

- **Web UI**: serve the repo root with any static server and open `index.html` (needs a Chromium-based browser for the File System Access directory picker). Same `processSolutions` library under the hood; lets you pick a source (local folder or GitHub), toggle modules, and download a ZIP.
- **Role authoring helper**: open `role-permissions-form.html` the same way. Upload a `module_permissions_map.json` (or any `{ "module": ["perm.a", ...] }` map), tick permissions, and it downloads a `<code>-role.json` file matching the shape expected under `solution/roles/<solution>/`.

## Solution / module JSON shape

A solution file is a shopping list; the same schema is used for top-level solutions and reusable bundles. Bundles are just solutions referenced through the `solutions` array. Example (`solution/solutions/coreMIS.json`):

```json
{
  "modules": {
    "grievance": "../modules/grievance.json",
    "opensearch-reports": "../modules/opensearch-reports.json"
  },
  "solutions": [
    "./social-protection-bundle.json",
    "./core-bundle.json",
    "../sources/main-menus.json",
    "../roles/coreMIS/local_admin-role.json"
  ],
  "services": ["db"],
  "moduleConfiguration": { "logo": "./sources/logo/coremis.png" },
  "initData": [
    "../fixtures/core/roles-coreMIS.json",
    "../fixtures/core/rights-coreMIS.json"
  ]
}
```

Key fields:

| Key | Meaning |
|---|---|
| `modules` | Map of `{ logicalName: "relative/path.json" }` — one JSON file per feature. |
| `solutions` | Other JSON files to merge recursively — bundles, role files, menu/locale packs. Later files override earlier definitions for the same package/service key. |
| `roles` | Inline role objects (usually roles are included as files via `solutions` instead). |
| `menus` | Extra menu entries. |
| `fePackages` / `fePackageDefinitions` | Frontend packages to install and their npm/git/version info. |
| `bePackages` / `bePackageDefinitions` | Backend packages to install and their pip/git/version info. |
| `services` / `serviceDefinitions` | Docker Compose includes. |
| `initData` | Fixture files copied into the output as-is. |
| `moduleConfiguration.logo` / `.theme` | Branding injected into the core module-configuration fixture. |

A module file (`solution/modules/*.json`) describes one feature: `menus`, `fePackages`, `bePackages`, `initData`, `services`, and `rights` (the permission names it contributes). Role assembly only keeps permissions that appear in the union of included modules' `rights` — see `transformRolesToFixture` in `solutionBuilder.js`.

### Package definitions

`fePackageDefinitions` / `bePackageDefinitions` (see `solution/sources/fe-sources.json` and `be-sources.json`) map a logical package name to its registry info:

```json
"CoreModule": {
  "package": "@openimis/fe-core",
  "git": "https://github.com/openimis/openimis-fe-core_js",
  "version": "v1.9.0",
  "branch": "develop"
}
```

`--packages` (library `packageMode`) emits registry specs from `version` (`@openimis/fe-core@>=v1.9.0`, `openimis-be-core~=v1.9.0`). Otherwise the spec points at `git`+`branch` (`@openimis/fe-core@https://github.com/.../fe-core_js#develop`). A package can override the git branch with its own `branch` field unless `--force-branch` is set. The `name` used in the output (`CoreModule`, `core`, …) is exactly the key you give it in the definitions map — there's no automatic PascalCasing. Version pins in the source JSON are generated by `openimis-dev-tools` (`gh-make-release-openimis-json.py`); do not treat hand-edits as the source of truth.

### Roles and rights

Role files (`solution/roles/<solution>/<code>-role.json`) look like:

```json
{
  "roles": [{
    "code": "local_admin",
    "name": "Local Admin",
    "permissions": ["core.users", "core.roles", "..."]
  }]
}
```

Permissions across role files with the same `code` are merged (deduped by permission name). `transformRolesToFixture` then maps each permission through `solution/permissions_map.json` into `core.role` / `core.roleright` Django fixture entries; a permission missing from the included modules' `rights` or from `permissions_map.json` is dropped with a console warning, not a hard failure.

### Services / Docker Compose

`services` (a list of names) + `serviceDefinitions` (name → `{ path, env_file }`) get turned into `compose.yml`'s `include` list. See `solution/services/*.json` for the base/cache/openSearch fragments used by the shipped solutions.

## Loading generated fixtures into openIMIS

The `fixtures/*.json` files this tool produces are standard Django fixtures for the openIMIS backend, loaded from *that* project, not from here:

```sh
python manage.py loaddata fixtures/core/users.json
```

`core.roleright` fixtures reference `core.role` by a natural key (e.g. `uuid`) rather than a database id, so load them with the custom command that resolves the foreign key first:

```sh
python manage.py load_fixture_foreign_key fixtures/roles-right.json uuid
```

## Ready-made solutions

| Name | Source file | Focus |
|---|---|---|
| coreMIS | `solution/solutions/coreMIS.json` | Social protection / cash transfer |
| SHI | `solution/solutions/HF.json` | Social health insurance (claims, enrollment, formal sector) |
| IBR | `solution/solutions/IBR.json` | Insurance-based registry hybrid |
| SR | `solution/solutions/SR.json` | Social registry |
| claim-ai | `solution/solutions/claim-ai.json` | Health claims + AI quality |
| full | `solution/solutions/full.json` | Maximal reference (not currently in the `workbench.js` loop) |

Business-facing write-ups for each live in `docs/` (`coreMIS.md`, `SHI.md`, `IBR.md`, `SR.md`, `claim-ai.md`, …).

## Useful links (openIMIS wiki on Confluence)

- [Solution Building / Deployment Recipe Strategy](https://openimis.atlassian.net/wiki/spaces/OP/pages/4139188234/Solution+Building+Deployment+Recipe+Strategy)
- [Configuration of Main Menu and Submenus](https://openimis.atlassian.net/wiki/spaces/OP/pages/4209606659/Solution+Building+configuration+of+Main+Menu+and+Submenus)
- [List of submenu entries available in the system](https://openimis.atlassian.net/wiki/spaces/OP/pages/4209737755/List+of+submenu+entries+available+in+system)
- [Technical approach behind configurable menus](https://openimis.atlassian.net/wiki/spaces/OP/pages/4209803280/Technical+Approach+to+have+Menu+Configuration+flexible)

These links describe the conceptual menu/deployment model; for the exact current menu IDs and submenu entries, read `solution/sources/main-menus.json` and the `menus` arrays in `solution/modules/*.json` directly rather than relying on a hardcoded table here, since those move faster than this document.
