# IBR (Insurance-Based Registry) Solution

**Business Focus:** Registry-centric Social Protection with Payroll and Grievance

IBR (Insurance-Based Registry) is a configuration emphasizing a strong modern beneficiary registry (individuals + groups), combined with social protection program management, payroll disbursements, grievance handling, and rich OpenSearch-powered analytics. It uses IBR-specific branding/theme.

It is well suited for programs needing a high-quality client registry that can support multiple benefits (cash, in-kind, or insurance-linked), with operational tools for targeting, payments, deduplication, tasks, and redress. It is similar to coreMIS but initialized with different role fixtures and specific branding.

> Note: This document describes menus and roles from a **business / operational perspective**. The technical mapping of roles to specific permissions (role → perms) is maintained separately and will be defined in follow-up work.

## High-Level Capabilities Included

- Modern Individual and Group registry with API/CSV imports and deduplication support
- Social Protection benefit plans and beneficiary management
- Payroll generation, approval, and reconciliation (including payment points and cycles)
- Invoicing/billing support
- Full Grievance / complaints lifecycle
- Advanced OpenSearch reports and dashboards
- Task/workflow management (maker-checker)
- Core user, role, location, and profile administration
- Uses coreMIS-style role fixtures + additional rights for Case Worker / Social Officer

**Note:** Classic health insurance modules (insuree families, policies, claims, medical prices, contracts, health facilities) are **not** included in base IBR. For those, see SHI or hybrid variants.

## Navigation Menu (Business View)

IBR activates a focused set of menus centered on registry, payments/payroll, tasks, grievances, and reporting.

### 1. Client Registry
Primary beneficiary data management using the modern individual model.

- **API Imports**: Bulk import or ETL of individuals and groups from external systems or registries.
- **Individuals**: Register, search, view, edit individual beneficiary records.
- **Groups**: Manage households, communities or other beneficiary groupings (with divider after).

### 2. Payments (Payroll & Disbursement focused)
Operational area for benefit payments.

- **Payment Plans**: Configure payment plan structures.
- **Payment Cycles**: Define recurring payment schedules.
- **Payrolls**: Create and manage payroll runs.
- **Payrolls Pending / Approved / Reconciled**: Multi-stage workflow for payroll approval and bank/mobile money reconciliation (CSV feedback).
- **Payment Points**: Manage locations or agents for disbursements.
- **Bills**: Supplier or related billing documents.
- **Payments (Invoice)**: Related payment transactions.

### 3. Tasks
Workflow and assignment support.

- **All Tasks**: Broad view of system tasks for supervisors.
- **Tasks**: Personal task inbox.
- **Task Groups** (under User Management): Configure teams for task routing.

### 4. Grievance
Integrated complaints and redress.

- **Add Grievance**: Create new tickets (eligibility, payment issues, data problems).
- **Grievances**: Search, comment, update, resolve grievances with full audit.

### 5. Reports (Dashboards & Analytics)
Powerful OpenSearch-based reporting.

- **Individual Reports**
- **Group Reports**
- **Beneficiary Reports**
- **Data Updates Reports**
- **Grievance Reports**
- **Dashboard Configuration**: Customize and save views.

### 6. Scheme Administration
Program configuration.

- **Benefit Plans**: Create, configure, search, and manage social protection benefit plans, eligibility, and related schemas.

### 7. User Management
User and access administration.

- **Roles**: Manage roles.
- **Users**: Create and maintain user accounts.
- **Task Groups**: Assignment groups for workflows.

### 8. Administration
Master data.

- **Locations**: Maintain administrative hierarchy (regions, districts, etc.) for targeting and reporting.

### 9. Profile
- **My Profile**
- **Change Password**

**Menus that are defined in main-menus but have no (or minimal) submenus in IBR**: Enrolment, Benefits and Claims (classic). They may appear lightly or be customized via moduleConfiguration.

## Roles (Business Perspective)

IBR is initialized with roles from the coreMIS fixture set plus extra RoleRights targeted at the Case Worker role.

### Loaded Roles

| Role                          | Business Description                                                                 | Typical Responsibilities |
|-------------------------------|--------------------------------------------------------------------------------------|--------------------------|
| **Program Manager**          | High-level oversight of the program or registry implementation.                     | Monitor operations via reports/dashboards, oversee benefit plans, review escalated grievances and payrolls, coordinate between teams. |
| **Case Worker / Social Officer** | Frontline worker focused on beneficiary interaction and case handling (receives additional specific rights in IBR init). | Register/update individuals and groups, handle grievances (create, comment, resolve), manage beneficiary records, participate in tasks/deduplication, view limited payroll and payment info. Strong focus on day-to-day registry and redress work. |
| **Data Analyst**             | Monitoring, evaluation, and evidence role.                                          | Heavy use of all Reports and search capabilities. Analyze beneficiary data, grievance trends, payment performance. Minimal transactional editing. |
| **Finance Officer**          | Finance and disbursement specialist.                                                | Work with payrolls, payment cycles, payment plans, reconciliation, bills/payments. Focused financial oversight without full scheme design or broad registry admin rights. |

In addition, because the core bundle and user-management are included, standard system roles (e.g. LOCAL Administrator) may also be available depending on the full fixture loading.

### Best Practice Recommendations
- The "Case Worker / Social Officer" role is given expanded rights in this solution — ideal for field staff but ensure it does not overlap too much with Finance Officer or Program Manager duties.
- Consider adding or refining:
  - **Registry Steward / Deduplication Specialist**: Focused on import validation and task-deduplication reviews.
  - **Local Admin**: For configuration of locations, users, and basic setup (if not covered by Program Manager).
  - **Payment Reconciler**: Narrow rights for bank feedback processing.

## Usage Notes

- IBR is very close to coreMIS in capabilities (SP + payroll + grievance + reports + registry) but uses fixture-based roles and distinct branding.
- Strong on modern registry (individual + api-import + dedup) and analytics.
- No legacy claims or health facility modules by default.
- Good as a foundation for unified social registries or multi-program beneficiary platforms.
- initData explicitly loads roles-coreMIS + case-worker rights.

## Related / Reference

- Solution definition: `solution/solutions/IBR.json`
- Role fixtures: `solution/fixtures/core/roles-coreMIS.json` and `rights-case-worker-social-officer.json`
- Bundles: `social-protection-bundle.json`, `good-distribution-bundle.json`, `core-bundle.json`
- Branding: `sources/logo/IBR.svg` and `sources/theme/IBR.json`

---
*Business view document. Technical permission matrices to be maintained separately.*

