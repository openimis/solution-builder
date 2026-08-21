# SR (Social Registry) Solution

**Business Focus:** Lightweight Unified Social / Beneficiary Registry

SR is a focused, lighter-weight configuration optimized for building and maintaining a high-quality master registry of individuals and groups. It emphasizes registration, deduplication, bulk imports, grievance handling, task-based workflows, and advanced analytics — designed to serve as a shared Social Registry that multiple downstream programs (cash transfers, health, education, etc.) can consume.

It uses SR-specific branding and a minimal set of modules compared to coreMIS or IBR.

> Note: This document describes menus and roles from a **business / operational perspective**. The technical mapping of roles to specific permissions (role → perms) is maintained separately and will be defined in follow-up work.

## High-Level Capabilities Included

- Modern Individual and Group (household) registry
- API and bulk imports for beneficiary data
- Deduplication tools and workflow
- Grievance / complaints and redress management
- OpenSearch-powered reporting and dashboards across individuals, groups, beneficiaries, grievances, and data updates
- Task / workflow management (including task groups)
- Core user, role, location, and profile features
- Uses the same coreMIS role fixtures + extra rights for Case Worker / Social Officer
- Backend contribution_plan package (limited UI impact)

**Not included** (by design for a lightweight registry focus):
- Full social protection benefit plans / payroll / payment cycles / payment points (no social-protection or good-distribution bundles)
- Classic health insurance / claims / enrolment (insuree, policy, claim, contracts, products, medical, health facilities)
- Heavy invoicing or formal sector modules

## Navigation Menu (Business View)

SR provides a streamlined menu set centered on registry operations, case handling, tasks, and analytics.

### 1. Client Registry (Primary Focus)
Core of the solution — master data for beneficiaries.

- **API Imports**: Bulk load or sync individuals and groups via API/ETL (e.g. from national registries or other systems).
- **Individuals**: Register, search, view, create, update, and manage single beneficiary records.
- **Groups**: Manage households, communities, or other groupings of beneficiaries (with divider).

### 2. Tasks
Workflow and case management support.

- **All Tasks**: Organization-wide task view (for supervisors and admins).
- **Tasks**: Personal or assigned task list.
- **Task Groups** (via User Management): Define groups of users who can execute or be assigned tasks.

### 3. Grievance
Redress and complaint handling integrated with the registry.

- **Add Grievance**: Register new complaints or issues (data errors, eligibility disputes, etc.).
- **Grievances**: Full search, comment, update, assignment, and resolution workflow.

### 4. Reports (Analytics & Dashboards)
Powerful OpenSearch reporting tailored for registry use.

- **Individual Reports**: Queries and views on person-level data.
- **Group Reports**: Household / group level analysis.
- **Beneficiary Reports**: Program-agnostic or cross-program beneficiary insights.
- **Data Updates Reports**: Track imports, changes, and data quality over time.
- **Grievance Reports**: Trends, volumes, and resolution metrics.
- **Dashboard Configuration**: Create and save custom dashboards and searches.

### 5. User Management
Access and workflow configuration.

- **Roles**: Manage roles (including the Case Worker focused role).
- **Users**: Create and administer user accounts.
- **Task Groups**: Configure assignment groups (also appears here).

### 6. Administration
Reference data.

- **Locations**: Maintain the geographic/administrative hierarchy used for targeting, filtering, and reporting.

### 7. Profile
Standard self-service.

- **My Profile**
- **Change Password**

**Notes on menu structure**:
- Enrolment, Benefits and Claims, Payments, and Scheme Administration main menus may appear (from main-menus.json) but have no (or very few) submenus in base SR.
- The menu is intentionally lean for registry-focused users.

## Roles (Business Perspective)

SR is initialized with the same role fixtures as IBR/coreMIS variants, plus additional RoleRights focused on the Case Worker role.

### Loaded Roles

| Role                          | Business Description                                                                 | Typical Responsibilities |
|-------------------------------|--------------------------------------------------------------------------------------|--------------------------|
| **Program Manager**          | Oversight role for the registry implementation or feeding programs.                 | Review reports and dashboards, monitor data quality and grievance volumes, coordinate with downstream programs, high-level configuration. |
| **Case Worker / Social Officer** | Frontline registration and case-handling staff (receives expanded rights in SR initData). | Primary users of Client Registry — add/edit individuals and groups, perform API imports, handle grievances (create, comment, resolve), participate in deduplication and task workflows. Core operational role for maintaining the master list. |
| **Data Analyst**             | Evidence, monitoring, and reporting specialist.                                     | Heavy reliance on all Reports and search functions. Analyze registry coverage, data quality, grievance patterns, and prepare exports for other programs. Very limited create/update rights. |
| **Finance Officer**          | Finance-oriented user (more limited scope in this lightweight registry solution).   | View/search related financial or payment-adjacent data if exposed; primarily report consumption. Less central than in payroll-heavy solutions. |

Core system roles (e.g. LOCAL Administrator) are typically also available via the core bundle.

### Recommended Extensions (Best Practice)
- **Registry Steward / Data Quality Officer**: Dedicated to deduplication reviews, import validation, data cleansing, and master data governance.
- **Interoperability Specialist**: Manages API import rules, external system connections, and data mapping.
- **Partner / Downstream Viewer**: Extremely restricted read-only/search access for programs that consume the registry (no editing).
- **Local Administrator**: For user/role setup, locations, and basic system config within a region or implementation.

## Usage Notes

- SR is intentionally minimal — ideal as a shared Social Registry or Unified Beneficiary Registry that other solutions (coreMIS, SHI, custom) can reference or extend.
- Strong emphasis on deduplication, API imports, and high-quality searchable data.
- Grievance and reporting are included to support redress and M&E without full operational payroll or claims modules.
- Uses the same role fixture base as IBR but in a more constrained module set.
- Branding and theme are SR-specific.

## Related / Reference

- Solution definition: `solution/solutions/SR.json`
- Role fixtures: `solution/fixtures/core/roles-coreMIS.json` and `rights-case-worker-social-officer.json`
- Key modules: `individual.json`, `api-import.json`, `deduplication.json`, `grievance.json`, `opensearch-reports.json`, `workflow.json` + core-bundle
- Branding: `sources/logo/SR.svg` and `sources/theme/SR.json`

---
*Business view document. Technical permission matrices to be maintained separately.*

