<!--
Read this before you write anything below. It will save you a wasted PR.
-->

## This tree does not accept merges — read this first

**This repository is generated.** Every file here arrived through a
fail-closed export from a private research repository (`bch-cloak`); there is
no human-authored history in `apnt` at all, and there never will be — see
`export-manifest.json` and the top-level `README.md`. That means **this PR
cannot be merged directly into this repository, no matter how correct it
is.** There is nothing wrong with your change; it is just not how change
reaches this tree.

**What actually happens to an accepted change:** if your PR is correct and in
scope, a maintainer applies the equivalent change **upstream, in the private
repository**, and it reaches `apnt` in that repository's next promoted
export — a new tagged release, with a new `export-manifest.json` recording
the commit it came from. Your PR itself is closed once that happens, usually
referencing the release it landed in. This is not a downgrade of your
contribution; it is the only path any change takes here, including the
maintainer's own.

If that's surprising, `CONTRIBUTING.md` explains why (a leak from the private
side is irreversible, so nothing merges into the public tree except through
the export) and what kinds of contributions are in scope before you invest
time in a diff. Reading it first is worth it — under-scoping a contribution
costs a conversation; over-scoping it costs a rejected PR after the work is
done.

---

## What this PR is

- [ ] Protocol / spec review (`spec/`, relation or covenant sources)
- [ ] Verifier improvement or a new independent verifier
- [ ] Spec clarification / delta proposal
- [ ] Wallet or tooling interop
- [ ] Verifier ported to another language
- [ ] Documentation or bug fix
- [ ] Other (describe below)

## What it changes and why

<!-- What's wrong, unclear, or missing today, and what this changes. -->

## How you checked it

<!--
What did you run, and what did it show? If you're proposing a change to an
independent verifier, include its output before and after. If you found a
disagreement between two things this repository claims, say so explicitly —
see AGENTS.md's honesty bar: what you're claiming, and what you're not.
-->

## Honesty check (both halves, always)

- [ ] I ran what I'm claiming, and said what I ran (not "should work").
- [ ] I distinguished a semantic bug ("this relation accepts a statement it
      shouldn't") from a construction bug ("this verifier's byte offsets are
      stale") — see `CONTRIBUTING.md`.
- [ ] If this touches anything under `AGENTS.md`'s "What is frozen" list, I
      opened an issue first rather than proposing the edit directly — a
      frozen identity can only gain a successor, never be revised in place.

## Not this PR

If your change touches aggregator operations, proving orchestration, or fee
and competition policy, it's almost certainly out of scope — see
`CONTRIBUTING.md`, "Out of scope", before continuing.
