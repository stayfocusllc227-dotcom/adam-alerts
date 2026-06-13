import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";

const emptyState = {
  sentAlerts: {},
  oddsSnapshot: {},
  lastDailyBetsDate: "",
};

export function loadState() {
  try {
    if (!fs.existsSync(config.statePath)) return structuredClone(emptyState);
    return { ...structuredClone(emptyState), ...JSON.parse(fs.readFileSync(config.statePath, "utf8")) };
  } catch (error) {
    console.warn(`State file could not be read, starting fresh: ${error.message}`);
    return structuredClone(emptyState);
  }
}

export function saveState(state) {
  fs.mkdirSync(path.dirname(config.statePath), { recursive: true });
  fs.writeFileSync(config.statePath, JSON.stringify(state, null, 2));
}

export function wasSent(state, key) {
  return Boolean(state.sentAlerts[key]);
}

export function markSent(state, key) {
  state.sentAlerts[key] = new Date().toISOString();
}
