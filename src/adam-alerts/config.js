import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const projectRoot = path.resolve(__dirname, "../..");

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const separator = trimmed.indexOf("=");
  if (separator === -1) return null;
  const key = trimmed.slice(0, separator).trim();
  let value = trimmed.slice(separator + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return [key, value];
}

function loadDotEnv() {
  const envPath = path.join(projectRoot, ".env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const parsed = parseEnvLine(line);
    if (!parsed) continue;
    const [key, value] = parsed;
    if (!process.env[key]) process.env[key] = value;
  }
}

loadDotEnv();

function env(name, fallback = "") {
  return process.env[name]?.trim() || fallback;
}

function intEnv(name, fallback) {
  const value = Number.parseInt(env(name), 10);
  return Number.isFinite(value) ? value : fallback;
}

function floatEnv(name, fallback) {
  const value = Number.parseFloat(env(name));
  return Number.isFinite(value) ? value : fallback;
}

export const config = {
  apiFootballKey: env("API_FOOTBALL_KEY", env("VITE_API_FOOTBALL_KEY")),
  oddsApiKey: env("ODDS_API_KEY", env("THE_ODDS_API_KEY", env("VITE_ODDS_API_KEY"))),
  telegramBotToken: env("TELEGRAM_BOT_TOKEN"),
  telegramChannelId: env("TELEGRAM_CHANNEL_ID"),
  port: intEnv("PORT", 3000),
  timezone: env("TIMEZONE", "America/New_York"),
  dailyBestBetsHour: intEnv("DAILY_BEST_BETS_HOUR", 8),
  livePollSeconds: intEnv("LIVE_POLL_SECONDS", 60),
  oddsPollSeconds: intEnv("ODDS_POLL_SECONDS", 300),
  oddsMoveThreshold: floatEnv("ODDS_MOVE_THRESHOLD", 0.12),
  statePath: env("ADAM_ALERTS_STATE_PATH", path.join(projectRoot, "data", "adam-alerts-state.json")),
  dryRun: env("DRY_RUN", "false").toLowerCase() === "true",
  worldCupMode: env("WORLD_CUP_MODE", "true").toLowerCase() !== "false",
  oddsSportKeys: env(
    "ODDS_SPORT_KEYS",
    [
      "soccer_epl",
      "soccer_spain_la_liga",
      "soccer_italy_serie_a",
      "soccer_germany_bundesliga",
      "soccer_france_ligue_one",
      "soccer_uefa_champs_league",
      "soccer_fifa_world_cup",
    ].join(","),
  )
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean),
};

export function validateConfig() {
  const missing = [];
  if (!config.apiFootballKey) missing.push("API_FOOTBALL_KEY");
  if (!config.oddsApiKey) missing.push("ODDS_API_KEY");
  if (!config.telegramBotToken) missing.push("TELEGRAM_BOT_TOKEN");
  if (!config.telegramChannelId) missing.push("TELEGRAM_CHANNEL_ID");
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}
