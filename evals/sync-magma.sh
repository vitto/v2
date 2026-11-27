#!/usr/bin/env bash
# Copies the Magma plugin from a checkout of magma-design-system/magma into the cases that load
# it beside v2 (review-or-audit-*): its manifest, its licence and the SKILL.md of each skill,
# which is what decides the skill that starts. A case may load only a plugin inside its own
# folder, so each case has its copy; .source names the commit it came from.
# Usage: evals/sync-magma.sh <magma checkout>
set -euo pipefail
magma="$(cd "${1:?the path of a magma checkout}" && pwd)"
src="$magma/projects/claude-plugin"
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
commit="$(git -C "$magma" rev-parse HEAD)"
cases=(review-or-audit-ux review-or-audit-magma review-or-audit-ui-check review-or-audit-markup)
for case in "${cases[@]}"; do
  dst="$here/$case/plugins/magma"
  rm -rf "$dst"
  mkdir -p "$dst/.claude-plugin"
  cp "$src/.claude-plugin/plugin.json" "$dst/.claude-plugin/"
  cp "$src/LICENSE" "$dst/"
  for skill in "$src"/skills/*/; do
    name="$(basename "$skill")"
    mkdir -p "$dst/skills/$name"
    cp "$skill/SKILL.md" "$dst/skills/$name/"
  done
  echo "$commit" > "$dst/.source"
done
echo "magma plugin at $commit"
