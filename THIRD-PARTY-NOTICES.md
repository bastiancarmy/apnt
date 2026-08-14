# Third-party notices

This repository's own code is MIT-licensed (see `LICENSE`). The upstream work
below is credited here because it is load-bearing for the CashVM Groth16
verification lane, whether or not any byte of it is redistributed in this tree.

## Upstreams of the CashVM Groth16 verification lane

The derivation is pinned by commit in the private repository's regeneration
notes, and reproduced here so a reader can fetch exactly what was used.

| Upstream | Pinned commit | Licence |
| --- | --- | --- |
| `mr-zwets/groth16_cashscript` | `6a309f506f87ef584165b9d3ae4c0ec6d66ad56f` | ISC (declared in [`package.json`](./package.json)) |
| `mr-zwets/cashscript`, branch `compiler-optimizations` | `1c707c1dbf87396b30ba5e0704b1db44475ce893` | MIT, © 2019 Rosco Kalis |
| `mr-zwets/zk-verifier-bench` | `227ddf58110a2e21d75cef9cf897132244fd0f47` | ISC (declared in [`package.json`](./package.json)) |

**Credit.** These three upstreams are a real contribution to this work, and
`mr-zwets` is named here deliberately rather than folded into a generic
acknowledgement.

**No upstream bytes are redistributed here.** This tree publishes *our*
artifacts plus the pins above; it does not vendor upstream sources or bundles.
Two of the three declare ISC in [`package.json`](./package.json) without shipping a `LICENSE`
file. That is generally accepted as the grant, but it is thinner evidence than
a licence file — which is a second reason this repository ships pins and a
reproduction path rather than copied upstream output.

ISC and MIT are both permissive and MIT-compatible. Their terms require the
copyright and permission notice to be reproduced in copies and substantial
portions; no such copies are made here.
