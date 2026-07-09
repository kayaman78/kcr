/**
 * Action: KCR - Komodo Command Runner (v2.0)
 * Description: Sequential Bash command executor with persistent user context.
 *              Requires Komodo v2 (uses execute_server_terminal with inline init).
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

    // Unique terminal name to avoid collisions on concurrent runs.
    // Timestamp + 6-char random suffix: collision-proof for any realistic concurrent rate.
    // (Previous Math.random().substring(7) could occasionally produce short/empty strings.)
    const terminalName = `kcr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Use 'sudo -iu' for non-root to load the user's full profile and environment
    const shellCommand = user === "root" ? "bash" : `sudo -iu ${user} bash`;

    console.log(`🛠️ KCR: Starting terminal on [${server}] as [${user}]`);

    try {
        // Execute commands sequentially in the same persistent terminal.
        // Komodo v2 unified API: the first call opens the terminal via `init`;
        // subsequent calls reuse the same shell — passing `init` again would
        // recreate it and break user-context persistence across commands.
        let firstCall = true;

        for (const cmd of commands) {
            console.log(`▶️ [EXEC] ${cmd}`);

            let exitCode = "0";
            let finished = false;

            const execArgs: any = {
                server: server,
                terminal: terminalName,
                command: cmd,
            };
            if (firstCall) {
                execArgs.init = {
                    command: shellCommand,
                    recreate: Types.TerminalRecreateMode.Always,
                };
                firstCall = false;
            }

            await komodo.execute_server_terminal(
                execArgs,
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
        // Only DeleteTerminal here — no execute_server_terminal.
        // The shell is already exited via "exit 0" sent as the last command
        // in the try block. Using execute_server_terminal in finally opens
        // a dangling SDK connection that keeps the action in "running" state
        // even after the function returns.
        try {
            await komodo.write("DeleteTerminal", {
                target: { type: "Server", params: { server: server } },
                terminal: terminalName,
            });
        } catch (e) { /* ignore cleanup errors */ }
    }
}

await runKCR();