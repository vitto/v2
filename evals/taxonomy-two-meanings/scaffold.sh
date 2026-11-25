#!/usr/bin/env bash
# Copies the fixture of this case into the empty workspace of the run (case.yaml, --scaffold).
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cp -R "$here/fixture/." .
