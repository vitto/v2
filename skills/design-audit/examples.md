---
group: design
order: 5
---

## Check a screen, a component or a change already built

Changes: nothing; it reports.

| You type | When | You get |
| --- | --- | --- |
| `/v2:design-audit src/pages/settings.html` | a page is built | every check pass, fail or not verifiable, merged by place; a Summary of where to start |
| `/v2:design-audit the current diff` | before a pull request | the audit of what the change touches |
| "fai un audit UX del dropdown" | a component is built | the same, on the component, with its screenshots |
