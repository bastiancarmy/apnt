> # ⚠ SUPERSEDED — obsolete architecture, do not use
>
> **This decision was accepted as target architecture on 2026-05-29 and has
> since been superseded.** The lane/master-root scaling model described below
> was replaced by a per-note, bundle-backed private data model. This
> repository's current internal design record classifies "lane/master-root
> and old global continuation material" as **obsolete architecture that must
> not be reused**, on the grounds that the bundle model is per-note and
> disjoint with no mutable shared head — the opposite structural assumption
> from the one this document proposes below.
>
> **This document is published as history, not as current or planned
> architecture.** Nothing in it describes what BCH Cloak APNT builds today or
> intends to build next. It is republished verbatim (only this notice was
> added) because [`docs/why-not-a-pool.md`](../why-not-a-pool.md) in this repository cites it, and a
> reader following that citation should land on the real record — including
> its own status — rather than on a document that silently implies it is
> still live.

# Master-root-bound Fixed Lane Scaling

## Status

Accepted as target architecture.

**Superseded — see the notice above. Retained for history only.**

## Date

2026-05-29

## Context

APNT starts with a single BCH covenant-governed lane state cell for correctness.

The current scaling direction uses fixed, versioned lane profiles rather than managed shard infrastructure. Fixed lanes allow BCH-native UTXO concurrency because different lane state cells can advance in parallel.

However, lanes must not become separate privacy protocols, user namespaces, aggregator namespaces, or managed shards.

## Decision

Future multi-lane APNT profiles should bind lane roots into one logical APNT master root.

A lane remains a Plane A state partition with its own root tuple, for example:

~~~text
laneId
epoch
noteRoot
nullifierRoot
packetRoot
accountingRoot
protocolVersion
verifierProfile
~~~

A future master root commits to the active lane root tuples for a fixed public profile.

This makes lanes a scalability structure under one logical APNT state.

## Current truth

This is not implemented.

The MVP remains single-lane:

~~~text
laneCount = 1
laneId = 0
~~~

No implementation should depend on master-root binding until the verifier profile, proof format, lane root tuple, wallet verification rules, and cross-lane transition rules are specified and tested.

## Target architecture

A future fixed-lane profile may use:

~~~text
K lane state cells
K parallel batch transitions
periodic or recursive master-root binding
wallet verification against lane roots and master roots
~~~

Cross-lane movement should be modeled as a valid APNT state transition, not as a trusted routing action.

Conceptually:

~~~text
nullify in lane A
commit in lane B
prove both effects inside the accepted batch/profile rules
bind resulting lane roots into the master root
~~~

## Non-goals

This decision does not introduce:

- managed shard operators;
- checkpoint authorities;
- aggregator-owned namespaces;
- sequencer authority;
- per-user lanes;
- dynamic lane creation;
- production scale claims.

## Privacy caveat

Master-root binding preserves one logical APNT state.

It does not automatically preserve one practical anonymity set.

Practical anonymity still depends on batch density, wallet lane selection, timing, packet shape, cross-lane behavior, and aggregator behavior.

## Blockers

Before implementation, BCH Cloak must specify and test:

- lane root tuple format;
- master-root commitment format;
- verifier profile;
- recursive or periodic proof strategy;
- duplicate-nullifier prevention across lanes;
- cross-lane transition rules;
- wallet scan and verification rules;
- packet/accounting root binding;
- migration between lane profiles;
- measured proof size, packet size, blockspace, and wallet scanning costs.

---

> **Reminder: everything above this line is superseded.** See the notice at
> the top of this document. The bundle-backed, per-note model that replaced
> it is described elsewhere in this repository's current documentation, not
> here.
