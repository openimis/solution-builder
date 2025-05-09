
const fs = require('fs');
const yaml = require('js-yaml');
const simpleGit = require('simple-git');
const unzipper = require('unzipper');
const os = require('os');


async function extractFERepoList(data, data_rel) {
    try {
        // Fetch the JSON file from the URL
        const response_dev = fs.readFileSync('dev.json', 'utf8');
        const response_rel =  fs.readFileSync('rel.json', 'utf8');
        const data = JSON.parse(response_dev);
        const data_rel = JSON.parse(response_rel);
        
        // Parse the JSON content
        const pip_gh_pattern = /^((?:git\+)?https?:.+\.git)@[^#]+#egg=([\w-]+)$/;
        // Extract modules and transform into the desired format
        const repoList = data.modules.reduce((acc, module) => {
            const match = module.pip.match(pip_gh_pattern);
            // Check if git property exists and starts with github.com
            cur_module = {}
            if (match) {
                // Convert github.com URL to git+https format
                cur_module = {
                    "package": match[2],
                    "git": match[1]
                }
            }
            const module_rel = data_rel.modules.find(m => m.name === module.name);
            if (module_rel){
                const versionMatch = module_rel.pip.match(/((?:[\d]+\.?)+)$/);
                if (versionMatch){
                    cur_module['version'] = versionMatch[0];
                }
            }
            if (Object.keys(cur_module).length>0){
                acc.push({
                    [module.name]: cur_module
                });
            }
            return acc;
        }, []);
        
        // Output the result
        console.log(JSON.stringify(repoList, null, 2));
        return repoList;
        
    } catch (error) {
        console.error('Error fetching or processing the data:', error);
        return [];
    }
}


async function extractFERepoList(data, data_rel) {
    try {
        // Fetch the JSON file from the URL
        const response_dev = fs.readFileSync('dev.json', 'utf8');
        const response_rel =  fs.readFileSync('rel.json', 'utf8');
        const data = JSON.parse(response_dev);
        const data_rel = JSON.parse(response_rel);
        ret = {}
        // Parse the JSON content
        const npm_gh_pattern = /^(@[^@]+)@((?:git\+)?https?:.+)#[^#]+$/;
        // Extract modules and transform into the desired format
        const repoList = data.modules.reduce((acc, module) => {
            const match = module.npm.match(npm_gh_pattern);
            // Check if git property exists and starts with github.com
            cur_module = {}
            if (match) {
                // Convert github.com URL to git+https format
                cur_module = {
                    "package": match[1],
                    "git": match[2]
                }
            }
            const module_rel = data_rel.modules.find(m => m.name === module.name);
            if (module_rel){
                const versionMatch = module_rel.npm.match(/v?((?:[\d]+\.?)+)$/);
                if (versionMatch){
                    cur_module['version'] = versionMatch[0];
                }
            }
                

            if (Object.keys(cur_module).length>0){
                ret[module.name]=cur_module;
                //acc.push({[module.name]:cur_module});
            }
            return ret;
        }, []);
        
        // Output the result
        console.log(JSON.stringify({ret}, null, 2));
        return ret;
        
    } catch (error) {
        console.error('Error fetching or processing the data:', error);
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
    const currentBranch = (await git.branch()).current;
  
    if (currentBranch !== branch) {
        console.log(`🔀 Checking out branch '${branch}'`);
        await git.checkout(branch);
    }
  
    return distDkrRepoPath;
}

// Generate the compose.yml based on the solutionName or any specific config
function generateComposeYml(solutionName) {
    const composeConfig = {
        include: [
            { path: 'compose.base.yml' },
            { path: `compose.${process.env.DB_DEFAULT || 'postgresql'}.yml` },
            { path: 'compose.openSearch.yml' },
            { path: 'compose.cache.yml' }
        ]
    };

    const composeContent = yaml.dump(composeConfig);
    const composeFilePath = path.resolve(`./solution/compose.yml`);
    
    // Write the generated compose.yml to the solution directory
    fs.writeFileSync(composeFilePath, composeContent, 'utf8');
    console.log(`✔️ Generated compose.yml for solution: ${solutionName}`);
    return composeFilePath;
}

// Get the paths from compose.yml
function getComposeFilePaths(composePath) {
    const content = fs.readFileSync(composePath, 'utf8');
    const parsed = yaml.load(content);
    const paths = new Set();
  
    if (parsed && parsed.include) {
        // Collect all paths from the "include" section in compose.yml
        for (const item of parsed.include) {
            if (item.path) {
                paths.add(item.path);
            }
        }
    }
  
    return [...paths]; // Return paths as an array
}

// Copy files defined in compose.yml from the dist-dkr repo
async function copyDistDkrAssetsFromCompose(composeFilePath, branch = 'develop') {
    if (!fs.existsSync(composeFilePath)) {
        console.warn('⚠️ compose.yml not found in the solution folder, skipping...');
        return {};
    }

    // Read and parse the compose.yml to get the file paths
    const composeFile = fs.readFileSync(composeFilePath, 'utf8');
    let composeConfig;
    try {
        composeConfig = yaml.load(composeFile); // Parse the YAML file
    } catch (error) {
        console.error('⚠️ Error reading compose.yml', error);
        return {};
    }

    // Ensure dist-dkr repo is cloned and checked out to the right branch
    const distDkrRepoPath = await ensureDistDkrRepo(branch);

    const outputFiles = {};

    // Ensure we are getting the paths from composeConfig
    if (composeConfig.include && Array.isArray(composeConfig.include)) {
        for (const item of composeConfig.include) {
            if (item.path) {
                // Resolve path within dist-dkr repo
                const filePath = item.path.replace('${DB_DEFAULT:-postgresql}', 'postgresql'); // Resolve dynamic paths
                const srcPath = path.join(distDkrRepoPath, filePath); // Full path inside dist-dkr repo

                if (fs.existsSync(srcPath)) {
                    // Read the file content
                    let fileContent = fs.readFileSync(srcPath, 'utf8');
                    
                    // Fix YAML block strings if necessary
                    fileContent = fixYmlBlockStrings(fileContent);

                    outputFiles[item.path] = fileContent;
                    console.log(`✔️ Copied ${item.path} from dist-dkr`);
                } else {
                    console.warn(`⚠️ File ${item.path} not found at path: ${srcPath}`);
                }
            }
        }
    } else {
        console.warn('⚠️ No include array found in compose.yml.');
    }

    return outputFiles;
}


async function sendToExternalSolutionRepo(folderName, zipPath) {
    const repoUrl = 'https://github.com/openimis/solutions.git';
    const branchName = `solution/${folderName}`;
    const tempDir = path.join(__dirname, 'temp_solutions_repo');
    const unzipDir = path.join(__dirname, 'unzipped_output');
    const targetFolder = path.join(tempDir, folderName);

    // Clean up any previous temp/unzip folder
    if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true });
    if (fs.existsSync(unzipDir)) fs.rmSync(unzipDir, { recursive: true });

    fs.mkdirSync(unzipDir);

    // Unzip output.zip
    await fs.createReadStream(zipPath)
        .pipe(unzipper.Extract({ path: unzipDir }))
        .promise();

    const git = simpleGit();

    // Clone the repo and checkout a new branch
    await git.clone(repoUrl, tempDir);
    const gitRepo = simpleGit(tempDir);
    await gitRepo.checkout('develop');
    await gitRepo.checkoutBranch(branchName, 'develop');

    // Create or overwrite target folder in the cloned repo
    if (!fs.existsSync(targetFolder)) fs.mkdirSync(targetFolder);
    fs.cpSync(unzipDir, targetFolder, { recursive: true });

    // Commit and push
    await gitRepo.add('.');
    await gitRepo.commit(`Add/update ${folderName} solution`);
    await gitRepo.push('origin', branchName);
    console.log(`✔️ Pushed ${folderName} to branch ${branchName}`);
}


const { createZip, processSolutions } = require('./solutionBuilder.js');

async function main() {
    try {
        const args = process.argv.slice(2);
        const shouldPublish = args.includes('--publish');
        const folderArg = args.find(arg => arg.startsWith('--folder='));
        const solutionName = folderArg ? folderArg.split('=')[1] : 'default-solution';
        
        const solution_path = './solution/solutions/HF.json';
        const permission = fs.readFileSync('./solution/permissions_map.json', 'utf8');
        const permissionMap = JSON.parse(permission);

        const composeFilePath = generateComposeYml(solutionName);

        const output = await processSolutions(
            solution_path,
            process.cwd(),
            permissionMap,
        );

        // Get dist-dkr files from compose.yml and merge them into output
        const composeFiles = await copyDistDkrAssetsFromCompose(composeFilePath, 'develop');
        Object.assign(output, composeFiles);

        // Create zip
        const zipPath = path.join(__dirname, 'output.zip');
        await createZip(output, zipPath);

        // Publish if requested
        if (shouldPublish) {
            await sendToExternalSolutionRepo(solutionName, zipPath);
        } else {
            console.log('🛈 Skipping publish step (use --publish to enable)');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

main();