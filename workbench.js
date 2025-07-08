const fs = require("fs");
const yaml = require("js-yaml");
//npm install js-yaml jszip

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

// source = extractRepoList();

// try {
//     fs.writeFileSync('output.json', JSON.stringify(source, null, 2));
//     console.log('JSON file has been written successfully');
// } catch (error) {
//     console.error('Error writing JSON file:', error);
// }

const { createZip, processSolutions } = require("./solutionBuilder.js");

async function main() {
  try {
    const solution_path = "./solution/solutions/claim-ai.json";
    const permission = fs.readFileSync(
      "./solution/permissions_map.json",
      "utf8"
    );
    const permissionMap = JSON.parse(permission);

    const output = await processSolutions(
      solution_path,
      process.cwd(),
      permissionMap,
      "release/25.04"
    );

    await createZip(output, "output.zip");
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
