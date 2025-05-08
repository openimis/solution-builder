
const fs = require('fs');
const yaml = require('js-yaml');
const simpleGit = require('simple-git');
const unzipper = require('unzipper');


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

        const output = await processSolutions(
            solution_path,
            process.cwd(),
            permissionMap,
        );
        
        const zipPath = path.join(__dirname, 'output.zip');
        await createZip(output, zipPath);
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