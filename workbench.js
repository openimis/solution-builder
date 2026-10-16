
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const simpleGit = require('simple-git');
const unzipper = require('unzipper');
const os = require('os');


async function extractFERepoList(data, data_rel) {
  try {
    // Fetch the JSON file from the URL
    const response_dev = fs.readFileSync("dev.json", "utf8");
    const response_rel = fs.readFileSync("rel.json", "utf8");
    const data = JSON.parse(response_dev);
    const data_rel = JSON.parse(response_rel);

    // Parse the JSON content
    const pip_gh_pattern = /^((?:git\+)?https?:.+\.git)@[^#]+#egg=([\w-]+)$/;
    // Extract modules and transform into the desired format
    const repoList = data.modules.reduce((acc, module) => {
      const match = module.pip.match(pip_gh_pattern);
      // Check if git property exists and starts with github.com
      cur_module = {};
      if (match) {
        // Convert github.com URL to git+https format
        cur_module = {
          package: match[2],
          git: match[1],
        };
      }
      const module_rel = data_rel.modules.find((m) => m.name === module.name);
      if (module_rel) {
        const versionMatch = module_rel.pip.match(/((?:[\d]+\.?)+)$/);
        if (versionMatch) {
          cur_module["version"] = versionMatch[0];
        }
      }
      if (Object.keys(cur_module).length > 0) {
        acc.push({
          [module.name]: cur_module,
        });
      }
      return acc;
    }, []);

    // Output the result
    console.log(JSON.stringify(repoList, null, 2));
    return repoList;
  } catch (error) {
    console.error("Error fetching or processing the data:", error);
    return [];
  }
}

async function extractFERepoList(data, data_rel) {
  try {
    // Fetch the JSON file from the URL
    const response_dev = fs.readFileSync("dev.json", "utf8");
    const response_rel = fs.readFileSync("rel.json", "utf8");
    const data = JSON.parse(response_dev);
    const data_rel = JSON.parse(response_rel);
    ret = {};
    // Parse the JSON content
    const npm_gh_pattern = /^(@[^@]+)@((?:git\+)?https?:.+)#[^#]+$/;
    // Extract modules and transform into the desired format
    const repoList = data.modules.reduce((acc, module) => {
      const match = module.npm.match(npm_gh_pattern);
      // Check if git property exists and starts with github.com
      cur_module = {};
      if (match) {
        // Convert github.com URL to git+https format
        cur_module = {
          package: match[1],
          git: match[2],
        };
      }
      const module_rel = data_rel.modules.find((m) => m.name === module.name);
      if (module_rel) {
        const versionMatch = module_rel.npm.match(/v?((?:[\d]+\.?)+)$/);
        if (versionMatch) {
          cur_module["version"] = versionMatch[0];
        }
      }

      if (Object.keys(cur_module).length > 0) {
        ret[module.name] = cur_module;
        //acc.push({[module.name]:cur_module});
      }
      return ret;
    }, []);

    // Output the result
    console.log(JSON.stringify({ ret }, null, 2));
    return ret;
  } catch (error) {
    console.error("Error fetching or processing the data:", error);
    return [];
  }
}


// Function to handle and fix YAML block strings (e.g., | or |+)
function fixYmlBlockStrings(content) {
    return content
        .replace(/^\|[ \t]*$/gm, '')  // Remove unnecessary | at the beginning of lines
        .replace(/\|[\r\n]+/g, '\n')  // Fix the newlines and keep the content formatted correctly
        .replace(/\|[\+\-]*\r?\n/g, '\n');  // Handle case for |+ or |- with additional newline handling
}

// Ensure dist-dkr repo is cloned and on the correct branch
async function ensureDistDkrRepo(branch = 'develop') {
    const distDkrRepoPath = path.resolve('.cache/openimis-dist_dkr');
    
    if (!fs.existsSync(distDkrRepoPath)) {
        console.log('🔄 Cloning dist-dkr repository...');
        await simpleGit().clone('https://github.com/openimis/openimis-dist_dkr.git', distDkrRepoPath);
    }
  
    const git = simpleGit(distDkrRepoPath);
    await git.fetch();
    const currentBranch = (await git.branch()).current;
  
    if (currentBranch !== branch) {
        console.log(`🔀 Checking out branch '${branch}'`);
        try {
            await git.checkout(branch);
        } catch (error) {
            if (branch !== 'develop') {
                console.warn(`⚠️ Could not check out '${branch}' (${error.message}); falling back to develop`);
                await git.checkout('develop');
            } else {
                throw error;
            }
        }
    }
    await git.pull();
  
    return distDkrRepoPath;
}


// Copy files defined in compose.yml from the dist-dkr repo
async function copyDistDkrAssetsFromCompose(composeContent, branch = 'develop') {

    // Read and parse the compose content to get the file paths


    // Ensure dist-dkr repo is cloned and checked out to the right branch
    const distDkrRepoPath = await ensureDistDkrRepo(branch);

    const outputFiles = {};

    // Ensure we are getting the paths from composeConfig
    if (composeContent && composeContent.include && Array.isArray(composeContent.include)) {
        for (const item of composeContent.include) {
            if (item.path) {
                // Resolve path within dist-dkr repo
                const filePath = item.path.replace('${DB_DEFAULT:-postgresql}', 'postgresql'); // Resolve dynamic paths
                const srcPath = path.join(distDkrRepoPath, filePath); // Full path inside dist-dkr repo

                if (fs.existsSync(srcPath)) {
                    // Read the file content
                    let fileContent = fs.readFileSync(srcPath, 'utf8');
                    
                    // Fix YAML block strings if necessary
                    fileContent = yaml.load(fileContent);

                    outputFiles[filePath] = fileContent;
                    console.log(`✔️ Copied ${item.path} from dist-dkr`);
                } else {
                    console.warn(`⚠️ File ${item.path} not found at path: ${srcPath}`);
                }
            }
            // Handle env files and their .example equivalents
            if (item.env_file && Array.isArray(item.env_file)) {
                for (const envFile of item.env_file) {
                    // Process the .env file itself
                    const envSrcPath = path.join(distDkrRepoPath, envFile + '.example');
                    if (fs.existsSync(envSrcPath)) {
                        const envContent = fs.readFileSync(envSrcPath, 'utf8');
                        outputFiles[envFile] = envContent;
                        console.log(`✔️ Copied ${envFile} from dist-dkr`);
                    } else {
                        console.warn(`⚠️ File ${envFile} not found at path: ${envSrcPath}`);
                    }
                }
            }
        }

    } else {
        console.warn('⚠️ No include array found in compose.yml.');
    }

    return outputFiles;
}

const getFormattedDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are 0-based, so +1
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

async function sendToExternalSolutionRepo(folderName, solutionFolder) {
    const repoUrl = 'https://github.com/openimis/solutions.git';
    const branchName = `solution/${folderName}/${getFormattedDate()}`;
    const tempDir = path.join(__dirname, '.cache/temp_solutions_repo');
    
    // Clean up any previous temp/unzip folder
    if (!fs.existsSync(tempDir)){
      await git.clone(repoUrl, tempDir);
    }
    const git = simpleGit();
    const gitRepo = simpleGit(tempDir);
    await gitRepo.checkout('develop');      // Clone the repo and checkout a new branch
    
    const localBranches = await gitRepo.branchLocal();
    if(localBranches.all.includes(branchName)){
       await gitRepo.checkout(branchName); 
    }else{
      await gitRepo.checkoutBranch(branchName, 'develop');

    }
    // Create or overwrite target folder in the cloned repo
    const targetFolder = path.join(tempDir,folderName)
    if (!fs.existsSync(targetFolder)) fs.mkdirSync(targetFolder);
    fs.cpSync(solutionFolder, targetFolder, { recursive: true });
    // Commit and push

    await gitRepo.add('.');
    await gitRepo.commit(`Add/update ${folderName} solution`);
    //await gitRepo.push('origin', branchName);
    console.log(`✔️ Pushed ${folderName} to branch ${branchName}`);
}




// ---------------------------------------------------------------------------
// Menu grouping: wrap each main menu's entries into "level 1.5" groups. An
// entry belongs to its source module's group (solution/modules/<module>.json)
// unless the menu declaration names a `group`, which wins and can be shared by
// several modules. The frontend renders a group as a titled separator opening
// the block and a plain separator closing it (see the frontend docs/menus.md,
// "Entry Groups" section).
// ---------------------------------------------------------------------------

const MODULES_DIR = path.join(__dirname, 'solution', 'modules');
const CORE_CONFIG_FIXTURE = 'fixtures/module-configuration-core.json';
const MENU_GROUP_MODES = ['multi', 'all', 'off'];
const MENU_KEY_SEPARATOR = '@@';

// "social-protection" -> "Social Protection"
const titleCase = (value) => String(value)
    .split(/[-_.\s]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const groupId = (value) => String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// Normalises a `group` declaration into { id, name, position? }. Accepts a bare
// string ("Providers") or an object ({ id, name, position }) so a group can pin
// its own title and sort order.
function parseGroup(group) {
    if (typeof group === 'string' && group.trim()) {
        return { id: groupId(group), name: group.trim() };
    }
    if (group && typeof group === 'object') {
        const label = [group.name, group.text, group.id].find((v) => typeof v === 'string' && v.trim());
        if (!label) return null;
        const id = groupId(group.id || label);
        if (!id) return null;
        const parsed = { id, name: label.trim() };
        if (typeof group.position === 'number') parsed.position = group.position;
        return parsed;
    }
    return null;
}

// A module's default group: its own `menuGroup` (or `label` / `name`) when set,
// otherwise the module file name title-cased.
function moduleGroup(moduleKey, moduleJson) {
    const explicit = moduleJson && parseGroup(moduleJson.menuGroup || moduleJson.label || moduleJson.name);
    return explicit || { id: groupId(moduleKey) || moduleKey, name: titleCase(moduleKey) };
}

const menuEntryKeys = (entry) => [entry && entry.id, entry && entry.route]
    .filter((key) => typeof key === 'string' && key.length);

// Builds the lookup used to attribute a generated entry to the module that
// declared it: keyed per main menu (mainMenu + entry id/route) with a
// menu-agnostic fallback, so entries still resolve when a solution moves them
// to another main menu. Ambiguous fallbacks (same route declared by several
// modules) are dropped rather than guessed.
function buildMenuEntryModuleMap(modulesDir = MODULES_DIR) {
    const scoped = new Map();
    const loose = new Map();
    const ambiguous = new Set();

    if (!fs.existsSync(modulesDir)) {
        console.warn(`No module directory at ${modulesDir}, skipping menu grouping`);
        return { scoped, loose, moduleCount: 0 };
    }

    const files = fs.readdirSync(modulesDir).filter((file) => file.endsWith('.json')).sort();
    let moduleCount = 0;

    for (const file of files) {
        const moduleKey = path.basename(file, '.json');
        let moduleJson;
        try {
            moduleJson = JSON.parse(fs.readFileSync(path.join(modulesDir, file), 'utf8'));
        } catch (error) {
            console.warn(`Could not parse ${file} for menu grouping: ${error.message}`);
            continue;
        }
        const menus = Array.isArray(moduleJson.menus) ? moduleJson.menus : [];
        const defaultGroup = moduleGroup(moduleKey, moduleJson);
        let declared = 0;

        for (const menu of menus) {
            if (!menu || !menu.mainMenu) continue; // main menu definitions carry no entries
            // A `group` on the entry overrides the module's own group, so entries
            // from several modules can share one block (health facilities and
            // payment points under "Providers", say).
            const group = parseGroup(menu.group) || defaultGroup;
            const attribution = { moduleKey, group };
            for (const key of menuEntryKeys(menu)) {
                scoped.set(`${menu.mainMenu}${MENU_KEY_SEPARATOR}${key}`, attribution);
                const known = loose.get(key);
                if (known && known.moduleKey !== moduleKey) {
                    ambiguous.add(key);
                } else {
                    loose.set(key, attribution);
                }
                declared += 1;
            }
        }
        if (declared) moduleCount += 1;
    }

    ambiguous.forEach((key) => loose.delete(key));
    return { scoped, loose, moduleCount };
}

function lookupEntryModule(map, menuId, entry) {
    for (const key of menuEntryKeys(entry)) {
        const scoped = map.scoped.get(`${menuId}${MENU_KEY_SEPARATOR}${key}`);
        if (scoped) return scoped;
    }
    for (const key of menuEntryKeys(entry)) {
        const loose = map.loose.get(key);
        if (loose) return loose;
    }
    return null;
}

const isMenuGroupEntry = (entry) => !!entry && !entry.route && Array.isArray(entry.entries);
const entryPosition = (entry) => (entry && typeof entry.position === 'number' ? entry.position : 99);

// Rewrites one main menu's entries into groups. Entries whose module cannot be
// resolved, and groups already present in the config, stay untouched at menu
// level. Unless the group pins its own `position`, it takes the smallest
// position of its entries, so it slots in where those entries used to sort.
function groupMenuEntries(menu, map, mode) {
    const entries = Array.isArray(menu.entries) ? menu.entries : [];
    if (!entries.length) return { entries, groupCount: 0 };

    const blocks = [];
    const byGroup = new Map();

    for (const entry of entries) {
        const module = isMenuGroupEntry(entry) ? null : lookupEntryModule(map, menu.id, entry);
        if (!module) {
            blocks.push({ kind: 'entry', entry });
            continue;
        }
        let block = byGroup.get(module.group.id);
        if (!block) {
            block = { kind: 'group', group: module.group, entries: [] };
            byGroup.set(module.group.id, block);
            blocks.push(block);
        }
        block.entries.push(entry);
    }

    // With 'multi', a menu whose entries all land in one group keeps a flat
    // list: a single group spanning the whole menu would only add a redundant
    // header.
    if (byGroup.size === 0 || (mode === 'multi' && byGroup.size < 2)) {
        return { entries, groupCount: 0 };
    }

    const menuPrefix = String(menu.id || '').replace(/\.MainMenu$/, '') || 'menu';
    const grouped = blocks.map((block) => {
        if (block.kind === 'entry') return block.entry;
        const { group } = block;
        return {
            type: 'group',
            id: `${menuPrefix}.group.${group.id}`,
            name: group.name,
            text: group.name,
            position: typeof group.position === 'number'
                ? group.position
                : Math.min(...block.entries.map(entryPosition)),
            entries: block.entries,
        };
    });

    return { entries: grouped, groupCount: byGroup.size };
}

// Applies the grouping to the generated fe-core module configuration fixture.
function groupCoreMenusByModule(output, map, mode, solutionName) {
    if (mode === 'off' || !map.moduleCount) return output;

    const fixture = output[CORE_CONFIG_FIXTURE];
    if (!Array.isArray(fixture) || !fixture.length) return output;

    let totalGroups = 0;
    let touchedMenus = 0;

    for (const record of fixture) {
        const fields = record && record.fields;
        if (!fields || fields.module !== 'fe-core' || typeof fields.config !== 'string') continue;

        let config;
        try {
            config = JSON.parse(fields.config);
        } catch (error) {
            console.warn(`Could not parse fe-core config for ${solutionName}: ${error.message}`);
            continue;
        }
        if (!Array.isArray(config.menus)) continue;

        for (const menu of config.menus) {
            const { entries, groupCount } = groupMenuEntries(menu, map, mode);
            if (!groupCount) continue;
            menu.entries = entries;
            totalGroups += groupCount;
            touchedMenus += 1;
        }
        fields.config = JSON.stringify(config, null, 2);
    }

    if (totalGroups) {
        console.log(`Grouped menu entries for ${solutionName}: ${totalGroups} groups in ${touchedMenus} main menus`);
    } else {
        console.log(`No menu groups created for ${solutionName} (mode=${mode})`);
    }
    // The fixture just changed; realign consolidated-solution.json with it.
    return syncConsolidatedCoreFeConfig(output);
}

const { createZip, processSolutions , createSolutionDirectory, syncConsolidatedCoreFeConfig } = require("./solutionBuilder.js");

async function main() {
    try {
        const args = process.argv.slice(2);
        const shouldPublish = args.includes('--publish');
        const shouldDocs = args.includes('--docs');
        const packageMode = args.includes('--packages');
        const forceBranch = args.includes('--force-branch');
        const folderArg = args.find(arg => arg.startsWith('--folder='));
        const branchArg = args.find(arg => arg.startsWith('--branch='));
        const menuGroupArg = args.find(arg => arg.startsWith('--menu-groups='));
        const menuGroupMode = menuGroupArg ? menuGroupArg.split('=')[1] : 'multi';
        if (!MENU_GROUP_MODES.includes(menuGroupMode)) {
            console.error(`--menu-groups must be one of: ${MENU_GROUP_MODES.join(', ')}`);
            process.exit(1);
        }
        const assemblyBranch = branchArg ? branchArg.split('=')[1] : null;
        const solutionName = folderArg ? folderArg.split('=')[1] : 'default-solution';
        if (packageMode && forceBranch) {
            console.error('❌ --packages and --force-branch are mutually exclusive');
            process.exit(1);
        }
        const distDkrBranch = packageMode
            ? 'release/26.04'
            : (assemblyBranch || 'develop');
        const solutions = {
          'coreMIS': './solution/solutions/coreMIS.json',
          'SHI': './solution/solutions/HF.json',
         'claimai': './solution/solutions/HF.json',
          'full' : './solution/solutions/full.json',
           'SR': './solution/solutions/SR.json',
           'IBR': './solution/solutions/IBR.json'
        }

        // Generated entry -> source module lookup, shared by every solution
        const menuEntryModuleMap = buildMenuEntryModuleMap();

        let outputs = {}
        for (const [name, solution_path] of Object.entries(solutions)){
          console.log(`generating ${name}`)
          const { output, modules, confluenceLabel } = await processSolutions(
              solution_path,
              process.cwd(),
              './solution/permissions_map.json',
              assemblyBranch,
              forceBranch,
              packageMode
          );
          outputs[name] = output;
          // Get dist-dkr files from compose.yml and merge them into output
          const composeFiles = await copyDistDkrAssetsFromCompose(outputs[name]['compose.yml'], distDkrBranch);
          Object.assign(outputs[name], composeFiles);
          // Group the fe-core menu entries by the module that declared them
          outputs[name] = groupCoreMenusByModule(outputs[name], menuEntryModuleMap, menuGroupMode, name);
          const zipPath = path.join(__dirname, 'build', name +'.zip');
          await createZip(outputs[name], zipPath);
          baseDir = 'build/'+name
          await createSolutionDirectory(baseDir, outputs[name])

          // Generate aggregated Confluence markup only if --publish or --docs is set
          if (shouldPublish || shouldDocs) {
            console.log(`📝 Generating aggregated Confluence markup for ${name} using aggregator config...`);
            try {
              const additionalLabels = (confluenceLabel && confluenceLabel.length ? confluenceLabel : modules).join(',');
              const { execSync } = require('child_process');
              const publishFlag = (shouldPublish || shouldDocs) ? '--publish' : '';
              execSync(`node script/generate-confluence-aggregator.js ${name} "${additionalLabels}" ${publishFlag}`, { stdio: 'inherit' });
              // Copy the generated markup to build directory
              const markupFile = `${name}-aggregated-markup.txt`;
              if (fs.existsSync(markupFile)) {
                const docsDir = path.join(__dirname, 'build', name, 'docs');
                if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
                fs.copyFileSync(markupFile, path.join(docsDir, markupFile));
                console.log(`✔️ Copied ${markupFile} to build/${name}/docs/`);
              }
            } catch (error) {
              console.error(`❌ Failed to generate aggregated markup for ${name}: ${error.message}`);
            }
          } else {
            console.log('🛈 Skipping KB page update (use --publish or --docs to enable)');
          }

          // Publish if requested
          if (shouldPublish) {
              await sendToExternalSolutionRepo(name, baseDir);
          } else {
              console.log('🛈 Skipping publish step (use --publish to enable)');
          }
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

main();
