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
3. **Sort permissions** within each role for better readability.  
4. **Save results** to `generated-roles.json`.  

## Input JSON Structure (Example Module File)  
Each module file should contain a `roles` section like this:
```json
{
  "roles": [
    {
      "roleName": "Admin",
      "roleId": 1,
      "permissions": ["127001", "127002", "127003"]
    },
    {
      "roleName": "SocialProtectionManager",
      "roleId": 12,
      "permissions": ["159001", "159002", "159003"]
    }
  ]
}
```

## Role Merging Logic
- If multiple modules define the same `roleName`, their permissions are merged (no duplicates).
- Roles retain the same `roleId` from their original definitions.
- The final output consolidates all role definitions into a single `generated-roles.json` file.

### Example:

#### Input from Module 1:
```json
{
  "roles": [
    {
      "roleName": "Admin",
      "roleId": 1,
      "permissions": ["127001", "127002"]
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
      "roleId": 1,
      "permissions": ["127003", "127004"]
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
      "roleId": 1,
      "permissions": ["127001", "127002", "127003", "127004"]
    }
  ]
}
```

## Processing Steps
1. **Load Modules**  
   - Extract roles from each module’s JSON file.  
   - Each module contains a list of roles with `roleName`, `roleId`, and associated `permissions`.

2. **Merge Roles**  
   - If the same `roleName` appears in multiple modules, their permissions are combined.  
   - Duplicates within the permission lists are removed.  
   - The `roleId` remains the same as defined in the original modules.

3. **Generate Output**  
   - The final list of merged roles is structured into a single JSON object.  
   - The processed roles are saved in `generated-roles.json`.

## Output File
The processed roles are saved in:
- `generated-roles.json`
This file consolidates all roles across modules, ensuring a structured and non-duplicated set of permissions.

Each role in the final output contains:

- `roleName`: The name of the role.
- `roleId`: The unique identifier for the role.
- `permissions`: A merged list of permissions from all modules, with duplicates removed.
