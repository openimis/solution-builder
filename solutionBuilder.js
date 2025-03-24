
if(typeof window === 'undefined'){
    fs =  require('fs');
    path = require('path'); // CommonJS
    JSZip = require('jszip'); // CommonJS
}



// solution-builder.js
// Base URL for fetching files from the repository

async function selectLocalFolder() {
    try {
        const dirHandle = await window.showDirectoryPicker();
        DIRECTORY = dirHandle; // Store directory handle instead of a URL
        init();
    } catch (err) {
        console.error('Error selecting folder:', err);
    }
}

function isHttpUrl(str) {
    return typeof str == 'string' && (str.startsWith('http://') || str.startsWith('https://'));
}

async function fetchJSON(handleOrUrl, DIRECTORY=null) {
    // Case 1: GitHub fetch (browser or Node with fetch polyfill)
    if (isHttpUrl(handleOrUrl)) {
        const response = await fetch(handleOrUrl, { headers: getHeaders() });
        if (!response.ok) throw new Error(`Failed to fetch ${handleOrUrl}: ${response.statusText}`);
        const data = await response.json();
        return JSON.parse(atob(data.content));
    } 
    // Case 2: Browser File System Access API (directory handle)
    else if (typeof DIRECTORY !== 'undefined' && DIRECTORY) {
        const fileHandle = typeof handleOrUrl === 'string' 
            ? (await DIRECTORY.getFileHandle(handleOrUrl)) 
            : handleOrUrl.handle;
        const file = await fileHandle.getFile();
        const text = await file.text();
        return JSON.parse(text);
    } 
    // Case 3: Local file path (Node.js)
    else if (typeof window === 'undefined' && typeof handleOrUrl === 'string') {
        const text = fs.readFileSync(handleOrUrl, 'utf8');
                    // Create a timeout Promise that resolves after a short delay
        return JSON.parse(text);
    } 
    // Fallback: Throw an error if no valid case is matched
    else {
        throw new Error('Invalid environment or input for fetchJSON');
    }
}




function getBePackageConf(name, definition, branch){
    if (typeof definition === 'undefined'){
        console.log(name + " be has no definition")
        return {}
    }
    
    let pip = ''
    if (branch == 'released'){
        pip =  definition.package + "~=" + definition.version;
    }else{
        pip = "git+" + definition.git + ".git@" + branch + "#egg="+ definition.package;
    }

    return {
        "name": name,
        "pip" : pip
    }
}

function getFePackageConf(name, definition, branch){
    if (typeof definition === 'undefined'){
        console.log(name + " fe has no definition")
        return {}
    }
    let npm = ''
    if (branch == 'released'){
        npm = definition.package + "@>=" + definition.version;
    }else{
        npm = definition.package + "@" +  definition.git + "#" + branch
    }



    return {
        "name": name,
        "pip" : npm 
    }
}

async function processSolutions(    
    solutionFile, 
    directoryPath,
    permissionMap,
    branch = 'develop'
)
{
    const merged = await mergeSolutions(
        solutionFile, 
        directoryPath,
        permissionMap
    )
    let result = {}

    for (let key in merged.moduleRefDict || {}) {
        const depPath = getAbsolutePath(merged.moduleRefDict[key], directoryPath);
        result = await mergeSolutions(
            depPath,
            directoryPath,
            permissionMap,
        );
        // Merge roles
        Object.assign(merged.rolesDict, result.rolesDict);
        Object.assign(merged.menusDict, result.menusDict);
        Object.assign(merged.moduleRefDict, result.moduleRefDict);
        Array.prototype.push.apply(merged.bePackagesList,result.bePackagesList);
        Object.assign(merged.bePackagesDefDict, result.bePackagesDefDict);
        Array.prototype.push.apply(merged.fePackagesList,result.fePackagesList);
        Object.assign(merged.fePackagesDefDict, result.fePackagesDefDict);
        Array.prototype.push.apply(merged.servicesList,result.servicesList);
        Object.assign(merged.servicesDefDict, result.servicesDefDict);
        for (attr in merged.initData){
            merged.initData[attr].assign(...result.initData[attr]);
        }
        
    }
    let PIPModules = new Set()
    for (let idx in merged.bePackagesList){
        bePackage = merged.bePackagesList[idx]
        PIPModules.add(getBePackageConf(bePackage, merged.bePackagesDefDict[bePackage], branch))
    }
    let NPMModules = new Set()
    for (let idx  in merged.fePackagesList){
        fePackage = merged.fePackagesList[idx]
        NPMModules.add(getFePackageConf(fePackage, merged.fePackagesDefDict[fePackage], branch))
    }
        
    return { 
        "feConf": { "modules" : NPMModules},
        "beConf":{ "modules" : PIPModules}
        };
}

async function mergeSolutions(
    solutionFile, 
    directoryPath,
    permissionMap,
    rolesDict = {},
    menusDict = {},
    moduleRefDict = {},
    bePackagesList = new Set(), bePackagesDefDict = {},
    fePackagesList = new Set(), fePackagesDefDict = {},
    servicesList = new Set(), servicesDefDict = {},
    initData = new Set()) 
{
    let solution = null
    if ( typeof window === 'undefined'  &&  typeof solutionFile === 'string' ){
        solutionPath = getAbsolutePath(solutionFile, directoryPath)
        solution =  await fetchJSON(solutionPath);
        directoryPath = path.dirname(solutionPath);
    } else if (typeof FileSystemFileHandle !== 'undefined' && solutionFile instanceof FileSystemFileHandle){
        solution =  await fetchJSON(solutionFile, directoryPath);
        directoryPath = getAbsolutePath(solutionFile, directoryPath);
    }else {
        solution = solutionFile;
    }
    

    if (solution.toString() == '[object Promise]') {
        console.warn(`Failed to load solution file: ${solutionFile}`);
        return { modules, menuDict, roleDict };
    }

    // Process solutions
    const solutions = solution.solutions || [];
    for (const dep of solutions) {
        const depPath = getAbsolutePath(dep, directoryPath);
        const result = await mergeSolutions(
            depPath,
            directoryPath,
            permissionMap,
            rolesDict,
            menusDict,
            moduleRefDict,
            bePackagesList, bePackagesDefDict,
            fePackagesList, fePackagesDefDict,
            servicesList, servicesDefDict,
            initData,
        );
        rolesDict = result.rolesDict;
        menusDict = result.menusDict;
        moduleRefDict = result.moduleRefDict;
        bePackagesList  = result.bePackagesList;
        bePackagesDefDict = result.bePackagesDefDict;
        fePackagesList = result.fePackagesList;
        fePackagesDefDict = result.fePackagesDefDict;
        servicesList = result.servicesList;
        servicesDefDict = result.servicesDefDict;
        initData = result.initData;
    }
    // Process modules
    for (let key in solution.modules || {} ) {
        const modulePath = getAbsolutePath(solution.modules[key], directoryPath);
        moduleRefDict[key] = modulePath;
    }
    fePackagesList = [...(solution.fePackages || []), ...fePackagesList]
    for (let key in solution.fePackageDefinitions || {}) {
        fePackagesDefDict[key] = solution.fePackageDefinitions[key];
    }
    bePackagesList = [...(solution.bePackages || []), ...bePackagesList]
    for (let key in solution.bePackageDefinitions || {}) {
        bePackagesDefDict[key] = solution.bePackageDefinitions [key];
    }
    servicesList = [...(solution.services || []), ...servicesList]

    for (let key in solution.serviceDefinitions || {}) {
        servicesDefDict[key] = solution.serviceDefinitions[key];
    }

    // Merge roles
    rolesDict = mergeRolesData(solution.roles || [], permissionMap, rolesDict);
    // Merge menus
    menusDict = mergeMenusData(solution.menus || [], menusDict);

    return {
        rolesDict,
        menusDict,
        moduleRefDict,
        bePackagesList, bePackagesDefDict,
        fePackagesList, fePackagesDefDict,
        servicesList, servicesDefDict,
        initData
    };
}

function getAbsolutePath(relativePath, basePath) {
    if( typeof window === 'undefined'){
        return path.isAbsolute(relativePath) ? relativePath : path.join(basePath, relativePath);
    }
    return relativePath;
}

function mergeRolesData(roles, permissionMap, roleDict) {
    for (const role of roles) {
        const roleCode = role.code;
        const permissions = role.permissions || [];

        const mappedPermissions = permissions
            .filter(permission => permission in permissionMap)
            .map(permission => ({
                name: permission,
                code: permissionMap[permission]
            }));

        if (mappedPermissions.length === 0) {
            continue;
        }

        if (roleCode in roleDict) {
            roleDict[roleCode].permissions.push(...mappedPermissions);
        } else {
            roleDict[roleCode] = {
                roleName: role.roleName,
                code: roleCode,
                permissions: mappedPermissions
            };
        }
    }

    return roleDict;
}

function mergeMenusData(menus, menuDict) {
    for (const menu of menus) {
        const menuId = menu.id;
        menuDict[menuId] = {
            position: menu.position,
            id: menu.id,
            name: menu.name,
            icon: menu.icon,
            description: menu.description,
            submenus: menu.submenus || []
        };
    }

    return menuDict;
}


// Function to get headers with GitHub API key
function getHeaders() {
    const headers = {
        'Accept': 'application/vnd.github.v3+json'
    };
    if (sourceType === 'github' && githubAuthType === 'authenticated' && githubApiKey) {
        headers['Authorization'] = `Bearer ${githubApiKey}`;
    }
    return headers;
}

async function generateSolution(event) {
    event.preventDefault();
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = 'Generating solution...';

    try {
        // Get selected modules (solutions)
        const solutions = Array.from(document.querySelectorAll('#solutions input[type="checkbox"]:checked'))
        .map(checkbox => checkbox.value);

        // Get selected modules (checkboxes)
        const modules = Array.from(document.querySelectorAll('#modules input[type="checkbox"]:checked'))
            .map(checkbox => checkbox.value);
        const solution = { solutions, modules };
            

        premission_map = fetchJSON("permission_map.json")
        // Process resolved modules (assuming processSolution exists in your code)
        const {feConf, beConf}= await processSolutions(solution, premission_map, null);

        const output = {
            'fe-openimis.json': feConf,
            'be-openimis.json': beConf,
        };

        createZip(output, 'solution.zip');
        resultDiv.innerHTML = 'Solution generated and downloaded successfully!';
    } catch (error) {
        resultDiv.innerHTML = `Error: ${error.message}`;
        console.error(error);
    }
}
// Function to create a zip file
function createZip(data, filename) {
    const zip = new JSZip();
    Object.entries(data).forEach(([name, content]) => {
        zip.file(name, JSON.stringify(content, null, 2));
    });
    zip.generateAsync({type:"blob"})
        .then(function(content) {

            if (typeof window === 'undefined'){
                fs.writeFileSync(filename, content);
                
            }else {
                const link = document.createElement("a");
                link.href = URL.createObjectURL(content);
                link.download = filename;
                link.click();
            }
            console.log(`ZIP file "${zipFilename}" created successfully!`);
        });
}   



module.exports = { mergeSolutions, getAbsolutePath, createZip, processSolutions };