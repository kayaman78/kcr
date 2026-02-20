/**
 * Action: KCR - Komodo Command Runner (v1.1)
 * Description: Sequential Bash command executor with persistent user context.
 */

async function runKCR() {
    // @ts-ignore
    const config = ARGS;

    if (!config || !config.server_name || !config.commands) {
        throw new Error("Missing required arguments: server_name and commands.");
    }

    const server = config.server_name;
    const user = config.run_as || "root";
    const commands = Array.isArray(config.commands) ? config.commands : [config.commands];
    const stopOnError = config.stop_on_error !== false;
    const terminalName = `kcr-${Math.random().toString(36).substring(7)}`;

    // Definiamo il comando di avvio del terminale
    // Usiamo 'sudo -iu' per caricare anche il profilo/ambiente dell'utente
    const shellCommand = user === "root" ? "bash" : `sudo -iu ${user} bash`;

    console.log(`🛠️ KCR: Starting persistent terminal on [${server}] as [${user}]`);

    try {
        // 1. Inizializza il terminale GIÀ con l'utente corretto
        await komodo.write("CreateTerminal", {
            server: server,
            name: terminalName,
            command: shellCommand,
            recreate: Types.TerminalRecreateMode.Always,
        });

        // Piccolo delay per permettere alla shell di inizializzarsi
        await new Promise(r => setTimeout(r, 500));

        for (const cmd of commands) {
            console.log(`[EXEC] ${cmd}`);

            let exitCode = "0";
            let finished = false;

            // 2. Esegui il comando "nudo" (il terminale è già dell'utente giusto)
            await komodo.execute_terminal(
                {
                    server: server,
                    terminal: terminalName,
                    command: cmd,
                },
                {
                    onLine: (line: string) => console.log(`  > ${line}`),
                    onFinish: (code: string) => {
                        exitCode = code;
                        finished = true;
                    },
                }
            );

            while (!finished) {
                await new Promise(r => setTimeout(r, 100));
            }

            if (exitCode !== "0") {
                const errorMsg = `Command failed with exit code: ${exitCode}`;
                if (stopOnError) throw new Error(errorMsg);
                console.warn(`⚠️ ${errorMsg}. Continuing...`);
            }
        }

        console.log("✅ KCR: Execution finished successfully.");

    } catch (err: any) {
        console.error(`❌ KCR ERROR: ${err.message}`);
        throw err;
    } finally {
        // 3. Cleanup
        try {
            await komodo.write("DeleteTerminal", {
                server: server,
                terminal: terminalName,
                name: terminalName
            } as any);
        } catch (e) { /* ignore cleanup errors */ }
    }
}

await runKCR();