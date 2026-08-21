# Full Solution

**Business Focus:** Comprehensive / All-Features Reference Configuration

The Full solution combines coreMIS (social protection heavy) and SHI/HF (health financing heavy) stacks. It serves as a maximal reference or "everything included" build for testing, demonstration, training, or environments that truly require the union of health insurance and social protection capabilities in one instance.

## Key Included Areas

- Everything from coreMIS (social protection, payroll, grievance, OpenSearch reports, individual registry)
- Everything from HF/SHI (claims, policies, products, medical prices, formal sector contracts)
- Grievance, tasks, user management, administration

## Navigation Menu (Business View)

All main menus are generally present:

- Client Registry (modern + legacy insuree/families)
- Enrolment (contracts, policies, contributions)
- Benefits and Claims (full claims + batch)
- Payments (payrolls + invoices/bills + classic payments)
- Tasks
- Grievance
- Reports (OpenSearch + classic)
- Scheme Administration (Benefit Plans + Products + medical + contribution plans)
- User Management
- Administration (Locations, Health Facilities, etc.)
- Profile + Tools

This results in a very rich (and potentially complex) navigation for users. In practice, most production solutions pick a focused subset.

## Roles (Business Perspective)

All standard SHI roles + coreMIS roles + any additional from fixtures.

Recommended approach in a "Full" deployment:
- Do **not** give most users broad access across both domains.
- Create focused composite or domain-specific roles (e.g. "Health Claims Officer", "SP Payments Officer", "Integrated Program Manager").
- Use location or other scoping (if supported) to limit visibility.

## When to Use

- Proof-of-concept or pilot that wants to explore both worlds.
- Training / demo environments.
- Rare cases of truly integrated multi-program national platforms.
- As a base from which to derive more targeted solutions.

**Solution file**: `solution/solutions/full.json`

---
*Business view document. Permission mapping separate.*
