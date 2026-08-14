# Security policy

## Read this first

**This is research software running on a test network.** Every live exercise
referenced anywhere in this repository ran on **Chipnet**, Bitcoin Cash's test
network. There is **no mainnet deployment** of anything published here, and
**no production privacy is claimed** for anything that has run — live
exercises used a degenerate anonymity set (a single operator, a handful of
notes), which demonstrates a property of the construction, not achieved
anonymity for a real user. Keep that in mind when deciding how urgently to
treat a finding: nothing here currently custodies real value or protects a
real user's privacy in production.

That said, protocol-level and cryptographic findings are still worth
reporting privately, because this project's stated goal is for the construction
to become trustworthy enough to matter. A soundness or privacy break found now,
on Chipnet, before there is anything real to break, is exactly the kind of
report this process exists for.

## What to report privately

- A way to make a relation (`apnt-import-created-note-relation-v0`, `-v1`,
  `-v2`, `-v4`, `apnt-private-note-transition-relation-v0`, or
  `apnt-note-commitment-preimage-v0`) accept a statement that violates its
  stated semantic contract.
- A way to make an independent verifier accept an artifact it should reject,
  or reject one it should accept, where the disagreement reveals a real
  soundness gap rather than the verifier's own known and stated scope
  boundary (every verifier in this tree states in its own header comment what
  it does not establish — read that before reporting a gap it already
  discloses).
- A way to break the binding between a proof's public values and the on-chain
  covenant that is supposed to authorize exactly that statement and no other.
- A way to recover private note plaintext, an opening, a spend key, or
  payer/recipient linkage from anything this repository publishes as
  public-safe.
- A way to make a pinned trust anchor (`tools/*-sp1/trusted/*.json`, `v0.2`
  Verification and later) accept a program identity, verification key, or
  public-values layout other than the one they pin.

## What a report should contain

- Which relation, verifier, or covenant is affected, named precisely (its
  `relationIdentity` or file path, not a description).
- Steps to reproduce, or the artifact that demonstrates the issue, using only
  material that is safe to send (no private witnesses, seeds, or keys — see
  "What not to include" below).
- What you believe the impact is, stated with the same honesty bar this
  repository asks of every other claim: what the finding establishes, and what
  it does not.
- Whether you believe this affects the frozen relation identities themselves
  (a semantic break) or a specific tool's implementation of a check against
  them (a construction bug). Both matter; they get triaged differently.

### What not to include

Never send private note plaintext, wallet seeds, spend keys, ML-KEM secret
keys, nullifier secrets, note openings, or private proving witnesses in a
report, even as a proof of concept. If your finding requires demonstrating
possession of such material, describe the shape of the exposure instead and
wait for a secure channel before sending the material itself.

## How to report

Use **GitHub's private vulnerability reporting** on this repository:
*Security → Report a vulnerability*. That channel is private to the maintainer,
requires no prior contact, and keeps the report out of public issues.

**Do not open a public issue for a security finding.** If the private channel is
unavailable to you for any reason, open a public issue saying only that you have
a security report and would like a private channel — no detail — and a
maintainer will arrange one.

A dedicated address and PGP key are not yet published. That is a real gap for a
project inviting scrutiny, and it is listed as such rather than papered over.

## No bug bounty

There is currently no bug bounty program for this repository. Reports are
read and taken seriously, but there is no monetary reward process today.
