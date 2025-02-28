// solution-builder.js
// Base URL for fetching files from the repository
let BASE_URL = 'https://api.github.com/repos/openimis/solution-builder/contents/';
let githubApiKey = '';
let sourceType = 'github'; // Default to GitHub
let githubAuthType = 'anonymous'; // Default to anonymous

// Function to handle source selection
function selectSource(type) {
    sourceType = type;
    if (type === 'github') {
        document.getElementById('githubSettings').style.display = 'block';
        document.getElementById('localSettings').style.display = 'none';
        updateGithubAuthVisibility();
    } else {
        document.getElementById('githubSettings').style.display = 'none';
        document.getElementById('localSettings').style.display = 'block';
    }
    init();
}

// Function to update GitHub authentication visibility
function updateGithubAuthVisibility() {
    const authType = document.querySelector('input[name="githubAuth"]:checked').value;
    githubAuthType = authType;
    if (authType === 'authenticated') {
        document.getElementById('githubApiKeyContainer').style.display = 'block';
    } else {
        document.getElementById('githubApiKeyContainer').style.display = 'none';
    }
}

// Function to handle proceeding with the API key or local path
function proceedWithSettings() {
    if (sourceType === 'github') {
        const inputValue = document.getElementById('githubApiKeyInitial').value.trim();
        githubApiKey = inputValue ? inputValue : null;
        const githubPath = document.getElementById('githubPath').value.trim();
        BASE_URL = githubPath || 'https://api.github.com/repos/openimis/solution-builder/contents/';
    } else {
        const localPathInput = document.getElementById('localPath');
        BASE_URL = localPathInput.value;
    }

    document.getElementById('settingsForm').classList.remove('active');
    document.getElementById('solutionForm').classList.add('active');
    init();
}

// Function to open file picker for local file selection
function selectLocalFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(event) {
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            const content = e.target.result;
            const jsonData = JSON.parse(content);
            processLocalFile(jsonData);
        };
        reader.readAsText(file);
    };
    input.click();
}
// Function to open folder picker for local path selection
function selectLocalFolder() {
    // This function uses the WebkitDirectory API, which is not supported in all browsers
    // For full cross-browser support, you might need to use a library or implement a custom solution
    const input = document.createElement('input');
    input.type = 'file';
    input.webkitdirectory = true;
    input.directory = true;
    input.onchange = function(event) {
        const files = event.target.files;
        if (files.length > 0) {
            const localPathInput = document.getElementById('localPath');
            localPathInput.value = files[0].webkitRelativePath.split('/')[0];
            BASE_URL = localPathInput.value;
            init();
        }
    };
    input.click();
}
// Function to process locally selected file
function processLocalFile(jsonData) {
    const localPathInput = document.getElementById('localPath');
    localPathInput.value = jsonData.path || '';
    BASE_URL = jsonData.path || '';
    init();
}


// Function to fetch and parse JSON files
async function fetchJSON(url) {
    if (sourceType === 'github') {
        const response = await fetch(url, {
            headers: getHeaders()
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
        }
        const data = await response.json();
        // Decode the base64 content
        const content = atob(data.content);
        return JSON.parse(content);
    } else {
        // For local files, we'll assume the URL is a file path
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
        }
        return await response.json();
    }
}

// Function to populate select elements with options
async function populateSelect(selectId, directory) {
    const select = document.getElementById(selectId);
    select.innerHTML = ''; // Clear existing options

    if (sourceType === 'github') {
        const files = await fetchDirectoryContents(`${BASE_URL}${directory}`);
        files.forEach(file => {
            if (file.name.endsWith('.json')) {
                const option = document.createElement('option');
                option.value = file.path;
                option.text = file.name;
                select.appendChild(option);
            }
        });
    } else {
        // For local files, we'll need to implement a way to list files in a directory
        // This is a placeholder and would need to be implemented using the File System API
        console.log('Local file listing not implemented yet');
    }
}

// Function to fetch directory contents
async function fetchDirectoryContents(url) {
    if (sourceType === 'github') {
        const response = await fetch(url, {
            headers: getHeaders()
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch directory contents from ${url}: ${response.statusText}`);
        }
        return await response.json();
    } else {
        // For local files, we'll need to implement a way to list files in a directory
        // This is a placeholder and would need to be implemented using the File System API
        console.log('Local directory listing not implemented yet');
        return [];
    }
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

// Main function to generate the solution
async function generateSolution(event) {
    event.preventDefault();
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = 'Generating solution...';

    try {
        const dependencies = Array.from(document.getElementById('dependencies').selectedOptions).map(option => option.value);
        const modules = Array.from(document.getElementById('modules').selectedOptions).map(option => option.value);
        const gitBranch = document.getElementById('gitBranch').value || null;

        // Check if GitHub API key is provided (only for GitHub source with authenticated access)
        if (sourceType === 'github' && githubAuthType === 'authenticated' && !githubApiKey) {
            throw new Error('GitHub API key is required for authenticated access.');
        }

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

// Add this code when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Add event listener for GitHub authentication type change
    document.querySelectorAll('input[name="githubAuth"]').forEach(radio => {
        radio.addEventListener('change', updateGithubAuthVisibility);
    });

    // Set initial state of GitHub authentication visibility
    updateGithubAuthVisibility();
});

