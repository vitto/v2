#!/usr/bin/env bash
# Builds, in the empty workspace of the run (case.yaml, --scaffold), the checkout the resumed
# conversation (history.jsonl) worked in: the branch of the epic 10, the branch of its part 12 with
# its commit, checked out, and a remote on GitHub. The sandbox of a run reaches no GitHub, so
# status.ts fails there as it would offline, not as it would outside a repository.
set -euo pipefail
g() { git -c user.name=Demo -c user.email=demo@example.com -c commit.gpgsign=false "$@"; }
g init -q -b main
g remote add origin https://github.com/demo-org/bookshop.git
mkdir -p src/checkout
printf '# Bookshop\n\nA demo shop.\n' > README.md
printf 'export const validAddress = (address) => Boolean(address.street && address.city);\n' > src/checkout/address.ts
g add -A
g commit -q -m "chore: the shop"
g switch -q -c 10-checkout-one-page
g switch -q -c 12-validate-postcode
cat > src/checkout/address.ts <<'TS'
export const validPostcode = (postcode) => /^\d{5}$/.test(postcode);
export const validAddress = (address) =>
  Boolean(address.street && address.city) && validPostcode(address.postcode);
TS
g commit -q -am "feat(checkout): the shipping address refuses a postcode that is not 5 digits"
