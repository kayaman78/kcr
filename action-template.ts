/**
 * Action: KCR - Komodo Command Runner (v1.0)
 * Description: Sequential Bash command executor for Komodo.
 * Author: Gemini & User
 */

async function runKCR() {
    // @ts-ignore - ARGS is injected by Komodo at runtime
    const config = ARGS;

    if (!config || !config.server_name || !config.commands) {
        throw new Error("Missing required arguments: server_name and commands.");
    }

    const server = config.server_name;
    const user = config.run_as || "root";
    const commands = Array.isArray(config.commands) ? config.commands : [config.commands];
    const stopOnError = config.stop_on_error !== false;
    const terminalName = `kcr-${Math.random().toString(36).substring(7)}`;

    console.log(`🛠️ KCR: Executing on [${server}] as [${user}]`);

    try {
        // 1. Initialize Terminal
        await komodo.write("CreateTerminal", {
            server: server,
            name: terminalName,
            command: "bash",
            recreate: Types.TerminalRecreateMode.Always,
        });

        for (const cmd of commands) {
            // Use sudo -u for non-interactive user switching
            const finalCommand = user === "root" 
                ? cmd 
                : `sudo -u ${user} bash -c '${cmd}'`;

            console.log(`[EXEC] ${cmd}`);

            let exitCode = "0";
            let finished = false;

            // 2. Execute command and stream logs
            await komodo.execute_terminal(
                {
                    server: server,
                    terminal: terminalName,
                    command: finalCommand,
                },
                {
                    onLine: (line: string) => console.log(`  > ${line}`),
                    onFinish: (code: string) => {
                        exitCode = code;
                        finished = true;
                    },
                }
            );

            // Wait for completion before next command
            while (!finished) {
                await new Promise(r => setTimeout(r, 200));
            }

            if (exitCode !== "0") {
                const errorMsg = `Command failed with exit code: ${exitCode}`;
                if (stopOnError) {
                    throw new Error(errorMsg);
                } else {
                    console.warn(`⚠️ ${errorMsg}. Continuing...`);
                }
            }
        }

        console.log("✅ KCR: Execution finished successfully.");

    } catch (err: any) {
        console.error(`❌ KCR ERROR: ${err.message}`);
        throw err;
    } finally {
        // 3. Robust Cleanup
        try {
            await komodo.execute_terminal(
                { server: server, terminal: terminalName, command: "exit 0" },
                { onLine: () => {}, onFinish: () => {} }
            );
            await new Promise(r => setTimeout(r, 500));
            await komodo.write("DeleteTerminal", {
                server: server,
                terminal: terminalName,
                name: terminalName
            } as any);
        } catch (e) {
            // Cleanup error ignored
        }
    }
}

await runKCR();