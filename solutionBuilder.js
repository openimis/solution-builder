
if(typeof window === 'undefined'){
    fs =  require('fs');
    path = require('path'); // CommonJS
    JSZip = require('jszip'); // CommonJS
    yaml = require('js-yaml'); // 
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



async function fetchJSON(handleOrUrl,DIRECTORY=null, rootPath = '') {
    // Case 1: GitHub fetch (browser or Node with fetch polyfill)
    if (isHttpUrl(handleOrUrl)) {
        const response = await fetch(handleOrUrl, { headers: getHeaders() });
        if (!response.ok) throw new Error(`Failed to fetch ${handleOrUrl}: ${response.statusText}`);
        const data = await response.json();
        return JSON.parse(atob(data.content));
    } 
    // Case 2: Browser File System Access API (directory handle)
    else if (typeof DIRECTORY !== 'undefined' && typeof DIRECTORY !== 'string' && DIRECTORY) {

        if (typeof handleOrUrl == 'string') {
            // Split the path into parts (e.g., "subfolder/file.txt" -> ["subfolder", "file.txt"])
            const pathParts = handleOrUrl.split('/').filter(part => part.length > 0);
            let currentDir = DIRECTORY;

            // Navigate directories if there are multiple parts
            for (let i = 0; i < pathParts.length - 1; i++) {
                currentDir = await currentDir.getDirectoryHandle(pathParts[i], { create: false });
            }

            // Get the file handle from the final directory
            const fileName = pathParts[pathParts.length - 1];
            fileHandle = await currentDir.getFileHandle(fileName);
        } else {
            // Assume handleOrUrl is an object with a handle property (file or directory handle)
            fileHandle = handleOrUrl;
        }
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

function getServiceConf(name, definition, services = {}){
    if (typeof definition === 'undefined'){
        console.log(name + " service has no definition")
        return {}
    }
    if( !(services.hasOwnProperty(name))){
        services[name] = {};
        }
    if(definition.hasOwnProperty('path')){
        services[name]['path'] = definition['path']
    }
    if(definition.hasOwnProperty('env_file')){
        if(!services[name].hasOwnProperty('env_file')){
            services[name]['env_file'] = []
        }
        for(let env_file in definition['env_file']){
            if(!services[name]['env_file'].includes(definition['env_file'][env_file])){
                services[name]['env_file'].push(definition['env_file'][env_file])
            }
        }
    }

    return services
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


function makeCoreModuleConfiguration(menus){
    return [
        {
          "model": "core.moduleconfiguration",
          "fields": {
            "id": "ebdbdbe5-c9be-4e66-8c49-edd1e5284c7c",
            "module": "fe-core",
            "version": "1",
            "config": "{\n  \"menus\": "+JSON.stringify(menus).replace(/"/g, '\"')+"}",
            "is_exposed": true,
            "layer": "fe"
          }
        }
      ]
}

async function processSolutions(    
    solutionFile, 
    directoryPath,
    permissionMap,
    branch = 'develop'
)
{
    solutionFilePath = getAbsolutePath(typeof solutionFile == 'string'?solutionFile:'', '', false)
    const merged = await mergeSolutions(
        solutionFile,
        directoryPath,
        permissionMap
    )
    let result = {}

    for (let key in merged.moduleRefDict || {}) {
        const depPath = getAbsolutePath(merged.moduleRefDict[key], solutionFilePath);
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
        for (let idx  in result.servicesDefDict){
            service = merged.servicesList[idx]
            merged.servicesDefDict =  getServiceConf(service, result.servicesDefDict[service], services)
        }
        for (attr in merged.initData){
            merged.initData[attr].assign(...result.initData[attr]);
        }
        
    }
    let PIPModules = new Set()
    merged.bePackagesList = merged.bePackagesList.filter((item, index) => merged.bePackagesList.indexOf(item) === index)
    for (let idx in merged.bePackagesList){
        bePackage = merged.bePackagesList[idx]
        PIPModules.add(getBePackageConf(bePackage, merged.bePackagesDefDict[bePackage], branch))
    }
    let NPMModules = new Set()
    merged.fePackagesList = merged.fePackagesList.filter((item, index) => merged.fePackagesList.indexOf(item) === index)
    for (let idx  in merged.fePackagesList){
        fePackage = merged.fePackagesList[idx]
        NPMModules.add(fePackage)
    }
    let services = {}
    for (let idx  in merged.servicesList){
        service = merged.servicesList[idx]
        services =  getServiceConf(service, merged.servicesDefDict[service], services)
    }

    output = {}
    
    if(NPMModules.size>0){
        output['fe-openimis.json'] ={"modules": [...NPMModules]};
    }
    if(PIPModules.size>0){
        output['be-openimis.json'] ={"modules": [...PIPModules]};
    }
    if(Object.keys(merged.menusDict).length>0){
        output['fixtures/module-configuration-core.json'] =makeCoreModuleConfiguration(merged.menusDict);
    }
    if(Object.keys(merged.rolesDict).length>0){
        output['fixtures/roles.json'] = merged.rolesDict;
    }
    if(Object.keys(merged.initData).length>0){
        output['fixtures/other-init-data.json'] = [...merged.initData];
    }
    if(Object.keys(services).length>0){
        output['compose.yml'] = services;
    }
    
    return output
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
    let solutionFilePath = ''
    let solution = null
    if ( typeof window === 'undefined'  &&  typeof solutionFile === 'string' ){
        solutionPath = getAbsolutePath(solutionFile, directoryPath)
        solution =  await fetchJSON(solutionPath);
        solutionFilePath = path.dirname(solutionPath);
    }  else if (typeof FileSystemFileHandle !== 'undefined' && solutionFile == '[object FileSystemFileHandle]'){
        solution =  await fetchJSON(solutionFile, directoryPath);
        solutionPath = solutionFile
        solutionFilePath = 'solution/solutions';
    } else if  (typeof solutionFile === 'object'){
        solution = solutionFile;
        solutionFilePath = typeof directoryPath === 'string'?directoryPath:''
    }
    if (solution.toString() == '[object Promise]') {
        console.warn(`Failed to load solution file: ${solutionFile}`);
        return { modules, menuDict, roleDict };
    }

    // Process solutions
    const solutions = solution.solutions || [];
    for (const dep of solutions) {
        const depPath = getAbsolutePath(dep, solutionFilePath);
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
        const modulePath = getAbsolutePath(solution.modules[key], solutionFilePath);
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
        servicesDefDict =  getServiceConf(key, solution.serviceDefinitions[key], servicesDefDict)

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

function getAbsolutePath(relativePath, basePath, withFile=true) {
    if( typeof window === 'undefined'){
        filePath = path.isAbsolute(relativePath) ? relativePath : path.join(basePath, relativePath)
        if(withFile){
            return filePath;
        }else{
            return path.dirname(filePath)
        }
        
    }else{
        const pathParts = relativePath.split('/').filter(part => part.length > 0);
        let dirParts = basePath.split('/').filter(part => part.length > 0);
        for (let i = 0; i < pathParts.length; i++) {
            const part = pathParts[i];
            if (part === '..') {
                // Move up to root if we're not already there
                if (dirParts.length !== 0) {
                    // In this simplified model, we reset to root; no parent handle available
                    dirParts.pop();
                } else {
                    throw new Error("Cannot go above root directory");
                }
            } else if (part !== '.') { // Ignore '.'
                // If it's the last part, treat it as a file; otherwise, a directory
                    dirParts.push(part)
            }
        }
        if(withFile){
            return dirParts.join('/');
        }else{
            return dirParts.slice(0, -1).join("/");
        }

    }
    
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

// Function to create a zip file
async function createZip(data, filename) {
    const zip = new JSZip();
    Object.entries(data).forEach(([name, content]) => {
        // Check if the filename ends with .yml or .yaml (case-insensitive)
        if (name.toLowerCase().endsWith('.yml') || name.toLowerCase().endsWith('.yaml')) {
            // Stringify as YAML
            zip.file(name, yaml.dump(content));
        } else {
            // Stringify as JSON with formatting
            zip.file(name, JSON.stringify(content, null, 2));
        }
    });
    try {
        const content = await zip.generateAsync({ type: "blob" });

        if (typeof window === 'undefined') {
            // Node.js: Convert Blob to Buffer and write to disk
            const buffer = Buffer.from(await content.arrayBuffer());
            fs.writeFileSync(filename, buffer);
            console.log(`ZIP file "${filename}" created successfully on disk!`);
        } else {
            // Browser: Trigger download
            const link = document.createElement("a");
            link.href = URL.createObjectURL(content);
            link.download = filename;
            link.click();
            console.log(`ZIP file "${filename}" triggered for download!`);
        }
    } catch (error) {
        console.error("Error creating ZIP file:", error);
    }

}   



module.exports = { mergeSolutions, getAbsolutePath, createZip, processSolutions };