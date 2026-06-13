import http from "node:http";
import { config } from "./config.js";
import { logger } from "./logger.js";

function sendJson(response, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(body);
}

export function createHealthState() {
  return {
    startedAt: new Date().toISOString(),
    status: "starting",
    lastLiveCheckAt: null,
    lastDailyCheckAt: null,
    lastOddsCheckAt: null,
    lastTelegramPostAt: null,
    lastErrorAt: null,
    lastError: null,
    counters: {
      liveChecks: 0,
      oddsChecks: 0,
      dailyChecks: 0,
      telegramPosts: 0,
      duplicateAlertsSkipped: 0,
      errors: 0,
    },
  };
}

export function startHealthServer(healthState) {
  const server = http.createServer((request, response) => {
    if (request.url === "/health" || request.url === "/") {
      sendJson(response, 200, {
        status: "ok",
        service: "ADAM Alerts",
      });
      return;
    }

    sendJson(response, 404, { ok: false, error: "not_found" });
  });

  server.listen(config.port, () => {
    logger.info("Health server listening", { port: config.port, path: "/health" });
  });

  server.on("error", (error) => {
    logger.error("Health server failed", error);
  });

  return server;
}
