# Minimal / Pilot Solution (Proposed)

**Status**: Proposed — not yet implemented as a first-class solution definition.

**Business Focus**: Lightweight starting point for pilots, small programs, or initial rollout where full feature sets would overwhelm users or infrastructure.

## Rationale (from best practice research)

Many successful social protection and health scheme digitization projects begin with a minimal viable registry + basic workflow + grievance, then expand. A "Minimal" solution reduces:

- Training burden
- Configuration complexity
- Attack surface / data exposure
- Time to first value

It can later be extended by adding bundles (social-protection, healthfinancing, etc.).

## Suggested Module Composition

- core-bundle (users, locations, profiles, basic admin)
- individual (modern beneficiary registry)
- grievance (basic redress)
- task-management (simple workflows)
- main-menus + profile
- (Optional) api-import for initial data load
- (Optional) very light reporting

**Exclude** (at least initially): full payroll, claims processing, medical pricelists, complex contribution plans, OpenSearch unless specifically needed.

## Navigation Menu (Business View) — Lean Version

### Client Registry
- Individuals
- Groups
- (API Imports if bulk loading is required)

### Tasks
- All Tasks
- Tasks

### Grievance
- Add Grievance
- Grievances

### Administration (very limited)
- Locations (basic)
- Users (if Local Admin)

### Profile
- My Profile
- Change Password

Very few main menus. Submenus are intentionally minimal.

## Roles (Business Perspective) — Keep It Simple

| Role                    | Business Description                              | Scope |
|-------------------------|---------------------------------------------------|-------|
| **Local Administrator** | Pilot lead / technical focal point. Can set up users, locations, and has broad rights within the small scope. | Full within pilot |
| **Registration / Data Entry Officer** | Primary user for adding and updating beneficiary records. Can create grievances. | Registry + Grievance create |
| **Viewer / Field Monitor** | Read/search beneficiaries and grievances. Useful for supervisors or partner staff. | Read mostly |
| **Grievance Handler** (optional split) | Focused on intake and resolution of complaints. | Grievance + related beneficiary read |

## Proposed Evolution Path

1. Start with Minimal.
2. Add grievance volume → strengthen workflow / tasks.
3. Add payments or cash transfers → bring in good-distribution or payroll modules → evolve toward coreMIS.
4. Add health benefits / claims → layer healthfinancing modules → move toward SHI or Hybrid.
5. Add scale/analytics → introduce OpenSearch reports.

## Implementation Notes (when built)

- Create `solution/solutions/minimal.json`
- Minimal or empty custom roles (rely on core + small additions)
- Very small fixture set
- Clear documentation that this is intentionally limited and how to "grow" the solution

## Benefits

- Fastest path from "we need something now" to a working system.
- Lower risk for first deployments.
- Excellent for capacity building before tackling complex modules like claims or payroll.

**Related existing**: Closest current approximations are subsets of SR or coreMIS without the heavy bundles.

---
*Proposed concept. Once implemented, promote to a regular solution MD.*
