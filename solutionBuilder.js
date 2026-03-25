
if(typeof window === 'undefined'){
    fs =  require('fs');
    path = require('path'); // CommonJS
    JSZip = require('jszip'); // CommonJS
    yaml = require('js-yaml'); // 
    const { Blob } = require('buffer');
}

const mime = require('mime-types');
const { v4: uuidv4 } = require('uuid');



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
    
  let pip = "";
  // overide the branch if a branch is specified in the source
  if (definition.hasOwnProperty("branch")) {
    branch = definition.branch;
  }
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

    if(!definition.hasOwnProperty('path')  ){
        console.log(name + " service has no path ")
        return {}
    }
    
    if ( services[name] === undefined){
        services[name]= {};
    }
    
    services[name] = {
        "path": definition['path'],
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
    if(definition.hasOwnProperty('env_contrib')){
        for(let contrib in definition['env_contrib']){
            if ( services[contrib] === undefined){
                services[contrib] = {}
            }
            services[contrib]['env_file'] = [...(services[contrib]['env_file'] || []), ...definition['env_contrib'][contrib]] 
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
        "npm" : npm 
    }
}


function makeCoreModuleConfiguration(menusDict) {
    const config = {
        menus: Object.values(menusDict).sort((a, b) => (a.position || 0) - (b.position || 0))
    };

    return [
        {
            model: 'core.moduleconfiguration',
            fields: {
                id: uuidv4(),
                module: 'fe-core',
                version: '1',
                config: JSON.stringify(config, null, 2),
                is_exposed: true,
                layer: 'fe'
            }
        }
    ];
}
// Function to merge and sort fixtures
async function mergeAndSortFixtures(inputFiles, output) {
  // Ensure output directory exists


  // Object to store fixtures grouped by model
  const fixturesByModel = {};

  // Process each input file
  for (const filePath of inputFiles) {
    const filename = path.basename(filePath);
    console.log(`Processing file: ${filename}`);

    const data = await fetchJSON(filePath);
    
    // Group entries by model
    for (const entry of data) {
      const model = entry.model;
      if (!fixturesByModel[model]) {
        fixturesByModel[model] = [];
      }
      fixturesByModel[model].push(entry);
    }
  }
  
  if (output['fixtures/roles.json']) {
    if (!fixturesByModel['core.role']) {
      fixturesByModel['core.role'] = [];
    }
    fixturesByModel['core.role'].push(...output['fixtures/roles.json']);
    delete output['fixtures/roles.json'];
  }

  if (output['fixtures/roles-right.json']) {
    if (!fixturesByModel['core.roleright']) {
      fixturesByModel['core.roleright'] = [];
    }
    fixturesByModel['core.roleright'].push(...output['fixtures/roles-right.json']);
    delete output['fixtures/roles-right.json'];
  }

  // Sort and save each model's fixtures
  for (const model in fixturesByModel) {
    // Sort entries by pk (primary key) if it exists
    fixturesByModel[model].sort((a, b) => {
      const pkA = a.pk || 0;
      const pkB = b.pk || 0;
      return pkA - pkB;
    });
    // Create output file path
    const filename = `${model.replace('.', '_')}.json`;
    // Write sorted fixtures to file
    output[`fixtures/${filename}`] =  fixturesByModel[model];

  }

  return output;
}

function mergeRoleDictionaries(mergedMenusDict, resultMenusDict) {
    for (const roleCode in mergedMenusDict) {
        const role = mergedMenusDict[roleCode];
        const permissions = role.permissions || [];

        if (roleCode in resultMenusDict) {
            // Role exists, merge permissions without duplicates
            const existingPermissionCodes = new Set(
                resultMenusDict[roleCode].permissions.map(p => p.code)
            );
            for (const perm of permissions) {
                if (!existingPermissionCodes.has(perm.code)) {
                    resultMenusDict[roleCode].permissions.push(perm);
                    existingPermissionCodes.add(perm.code);
                }
            }
        } else {
            // Role doesn't exist, add it directly
            resultMenusDict[roleCode] = {
                roleName: role.roleName,
                code: roleCode,
                permissions: [...permissions] // Create a new array to avoid reference issues
            };
        }
    }
    return resultMenusDict;
}

function mergeMenuDictionaries(mergedMenusDict, resultMenusDict) {
    // Helper function to merge submenus
    function mergeSubmenus(existingSubmenus, newSubmenus, mainMenuId) {
        const submenus = existingSubmenus ? [...existingSubmenus] : [];
        if (!newSubmenus) return submenus;

        // Remove submenus from other main menus to ensure uniqueness
        function removeSubmenuFromOtherMenus(submenuId, targetMainMenuId) {
            for (const menuId in mergedMenusDict) {
                if (menuId !== targetMainMenuId && mergedMenusDict[menuId].submenus) {
                    mergedMenusDict[menuId].submenus = mergedMenusDict[menuId].submenus.filter(
                        submenu => submenu.id !== submenuId
                    );
                }
            }
        }

        // Merge or add new submenus
        newSubmenus.forEach(newSubmenu => {
            removeSubmenuFromOtherMenus(newSubmenu.id, mainMenuId);
            const existingIndex = submenus.findIndex(submenu => submenu.id === newSubmenu.id);
            if (existingIndex !== -1) {
                // Update existing submenu
                submenus[existingIndex] = { ...newSubmenu };
            } else {
                // Add new submenu
                submenus.push({ ...newSubmenu });
            }
        });

        return submenus;
    }

    // Iterate through resultMenusDict to merge into mergedMenusDict
    for (const menuId in resultMenusDict) {
        const resultMenu = resultMenusDict[menuId];
        const existingMenu = mergedMenusDict[menuId] || {};

        // Merge main menu fields, preserving existing submenus if not provided in result
        mergedMenusDict[menuId] = {
            position: resultMenu.position !== undefined ? resultMenu.position : existingMenu.position,
            id: menuId,
            name: resultMenu.name !== undefined ? resultMenu.name : existingMenu.name,
            icon: resultMenu.icon !== undefined ? resultMenu.icon : existingMenu.icon,
            description: resultMenu.description !== undefined ? resultMenu.description : existingMenu.description,
            submenus: mergeSubmenus(existingMenu.submenus, resultMenu.submenus, menuId)
        };
    }

    return mergedMenusDict;
}

function  cleanMenuDictionaries(menusDict) {

    // Iterate through resultMenusDict to merge into mergedMenusDict
    for (const menuId in menusDict) {
        if(menusDict[menuId].submenus.length === 0 || menusDict[menuId].name === undefined){
            delete menusDict[menuId];
        }
    }

    return menusDict;
}


function transformComposeContent(composeContent) {
  let object = {'include': []}
  // Iterate through each key in the composeContent object
  for (const [key, value] of Object.entries(composeContent)) {
    const line = {'path': value.path};
    // Handle env_file section
    if (value.env_file && value.env_file.length > 0) {
      line['env_file'] = [...value.env_file];
    }
    object['include'].push(line) 
  }
  
  return object;
}

async function processSolutions(    
    solutionFile, 
    directoryPath,
    permissionMap,
    branch = 'develop'
)
{
    const solutionFilePath = getAbsolutePath(typeof solutionFile === 'string' ? solutionFile : '', '', false);

    let solutionJson = {};
    try {
        solutionJson = JSON.parse(fs.readFileSync(solutionFile, 'utf8'));
    } catch (e) {
        console.warn('⚠️ Failed to parse root solution JSON file:', e.message);
    }

    let logoPath = null;
    if (solutionJson?.moduleConfiguration?.logo) {
        logoPath = path.resolve(path.dirname(solutionFilePath), solutionJson.moduleConfiguration.logo);
    }

    let themePath = null;
    if (solutionJson?.moduleConfiguration?.theme) {
        themePath = path.resolve(path.dirname(solutionFilePath), solutionJson.moduleConfiguration.theme);
    }

    let merged = await mergeSolutions(solutionFile, directoryPath, permissionMap);
    let result = {};

    for (let key in merged.moduleRefDict || {}) {
        const depPath = getAbsolutePath(merged.moduleRefDict[key], solutionFilePath);
        result = await mergeSolutions(
            depPath,
            directoryPath,
            permissionMap,
        );
        // Merge roles
        merged.rolesDict = mergeRoleDictionaries(merged.rolesDict, result.rolesDict)
        merged.menusDict = mergeMenuDictionaries(merged.menusDict, result.menusDict);
        Object.assign(merged.moduleRefDict, result.moduleRefDict);
        Array.prototype.push.apply(merged.bePackagesList,result.bePackagesList);
        Object.assign(merged.bePackagesDefDict, result.bePackagesDefDict);
        Array.prototype.push.apply(merged.fePackagesList,result.fePackagesList);
        Array.prototype.push.apply(merged.locales,result.locales);


        Object.assign(merged.fePackagesDefDict, result.fePackagesDefDict);
        Array.prototype.push.apply(merged.servicesList,result.servicesList);
        for (let idx  in result.servicesDefDict){
            service = merged.servicesList[idx]
            merged.servicesDefDict =  getServiceConf(service, result.servicesDefDict[service], services)
        }
        Array.prototype.push.apply(merged.initData,result.initData);
        for(let data of result.initData){
            merged.initData.add(getAbsolutePath(data, solutionFilePath));
        }
        
    }

    merged.menusDict = cleanMenuDictionaries(merged.menusDict)

    const assemblyBranch = merged.bePackagesDefDict['assembly']?.branch || 'develop';

    let PIPModules = new Set()
    merged.bePackagesList = merged.bePackagesList.filter((item, index) => merged.bePackagesList.indexOf(item) === index)
    for (let idx in merged.bePackagesList){
        bePackage = merged.bePackagesList[idx]
        PIPModules.add(getBePackageConf(bePackage, merged.bePackagesDefDict[bePackage], assemblyBranch))
    }
    let NPMModules = new Set()
    merged.fePackagesList = merged.fePackagesList.filter((item, index) => merged.fePackagesList.indexOf(item) === index)

    for (let idx  in merged.fePackagesList){
        fePackage = merged.fePackagesList[idx]
        NPMModules.add(getFePackageConf(fePackage, merged.fePackagesDefDict[fePackage], assemblyBranch))
    }
    let services = {}
    for (let idx  in merged.servicesList){
        service = merged.servicesList[idx]
        services =  getServiceConf(service, merged.servicesDefDict[service], services)
    }

    output = {}
    // TODO manage the language in a better way 
    if(NPMModules.size>0){
        output['fe-openimis.json'] ={
            "modules": [...NPMModules], 
            "locales": [...merged.locales]
        };
    }
    if(services){
        output['compose.yml'] = transformComposeContent(services);
    }

    if(PIPModules.size>0){
        output['be-openimis.json'] ={"modules": [...PIPModules]};
    }
    if (Object.keys(merged.menusDict).length > 0) {
        const coreModuleConfig = makeCoreModuleConfiguration(merged.menusDict);

        // Inject logo/theme using resolved paths
        await injectLogoTheme(coreModuleConfig[0], logoPath, themePath);
        output['fixtures/module-configuration-core.json'] = coreModuleConfig;
    }
    if (Object.keys(merged.rolesDict).length > 0) {
   
        const transformed = transformRolesToFixture(merged.rolesDict);
        output['fixtures/roles.json'] = transformed.roles;
        output['fixtures/roles-right.json'] = transformed.rolesRight;
    }
    // merging all fixture

    output = mergeAndSortFixtures(merged.initData, output);

    // sorting fixture by model

    // adding fixture file to output
        
    
    if(Object.keys(services).length>0){
        output['compose.yml'] = services;
    }

    return { output, modules: Object.keys(merged.moduleRefDict), assemblyBranch }
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
    locales = new Set(),
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
            locales,
            servicesList, servicesDefDict,
            initData,
        );
        rolesDict = result.rolesDict;
        menusDict = result.menusDict;
        moduleRefDict = result.moduleRefDict;
        bePackagesList  = result.bePackagesList;
        bePackagesDefDict = result.bePackagesDefDict;
        fePackagesList = result.fePackagesList;
        locales = result.locales;
        fePackagesDefDict = result.fePackagesDefDict;
        servicesList = result.servicesList;
        servicesDefDict = result.servicesDefDict;
        for(let idx in result.initData){
            initData.add(getAbsolutePath(result.initData[idx], depPath));
        }
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
        bePackagesDefDict[key] = solution.bePackageDefinitions[key];
    }
    // Merge arrays and remove duplicates based on locale.intl
    locales = [...(solution.locales || []), ...locales];

    // Use reduce to create a dictionary with intl as the key
    const localesDict = locales.reduce((dict, locale) => {
    dict[locale.intl] = locale;
    return dict;
    }, {});

    // Convert dictionary values back to an array
    locales = Object.values(localesDict);

    servicesList = [...(solution.services || []), ...servicesList]
    for (let key in solution.serviceDefinitions || {}) {
        servicesDefDict[key] = solution.serviceDefinitions[key];
    }
    for(let idx in solution.initData){
        initData.add(getAbsolutePath(solution.initData[idx], solutionFilePath));
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
        locales,
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
            // Merge permissions, avoiding duplicates based on code
            const existingPermissionCodes = new Set(
                roleDict[roleCode].permissions.map(p => p.code)
            );
            for (const perm of mappedPermissions) {
                if (!existingPermissionCodes.has(perm.code)) {
                    roleDict[roleCode].permissions.push(perm);
                    existingPermissionCodes.add(perm.code);
                }
            }
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
    // Helper function to find and remove submenu from all main menus
    function removeSubmenuFromOtherMenus(submenuId, targetMainMenuId) {
        for (const mainMenuId in menuDict) {
            if (mainMenuId !== targetMainMenuId && menuDict[mainMenuId].submenus) {
                menuDict[mainMenuId].submenus = menuDict[mainMenuId].submenus.filter(
                    submenu => submenu.id !== submenuId
                );
            }
        }
    }

    for (const menu of menus) {
        // Handle submenu payload (has mainMenu field)
        if (menu.mainMenu) {
            const mainMenuId = menu.mainMenu;
            const submenu = {
                position: menu.position,
                id: menu.id,
                name: menu.name,
                icon: menu.icon,
                description: menu.description
            };

            // Create minimal main menu if it doesn't exist
            if (!menuDict[mainMenuId]) {
                menuDict[mainMenuId] = {
                    id: mainMenuId,
                    submenus: []
                };
            }

            // Remove this submenu from other main menus
            removeSubmenuFromOtherMenus(menu.id, mainMenuId);

            // Add submenu to the target main menu
            if (!menuDict[mainMenuId].submenus) {
                menuDict[mainMenuId].submenus = [];
            }
            // Check if submenu already exists
            const existingSubmenuIndex = menuDict[mainMenuId].submenus.findIndex(
                sm => sm.id === menu.id
            );
            if (existingSubmenuIndex !== -1) {
                // Update existing submenu
                menuDict[mainMenuId].submenus[existingSubmenuIndex] = submenu;
            } else {
                // Add new submenu
                menuDict[mainMenuId].submenus.push(submenu);
            }
        } 
        // Handle main menu payload
        else {
            const menuId = menu.id;
            // Preserve existing submenus if new payload doesn't include them
            const existingSubmenus = menuDict[menuId]?.submenus || [];
            
            menuDict[menuId] = {
                position: menu.position,
                id: menu.id,
                name: menu.name,
                icon: menu.icon,
                description: menu.description,
                submenus: menu.submenus || existingSubmenus
            };
        }
    }

    return menuDict;
}

async function injectLogoTheme(menuJson, logoPath, themePath) {
    if (!menuJson.fields || !menuJson.fields.config) {
        console.warn("⚠️ menuJson is missing 'fields.config'");
        return;
    }

    // Parse the existing config JSON string
    let config;
    try {
        config = JSON.parse(menuJson.fields.config);
    } catch (e) {
        console.error("❌ Failed to parse menuJson.fields.config:", e);
        return;
    }

    // Inject logo
    if (logoPath && fs.existsSync(logoPath)) {
        const img = fs.readFileSync(logoPath);
        const mimeType = mime.lookup(logoPath) || 'image/png';
        const base64 = img.toString('base64');
        config.logo = {
            value: `data:${mimeType};base64,${base64}`
        };
    }

    // Inject theme
    if (themePath && fs.existsSync(themePath)) {
        const themeData = JSON.parse(fs.readFileSync(themePath, 'utf8'));
        config.theme = themeData.theme;
    }
    // Write back to config as string
    menuJson.fields.config = JSON.stringify(config, null, 2);
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

function generateDeterministicUUID(inputString) {
    // Initialize seed for deterministic random
    let seed = 0;
    for (let i = 0; i < inputString.length; i++) {
        seed += inputString.charCodeAt(i);
    }
    
    // Simple pseudo-random number generator based on seed
    function seededRandom() {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    }
    
    // UUID template: 8-4-4-4-12 characters
    const chars = '0123456789abcdef';
    let uuid = '';
    
    // Generate UUID parts
    for (let i = 0; i < 36; i++) {
        if (i === 8 || i === 13 || i === 18 || i === 23) {
            uuid += '-';
        } else {
            uuid += chars[Math.floor(seededRandom() * 16)];
        }
    }
    
    return uuid;
}


function transformRolesToFixture(rolesDict) {
    const roleFixtures = [];
    const roleRightFixtures = [];
    const validityFrom = "2025-01-01T00:00:00Z";

    for (const key in rolesDict) {
        const role = rolesDict[key];
        const roleUuid = generateDeterministicUUID(key);

        roleFixtures.push({
            model: "core.role",
            fields: {
                uuid: roleUuid,
                name: role.roleName,
                alt_language: null,
                is_system: 0,
                is_blocked: false,
                audit_user_id: null,
                validity_from: validityFrom,
                validity_to: null,
                legacy_id: null
            }
        });

        for (const perm of role.permissions) {
            roleRightFixtures.push({
                model: "core.roleright",
                fields: {
                    validity_from: validityFrom,
                    validity_to: null,
                    legacy_id: null,
                    right_id: perm.code,
                    audit_user_id: null,
                    role: [role.roleName]
                }
            });
        }
    }

    return {
        roles: roleFixtures,
        rolesRight: roleRightFixtures
    };
}

async function createSolutionDirectory(baseDir, output)
{
  try {
              // Ensure the base directory exists
              await fs.mkdirSync(baseDir, { recursive: true });

              // Iterate over the output object
              for (const [filePath, content] of Object.entries(output)) {
                // Resolve the full path for the file
                const fullPath = path.join(baseDir, filePath);

                // Ensure the directory for the file exists
                const dir = path.dirname(fullPath);
                await fs.mkdirSync(dir, { recursive: true });

                // Write the file content
                if (fullPath.toLowerCase().endsWith('.yml') || fullPath.toLowerCase().endsWith('.yaml')) {
                // Stringify as YAML
                    await fs.writeFileSync(fullPath, yaml.dump(content));
                } else if (fullPath.toLowerCase().endsWith('.json') ){
                    // Stringify as JSON with formatting
                    await fs.writeFileSync(fullPath, JSON.stringify(content, null, 2));
                } else {
                    // Stringify as JSON with formatting
                    await fs.writeFileSync(fullPath, content);
                }
              }

              console.log(`Directory and files created successfully in ${baseDir}`);
            } catch (error) {
              console.error('Error creating directory and files:', error);
              throw error;
            }
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



module.exports = { mergeSolutions, getAbsolutePath, createZip, processSolutions, createSolutionDirectory };