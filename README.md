# KCR — Komodo Command Runner

**Project Status**: Active | **Version**: 1.1 | **Maintained**: Yes

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Komodo](https://img.shields.io/badge/komodo-action-blue.svg)](https://github.com/mbecker20/komodo)
[![Type](https://img.shields.io/badge/type-Action%20Template-informational.svg)](https://github.com/kayaman78/kcr)

Komodo Action template that executes a sequence of Bash commands on a remote server through a persistent terminal, maintaining user context across all commands.

> Part of the **KDD ecosystem** — see also [KDD](https://github.com/kayaman78/kdd) for MySQL / PostgreSQL / MongoDB backups and [DABS](https://github.com/kayaman78/dabs) for SQLite backups.

---

## How It Works

1. **Opens a persistent terminal** on the target server, already authenticated as the specified user (`root` uses `bash` directly, other users are switched via `sudo -iu`)
2. **Runs commands sequentially**, printing output line by line
3. **Handles errors** per command: if `stop_on_error` is `true` (default), execution stops at the first failure; otherwise it continues with a warning
4. **Closes and deletes the terminal** when done, even if an error occurred

---

## Setup

1. In Komodo, go to **Actions → New Action**
2. Paste the TypeScript code into the **Script** field
3. In the **Args (JSON)** field, configure your parameters
4. Save and run the action

---

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `server_name` | `string` | ✅ | — | Name of the target Komodo server |
| `commands` | `string[]` | ✅ | — | List of Bash commands to execute |
| `run_as` | `string` | ❌ | `root` | User to run the commands as |
| `stop_on_error` | `boolean` | ❌ | `true` | Stop execution on first error |

---

## Example

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

---

## Use Case: DABS + KDD via Komodo Procedure

KCR is the glue that connects shell-based tools like [DABS](https://github.com/kayaman78/dabs) to Komodo's orchestration layer. A typical full-stack backup Procedure looks like this:

1. **KDD Action** → backs up MySQL, PostgreSQL, MongoDB across all Docker networks
2. **KCR Action running DABS** → backs up all SQLite databases on the same host
3. **One Komodo Procedure** schedules both, runs them sequentially, separate email report per job

```json
{
  "server_name": "prod-server",
  "run_as": "root",
  "commands": ["bash /srv/docker/dabs/backup-sqlite.sh"],
  "stop_on_error": true
}
```

---

## Related Projects

| Project | Description |
|---------|-------------|
| [KDD](https://github.com/kayaman78/kdd) | Docker backup for MySQL, PostgreSQL, MongoDB |
| [DABS](https://github.com/kayaman78/dabs) | Docker automated backup for SQLite |

---

## License

MIT