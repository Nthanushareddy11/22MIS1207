export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

export type LogStack = "frontend" | "backend" | "database" | "network" | "auth";

export interface LogPayload {
  stack: string;
  level: string;
  package: string;
  message: string;
  timestamp: string;
}

export interface LoggerConfig {
  serverUrl: string;
  enableConsole?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
}
