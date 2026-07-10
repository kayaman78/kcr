# KCR — Komodo Command Runner

## File
- `action-template.ts` — Action TypeScript (SoT)
- `arguments-example.json` — parametri esempio
- `README.md` — documentazione

## Come funziona (v2 API)

Esegue comandi bash in sequenza su un server Komodo, nello stesso terminale persistente.

1. Prima `execute_server_terminal` con `init: { command: shellCommand, recreate: Always }` apre la shell
2. Call successive senza `init` — riusano la stessa shell, user-context preservato
3. Output line-by-line via `onLine`, exit code via `onFinish`
4. Timeout per-command, stop on error configurabile
5. `DeleteTerminal` nel finally — sempre eseguito

## Parametri
```json
{
  "server_name": "prod-server",
  "commands": ["bash /srv/docker/dabs/backup-sqlite.sh"],
  "run_as": "root",
  "stop_on_error": true,
  "timeout_seconds": 300
}
```

## 3 regole terminale (condivise con KDD)

1. **Mai multi-riga** — SDK non risolve la promise
2. **Mai `execute_server_terminal("exit")`** — stream HTTP non chiude, promise pending
3. **Solo `DeleteTerminal` in finally** — struttura `{ target: { type: "Server", params: { server } }, terminal }`

## Note
- `recreate: Always` solo al primo `init` — nuke residui
- Non root: `sudo -iu ${user} bash` come `init.command`
- Terminal name unico: `kcr-${timestamp}-${random6}`
- Sequenziale by design, no parallelismo
