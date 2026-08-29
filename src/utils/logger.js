import fs from "fs";
import path from "path";

// Try to create logs directory, but gracefully handle permission errors in production
let stream = null;
try {
  const logsDir = path.resolve(process.cwd(), "logs");
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  stream = fs.createWriteStream(path.join(logsDir, "app.log"), {
    flags: "a",
  });
} catch (err) {
  console.warn("Could not create log file (permission denied or read-only filesystem). Logging to console only.");
}

const write = (level, message, meta) => {
  if (!stream) return; // Skip file logging if stream creation failed
  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    ...(meta ? { meta } : {}),
  };
  const line = `${JSON.stringify(entry)}\n`;
  stream.write(line);
};

export const logger = {
  info: (message, meta) => {
    console.log(message, meta ?? "");
    write("info", message, meta);
  },
  error: (message, meta) => {
    console.error(message, meta ?? "");
    write("error", message, meta);
  },
};

