
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
    const currentBranch = (await git.branch()).current;
  
    if (currentBranch !== branch) {
        console.log(`🔀 Checking out branch '${branch}'`);
        await git.checkout(branch);
    }
    git.pull();
  
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




const { createZip, processSolutions , createSolutionDirectory} = require("./solutionBuilder.js");

async function main() {
    try {
        const args = process.argv.slice(2);
        const shouldPublish = args.includes('--publish');
        const shouldDocs = args.includes('--docs');
        const folderArg = args.find(arg => arg.startsWith('--folder='));
        const solutionName = folderArg ? folderArg.split('=')[1] : 'default-solution';
        const solutions = {
           'coreMIS': './solution/solutions/coreMIS.json',
          // 'SHI': './solution/solutions/HF.json',
          // 'claimai': './solution/solutions/HF.json',
          //'full' : './solution/solutions/full.json',
          // 'SR': './solution/solutions/SR.json',
          // 'IBR': './solution/solutions/IBR.json'
        }
        const permission = fs.readFileSync('./solution/permissions_map.json', 'utf8');
        const permissionMap = JSON.parse(permission);
        let outputs = {}
        for (const [name, solution_path] of Object.entries(solutions)){
          console.log(`generating ${name}`)
          const { output, modules, assemblyBranch } = await processSolutions(
              solution_path,
              process.cwd(),
              permissionMap,
          );
          outputs[name] = output;
          // Get dist-dkr files from compose.yml and merge them into output
          const composeFiles = await copyDistDkrAssetsFromCompose(outputs[name]['compose.yml'], assemblyBranch);
          Object.assign(outputs[name], composeFiles);
          const zipPath = path.join(__dirname, 'build', name +'.zip');
          await createZip(outputs[name], zipPath);
          baseDir = 'build/'+name
          await createSolutionDirectory(baseDir, outputs[name])

          // Generate aggregated Confluence markup only if --publish or --docs is set
          if (shouldPublish || shouldDocs) {
            console.log(`📝 Generating aggregated Confluence markup for ${name} using aggregator config...`);
            try {
              const additionalLabels = modules.join(',');
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
