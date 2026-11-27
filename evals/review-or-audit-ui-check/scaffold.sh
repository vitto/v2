#!/usr/bin/env bash
# Copies the fixture of review-or-audit-ux, the same page, into the empty workspace of the run
# (case.yaml, --scaffold): the two cases differ only in what the person asks.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cp -R "$here/../review-or-audit-ux/fixture/." .
