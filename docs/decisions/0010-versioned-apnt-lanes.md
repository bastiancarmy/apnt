> # ⚠ SUPERSEDED — obsolete architecture, do not use
>
> **This decision was first recorded as target direction on 2026-05-24 and has
> since been superseded.** The fixed, versioned lane-profile scaling model
> described below was replaced by a per-note, bundle-backed private data
> model — the same replacement documented in ADR 0012
> ([`docs/decisions/0012-master-root-bound-lane-scaling.md`](./0012-master-root-bound-lane-scaling.md)).
> This repository's current internal design record classifies
> "lane/master-root and old global continuation material" as **obsolete
> architecture that must not be reused**, on the grounds that the bundle
> model is per-note and disjoint with no mutable shared head, and states
> plainly that there is "no global state root, master-root authority,
> covenant continuation head, lane authority, or aggregator sequencing
> role" — the opposite structural assumption from the one this document
> proposes below, which scales by giving multiple users a shared lane state
> cell to advance through.
>
> **This document is published as history, not as current or planned
> architecture.** Nothing in it describes what BCH Cloak APNT builds today
> or intends to build next. It is republished verbatim (only this notice
> was added) as part of this repository's public decision-record corpus,
> alongside ADR 0012 (linked above): the two records describe the same
> superseded scaling direction from different ends — this one establishes
> the single-lane MVP and fixed
> lane-profile numbering, ADR 0012 proposes binding multiple lane roots into
> one master root. A reader who lands on either should be able to find the
> other and see the complete superseded proposal, not half of it.

# 0010 — Use Single-Lane MVP and Fixed Versioned Lane Profiles for Scaling

Status: accepted target direction.

**Superseded — see the notice above. Retained for history only.**

## Context

BCH Cloak APNT needs a private-note state model that can eventually scale without becoming a single global covenant bottleneck.

A multi-lane design can provide BCH-native parallelism because each lane is a separate covenant UTXO. However, if lanes require trusted operators to monitor throughput, add capacity, drain congested lanes, rebalance users, or publish canonical lane registries, the system becomes managed shard infrastructure.

That conflicts with APNT's trust model:

~~~text
Aggregators assemble.
BCH validates.
Wallets verify.
No operator is protocol truth.
~~~

## Decision

The MVP will use one APNT lane for correctness.

The scalable target is fixed, versioned lane profiles, not dynamically managed lanes.

A profile may define a fixed public lane count, for example:

~~~text
APNT-v0-dev: laneCount = 1
APNT-v1-fixed-4: laneCount = 4
APNT-v2-fixed-16: laneCount = 16
~~~

Every lane in a profile must be chain-discoverable and community-auditable from public BCH covenant state.

No party is trusted to add, remove, drain, rebalance, or checkpoint lanes.

## Consequences

Positive:

- avoids single global state-cell bottleneck in the long-term design;
- avoids managed shard infrastructure;
- preserves permissionless aggregator participation;
- keeps community auditability clear;
- keeps MVP implementation simple with one lane.

Tradeoffs:

- fixed lane profiles may under-provision or over-provision capacity;
- profile migration needs explicit design;
- multi-lane wallet routing is deferred;
- dynamic permissionless lane creation remains unsolved;
- single-lane MVP does not prove scalable throughput.

## Rules

- Lanes are protocol-defined BCH covenant UTXOs.
- Lanes are not per-user accounts.
- Lanes are not aggregator namespaces.
- Lanes are not operator-managed services.
- Wallets verify lane state from BCH chain truth.
- Aggregators may propose transitions for any lane but do not control lanes.
- BCH accepts or rejects transitions by covenant/proof validity.
- Dynamic lane factories are future research, not MVP scope.

## Current implementation implication

Upcoming slices should include a `laneId` field where useful, but use `laneId = 0` until the single-lane transition model is validated.

Multi-lane simulation should come after import claim, import covenant cell, and single-lane state transition correctness.

---

> **Reminder: everything above this line is superseded.** See the notice at
> the top of this document. The bundle-backed, per-note model that replaced
> it is described elsewhere in this repository's current documentation, not
> here.
