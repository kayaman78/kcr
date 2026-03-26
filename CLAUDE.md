# KCR — Komodo Command Runner

## Scopo
Action template TypeScript per Komodo che esegue sequenze di comandi Bash su server remoti con terminal persistente e context utente. È il layer di orchestrazione che lancia DABS e DABV dall'interfaccia Komodo.

## File
- `action-template.ts` — codice Action TypeScript (source)
- `arguments-example.json` — esempio parametri JSON per la Action
- `kcr-action-template.toml` — export Komodo Resource Sync — importa direttamente in Komodo
- `README.md` — documentazione e guide d'uso

## Come funziona in Komodo
1. Crea un terminal persistente sul server target (`CreateTerminal` con `recreate: Always`)
2. Attende 500ms per init shell
3. Esegue ogni comando in sequenza con output line-by-line (`execute_terminal`)
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

## API Komodo utilizzate
```typescript
komodo.write("CreateTerminal", { server, name, command: shellCommand, recreate: "Always" })
komodo.execute_terminal({ server, terminal, command }, { onLine, onFinish })
komodo.write("DeleteTerminal", { server, terminal, name })
```

## Terminal lifecycle — CRITICO
Il meccanismo di apertura/chiusura terminal ha richiesto iterazioni significative. **Non modificare questa logica.**

- `CreateTerminal` con `recreate: Always` — elimina residui da run precedenti
- Il terminal viene passato comandi via `execute_terminal` nella stessa sessione bash
- `finally` block garantisce sempre `DeleteTerminal` — anche su timeout o eccezione
- Non usare `exit` nel flusso normale: il terminal viene chiuso solo da `DeleteTerminal`

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
- `recreate: "Always"` — garantisce terminal pulito anche se residuo da run precedente
- Timeout per-command (`timeoutMs`): polling ogni 100ms sul flag `finished`
- Non c'è esecuzione parallela (sequenziale by design)
- Non root: usa `sudo -iu ${user} bash` per caricare il profilo completo dell'utente
- Output visibile in Komodo UI in tempo reale via `onLine` callback

## Non implementato
- Retry per singolo comando
- Timeout globale (solo per-command)
- Output redirection to file dalla Action
