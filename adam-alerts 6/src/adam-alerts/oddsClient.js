import { config } from "./config.js";
import { fetchJson } from "./http.js";

const BASE_URL = "https://api.the-odds-api.com/v4";

function decimal(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeEvent(event, sportKey) {
  return {
    id: event.id,
    sportKey,
    commenceTime: event.commence_time,
    homeTeam: event.home_team,
    awayTeam: event.away_team,
    bookmakers: event.bookmakers || [],
  };
}

export function extractMarkets(event) {
  const outcomes = [];

  for (const bookmaker of event.bookmakers || []) {
    for (const market of bookmaker.markets || []) {
      for (const outcome of market.outcomes || []) {
        const price = decimal(outcome.price);
        if (!price) continue;
        outcomes.push({
          eventId: event.id,
          sportKey: event.sportKey,
          match: `${event.homeTeam} vs ${event.awayTeam}`,
          commenceTime: event.commenceTime,
          bookmaker: bookmaker.title,
          market: market.key,
          label: outcome.point !== undefined ? `${outcome.name} ${outcome.point}` : outcome.name,
          price,
          lastUpdated: bookmaker.last_update,
        });
      }
    }
  }

  return outcomes;
}

export async function fetchSportOdds(sportKey) {
  const url = new URL(`${BASE_URL}/sports/${sportKey}/odds`);
  url.searchParams.set("apiKey", config.oddsApiKey);
  url.searchParams.set("regions", "us,eu");
  url.searchParams.set("markets", "h2h,totals,spreads");
  url.searchParams.set("oddsFormat", "decimal");
  url.searchParams.set("dateFormat", "iso");

  const payload = await fetchJson(url);
  return (payload || []).map((event) => normalizeEvent(event, sportKey));
}

export async function fetchAllOdds() {
  const settled = await Promise.allSettled(config.oddsSportKeys.map((sportKey) => fetchSportOdds(sportKey)));
  const events = settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  const failures = settled.filter((result) => result.status === "rejected");

  if (!events.length && failures.length) throw failures[0].reason;

  return {
    events,
    failures,
    fetchedAt: new Date().toISOString(),
  };
}
