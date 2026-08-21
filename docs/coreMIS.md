# coreMIS Solution

**Business Focus:** Social Protection and Cash Transfer Programs

coreMIS is a specialized configuration of the openIMIS platform optimized for social protection schemes, cash transfer programs, beneficiary registries, payroll disbursements, and grievance redress mechanisms. It is used by governments and programs (e.g. cash transfer initiatives in West Africa such as Guinea's Nafa programme) to manage large-scale beneficiary lists, eligibility, payments to individuals/households, and operational workflows including deduplication and task-based approvals.

It emphasizes modern individual/group registry capabilities, flexible benefit plan configuration, automated payroll, payment reconciliation, and integrated grievance handling over traditional health insurance claims processing.

> Note: This document describes menus and roles from a **business / operational perspective**. The technical mapping of roles to specific permissions (role → perms) is maintained separately and will be defined in follow-up work.

## High-Level Capabilities Included

- Individual and Group (household) registry with API/CSV import and deduplication
- Social Protection benefit plans, projects, schemas and beneficiary enrollment
- Payroll generation, approval workflows, and multi-stage reconciliation (including bank feedback via CSV)
- Payment points and payment cycles management
- Grievance / complaint and redress management (with comments and resolution)
- Advanced reporting and dashboards powered by OpenSearch
- Task / workflow management (maker-checker patterns)
- User, role and location master data administration
- Invoicing / billing support for suppliers or related flows
- Core profile and administration functions

## Navigation Menu (Business View)

Menus are organized to support frontline registration, operations/payment teams, program managers, and oversight.

### 1. Client Registry
Primary entry point for beneficiary data management.

- **API Imports**: Bulk import or ETL of individuals and groups from external sources (e.g. national ID systems, social registries, or partner databases). Used during initial enrollment drives or periodic updates.
- **Individuals**: Register, search, view, edit, and (soft) delete single beneficiary records. Supports key demographic and program-specific attributes.
- **Groups**: Manage households, communities, or other beneficiary groupings. Critical for targeting cash transfers at the household level.

### 2. Payments
Core operational area for disbursing benefits.

- **Payrolls**: Create, view and manage payroll runs for benefit distribution. Supports generating payment lists for a payment cycle / benefit plan.
- **Payrolls Pending**: Review and approve payrolls that are awaiting validation or authorization.
- **Payrolls Approved**: Payrolls that have passed approval and are ready for execution or export to payment providers.
- **Payrolls Reconciled**: Completed payrolls after receiving and matching feedback (e.g. successful/failed payments from banks or mobile money operators via CSV reconciliation).
- **Payment Points**: Register and manage physical or agent-based points where beneficiaries can collect cash or where payments are facilitated.
- **Payment Cycles**: Define the schedule and parameters for recurring payment rounds (e.g. monthly, quarterly).
- **Payments**: Individual payment records and transaction management.
- **Invoices / Bills**: Manage financial documents for suppliers, implementing partners, or certain beneficiary-related flows (amend, pay, reconcile).
- **Payers** (where exposed): Manage organizations or entities providing funding or acting as payers.

### 3. Tasks
Supports internal workflow and maker-checker controls.

- **All Tasks**: Organization-wide view of pending tasks (for supervisors and admins). Search and assign tasks related to beneficiary updates, payroll reviews, grievance handling, etc.
- **Tasks**: Personal or role-filtered task inbox for day-to-day work items.
- **Task Groups** (accessible via User Management): Define groups of users who can be assigned as task executors or reviewers.

### 4. Grievance
Redress and complaints handling integrated with beneficiary records.

- **Add Grievance**: Frontline or self-service creation of new tickets/complaints (e.g. payment not received, eligibility disputes, data errors).
- **Grievances**: Search, comment, update status, and resolve grievances. Supports assignment, escalation, and audit trail of communications.

### 5. Reports (Dashboards & Analytics)
OpenSearch-powered advanced search and visualization (replaces or augments classic reports).

- **Individual Reports**: Flexible queries and dashboards on individual beneficiary data.
- **Group Reports**: Analysis at household/group level.
- **Beneficiary Reports**: Program-specific beneficiary lists, statistics, and exports.
- **Grievance Reports**: Trends, resolution times, categories of complaints.
- **Data Updates Reports**: Track changes, imports, and data quality over time.
- **Dashboard Configuration**: Administrators and analysts can configure and save custom dashboards and saved searches.

### 6. Scheme Administration (Benefit Plans / Protection)
Program design and configuration.

- **Benefit Plans**: Create, configure, search and close benefit plans. Define eligibility criteria, benefit values, target populations, schemas, and link to payroll/payment cycles. Core tool for program managers to model social protection schemes.

(Additional related configuration such as projects and schemas may surface under or near benefit plan management.)

### 7. User Management
Day-to-day user and access administration (often used by Local Admins).

- **Users**: Create, update, search system users and assign them to roles and locations.
- **Roles**: Manage custom roles (see Roles section below). Assign permissions bundles.
- **Task Groups**: Configure groups used for workflow routing.

### 8. Administration
Master data and system-wide setup (typically restricted).

- **Locations**: Maintain the administrative hierarchy (country → regions → districts → villages/wards). Used heavily for targeting and reporting.
- Health facilities or other reference data may be present depending on hybrid use cases.

### 9. Profile
Personal account management available to all authenticated users.

- **My Profile**: View and update personal information.
- **Change Password**: Self-service password management.

## Roles (Business Perspective)

The coreMIS solution ships with a focused set of business roles tailored to social protection operations. These are distinct from classic health insurance roles.

### Core Defined Roles

| Role                        | Business Description                                                                 | Typical Responsibilities |
|-----------------------------|--------------------------------------------------------------------------------------|--------------------------|
| **Local Admin**            | Local or implementation-level system administrator. Full control within a geographic or program scope. | User & role provisioning, location master data, full beneficiary CRUD (including deletes/undeletes), benefit plan setup, payroll and payment config, grievance resolution (incl. delete), task management, API import rules, reporting config. Acts as power user / first-line support. |
| **Accountant**             | Finance and disbursement focused role. Handles money movement and reconciliation. | Payroll search + limited actions, payment creation/update, invoice/bill lifecycle (create/amend/pay), payment cycles, payment point search, reconciliation uploads, limited reporting. Restricted from broad beneficiary or scheme design changes. |
| **Social Protection Manager** | Program / operations manager. Owns the end-to-end delivery of one or more schemes. | Full benefit plan and project lifecycle, beneficiary and group management, payroll creation + approval stages, grievance resolution, advanced reporting & dashboard config, task oversight, some user/role visibility. High level of operational authority without full IT admin rights. |
| **Social Protection Officer** | Frontline case / field officer. Primary day-to-day interaction with beneficiaries. | Register and update individuals/groups, create and handle grievances, view payrolls/payments/cycles, basic beneficiary and scheme searches, participate in task workflows and deduplication reviews. Limited ability to create payment plans or full payrolls. |

### Additional Roles Commonly Used or Recommended (from fixtures and best practice)

- **Program Manager** / **Scheme Administrator**: Strategic oversight. Approves major changes, monitors KPIs via reports, configures high-level parameters. Often combined with or above Social Protection Manager.
- **Case Worker / Social Officer**: Specialized version of the Officer role focused on individual case management, follow-up visits, and grievance intake. May have stronger emphasis on viewing masked/sensitive data and task handling.
- **Data Analyst** / **M&E Officer**: Read-heavy access to reports, beneficiary searches, exports, and dashboards. Minimal or no create/update on operational data. Critical for monitoring, evaluation, donor reporting, and evidence-based program adjustments.
- **Finance Officer**: May be a variant or superset of Accountant with stronger approval rights on payments and reconciliation, plus audit-oriented views.

**Best Practice Recommendation (from SP MIS and healthcare IAM research):**
- Follow least-privilege and clear separation of duties (e.g. person who creates a payroll should not be sole approver).
- Use task groups and workflow to implement maker-checker for sensitive actions (payroll approval, large beneficiary changes, grievance resolution).
- Regularly review role assignments as staff rotate between programs or field vs HQ roles.
- Consider adding an **Auditor / Compliance** role (read-only + access to logs/events) and a narrow **Payment Reconciler** role for bank interface staff.

## Usage Notes

- coreMIS leans heavily on the modern Individual + Social Protection + Payroll stack rather than legacy insuree/policy/claim modules.
- OpenSearch reports and task management are key differentiators for large-scale or complex programs.
- Many deployments also integrate with external social registries via the API import and deduplication features.

## Related / Reference

- Solution definition: `solution/solutions/coreMIS.json`
- Custom roles: `solution/roles/coreMIS/`
- Consolidated build artifacts (example): `build/coreMIS/`
- See also general openIMIS and CoreMIS documentation on Confluence and openimis.org for operational guidance.

---
*Document generated for business stakeholders. Technical permission matrices to be maintained separately.*
