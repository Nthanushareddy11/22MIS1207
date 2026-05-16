import { LogPayload, LoggerConfig } from "./types";

let config: LoggerConfig = {
  serverUrl: "http://4.224.186.213/evaluation-service/logs",
  enableConsole: true,
  retryAttempts: 2,
  retryDelay: 1000,
};

export function configureLogger(userConfig: Partial<LoggerConfig>) {
  config = { ...config, ...userConfig };
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendToServer(payload: LogPayload) {
  let attempts = config.retryAttempts ?? 2;
  let delay = config.retryDelay ?? 1000;

  for (let i = 0; i <= attempts; i++) {
    try {
      let res = await fetch(config.serverUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) return;

      if (i < attempts) await wait(delay * (i + 1));
    } catch (err) {
      if (i === attempts) {
        console.error("[Logger] could not send log to server:", err);
      } else {
        await wait(delay * (i + 1));
      }
    }
  }
}

function printToConsole(stack: string, level: string, pkg: string, message: string) {
  let ts = new Date().toISOString();
  let line = `[${ts}] [${level.toUpperCase()}] [${stack}] [${pkg}] ${message}`;

  if (level === "error" || level === "fatal") console.error(line);
  else if (level === "warn") console.warn(line);
  else if (level === "debug") console.debug(line);
  else console.log(line);
}

export async function Log(stack: string, level: string, pkg: string, message: string) {
  let payload: LogPayload = {
    stack,
    level,
    package: pkg,
    message,
    timestamp: new Date().toISOString(),
  };

  if (config.enableConsole) {
    printToConsole(stack, level, pkg, message);
  }

  await sendToServer(payload);
}
