import "server-only";
import { execFile } from "node:child_process";

const MAX_OUTPUT = 128 * 1024;

export interface ProgramResult {
  code: number;
  stdout: string;
  stderr: string;
}

export function runProgram(command: string, args: readonly string[], timeout = 30_000): Promise<ProgramResult> {
  return new Promise((resolve) => {
    execFile(
      command,
      [...args],
      { timeout, maxBuffer: MAX_OUTPUT, windowsHide: true, shell: false },
      (error, stdout, stderr) => {
        const code = typeof error?.code === "number" ? error.code : error ? 1 : 0;
        resolve({ code, stdout: String(stdout ?? ""), stderr: String(stderr ?? "") });
      },
    );
  });
}

export async function commandExists(command: string): Promise<boolean> {
  const probe = process.platform === "win32" ? ["where", [command]] as const : ["which", [command]] as const;
  return (await runProgram(probe[0], probe[1], 5_000)).code === 0;
}

export async function requireProgram(command: string, args: readonly string[], timeout?: number): Promise<void> {
  const result = await runProgram(command, args, timeout);
  if (result.code !== 0) throw new Error("managed application operation failed");
}
