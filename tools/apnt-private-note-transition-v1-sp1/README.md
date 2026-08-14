# APNT private-note transition V1 SP1 guest

This separate additive workspace contains only the V1 `program` and its
execution `runner`. The runner executes the five-case APNTPTI1 corpus, including
an executed malformed-envelope panic control and a consumed-logical
witness-order control. Both controls must halt nonzero and commit no bytes. The
runner does not call `setup()` and derives no worktree program key.

There is deliberately no proof, verifier, trusted descriptor, or packaged
Groth16 fixture path here. Worktree builds are path-dependent, so canonical
build and durable `K` derivation belong to the main-checkout workflow.
