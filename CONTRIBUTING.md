# Contributing to apnt

Thanks for looking at this. Read this file before opening a PR — it will save
you writing something that's out of scope, and it tells you how to check your
own work before you send it.

## Scope

The short version, stated once so it doesn't need repeating: **the protocol is
public, the service is a business.** That's the honest framing, and it costs
nothing to say plainly rather than let a contributor discover it from a
rejected PR.

### In scope

- **Protocol review.** Reading the relation sources, the covenant bytes, the
  transition statement encoding, and the capability specs under [`spec/`](./spec), and
  reporting what's wrong, unclear, or under-specified.
- **Verifier improvements.** The independent verifiers under
  `packages/reference-aggregator/tools/` and
  `tools/*-sp1/scripts/quotient-residue-regeneration/` (`v0.2` Verification
  and later — this invitation stands regardless of which layer you're
  reading from, but the files themselves are only in a checkout that includes
  `v0.2`) deliberately do not import the code they check. Making one of them
  check more, check something it currently assumes, or fail more precisely is
  exactly the kind of contribution this repository wants.
- **Additional independent verifiers.** A new verifier that establishes
  something the existing ones don't — and states plainly what it does and does
  not establish, matching every existing verifier's header comment — is
  welcome. A verifier that imports the code under test is not an independent
  verifier; say so if that's what you're proposing, and it may still be useful
  as a different kind of test.
- **Spec clarifications.** The 22 capability specs under [`spec/`](./spec) are
  GIVEN/WHEN/THEN requirements, not prose essays. If one is ambiguous, wrong,
  or contradicts the shipped artifacts it's supposed to describe, propose a
  spec delta — see [`openspec/README.md`](./openspec/README.md).
- **Wallet and tooling interop.** Anything that helps a wallet, indexer, or
  other independent piece of software speak this protocol correctly.
- **Porting verifiers to other languages.** An independent verifier written in
  a second language is worth more than one written in a third, because it
  removes a shared-toolchain blind spot. Rust and Python ports of the existing
  Node.js verifiers are explicitly wanted.
- **A WalletConnect v2 adapter.** This is a named, wanted gap: the wallet
  transport story here is APNT-specific, and a WalletConnect v2 adapter that
  speaks it would materially lower the bar for wallet integration. If you're
  looking for a substantial, concrete first contribution, this is it. **State
  the limit alongside the invitation:** the transport it would need to speak,
  `packages/wizardconnect-client`, has zero files in this export today. This
  is an invitation to build a bridge to something not yet published, not a
  pointer to code you can read here — open an issue first to talk about what's
  needed before writing an adapter against an interface you'd have to guess at.

### Out of scope

- **Aggregator operations.** Running a hosted aggregator — batching,
  scheduling, fee collection, operator liveness — is the product this project
  monetizes, not the protocol. PRs that add aggregator-service code have
  nowhere to land here; that code isn't published, on purpose.
- **Proving orchestration.** Provers, runners, cost probes, and fixture
  generators are deliberately withheld (see the top-level [`README.md`](./README.md),
  "What builds and what does not"). The proofs are here; the machine that made
  them is not, and PRs that try to reconstruct it are out of scope.
- **Fee and competition policy.** Aggregator fee markets, competitive
  strategy, and revenue mechanics are private, operator-side decisions, not
  protocol requirements. If a fee-related field appears in a public statement
  or covenant, its *wire presence* is fair game for protocol review; its
  *policy value* is not something this repository takes proposals on.

If you're unsure which side of that line something falls on, open an issue
describing what you want to do before writing code. Under-scoping a
contribution costs you a conversation; over-scoping it costs you a rejected
PR after the work is done.

## Running the verifiers

*(`v0.2` Verification and later. If [`package.json`](./package.json) has no `verify` script,
this checkout is `v0.1` Foundation and none of the below is staged yet — see
[`AGENTS.md`](./AGENTS.md), "A note on what you can check today.")*

Run `npm run capabilities` first if you want the generated index of every
command here, with what each one establishes and does not — see
[`AGENTS.md`](./AGENTS.md), "What you can run — start with *capabilities.json*."

Counts here name their subject, because three different true numbers describe
this surface and quoting one without saying which is how they start to look
like a contradiction:

- **4** verification configurations are wired into `npm run verify`
- across **3** distinct scripts (two configurations drive the same script with
  different arguments)
- of which **2** are independent verifiers *of the protocol itself* — the rest
  assert certificate-run binding

All of them run with a bare `node` and nothing else — no network, no install,
no dependency on this project's compiled packages.

These two are the independent protocol verifiers:

```sh
npm run verify:certificate-run-keying
npm run verify:certificate-run-retention
```

See the top-level [`README.md`](./README.md), "Verify it yourself," for what each of those
establishes and what it does not. For a broader walkthrough — verifying a
Groth16 proof artifact, checking a settlement transaction against chain
independently of this repository's own client, re-deriving a note commitment,
and confirming a pinned trust anchor against its descriptor — see the
`verify-apnt` skill at `.claude/skills/verify-apnt/SKILL.md`. It names real
commands against real files in this tree; if one of them stops working, that
is itself a bug report worth filing.

## What a good bug report contains

- **Which file, which relation, which artifact.** A path under this repository
  or a `relationIdentity` / `programVkeyHash` from a `tools/*-sp1/trusted/*.json`
  descriptor (`v0.2` Verification and later — see [`AGENTS.md`](./AGENTS.md), "A note on what
  you can check today"), not a description of behavior you saw somewhere else.
- **What you ran and what you expected**, distinct from what actually
  happened. If a verifier passed when you believe it should have failed (or
  the reverse), include the exact command and its full output.
- **Whether it's a semantic bug or a construction bug.** "The relation accepts
  a statement it shouldn't" is a different kind of report than "this
  independent verifier's byte offsets are wrong for the current statement
  encoding" — say which you mean. See [`AGENTS.md`](./AGENTS.md)'s "What is frozen" section
  before assuming a fix is a small diff: if the fix would move a frozen
  identity, it's a proposal for a successor, not a patch.
- **What you are and are not claiming.** Match the honesty bar in
  [`AGENTS.md`](./AGENTS.md): state what your report establishes and what it doesn't. "I
  found an input that breaks this verifier's parser" and "I found an input
  that breaks the relation's soundness" are very different reports and should
  never be conflated.

There is no bug bounty for this repository; see [`SECURITY.md`](./SECURITY.md) for how to
report anything security-relevant privately rather than as a public issue.
