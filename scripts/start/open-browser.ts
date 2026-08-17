import { spawn } from "node:child_process";

/**
 * Opens the default browser to `url`. No dependency is added for this
 * (PRD §4.4: low-maintenance architecture) — it's a one-line shell-out per
 * platform, the same approach Node's own ecosystem tools use. Failure is
 * non-fatal: the server is already up and the terminal has printed the
 * URL, so a user on an unusual platform (or with no browser command
 * available at all) can still open it by hand.
 */
export function openBrowser(url: string): void {
  const [command, args] =
    process.platform === "darwin"
      ? ["open", [url]]
      : process.platform === "win32"
        ? ["cmd", ["/c", "start", "", url]]
        : ["xdg-open", [url]];

  try {
    spawn(command, args, { stdio: "ignore", detached: true }).unref();
  } catch {
    // Non-fatal — see doc comment above.
  }
}
