// solution-builder.js

// Base URL for fetching files from the repository
const BASE_URL = 'https://api.github.com/repos/openimis/solution-builder/contents/'

// Function to fetch and parse JSON files
async function fetchJSON(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }
    const data = await response.json();
    // Decode the base64 content
    const content = atob(data.content);
    return JSON.parse(content);
}

// Function to populate select elements with options
async function populateSelect(selectId, directory) {
    const select = document.getElementById(selectId);
    const files = await fetchDirectoryContents(`${BASE_URL}${directory}`);
    files.forEach(file => {
        if (file.name.endsWith('.json')) {
            const option = document.createElement('option');
            option.value = file.path;
            option.text = file.name;
            select.appendChild(option);
        }
    });
}

// Function to fetch directory contents
async function fetchDirectoryContents(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch directory contents from ${url}: ${response.statusText}`);
    }
    return await response.json();
}

// Function to create a zip file
function createZip(data, filename) {
    const zip = new JSZip();
    Object.entries(data).forEach(([name, content]) => {
        zip.file(name, JSON.stringify(content, null, 2));
    });
    zip.generateAsync({type:"blob"})
        .then(function(content) {
            const link = document.createElement("a");
            link.href = URL.createObjectURL(content);
            link.download = filename;
            link.click();
        });
}

// Main function to generate the solution
async function generateSolution(event) {
    event.preventDefault();
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = 'Generating solution...';

    try {
        const dependencies = Array.from(document.getElementById('dependencies').selectedOptions).map(option => option.value);
        const modules = Array.from(document.getElementById('modules').selectedOptions).map(option => option.value);
        const gitBranch = document.getElementById('gitBranch').value || null;

        const solution = {
            dependencies: dependencies,
            modules: modules
        };

        const resolvedModules = await resolveModules(solution);
        const { menus, roles, fePackages, bePackages, services } = await processSolution(resolvedModules, gitBranch);

        const output = {
            'generated-menu.json': { menus },
            'generated-roles.json': { roles },
            'fe-openimis.json': { packages: fePackages },
            'be-openimis.json': { packages: bePackages },
            'services.yaml': services
        };

        createZip(output, 'solution.zip');
        resultDiv.innerHTML = 'Solution generated and downloaded successfully!';
    } catch (error) {
        resultDiv.innerHTML = `Error: ${error.message}`;
        console.error(error);
    }
}

// Function to resolve modules
async function resolveModules(solution) {
    const resolvedModules = ['solution/modules/core.json'];
    for (const dep of solution.dependencies) {
        resolvedModules.push(`${dep}`);
    }
    for (const mod of solution.modules) {
        resolvedModules.push(`${mod}`);
    }
    return Promise.all(resolvedModules.map(module => fetchJSON(`${BASE_URL}${module}`)));
}

// Function to process the solution
async function processSolution(resolvedModules, gitBranch) {
    const permissionsMap = await fetchJSON(`${BASE_URL}solution/permissions_map.json`);
    const { menus, roles } = await mergeSolutions(resolvedModules, permissionsMap);
    const sortedMenus = sortMenus(menus);
    const sortedRoles = sortRoles(roles);
    const [fePackages, bePackages] = processPackages(resolvedModules);
    const formattedFePackages = formatFePackages(fePackages, gitBranch);
    const formattedBePackages = formatBePackages(bePackages, gitBranch);
    const services = await processServices(`${BASE_URL}solution/service.json`);
    return {
        menus: sortedMenus,
        roles: sortedRoles,
        fePackages: formattedFePackages,
        bePackages: formattedBePackages,
        services
    };
}

// Function to merge solutions
async function mergeSolutions(modules, permissionsMap) {
    let allModules = new Set();
    let menuDict = {};
    let roleDict = {};

    async function mergeSingleSolution(solutionFile) {
        const solution = await fetchJSON(solutionFile);
        if (solution.dependency) {
            for (const dep of solution.dependency) {
                await mergeSingleSolution(`${BASE_URL}solution/bundles/${dep}`);
            }
        }
        if (solution.modules) {
            for (const mod of solution.modules) {
                await mergeSingleSolution(`${BASE_URL}solution/modules/${mod}`);
            }
            solution.modules.forEach(mod => allModules.add(`solution/modules/${mod}`));
        }
        if (solution.roles) {
            mergeRolesData(solution.roles, permissionsMap, roleDict);
        }
        if (solution.menus) {
            mergeMenusData(solution.menus, menuDict);
        }
    }

    // Start merging from core.json
    await mergeSingleSolution(`${BASE_URL}solution/modules/core.json`);

    // Convert Set to Array for modules
    return {
        menus: menuDict,
        roles: roleDict
    };
}

// Function to sort menus
function sortMenus(menus) {
    Object.values(menus).forEach(menu => {
        if (menu.submenus) {
            menu.submenus.sort((a, b) => (a.position || Infinity) - (b.position || Infinity));
        }
    });
    return Object.values(menus).sort((a, b) => (a.position || Infinity) - (b.position || Infinity));
}

// Function to sort roles
function sortRoles(roles) {
    return Object.values(roles).map(role => ({
        roleName: role.roleName,
        code: role.code,
        permissions: role.permissions.sort((a, b) => a.name.localeCompare(b.name))
    }));
}

// Function to process packages
function processPackages(modules) {
    let fePackages = [];
    let bePackages = [];

    modules.forEach(moduleFile => {
        if (moduleFile['fe-packages']) {
            fePackages = fePackages.concat(moduleFile['fe-packages']);
        }
        if (moduleFile['be-packages']) {
            bePackages = bePackages.concat(moduleFile['be-packages']);
        }
    });

    return [
        fePackages.sort((a, b) => (a.name || '').localeCompare(b.name || '')),
        bePackages.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    ];
}

// Function to format frontend packages
function formatFePackages(packages, gitBranch) {
    const formattedPackages = {
        locales: [
            {
                languages: ["en", "en-GB"],
                intl: "en-GB",
                fileNames: "en"
            },
            {
                languages: ["fr", "fr-FR"],
                intl: "fr-FR",
                fileNames: "fr"
            }
        ],
        modules: []
    };

    packages.forEach(pkg => {
        formattedPackages.modules.push(packageFeExport(pkg, gitBranch));
    });

    return formattedPackages;
}

// Function to format backend packages
function formatBePackages(packages, gitBranch) {
    const formattedPackages = {
        modules: []
    };

    packages.forEach(pkg => {
        formattedPackages.modules.push(packageBeExport(pkg, gitBranch));
    });

    return formattedPackages;
}

// Helper function for frontend package export
function packageFeExport(package, gitBranch) {
    return {
        name: package.name + "Module",
        npm: package.package + "@" + (gitBranch && package.git ? package.git + '#' + gitBranch : '>=' + package.version)
    };
}

// Helper function for backend package export
function packageBeExport(package, gitBranch) {
    return {
        name: package.name,
        npm: gitBranch && package.git ? `${package.git}@${gitBranch}#egg=${package.package}` : package.package + '~=' + package.version
    };
}

// Function to process services
async function processServices(serviceFile) {
    try {
        const serviceData = await fetchJSON(serviceFile);

        if (!serviceData) {
            console.log("No service.json found. Skipping service processing.");
            return null;
        }

        let servicesOutput = [];

        if (Array.isArray(serviceData)) {
            servicesOutput = serviceData.map(service => ({
                path: service.path || "",
                env_file: service.env_file || []
            }));
        } else {
            servicesOutput.push({
                path: serviceData.path || "",
                env_file: serviceData.env_file || []
            });
        }

        return { include: servicesOutput };
    } catch (error) {
        console.log("Error processing services:", error);
        return null;
    }
}

// Helper function to merge roles data
function mergeRolesData(moduleData, permissionMap, rolesDict) {
    moduleData.forEach(role => {
        const roleCode = role.code;
        const permissions = role.permissions || [];

        const mappedPermissions = permissions
            .filter(permission => permission in permissionMap)
            .map(permission => ({
                name: permission,
                code: permissionMap[permission] || permission
            }));

        if (mappedPermissions.length === 0) return;

        if (roleCode in rolesDict) {
            rolesDict[roleCode].permissions = rolesDict[roleCode].permissions.concat(mappedPermissions);
        } else {
            rolesDict[roleCode] = {
                roleName: role.roleName,
                code: roleCode,
                permissions: mappedPermissions
            };
        }
    });
}

// Helper function to merge menus data
function mergeMenusData(moduleData, menuDict) {
    moduleData.forEach(menu => {
        const menuId = menu.id;
        menuDict[menuId] = {
            position: menu.position,
            id: menu.id,
            name: menu.name,
            icon: menu.icon,
            description: menu.description,
            submenus: menu.submenus || []
        };
    });
}

// Initialize the page
async function init() {
    await populateSelect('dependencies', 'solution/bundles');
    await populateSelect('modules', 'solution/modules');
    document.getElementById('solutionForm').addEventListener('submit', generateSolution);
}

// Load JSZip library
const script = document.createElement('script');
script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
script.onload = init;
document.head.appendChild(script);