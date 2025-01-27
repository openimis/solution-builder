# Menu Builder Script

This script processes a `solution.json` file and combines the `menus` key from multiple module JSON files to build a complete menu structure (TO-DO: generation of openimis.json and merging roles to apply them in migration). 
The resulting menu is sorted by `position` at both the menu and submenu levels. The script outputs a new file named `generated-menu.json` containing the combined and sorted menu structure.
This file can be pasted as a part of `fe-core` configuration. It can be changed either on database level or in django administration panel as superuser.

## How It Works

1. **Input File:**
   - The script reads `solution.json` from the current working directory.
   - The `solution.json` file should have a `modules` key containing a list of module file names (e.g., `client-management.json`, `user-management.json`, etc.).

2. **Module Files:**
   - Each module file listed under the `modules` key should be present in the same directory as `solution.json`.
   - Each module file should contain a `menus` key, which defines its menu structure.

3. **Combining Menus:**
   - The script reads all the module files, extracts their `menus`, and combines them.
   - Both menus and their submenus are sorted by the `position` field.

4. **Missing Files:**
   - If any module file is missing, the script will print a warning but will continue processing the rest.

5. **Output File:**
   - The script generates a `generated-solution.json` file in the same directory as the input files. This file contains the combined and sorted menu structure.

## How to Use

### Prerequisites
- Python 3.x installed on your system.

### Steps
1. **Prepare `solution.json`:**
   - Create a file named `solution.json` in the directory where you will run the script.
   - Add a `modules` key listing all the module files you want to include. Example:
     ```json
     {
       "modules": [
         "client-management.json",
         "user-management.json",
         "grievance.json",
         "social-protection.json",
         "core.json"
       ]
     }
     ```

2. **Prepare Module Files:**
   - Place all the module files listed in `solution.json` in the same directory. Each file should have a structure similar to the example below:
     ```json
     {
       "menus": [
         {
           "position": 1,
           "id": "MainMenu",
           "name": "Main",
           "icon": "main-icon",
           "description": "Main menu",
           "submenus": [
             {
               "position": 1,
               "id": "submenu1"
             },
             {
               "position": 2,
               "id": "submenu2"
             }
           ]
         }
       ]
     }
     ```

3. **Run the Script:**
   - Save the script as `menu_builder.py` in the same directory as `solution.json` and the module files.
   - Open a terminal or command prompt and navigate to the directory.
   - Run the script using the command:
     ```bash
     python menu_builder.py
     ```

4. **View the Output:**
   - After the script completes, a new file named `generated-solution.json` will be created in the same directory.
   - This file contains the combined and sorted menu structure.

## Example Directory Structure
```
/solution
|-- solution.json
|-- client-management.json
|-- user-management.json
|-- grievance.json
|-- social-protection.json
|-- core.json
|-- menu_builder.py
```

## Notes
- Ensure all files are properly formatted JSON.
- Missing or malformed files will result in warnings but will not stop the script.
- Customize the `solution.json` file to include or exclude specific modules based on your requirements.

## Useful links (openIMIS wiki page on Confluence)
- [Menu Builder Script explanation](https://openimis.atlassian.net/wiki/spaces/OP/pages/4220616709/Solution+Builder+Script)
- [Conception of deployment Recipe Strategy](https://openimis.atlassian.net/wiki/spaces/OP/pages/4139188234/Solution+Building+Deployment+Recipe+Strategy)
- [More detailed instruction of menu configuration](https://openimis.atlassian.net/wiki/spaces/OP/pages/4209606659/Solution+Building+configuration+of+Main+Menu+and+Submenus)
- [List of possible configurations of submenus items](https://openimis.atlassian.net/wiki/spaces/OP/pages/4209737755/List+of+submenu+entries+available+in+system)
- [Detailed description of technical approach to achieve having menu configurable](https://openimis.atlassian.net/wiki/spaces/OP/pages/4209803280/Technical+Approach+to+have+Menu+Configuration+flexible).


# Packaging Building

This section explains how the script processes `solution.json` to generate two package configuration files:

1. **`be-openimis.json`**: Contains backend (`be-packages`) packages.  
2. **`fe-openimis.json`**: Contains frontend (`fe-packages`) packages.  

Each package is transformed to meet specific naming conventions and structure requirements based on its `type`.

---

## Backend Package Rules (`be-openimis.json`)

- **General Format:**  
  Backend packages are listed under the `pip` key. Depending on the `type`, they are transformed as follows:

  - **Type: `pip`**  
    ```json
    {
      "name": "menu",
      "pip": "openimis-be-menu==v1.8.0"
    }
    ```

  - **Type: `github`**  
    ```json
    {
      "name": "core",
      "pip": "git+https://github.com/openimis/openimis-be-core_py.git@develop#egg=openimis-be-core"
    }
    ```

- **Naming Rules:**  
  - For `pip` packages, the full `openimis-be-<module_name>` pattern is retained.  
  - For `github` packages, the `openimis-be-` prefix and `_py` suffix are removed, leaving only `<module_name>` in `name`.  

---

## Frontend Package Rules (`fe-openimis.json`)

- **General Format:**  
  Frontend packages are listed under the `npm` key. Depending on the `type`, they are transformed as follows:

  - **Type: `npm`**  
    ```json
    {
      "name": "CoreModule",
      "npm": "@openimis/fe-core@>=v1.7.1"
    }
    ```

  - **Type: `github`**  
    ```json
    {
      "name": "GrievanceSocialProtectionModule",
      "npm": "@openimis/fe-grievance_social_protection@https://github.com/openimis/openimis-fe-grievance_social_protection_js#develop"
    }
    ```

- **Naming Rules:**  
  - The `name` key is converted to PascalCase with the `Module` suffix (e.g., `GrievanceSocialProtectionModule`).  
  - For `npm` packages, `_js` suffixes are removed.  
  - For `github` packages, URLs follow the pattern `openimis/openimis-<module_name>_js`.  

---

## Generated Files

### `be-openimis.json`
```json
{
  "packages": [
    {
      "name": "menu",
      "pip": "openimis-be-menu==v1.8.0"
    },
    {
      "name": "core",
      "pip": "git+https://github.com/openimis/openimis-be-core_py.git@develop#egg=openimis-be-core"
    }
  ]
}
```

### `fe-openimis.json`
```json
{
  "packages": [
    {
      "name": "CoreModule",
      "npm": "@openimis/fe-core@>=v1.7.1"
    },
    {
      "name": "GrievanceSocialProtectionModule",
      "npm": "@openimis/fe-grievance_social_protection@https://github.com/openimis/openimis-fe-grievance_social_protection_js#develop"
    }
  ]
}
```

---