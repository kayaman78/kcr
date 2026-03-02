# KCR – Komodo Command Runner

**Version:** 1.1  
**Type:** Komodo Action Template

Esegue una sequenza di comandi Bash su un server remoto tramite un terminale persistente, mantenendo il contesto utente tra un comando e l'altro.

---

## Come funziona

1. **Apre un terminale persistente** sul server target, già autenticato come l'utente specificato (`root` usa `bash` direttamente, altri utenti passano per `sudo -iu`).
2. **Esegue i comandi in sequenza**, stampando l'output riga per riga.
3. **Gestisce gli errori** per ogni comando: se `stop_on_error` è `true` (default), l'esecuzione si interrompe al primo fallimento; altrimenti continua con un warning.
4. **Chiude e cancella il terminale** al termine, anche in caso di errore.

---

## Creare il template

1. In Komodo, vai su **Actions → New Action**.
2. Incolla il codice TypeScript nel campo **Script**.
3. Nel campo **Args (JSON)**, configura i parametri:

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

4. Salva e avvia l'action.

---

## Parametri

| Parametro | Tipo | Obbligatorio | Default | Descrizione |
|---|---|---|---|---|
| `server_name` | `string` | ✅ | — | Nome del server Komodo target |
| `commands` | `string[]` | ✅ | — | Lista di comandi Bash da eseguire |
| `run_as` | `string` | ❌ | `root` | Utente con cui eseguire i comandi |
| `stop_on_error` | `boolean` | ❌ | `true` | Interrompe l'esecuzione al primo errore |

---

## Esempio di output

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