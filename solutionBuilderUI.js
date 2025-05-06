// solution-builder.js
// Base URL for fetching files from the repository
let BASE_URL = 'https://api.github.com/repos/openimis/solution-builder/contents/';
let DIRECTORY = ''
let githubApiKey = '';
let sourceType = 'local'; // Default to GitHub
let githubAuthType = 'anonymous'; // Default to anonymous
const otherContainer = document.getElementById('other');

// Configuration for editable JSON editors
const editorOptions = {
    mode: 'code', // Tree mode for a visual editor
    modes: ['tree', 'code'], // Allow switching between tree and code modes
    onEditable: () => true, // Explicitly allow editing
    mainMenuBar: true, // Show the menu bar for mode switching
    navigationBar: true // Show navigation bar
};


const otherEditor = new JSONEditor(otherContainer, editorOptions);

otherEditor.set({'menus':[], 'solutions':[], 'roles':[], 'modules':[], 'packages':[]});
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
            

        premission_map = await fetchJSON('solution/permissions_map.json', DIRECTORY)
        // Process resolved modules (assuming processSolution exists in your code)
        const output = await processSolutions(solution, DIRECTORY, premission_map );


        createZip(output, 'solution.zip');
        resultDiv.innerHTML = 'Solution generated and downloaded successfully!';
    } catch (error) {
        resultDiv.innerHTML = `Error: ${error.message}`;
        console.error(error);
    }
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

// Function to proceed with settings (set BASE_URL)
function proceedWithSettings() {
    if (sourceType === 'github') {
        const inputValue = document.getElementById('githubApiKeyInitial').value.trim();
        githubApiKey = inputValue || null;
        const githubPath = document.getElementById('githubPath').value.trim();
        BASE_URL = githubPath || 'https://api.github.com/repos/openimis/solution-builder/contents/';
    } 

    document.getElementById('settingsForm').classList.remove('active');
    document.getElementById('solutionForm').classList.add('active');
    init();
}


async function selectLocalFolder() {
    try {
        const dirHandle = await window.showDirectoryPicker();
        DIRECTORY = dirHandle; // Store directory handle instead of a URL
        init();
    } catch (err) {
        console.error('Error selecting folder:', err);
    }
}


// Populate select elements dynamically
async function populateSelect(selectId, directory) {
    const select = document.getElementById(selectId);
    select.innerHTML = '';
    const url = sourceType === 'github' ? `${BASE_URL}${directory}` : directory;
    const files = await fetchDirectoryContents(url);

    for (const file of files) {
        if (file.name.endsWith('.json')) {
            const line = document.createElement('label');
            const checkbox = document.createElement('input');
            const label = document.createElement('div');
            checkbox.type = 'checkbox';
            checkbox.value = sourceType === 'github' ? file.path : file.handle;
            label.innerText = file.name
            line.appendChild(checkbox);
            line.appendChild(label);
            select.appendChild(line);
        }
    }
}
// Fetch directory contents
async function fetchDirectoryContents(directory) {
    if (sourceType === 'github') {
        const response = await fetch(directory, { headers: getHeaders() });
        if (!response.ok) throw new Error(`Failed to fetch directory contents from ${directory}: ${response.statusText}`);
        return await response.json();
    } else {
        // Ensure DIRECTORY is set
        if (!DIRECTORY) throw new Error('Root directory not initialized. Call initializeDirectory first.');

        const files = [];
        let currentDirHandle = DIRECTORY;

        // If directory is provided, resolve it as a relative path from the root
        if (directory && directory !== '') {
            const pathParts = directory.split('/').filter(part => part.length > 0);
            for (const part of pathParts) {
                currentDirHandle = await currentDirHandle.getDirectoryHandle(part, { create: false });
            }
        }

        // Fetch contents of the current directory
        for await (const [name, handle] of currentDirHandle.entries()) {
            if (name.endsWith('.json')) {
                files.push({ name, handle });
            }
        }
        return files;
    }
}
// Initialize
async function init() {
    await populateSelect('solutions', 'solution/solutions');
    await populateSelect('modules', 'solution/modules');
    document.getElementById('solutionForm').addEventListener('submit', generateSolution);
    const otherContainer = document.getElementById('other');
}
// Load JSZip and initialize
// const script = document.createElement('script');
// script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
// script.onload = init;
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

