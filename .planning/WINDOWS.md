---
schema_version: 1
open_count: 0
waived_count: 0
fixed_count: 1
total_count: 1
last_updated: 2026-09-29T09:17:34.892Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 01 | unrun-verify | modules/screen-guard/android/src/main/java/expo/modules/screenguard/BlockActivity.kt |  | Task 2 human-check (visual Close/Back-to-launcher and notification-tap-reopens-BlockActivity confirmation) not yet performed by a human; deferred to end-of-phase UAT per workflow.human_verify_mode=end-of-phase | fixed |  | 2026-09-28T12:51:48.169Z | 2026-09-29T09:17:34.892Z |

````json
[
  {
    "id": 1,
    "kind": "unrun-verify",
    "phase": "01",
    "file": "modules/screen-guard/android/src/main/java/expo/modules/screenguard/BlockActivity.kt",
    "line": null,
    "description": "Task 2 human-check (visual Close/Back-to-launcher and notification-tap-reopens-BlockActivity confirmation) not yet performed by a human; deferred to end-of-phase UAT per workflow.human_verify_mode=end-of-phase",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-09-28T12:51:48.169Z",
    "resolved_at": "2026-09-29T09:17:34.892Z",
    "milestone": null
  }
]
````
