function write(level, message, fields = {}) {
  const record = {
    timestamp: new Date().toISOString(),
    level,
    service: "adam-alerts",
    message,
    ...fields,
  };

  const line = JSON.stringify(record);
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.log(line);
}

export const logger = {
  info(message, fields) {
    write("info", message, fields);
  },
  warn(message, fields) {
    write("warn", message, fields);
  },
  error(message, errorOrFields = {}, fields = {}) {
    if (errorOrFields instanceof Error) {
      write("error", message, {
        ...fields,
        error: errorOrFields.message,
        stack: errorOrFields.stack,
      });
      return;
    }
    write("error", message, errorOrFields);
  },
};
