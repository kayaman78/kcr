# KCR — Komodo Command Runner

## Scopo
Action template TypeScript per Komodo che esegue sequenze di comandi Bash su server remoti con terminal persistente e context utente. È il layer di orchestrazione che lancia DABS e DABV dall'interfaccia Komodo.

## File
- `action-template.ts` — codice Action TypeScript (source)
- `arguments-example.json` — esempio parametri JSON per la Action
- `kcr-action-template.toml` — export Komodo Resource Sync — importa direttamente in Komodo
- `README.md` — documentazione e guide d'uso

## Come funziona in Komodo (v2 API)
1. La prima `execute_server_terminal` apre il terminal persistente passando `init: { command: shellCommand, recreate: Always }`
2. Le call successive eseguono i comandi seguenti **senza** `init` — riusano la stessa shell, persistenza user-context preservata
3. Output line-by-line via callback `onLine`
4. Per ogni comando: timeout guard attivo, stop su errore se `stop_on_error: true`
5. Cleanup garantito del terminal nel `finally` block (`DeleteTerminal`) — sempre eseguito anche su errore

## Parametri Action
```json
{
  "server_name": "prod-server",     // nome server in Komodo (required)
  "commands": [                      // stringa o array di comandi (required)
    "bash /srv/docker/dabs/backup-sqlite.sh"
  ],
  "run_as": "root",                  // user context — sudo -iu se non root (default: "root")
  "stop_on_error": true,             // stop su primo errore (default: true)
  "timeout_seconds": 300             // timeout per singolo comando (default: 300)
}
```

## API Komodo utilizzate (v2)
```typescript
// Prima call: init inline crea il terminal (recreate: Always nuke residui)
komodo.execute_server_terminal(
  { server, terminal, command, init: { command: shellCommand, recreate: "Always" } },
  { onLine, onFinish }
)
// Call successive: stesso terminal, niente init
komodo.execute_server_terminal({ server, terminal, command }, { onLine, onFinish })
// Cleanup: graceful exit → hard cleanup
Promise.race([
  komodo.execute_server_terminal({ server, terminal, command: "exit 0" }, { onLine: () => {}, onFinish: () => {} }),
  new Promise(r => setTimeout(r, 2000))
])
komodo.write("DeleteTerminal", { server, terminal, name })
```

## Terminal lifecycle — CRITICO
Il meccanismo di apertura/chiusura terminal ha richiesto iterazioni significative. **Non modificare questa logica.**

- `init` con `recreate: Always` passato **solo alla prima** `execute_server_terminal` — elimina residui da run precedenti e apre la shell
- Le call successive **non passano `init`**: riusano lo stesso terminal e mantengono la persistenza user-context. Passare di nuovo `init` con `recreate: Always` ricreerebbe la shell ad ogni comando, perdendo `cwd`/env/sudo session.
- `finally` block: cleanup a due passi. Prima `exit 0` alla shell bash (wrappato in `Promise.race` con timeout 2s — protegge dal caso in cui la shell sia già morta e la promise SDK resti pendente all'infinito). Poi `DeleteTerminal` per rimuovere la risorsa terminale da Komodo. Entrambi i passi sono in try/catch separati — errori di cleanup non propagano.

## Utilizzo tipico nell'ecosistema
```json
// Lancia DABS (SQLite)
{ "server_name": "prod", "run_as": "root", "commands": ["bash /srv/docker/dabs/backup-sqlite.sh"], "timeout_seconds": 600 }

// Lancia DABV (volumi)
{ "server_name": "prod", "commands": ["bash /srv/docker/dabv/backup-volumes.sh"] }

// Sequenza completa
{ "server_name": "prod", "commands": [
  "bash /srv/docker/dabs/backup-sqlite.sh",
  "bash /srv/docker/dabv/backup-volumes.sh"
]}
```

## Note architetturali
- `recreate: "Always"` (passato solo nel primo `init`) — garantisce terminal pulito anche se residuo da run precedente
- Timeout per-command (`timeoutMs`): polling ogni 100ms sul flag `finished`
- Non c'è esecuzione parallela (sequenziale by design)
- Non root: usa `sudo -iu ${user} bash` per caricare il profilo completo dell'utente — passato come `init.command` alla prima call
- Output visibile in Komodo UI in tempo reale via `onLine` callback
- Komodo v2 required: usa `execute_server_terminal` (rinominato da `execute_terminal` in v1) con `init` block inline

## Non implementato
- Retry per singolo comando
- Timeout globale (solo per-command)
- Output redirection to file dalla Action
