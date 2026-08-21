# SHI (Social Health Insurance) Solution

**Business Focus:** Health Insurance / Health Financing Schemes (also referenced internally as HF)

The SHI solution (built from `HF.json`) configures openIMIS for classic social health insurance and health financing use cases. It supports enrollment of individuals and families (or formal sector groups/employers), contribution collection, benefit package (product) definition, claims submission and review, provider (health facility) management, and payment of claims or capitation.

It is the configuration suited for national health insurance funds, social health insurance schemes, and mutual health organizations that need the full health claims lifecycle in addition to enrollment and financing.

> Note: This document describes menus and roles from a **business / operational perspective**. The technical mapping of roles to specific permissions (role → perms) is maintained separately and will be defined in follow-up work.

## High-Level Capabilities Included

- Beneficiary / insuree and family or group enrollment using the legacy insuree model (Client Registry)
- Formal sector support: policyholders (employers/groups), contracts, contribution plans
- Health financing: products (benefit packages), policies, contributions/premiums
- Claims lifecycle: submission by health facilities, review, feedback, batch processing
- Provider network: health facilities, medical services & items price lists
- Payments & invoicing (claim payments, contribution-related invoices, supplier bills)
- Grievance / complaint handling
- Task/workflow support and classic reporting/tools
- Full administration (locations, health facilities) and user/role management

## Navigation Menu (Business View)

SHI activates the traditional health insurance navigation areas alongside supporting modules.

### 1. Client Registry
Beneficiary and family intake (legacy insuree/family model — modern Individual/Group registry is **not** included in base SHI).

- **Add Family or Group**: Enroll a new household or group of insurees.
- **Families or Groups**: Search and maintain existing family/group records.
- **Insurees**: Search, view, add, and update individual insured persons (members). Includes photos, relationships, and policy linkage.

### 2. Enrolment
Coverage and contribution management.

- **Contracts**: Formal sector contracts with policyholders (employers or groups). Create, submit, approve, amend, renew.
- **Policies**: View, create, renew, suspend, and manage health insurance policies linked to families/insurees.
- **Contributions**: Record premium payments / contributions against policies. Search contribution history.

### 3. Benefits and Claims
The heart of health insurance operations (Benefit.MainMenu).

- **Health Facility Claims**: Claims submitted by (or on behalf of) health facilities. Search, review, and process.
- **Reviews**: Dedicated queue and tools for medical/clinical review of claims (bypass, feedback, approval paths).
- **Claim Feedback**: Capture beneficiary or provider feedback on claims/services.
- **Claim Batch (Batch Run)**: Periodic batch processing of claims for payment calculation (capitation or fee-for-service).

### 4. Payments
Financial flows on both revenue (contributions) and expenditure (claims) sides.

- **Payment Plans**: Define scheduled contribution or payment structures.
- **Payments**: Record and manage payment transactions (e.g. claim payments to providers).
- **Payers**: Register and manage funding sources, insurers, or third-party payers.
- **Invoices**: Customer (member or employer) invoices for contributions or other receivables.
- **Bills**: Supplier/provider bills (claim payments, capitation, etc.).

### 5. Scheme Administration
Design of the insurance offering, contributions, and pricing (often labeled "Scheme Administration" or "Protection" in the UI).

- **Contribution Plans** and **Contribution Plan Bundles**: Define rates, rules, and bundles (frequently used for formal sector/employer contributions).
- **Products**: Define benefit packages — covered services/items, ceilings, co-payments, eligibility.
- **Medical Services** and **Medical Items**: Master lists of billable services and drugs/items.
- **Medical Services / Items Price Lists**: Pricelists used for claims valuation.
- **Policy Holders**: Employers or organized groups under formal sector coverage.

### 6. Tasks
Internal workflow and assignment support.

- **All Tasks**: Organization-wide view of pending tasks (supervisors/admins).
- **Tasks**: Personal or role-based task list.

### 7. Grievance
Complaints and appeals, often linked to coverage, claims or contributions.

- **Add Grievance**: Log new tickets (e.g. claim rejected unfairly, contribution not recorded, access to care issues).
- **Grievances**: Full lifecycle — triage, assignment, comments, resolution, and reporting.

### 8. Reports
Operational and management reporting.

- Reports entry (tools.reports) under the Reports main menu.
- Note: Advanced OpenSearch-powered reports (individual, group, beneficiary, grievance, data updates, etc.) are **not** included in base SHI (they come from the opensearch-reports module used in coreMIS-style solutions). Classic extracts/registers may appear under Tools where the Tools module is active.

### 9. Administration
Reference and provider data.

- **Health Facilities**: Register and maintain the network of contracted providers (hospitals, clinics, pharmacies). Includes legal form and sub-level classification.
- **Locations**: Geographic hierarchy used for targeting, reporting, and facility placement.
- Other controls and reference data (e.g. gender, education, profession, relations).

### 10. User Management
Access control and workflow groups.

- **Roles**: Define and assign roles (see below).
- **Users**: Manage accounts, often scoped by health facility, location, or payer.
- **Task Groups**: Define groups of users for task assignment and execution (maker-checker workflows).

### 11. Profile & Tools
- **My Profile** / **Change Password**
- Tools (registers, extracts, mobile sync where activated) for field or back-office use.

## Roles (Business Perspective)

SHI uses the classic openIMIS role set (defined as system roles in fixtures) plus any local extensions. These roles map closely to typical health insurance fund or scheme operator job functions.

### Standard / Core Roles

| Role                        | Business Description                                                                 | Typical Responsibilities |
|-----------------------------|--------------------------------------------------------------------------------------|--------------------------|
| **Enrolment Officer**      | Frontline registration staff (often mobile or at enrollment points). | Add families/insurees, collect and record contributions, issue/renew policies, basic inquiries and updates. |
| **Accountant**             | Finance team member handling money in and money out. | Contributions and premium collection recording, claim payments, invoice/bill processing, reconciliation, payment plans. |
| **Clerk**                  | General administrative / data support. | Data entry, searches, simple updates, support to other teams. Limited decision rights. |
| **Manager**                | Operational supervisor or mid-level program manager. | Oversight of enrollment, claims, and payments within a region or scheme; review queues, reporting. |
| **Medical Officer**        | Clinically trained reviewer. | Medical review of claims, application of clinical protocols, feedback to providers, bypass or adjustment decisions. |
| **Scheme Administrator**   | Product and rules owner (actuarial / benefits design). | Configure products (benefit packages), contribution plans, medical pricelists, health facility contracts, overall scheme parameters. |
| **LOCAL Administrator**    | Implementation-level IT / super user. | User and role management, location and reference data maintenance, system configuration, troubleshooting. Broad but usually geographically or organizationally scoped. |
| **Receptionist**           | Front-desk or call-center style role. | Quick lookup of members, policies and eligibility, simple inquiries, directing people to the right service. |
| **Claim Administrator**    | Claims operations lead. | Overall claims process management, batch runs, assignment of reviews, reporting on claims performance. |
| **Claim Contributor**      | Typically used by health facility staff or billing clerks. | Submit claims on behalf of the facility; limited to creation and status checking. |
| **HF Administrator**       | Health Facility side administrator. | Manage facility data, submit and track claims for that HF, view related reports and payments. |
| **Offline Administrator**  | Used in hybrid online/offline deployments (e.g. remote facilities). | Manage synchronization, offline data handling, and related admin tasks. |

### Best Practice Recommendations (drawn from health IAM and SP MIS literature)

- **Separation of duties** is critical in claims: the person submitting or initially processing a claim should not be the sole medical reviewer or payment approver.
- Use **RBAC with least privilege** — e.g. Enrolment Officers should not have access to medical price list configuration.
- Add or refine roles for:
  - **Data Analyst / M&E**: Heavy read + export access to reports and searches for performance monitoring, fraud detection, and reporting to governance/donors.
  - **Auditor / Compliance Officer**: Read-mostly access focused on trails, exceptions, and aggregate data.
  - **Provider Relations / Quality Officer**: Focused on health facility management, feedback, and quality metrics.
  - **Call Center / Member Services**: Narrow profile + policy lookup + grievance creation rights.
- Automate provisioning/de-provisioning as staff change roles (standard IAM best practice).
- For formal sector schemes, consider employer portal roles (policyholder user) separate from scheme operator roles.

## Usage Notes

- SHI activates the legacy-style health modules (insuree, policy, claim, product, medical, health facility) together with formal sector extensions (contract, policyholder, contribution plan) and grievance.
- The modern Individual/Group registry, API imports, social protection benefit plans, payroll, payment points/cycles, and OpenSearch reporting are **not** part of the base SHI configuration (see coreMIS, IBR, or SR for those).
- Grievance is included. Additional modules (e.g. modern individual or OpenSearch) can be added in custom variants.
- Many SHI deployments also maintain strong integration points with health facility billing systems and payment providers.

## Related / Reference

- Solution definition: `solution/solutions/HF.json` (exposed as SHI)
- Standard roles fixtures: `solution/fixtures/core/roles-SHI.json`
- Core health financing modules: `solution/modules/insuree.json`, `claim.json`, `policy.json`, `product.json`, etc.
- See openIMIS wiki and openimis.org for detailed functional and claims processing guidance.

---
*Document generated for business stakeholders. Technical permission matrices to be maintained separately.*
