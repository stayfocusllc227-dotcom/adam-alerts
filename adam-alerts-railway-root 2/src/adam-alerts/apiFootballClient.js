import { config } from "./config.js";
import { fetchJson } from "./http.js";

const BASE_URL = "https://v3.football.api-sports.io";

function buildUrl(path, params = {}) {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
  }
  return url;
}

async function request(path, params) {
  return fetchJson(buildUrl(path, params), {
    headers: {
      "x-apisports-key": config.apiFootballKey,
    },
  });
}

export async function fetchLiveFixtures() {
  const payload = await request("/fixtures", { live: "all", timezone: config.timezone });
  return payload.response || [];
}

export async function fetchFixtureEvents(fixtureId) {
  const payload = await request("/fixtures/events", { fixture: fixtureId });
  return payload.response || [];
}

export async function fetchTodayFixtures(date) {
  const payload = await request("/fixtures", { date, timezone: config.timezone });
  return payload.response || [];
}

export async function fetchPrediction(fixtureId) {
  const payload = await request("/predictions", { fixture: fixtureId });
  return payload.response?.[0] || null;
}
