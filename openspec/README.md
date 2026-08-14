# Protocol changes: how a spec proposal works here

This directory is the contributor-facing entry point for proposing a change to
the APNT protocol as this repository describes it. It is deliberately a small
scaffold, not a mirror of any internal planning process — see "What is not
here" below.

## The specs this process governs

The 22 promoted capability specifications live in [`spec/`](../spec), one file per
capability, covering everything from the transition statement encoding to
noncustodial spend authority to live-validation requirements. They are the
normative description of what the protocol must do. Read the relevant one
before proposing a change to it — a proposal that contradicts a spec without
saying so is a bug report about the spec, not a change to it.

Specs are written as **requirements with scenarios**, not prose:

```text
### Requirement: <name>

The protocol MUST <do the thing>.

#### Scenario: <situation>

- **GIVEN** <the starting state, when one is needed to disambiguate> (optional)
- **WHEN** <a precondition holds>
- **THEN** <the required outcome>
- **AND** <any additional required outcome>
```

`GIVEN` is used where a scenario needs a starting state spelled out; plenty of
scenarios in [`spec/`](../spec) only need `WHEN`/`THEN`/`AND`. Look at a few real files
before writing a new one — [`spec/apnt-aggregation-transition-output.md`](../spec/apnt-aggregation-transition-output.md) uses
`GIVEN` throughout; [`spec/apnt-transition-statement.md`](../spec/apnt-transition-statement.md) mostly doesn't.

A `MUST` is not optional and is not aspirational — every promoted spec is
backed by an implementation. **Independent-verifier coverage is partial, and
that is stated exactly rather than implied as complete.**
`tools/apnt-private-note-transition-sp1/fixtures/README.md` names **seven**
independent verifiers for the transition relation alone; **two** ship at `v0.2` Verification and later — as does the verify-apnt skill
that documents them. If your
[`export-manifest.json`](../export-manifest.json) records `layer: "v0.1"`, neither is in this checkout. Of the five that don't, one
reason is confirmed directly from a shipped tool's own output: the projection
verifier's `notEstablishedHere` field says its sibling
noncustodial-spend-authority verifier "needs the witness and therefore cannot
run against published artifacts only" — that one is structurally
unpublishable, not merely unpromoted. Whether the same is true of the other
four (`verify-apnt-chunked-verifier-statement-binding`,
`verify-apnt-aggregate-settlement-chain`, `verify-apnt-created-note-seal`,
`verify-apnt-created-note-seal-exit-branch`) is **not established here** —
this document doesn't know, and doesn't guess. What's certain: most of a
relation's claimed verification surface is not independently checkable from
this tree today, and a new independent verifier that closes any of these gaps
— witness-free ones especially — is exactly the kind of contribution
[`CONTRIBUTING.md`](../CONTRIBUTING.md) asks for. If you're proposing a new requirement, write it in
the GIVEN/WHEN/THEN shape above from the start; it makes it obvious what a
reviewer needs to check and what an eventual verifier would need to establish,
even where none exists yet.

## What a spec delta looks like

A protocol-change proposal has three parts:

1. **What spec(s) it touches**, named by file (e.g. [`spec/apnt-transition-statement.md`](../spec/apnt-transition-statement.md)).
2. **The delta itself** — which requirements are added, which scenarios change,
   and, critically, whether it moves a **frozen** identity (see [`AGENTS.md`](../AGENTS.md),
   "What is frozen"). A delta that moves a frozen relation identity, the
   pinned CashVM verifier profile, a semantic-contract commitment, or a
   pinned trust anchor is a proposal for a **successor**, not an edit to the
   existing one — say so explicitly, and expect the existing identity to stay
   `stable` or become `superseded`, never silently replaced.
3. **Why** — the requirement the current spec doesn't meet, or the gap it
   leaves. "This would be nice" is a weaker proposal than "here is the
   scenario the current spec doesn't cover, and here is what breaks without
   it."

Open the proposal as an issue or a PR that edits (or adds) files under this
`openspec/` directory, describing the delta in the shape above, before writing
implementation code against it. For anything that would move a frozen
identity, expect discussion before any code — see [`CONTRIBUTING.md`](../CONTRIBUTING.md) for what's
in scope for this repository at all versus what belongs to the private
aggregator service.

## What is not here

This directory does not contain this project's internal change-planning
process. The private research repository this project is exported from
tracks its own active work — in-flight design, sequencing, and internal
notes — under its own `openspec/changes/**`, and that tree is deliberately not
published: it is internal planning, not a public contract, and publishing it
would expose unfinished reasoning and roadmap detail that has no business
being here. What you get instead is the promoted, stable output of that
process: the specs in [`spec/`](../spec), the frozen identities in [`AGENTS.md`](../AGENTS.md), and the
verifiers that check both.

If you want to propose something, propose it here, against the promoted
specs — not by looking for an internal planning document that isn't published.
