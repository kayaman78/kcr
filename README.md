# KCR — Komodo Command Runner

**Version**: 2.1 | **Requires**: Komodo v2 | **License**: MIT

[![Komodo](https://img.shields.io/badge/komodo-action-blue.svg)](https://github.com/mbecker20/komodo)

Komodo Action that runs a sequence of Bash commands on a remote server through a persistent terminal. Maintains user context across commands, with per-command timeout and guaranteed cleanup.

> Part of the **KDD ecosystem** — see also [KDD](https://github.com/kayaman78/kdd) for MySQL/PostgreSQL/MongoDB, [DABS](https://github.com/kayaman78/dabs) for SQLite, [DABV](https://github.com/kayaman78/dabv) for Docker volumes, and [DABR](https://github.com/kayaman78/dabr) for host paths.

---

## How It Works

1. Opens a persistent terminal on the target server (root = `bash`, other users = `sudo -iu`)
2. Runs commands sequentially with line-by-line output
3. Stops on first error (configurable) or continues with warning
4. Deletes terminal on any exit path

---

## Setup

1. Create a new Action in Komodo
2. Paste the content of [`action-template.ts`](action-template.ts) into the Script field
3. Set your Args JSON (see [Parameters](#parameters))

---

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `server_name` | string | required | Komodo server name |
| `commands` | string or string[] | required | Commands to execute |
| `run_as` | string | `root` | User context |
| `stop_on_error` | boolean | `true` | Stop on first failure |
| `timeout_seconds` | number | `300` | Max seconds per command |

---

## Examples

```json
{
  "server_name": "prod-server",
  "commands": ["whoami", "uptime", "docker ps --format 'table {{.Names}}\t{{.Status}}'"],
  "timeout_seconds": 300
}
```

### Run DABS (SQLite backup)
```json
{
  "server_name": "prod",
  "commands": ["bash /srv/docker/dabs/sqlite-backup.sh"],
  "timeout_seconds": 600
}
```

### Full backup chain (Komodo Procedure)
1. **KDD Action** → MySQL, PostgreSQL, MongoDB
2. **KCR Action** → `bash /srv/docker/dabs/sqlite-backup.sh`
3. **KCR Action** → `bash /srv/docker/dabv/backup-volumes.sh`
4. **KCR Action** → `bash /srv/docker/dabr/backup-paths.sh`

Run DABR last: the databases have finished dumping by then, so its snapshot
picks up the fresh dump files along with everything else.

---

## Updating

Script and Args are separate in Komodo. Updating the script never touches your parameters.

1. Open your KCR Action
2. Paste the new [`action-template.ts`](action-template.ts) into the Script field
3. Save

---

## Changelog

### v2.1
- Fixed `DeleteTerminal` params (`TerminalTarget` structure).
- Removed `execute_server_terminal("exit")` — causes permanent hang.

### v2.0
- Komodo v2 migration. Inline `init` on first call, persistent shell across commands.
- Hardened terminal name: `kcr-${timestamp}-${random6}`.

### v1.1–v1.2
- Per-command timeout, initial release.

---

## Ecosystem

| Project | What it backs up |
|---------|-----------------|
| [KDD](https://github.com/kayaman78/kdd) | MySQL, PostgreSQL, MongoDB |
| [DABS](https://github.com/kayaman78/dabs) | SQLite |
| [DABV](https://github.com/kayaman78/dabv) | Docker volumes |
| [DABR](https://github.com/kayaman78/dabr) | Host paths — bind mounts, config, generated data |
| **KCR** | Runs the shell-based tools from Komodo |

---

## License

MIT
