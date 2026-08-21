# Proposed Roles and Solution Concepts (Best Practices)

This document captures recommendations derived from:

- Existing coreMIS and SHI configurations in this repository
- Standard openIMIS roles
- Industry best practices for Role-Based Access Control (RBAC) in healthcare and social protection information systems (least privilege, separation of duties, automated provisioning, regular access reviews)
- Common operational patterns in large-scale social protection programs and national health insurance schemes (from sources such as TRANSFORM MIS materials, GIZ integrated SPIS guidance, and openIMIS deployments)

## Recommended Additional / Refined Roles (Business View)

These can be added to any solution (coreMIS, SHI, or custom). The actual permission lists will be created later.

### Cross-Cutting / Recommended for Most Solutions

| Proposed Role                  | Business Purpose                                                                 | Key Characteristics (high level) |
|--------------------------------|----------------------------------------------------------------------------------|----------------------------------|
| **Data Analyst / M&E Officer** | Monitoring, evaluation, reporting, evidence for decision makers and donors.     | Primarily read + advanced search + export. Access to all reports/dashboards. Very limited or no create/update on transactional data. |
| **Auditor / Compliance Officer** | Independent review, fraud detection, regulatory compliance.                     | Read-mostly across modules + access to audit/event data where available. Can view but not alter operational records. |
| **Grievance / Redress Specialist** | Dedicated handling of complaints and appeals.                                 | Strong on Grievance module (create, comment, resolve, report). Read access to related beneficiary/claim/payroll records. Limited other edits. |
| **Registry Steward / Data Quality Officer** | Master data quality, deduplication, import validation.                        | Focused on Client Registry + deduplication tasks. High search + update on individual/group records; can run/approve dedup reviews. |
| **Payment Reconciler**         | Specialized bank/mobile money feedback processing.                               | Narrow rights around payroll reconciliation, payment search, CSV uploads. No payroll creation or broad finance rights. |

### Solution-Specific Additions

**For coreMIS / Social Protection heavy:**

- **Field Supervisor**: Oversees a team of Social Protection Officers. Can view team tasks, approve certain beneficiary changes or grievances, run team reports.
- **Cash Transfer Program Coordinator**: Variant of Social Protection Manager with stronger focus on one program and its specific benefit plans + payrolls.

**For SHI / Health Financing heavy:**

- **Provider Relations Officer**: Manages health facilities (add/edit, performance views), handles facility grievances and feedback. Read on claims and payments for assigned facilities.
- **Member Services / Call Center Agent**: Very narrow lookup of policies, eligibility, claims status + ability to create grievances on behalf of members.
- **Fraud Investigator** (SHI or Claim AI): Uses claims data + AI flags + reports to investigate suspicious patterns. Read + limited notes on claims.

**For Registries (SR, IBR):**

- **Interoperability Manager**: Configures and monitors API imports, ETL rules, external data mappings. Strong on api_etl rights + reporting.
- **Partner Agency Viewer**: Extremely limited read/search for external organizations that consume registry data.

## Proposed New Solution Concepts

These are not yet implemented as full `solution/*.json` definitions but represent logical, commonly requested configurations based on real-world usage patterns.

### 1. Minimal / Pilot Solution
**Target**: Small pilots, proof-of-concepts, or very focused programs.

**Core modules**:
- Core bundle (users, locations, profiles, tasks)
- Individual (light registry)
- Grievance (basic)
- Profiles + main menus

**Menu**: Very small — Client Registry (Individuals/Groups), Grievance, Tasks, Profile, minimal Admin.

**Roles**: Local Admin + Data Entry Officer + Viewer.

**Benefits**: Fast to deploy, low training burden, easy to evolve into fuller solution.

### 2. Social Registry Lite (or "Unified Registry Feeder")
**Target**: National social registries or program-agnostic beneficiary databases.

**Based on**: SR + selected elements from coreMIS (dedup, workflow, OpenSearch reports) + strong API layer.

**Menu emphasis**: Client Registry + Tasks + Reports + Grievance. No or minimal payroll/claims.

**Roles**: Registry Steward, Data Analyst, Interoperability Manager, Partner Viewer, Local Admin.

### 3. Integrated SP + HI Hybrid (recommended evolution from "full")
**Target**: Countries running both cash transfers and health insurance (or wanting a single platform for multiple programs).

**Approach**:
- Start from full or coreMIS + healthfinancing modules.
- **Strongly recommended**: Define narrow, program-specific roles rather than giving everyone "everything".
- Use task management heavily for cross-program workflows.
- Invest early in good dashboard/report configuration so managers see only relevant slices.

**Key success factor**: Role design and training that prevents confusion between "insurance member" and "cash beneficiary" concepts.

### 4. Claims Quality & AI Enhanced (evolution of claim-ai)
**Target**: Mature health insurance schemes wanting to move from manual review to risk-based / AI-supported review.

**Enhancements over base claim-ai**:
- Add stronger analytics / fraud detection reports.
- Add "AI Review Supervisor" role.
- Tight integration with grievance for overturned AI decisions.

### 5. Formal Sector / Contributory Scheme Focused
**Target**: Employment-based or contributory health/pension schemes.

**Modules**: formal-sector-bundle + healthfinancing core + contribution + contract + invoice + limited claims if health benefits included.

**Roles**: Enrolment Officer (employer liaison), Accountant (contribution collection), Scheme Administrator, Employer Portal User (if portal enabled), LOCAL Admin.

## General Best Practice Guidance for Roles (Business View)

1. **Start narrow, expand as needed**. Begin with 4–6 roles per program and add only when a clear operational gap appears.
2. **Map to real jobs, not technical modules**. "Social Protection Officer" is better than "Individual + Grievance + Payroll Reader".
3. **Implement maker-checker via Tasks** for high-risk actions (large payrolls, mass beneficiary changes, grievance closures, payments).
4. **Separate configuration from operations**. Scheme Administrators and Local Admins should be small, trusted groups.
5. **Plan for rotation and audit**. Staff change; roles should be easy to re-assign. Schedule periodic access reviews.
6. **Consider data sensitivity**. Some fields (e.g. disability status, HIV-related, income details) may require extra masking or viewing rights.
7. **Document the "why"**. Every role should have a one-paragraph business purpose statement (as started in the per-solution MDs).

## Next Steps (for the team)

- After business roles are agreed, create the detailed `role-*.json` definitions with permission lists (the role → perms map).
- Consider adding a `roles/` folder structure per solution (already partially done for coreMIS).
- Validate proposed roles against real country deployments and adjust.
- Possibly create the Minimal and Social Registry Lite as first-class `solution/*.json` entries + corresponding MDs.

## Sources & Further Reading (high level)

- openIMIS solution building documentation and module rights
- TRANSFORM and other socialprotection.org MIS guidance
- General healthcare IAM literature (RBAC, least privilege, access reviews)
- Existing fixtures and role definitions in this repository (`solution/roles/`, `solution/fixtures/core/`)

---
*This is living guidance. Update as new usage patterns and country feedback emerge.*
