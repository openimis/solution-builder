# Menu Builder Script

This script processes a `solution.json` file and combines the `menus` key from multiple module JSON files to build a complete menu structure. The resulting menu is sorted by `position` at both the menu and submenu levels. The script outputs a new file named `generated-solution.json` containing the combined and sorted menu structure.

## How It Works

### 1. Input File:
- The script reads `solution.json` from the current working directory.
- The `solution.json` file should have a modules key containing a list of module bundle file names 
(e.g., `social-protection-bundle.json`, `formal-sector-bundle.json`, etc.).

### 2. Module and Module Bundle Files:
- Each module file listed under the `modules` key should be present in the same directory as `solution.json`.
- Each module file should contain a `menus` key, which defines its menu structure.
- Some modules may also contain a `dependency` key, listing other module bundles that must be processed even if they are not explicitly included in `solution.json`.

### 3. Combining Menus:
- The script reads all the module files, extracts their `menus`, and combines them.
- If multiple entries share the same `id`, their `submenus` are merged instead of duplicating menu items.
- Both menus and their `submenus` are sorted by the `position` field.

### 4. Handling Dependencies:
- If a module has a `dependency` key, the script ensures that the referenced module files are also processed, even if they are not explicitly listed in `solution.json`.
- Dependencies are resolved recursively to ensure all required modules are included.

### 5. Handling Bundles:
- Bundles are collections of multiple related modules grouped together in a single file.
- If a bundle file is listed in `solution.json`, the script will process all its included modules.
- Bundles may also have dependencies on other bundles, which are resolved recursively.

### 6. Missing Files:
- If any module, bundle, or dependency file is missing, the script will print a warning but will continue processing the available files.

## Example

### Example `solution.json` with Bundles
```json
{
  "modules": [
    "social-protection-bundle.json",
    "opensearch-report-bundle.json",
    "core-bundle.json"
  ],
  "roles": [
    "role-eo.json"
  ]
}
```

### Example `social-protection-bundle.json` (Bundle with Dependencies)
```json
{
  "modules": [
    "individual.json",
    "api-import.json",
    "social-protection.json",
    "payroll.json",
    "payment-cycle.json",
    "deduplication.json"
  ],
  "dependency": [
    "grievance-bundle.json"
  ]
}
```

### Example `opensearch-report-bundle.json` (Bundle Without Dependencies)
```json
{
  "modules": [
    "opensearch-report.json"
  ]
}
```

### Example `generated-solution.json` (Final Merged Output)
```json
{
  "menus": [
    {
      "position": 1,
      "id": "SocialRegistryMainMenu",
      "name": "Social Registry",
      "icon": "task-icon",
      "description": "Social Registry",
      "submenus": [
        {
          "position": 1,
          "id": "individual.api_imports"
        },
        {
          "position": 3,
          "id": "individual.individuals"
        },
        {
          "position": 4,
          "id": "individual.groups"
        },
        {
          "position": 2,
          "id": "socialProtection.benefitPlans"
        }
      ]
    }
  ]
}
```

## How to Use

### Prerequisites
- Python 3.x installed on your system.

### Steps
1. **Prepare `solution.json`:**
   - Create a file named `solution.json` in the directory where you will run the script.
   - Add a `modules` key listing all the module bundles you want to include. Example:
     ```json
     {
       "modules": [
         "social-protection-bundle.json",
         "opensearch-report-bundle.json",
         "core-bundle.json",
         "xxxx-bundle.json",
         "formal-sector-bundle.json"
       ]
     }
     ```
2. **Prepare `<module>-bundle.json`:**
   - Create a file named `<module>-bundle.json` in the directory where you will run the script.
   - Add a `modules` key listing all the modules you want to include in bundle. Example:
     ```json
     {
       "modules": [
         "individual.json",
         "api-import.json",
         "social-protection.json",
         "payroll.json",
         "payment-cycle.json",
         "deduplication.json"
       ],
       "dependency": [
         "grievance-bundle.json",
         "calculation-social-protection-bundle.json"
       ]
     }
     ```
   - `dependency` key: it means that this bundle is related to other bundle and the additional package must be installed 
   and considered in the final output. For example if `grievance-bundle.json` is not added in `solution.json` - this 
   bundle package will be added in the final output even though is not presented in `solution.json` file.

3. **Prepare Module Files:**
   - Place all the module files listed in `<module>-bundle.json` files in the same directory. Each file should have a structure similar to the example below:
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

4. **Run the Script:**
   - Save the script as `build_solution.py` in the same directory as `solution.json` and the module files.
   - Open a terminal or command prompt and navigate to the directory.
   - Run the script using the command:
     ```bash
     python3 build_solution.py
     ```

5. **View the Output:**
   - After the script completes, a new files named `generated-menu.json`, `generated-roles.json`, `fe-openimis.json` and `be-openimis.json` will be created in the same directory.
   - This file contains the combined and sorted menu structure.

## Example Directory Structure
```
/solution
|-- solution.json
|-- social-protection.json
|-- payroll.json
|-- payment-cycle.json
|-- individual.json
|-- grievance.json
|-- grievance-bundle.json
|-- social-protection-bundle.json
|-- core.json
|-- build_solution.py
```

## Notes
- Ensure all files are properly formatted JSON.
- Missing or malformed files will result in warnings but will not stop the script.
- Customize the `solution.json` file to include or exclude specific modules based on your requirements.

## Table of Configurations

Here’s the complete table with all the submenu configurations extracted, including their `Name of Submenu`, `ID of Submenu`, `Filter`, and `Route`.

| **Name of Submenu**                  | **ID of Submenu**                | **Filter**                                                          | **Route**                           |
|--------------------------------------|----------------------------------|----------------------------------------------------------------------|-------------------------------------|
| Tasks Management View                | `task.tasks`                    | `(rights) => rights.includes(RIGHT_TASKS_MANAGEMENT_SEARCH_ALL)`    | `/tasks`                            |
| Tasks Management All View            | `task.allTasks`                 | `(rights) => rights.includes(RIGHT_TASKS_MANAGEMENT_SEARCH_ALL)`    | `/AllTasks`                         |
| Registers                            | `tools.registers`               | `(rights) => enablers(rights, RIGHT_REGISTERS)`                     | `/tools/registers`                  |
| Extracts                             | `tools.extracts`                | `(rights) => enablers(rights, RIGHT_EXTRACTS)`                      | `/tools/extracts`                   |
| Reports                              | `tools.reports`                 | `(rights) => enablers(rights, RIGHT_REPORTS)`                       | `/tools/reports`                    |
| Social Protection Benefit Plans      | `socialProtection.benefitPlans` | `(rights) => rights.includes(RIGHT_BENEFIT_PLAN_SEARCH)`            | `/benefitPlans`                     |
| My Profile                           | `profile.myProfile`             | None                                                                | `/profile/myProfile`                |
| Change Password                      | `profile.changePassword`        | None                                                                | `/profile/changePassword`           |
| Policies                             | `insuree.policies`              | `(rights) => rights.includes(RIGHT_POLICY)`                         | `/policy/policies`         |
| Payment Point                        | `legalAndFinance.paymentPoint`  | `(rights) => rights.includes(RIGHT_PAYMENT_POINT_SEARCH)`           | `/paymentPoints`          |
| Payrolls                             | `legalAndFinance.payrolls`      | `(rights) => rights.includes(RIGHT_PAYROLL_SEARCH)`                 | `/payrolls`                |
| Payrolls Pending                     | `legalAndFinance.payrollsPending` | `(rights) => rights.includes(RIGHT_PAYROLL_SEARCH)`              | `/payrollsPending`        |
| Payrolls Approved                    | `legalAndFinance.payrollsApproved` | `(rights) => rights.includes(RIGHT_PAYROLL_SEARCH)`            | `/payrollsApproved`       |
| Payrolls Reconciled                  | `legalAndFinance.payrollsReconciled` | `(rights) => rights.includes(RIGHT_PAYROLL_SEARCH)`          | `/payrollsReconciled`     |
| Payments                             | `insuree.payment`               | `(rights) => rights.includes(RIGHT_PAYMENT)`                        | `/payment/payments`                |
| Payment Cycles                       | `legalAndFinance.paymentCycles` | `(rights) => rights.includes(RIGHT_PAYMENT_CYCLE_SEARCH)`           | `/paymentCycles`          |
| Payers                               | `admin.payers`                  | `(rights) => rights.includes(RIGHT_PAYERS)`                         | `/payer/payers`                     |
| Individual Reports                   | `openSearch.individualReports`  | None                                                                | `/individualReports`                |
| Group Reports                        | `openSearch.groupReports`       | None                                                                | `/groupReports`                     |
| Beneficiary Reports                  | `openSearch.beneficiaryReports` | None                                                                | `/beneficiaryReports`               |
| Invoice Reports                      | `openSearch.invoiceReports`     | None                                                                | `/invoiceReports`                   |
| Payment Reports                      | `openSearch.paymentReports`     | None                                                                | `/paymentReports`                   |
| Grievance Reports                    | `openSearch.grievanceReports`   | None                                                                | `/grievanceReports`                 |
| Data Updates Reports                 | `openSearch.dataUpdatesReports` | None                                                                | `/dataUpdatesReports`               |
| Open Search Config                   | `openSearch.openSearchConfig`   | None                                                                | `/dashboardConfiguration`           |
| Invoices                             | `legalAndFinance.invoices`      | `(rights) => rights.filter((r) => r >= RIGHT_INVOICE_SEARCH && r <= RIGHT_INVOICE_AMEND).length > 0` | `/invoices`                         |
| Bills                                | `legalAndFinance.bills`         | `(rights) => rights.filter((r) => r >= RIGHT_BILL_SEARCH && r <= RIGHT_BILL_AMEND).length > 0`        | `/bills`                            |
| Add Family or Group                  | `insuree.addFamilyOrGroup`      | `(rights) => rights.includes(RIGHT_FAMILY_ADD)`                     | `/insuree/family`          |
| Families or Groups                   | `insuree.familiesOrGroups`      | `(rights) => rights.includes(RIGHT_FAMILY)`                         | `/insuree/families`        |
| Insurees                             | `insuree.insurees`              | `(rights) => rights.includes(RIGHT_INSUREE)`                        | `/insuree/insurees`        |
| Individuals                          | `individual.individuals`        | `(rights) => rights.includes(RIGHT_INDIVIDUAL_SEARCH)`              | `/individuals`             |
| Groups                               | `individual.groups`              | `(rights) => rights.includes(RIGHT_GROUP_SEARCH)`                    | `/groups`                  |
| API Imports                          | `individual.api_imports`         | `(rights) => rights.includes(RIGHT_INDIVIDUAL_SEARCH)`               | `/imports`             |
| Grievances                           | `grievance.grievances`           | `(rights) => rights.includes(RIGHT_TICKET_SEARCH)`                   | `/ticket/tickets`          |
| Add Grievance                        | `grievance.add`                  | `(rights) => rights.includes(RIGHT_TICKET_ADD)`                      | `/ticket/newTicket`      |
| Role Management                      | `admin.roleManagement`           | `(rights) => rights.includes(RIGHT_ROLE_SEARCH)`                     | `/roles`                 |
| Contribution Plans                   | `admin.contributionPlans`        | `(rights) => rights.includes(RIGHT_CONTRIBUTION_PLAN_SEARCH)`        | `/contributionPlans`   |
| Contribution Plan Bundles            | `admin.contributionPlanBundles`  | `(rights) => rights.includes(RIGHT_CONTRIBUTION_PLAN_BUNDLE_SEARCH)` | `/contributionPlanBundles` |
| Payment Plans                        | `legalAndFinance.paymentPlans`   | `(rights) => rights.includes(RIGHT_PAYMENT_PLAN_SEARCH)`            | `/paymentPlans`        |
| Contribution                         | `insuree.contribution`           | `(rights) => rights.includes(RIGHT_CONTRIBUTION)`                    | `/contribution/contributions` |
| Health Facility Claims               | `claim.healthFacilityClaims`     | `(rights) => rights.some((r) => r >= RIGHT_CLAIMREVIEW && r <= RIGHT_PROCESS)` | `/claim/healthFacilities`           |
| Reviews                              | `claim.reviews`                  | `(rights) => rights.some((r) => r >= RIGHT_CLAIMREVIEW && r <= RIGHT_PROCESS)` | `/claim/reviews`                    |
| Claim Batch (Batch Run)              | `claim.claimBatch`               | `(rights) => !!rights.filter(r => r >= RIGHT_PROCESS && r <= RIGHT_PREVIEW).length` | `/claim_batch`             |
| Products                             | `admin.products`                 | `(rights) => rights.includes(RIGHT_PRODUCTS)`                        | `/admin/products`                   |
| Health Facilities                    | `admin.healthFacilities`         | `(rights) => rights.includes(RIGHT_HEALTHFACILITIES)`                | `/location/healthFacilities`       |
| Medical Services Prices List         | `admin.services`                 | `(rights) => rights.includes(RIGHT_PRICELISTMS)`                     | `/medical/pricelists/services`     |
| Medical Items Prices List            | `admin.items`                    | `(rights) => rights.includes(RIGHT_PRICELISTMI)`                     | `/medical/pricelists/items`        |
| Medical Services                     | `admin.medicalServices`          | `(rights) => rights.includes(RIGHT_MEDICALSERVICES)`                 | `/medical/pricelists/services`     |
| Medical Items                        | `admin.medicalItems`             | `(rights) => rights.includes(RIGHT_MEDICALITEMS)`                    | `/medical/pricelists/items`        |
| Users                                | `admin.users`                    | `(rights) => rights.includes(RIGHT_USERS)`                           | `/admin/users`                      |
| Locations                            | `admin.locations`                | `(rights) => rights.includes(RIGHT_LOCATIONS)`                       | `/location/locations`              |
| Contracts                            | `legalAndFinance.contracts`      | `(rights) => rights.includes(RIGHT_POLICYHOLDERCONTRACT_SEARCH)`     | `/contracts`             |


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
# Processing Roles in `build_solution.py`

## Overview  
The `build_solution.py` script processes multiple JSON module files to generate a consolidated roles file:  
**`generated-roles.json`** – Contains merged roles with unique permissions.  

## How Roles Are Processed  
1. **Extract roles** from each module's JSON file.  
2. **Merge duplicate role names**, ensuring unique permissions are combined.  
3. **Map permissions using `permissions_map.json`** to include both `code` and `name` fields.  
4. **Sort permissions** within each role for better readability.  
5. **Save results** to `generated-roles.json`.  

## Input JSON Structure (Example Module File)  
Each module file should contain a `roles` section like this:
```json
{
  "roles": [
    {
      "roleName": "Admin",
      "code": "admin",
      "permissions": [
        "individual.read_individual",
        "individual.create_individual",
        "individual.update_individual",
        "individual.delete_individual"
      ]
    }
  ]
}
```

## Role Merging Logic
- If multiple modules define the same `roleName`, their permissions are merged (no duplicates).
- Roles retain the same `code` from their original definitions.
- The final output consolidates all role definitions into a single `generated-roles.json` file.
- **Permissions are mapped** to include `code` and `name` using `permissions_map.json`.

### Example:

#### Input from Module 1:
```json
{
  "roles": [
    {
      "roleName": "Admin",
      "code": "admin",
      "permissions": [
        "grievance.create_grievance",
        "grievance.update_grievance"
      ]
    }
  ]
}
```

#### Input from Module 2:
```json
{
  "roles": [
    {
      "roleName": "Admin",
      "code": "admin",
      "permissions": [
        "grievance.delete_grievance",
        "grievance.read_grievance"
      ]
    }
  ]
}
```

#### Final Output (generated-roles.json):
```json
{
  "roles": [
    {
      "roleName": "Admin",
      "code": "admin",
      "permissions": [
        {
          "name": "grievance.create_grievance",
          "code": "127001"
        },
        {
          "name": "grievance.update_grievance",
          "code": "127002"
        },
        {
          "name": "grievance.delete_grievance",
          "code": "127003"
        },
        {
          "name": "grievance.read_grievance",
          "code": "127000"
        }
      ]
    }
  ]
}
```

## Processing Steps
1. **Load Modules**  
   - Extract roles from each module’s JSON file.  
   - Each module contains a list of roles with `roleName`, `code`, and associated `permissions`.

2. **Merge Roles**  
   - If the same `roleName` appears in multiple modules, their permissions are combined.  
   - Duplicates within the permission lists are removed.  
   - The `code` remains the same as defined in the original modules.

3. **Map Permissions**  
   - Each permission string is replaced with a dictionary containing:  
     - `"name"`: The original permission string.  
     - `"code"`: The mapped value from `permissions_map.json`.
   - If no mapping exists, the permission remains unchanged.

4. **Generate Output**  
   - The final list of merged roles is structured into a single JSON object.  
   - The processed roles are saved in `generated-roles.json`.

## Output File
The processed roles are saved in:
- `generated-roles.json`

This file consolidates all roles across modules, ensuring a structured and non-duplicated set of permissions. Each role in the final output contains:
- `roleName`: The name of the role.
- `code`: The unique code identifier for the role.
- `permissions`: A merged list of permissions from all modules, each containing:
  - `name`: The permission name.
  - `code`: The mapped permission code from `permissions_map.json`.
