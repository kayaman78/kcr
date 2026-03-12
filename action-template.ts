/**
 * Action: KCR - Komodo Command Runner (v1.2)
 * Description: Sequential Bash command executor with persistent user context.
 *
 * ARGS JSON fields:
 *   server_name     - Komodo server name (required)
 *   commands        - Command or array of commands to execute (required)
 *   run_as          - User to run commands as (default: "root")
 *   stop_on_error   - Stop execution on first failure (default: true)
 *   timeout_seconds - Max seconds to wait for a single command (default: 300)
 */
async function runKCR() {
    // @ts-ignore — ARGS is injected as a local constant by Komodo at runtime
    const config = ARGS;

    if (!config || !config.server_name || !config.commands) {
        throw new Error("Missing required arguments: server_name and commands.");
    }

    const server      = config.server_name;
    const user        = config.run_as || "root";
    const commands    = Array.isArray(config.commands) ? config.commands : [config.commands];
    const stopOnError = config.stop_on_error !== false;
    const timeoutMs   = (config.timeout_seconds ?? 300) * 1000;

    // Unique terminal name to avoid collisions on concurrent runs
    const terminalName = `kcr-${Math.random().toString(36).substring(7)}`;

    // Use 'sudo -iu' for non-root to load the user's full profile and environment
    const shellCommand = user === "root" ? "bash" : `sudo -iu ${user} bash`;

    console.log(`🛠️ KCR: Starting terminal on [${server}] as [${user}]`);

    try {
        // 1. Open persistent terminal already authenticated as the target user
        await komodo.write("CreateTerminal", {
            server: server,
            name: terminalName,
            command: shellCommand,
            recreate: Types.TerminalRecreateMode.Always,
        });

        // Brief delay to let the shell initialise before sending commands
        await new Promise(r => setTimeout(r, 500));

        // 2. Execute commands sequentially in the same terminal session
        for (const cmd of commands) {
            console.log(`▶️ [EXEC] ${cmd}`);

            let exitCode = "0";
            let finished = false;

            await komodo.execute_terminal(
                {
                    server: server,
                    terminal: terminalName,
                    command: cmd,
                },
                {
                    onLine:   (line: string) => console.log(`  > ${line}`),
                    onFinish: (code: string) => { exitCode = code; finished = true; },
                }
            );

            // Wait for completion with timeout guard
            const deadline = Date.now() + timeoutMs;
            while (!finished) {
                if (Date.now() > deadline) {
                    throw new Error(
                        `⏱️ Command timed out after ${config.timeout_seconds ?? 300}s: ${cmd}`
                    );
                }
                await new Promise(r => setTimeout(r, 100));
            }

            if (exitCode !== "0") {
                const errorMsg = `Command failed with exit code: ${exitCode}`;
                if (stopOnError) throw new Error(errorMsg);
                console.warn(`⚠️ WARNING: ${errorMsg}. Continuing...`);
            }
        }

        console.log("✅ KCR: Execution finished successfully.");

    } catch (err: any) {
        console.error(`❌ KCR ERROR: ${err.message}`);
        throw err;

    } finally {
        // 3. Always delete the terminal — even if a command failed or timed out
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