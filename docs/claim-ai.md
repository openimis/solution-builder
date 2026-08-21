# Claim AI Solution

**Business Focus:** Health Claims with AI-Assisted Quality and Fraud Detection

This solution layers AI claim analysis capabilities on top of a health financing / formal sector base. It is intended for schemes that want to improve claims review efficiency, flag anomalies, and support medical officers with intelligent suggestions while retaining human oversight.

## Key Included Areas

- Core + formal sector (contracts, policyholders, contribution plans)
- Health financing modules (insuree, policy, claim, product, medical, HF, payment, invoice)
- Grievance
- Individual registry elements
- Claim AI module (specialized analysis)
- FHIR API support for interoperability
- Workflow

## Navigation Menu Highlights (Business View)

- **Client Registry / Enrolment**: Families, Insurees, Policies, Contracts, Contributions
- **Benefits and Claims**: Health Facility Claims (with AI flagging), Reviews (augmented), Feedback, Claim Batch
- **Payments**: Payments to providers, invoices, bills, payers
- **Scheme Administration**: Products, medical prices, contribution plans, policyholders
- **Grievance**: Linked to claims or coverage issues
- **Reports**: Standard + AI-related or enhanced analytics where available
- **Tasks**: For routing AI-flagged claims or reviews
- **Administration & User Management**
- **Profile**

## Roles (Business Perspective)

The solution includes dedicated role definitions (in `solution/roles/claimai/`) following good practices (least privilege, separation of duties for AI-assisted decisions, domain focus):

- **Local Administrator**: Broad config, users, locations, full registry + claims oversight.
- **Enrolment Officer**: Membership, policies, contracts, basic individual search.
- **Accountant**: Payments, invoices, bills, contributions.
- **Claim AI Reviewer** (Medical Officer variant): Heavy on claim review, feedback, process; access to individual/grievance data and reports for AI-flagged cases.
- **Scheme Administrator**: Products, medical prices, contribution plans, policyholders, health facilities.
- **Data Analyst / Fraud Analyst**: Search-heavy across claims, reports (including OpenSearch), individual data, grievance trends for AI quality/fraud monitoring.

**Recommended additions for full AI best practice** (can be added to role defs):
- **AI Review Supervisor**: Threshold config, model performance, escalations.
- **Fraud / Compliance Analyst**: Deep AI flag + aggregate analysis.
- **Provider Auditor**: Facility-level patterns.

The corresponding mapped fixtures (`roles-claimai.json`, `rights-claimai.json`) were generated using `permissions_map.json`.

## Best Practices for AI in Claims

- Always keep a human-in-the-loop for final decisions (especially payment impacting).
- Log AI recommendations vs final human decision for model improvement and audit.
- Provide clear explainability to Medical Officers (why a claim was flagged).
- Periodically retrain or tune models against local fraud/cost patterns.

**Solution file**: `solution/solutions/claim-ai.json` (reuses HF base in some configurations)

---
*Business view document. Permission mapping separate.*
