# AG OS Owner Console

AG OS has one owner-facing shell: `os.html`. The root route and legacy `index.html` both open this shell so the earlier blue dashboard cannot reappear.

## Four views

- **Console** — issue one-off or project-targeted owner commands.
- **Ops** — open projects, inspect work, and make approvals, proposal, lesson, retry, and outcome decisions.
- **Keep** — see the live operating map and open each governed system through its room or resident.
- **Dash** — see the compact owner snapshot for work, decisions, cost, learning, and system health.

The shell authenticates directly with the private coordinator. Sensitive external actions remain fail-closed behind their existing exact approval gates.

## Local Commands

```text
npm.cmd run dashboard:build
npm.cmd run dashboard:check
```

Run the coordinator and open `/` or `/os.html`. `dashboard/index.html` is redirect-only compatibility markup.
