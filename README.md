# KCR – Komodo Command Runner

**Version:** 1.1  
**Type:** Komodo Action Template

Executes a sequence of Bash commands on a remote server through a persistent terminal, maintaining user context across all commands.

---

## How it works

1. **Opens a persistent terminal** on the target server, already authenticated as the specified user (`root` uses `bash` directly, other users are switched via `sudo -iu`).
2. **Runs commands sequentially**, printing output line by line.
3. **Handles errors** per command: if `stop_on_error` is `true` (default), execution stops at the first failure; otherwise it continues with a warning.
4. **Closes and deletes the terminal** when done, even if an error occurred.

---

## Creating the template

1. In Komodo, go to **Actions → New Action**.
2. Paste the TypeScript code into the **Script** field.
3. In the **Args (JSON)** field, configure the parameters:
```json
{
  "server_name": "your-server-name",
  "run_as": "root",
  "commands": [
    "whoami",
    "uptime",
    "docker ps --format 'table {{.Names}}\t{{.Status}}'"
  ],
  "stop_on_error": true
}
```

4. Save and run the action.

---

## Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `server_name` | `string` | ✅ | — | Name of the target Komodo server |
| `commands` | `string[]` | ✅ | — | List of Bash commands to execute |
| `run_as` | `string` | ❌ | `root` | User to run the commands as |
| `stop_on_error` | `boolean` | ❌ | `true` | Stop execution on first error |

---

## Example output
```
🛠️ KCR: Starting persistent terminal on [my-server] as [root]
[EXEC] whoami
  > root
[EXEC] uptime
  > 10:42:01 up 12 days, 3:21, load average: 0.10, 0.05, 0.01
[EXEC] docker ps --format 'table {{.Names}}\t{{.Status}}'
  > NAMES       STATUS
  > nginx       Up 2 hours
✅ KCR: Execution finished successfully.
```