# Solution Documentation

This folder contains documentation for the Solution Builder and the pre-defined solutions.

## Solution-Specific Documentation (Business View)

Each solution has a dedicated guide describing:
- Business purpose and typical use cases
- Navigation menu structure (translated to business language)
- Key user roles described from an operational / organizational perspective

**Current Solutions:**

- [coreMIS](coreMIS.md) — Social Protection / Cash Transfer focus (widely used base)
- [SHI (Social Health Insurance / HF)](SHI.md) — Classic health financing, claims, enrollment, and formal sector
- [IBR](IBR.md) — Insurance-Based Registry hybrid
- [SR](SR.md) — Social Registry / beneficiary master list focus
- [claim-ai](claim-ai.md) — Health claims with AI quality support
- [full](full.md) — Maximal reference configuration (coreMIS + SHI combined)

**Proposed / Emerging Concepts:**

- [Minimal / Pilot](minimal.md) — Lightweight starting configuration
- [Proposed Roles & Additional Solution Ideas](proposed-roles-and-solutions.md) — Best-practice role suggestions and new solution concepts derived from research and usage patterns

> **Important**: These documents focus on the **business meaning** of menus and roles. The concrete technical mapping (role → list of permissions) is handled separately and will be produced in follow-up work.

## General Documentation

- [solution-builder-explained.md](solution-builder-explained.md) — High-level presentation of the Solution Builder approach (also used to generate the deck)
- [solution-builder-deck.pdf](solution-builder-deck.pdf) / [solution-builder-deck.html](solution-builder-deck.html) — Slide versions

## How to (Re)build the Presentation Deck

```bash
npx @marp-team/marp-cli docs/solution-builder-explained.md \
  -o docs/solution-builder-deck.pdf \
  --allow-local-files \
  --html
```

## Related Project Files

- `solution/solutions/*.json` — Source definitions for each solution
- `solution/roles/` — Business role definitions (currently populated for coreMIS)
- `solution/modules/` — Individual module configurations (menus, packages, rights)
- `build/` — Example generated outputs for coreMIS, SHI, etc.