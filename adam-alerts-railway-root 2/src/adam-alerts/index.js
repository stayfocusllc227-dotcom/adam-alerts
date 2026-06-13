import { config, validateConfig } from "./config.js";
import { fetchFixtureEvents, fetchLiveFixtures } from "./apiFootballClient.js";
import { createHealthState, startHealthServer } from "./healthServer.js";
import { logger } from "./logger.js";
import { extractMarkets, fetchAllOdds } from "./oddsClient.js";
import { formatAdamAlert, formatDailyBestBets } from "./messages.js";
import { rankBestBets } from "./scoring.js";
import { loadState, markSent, saveState, wasSent } from "./store.js";
import { sendTelegramMessage } from "./telegram.js";

const state = loadState();
const health = createHealthState();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function localDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: config.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function localHour(date = new Date()) {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: config.timezone,
      hour: "numeric",
      hour12: false,
    }).format(date),
  );
}

function scoreForFixture(fixture) {
  return `${fixture.goals?.home ?? 0}-${fixture.goals?.away ?? 0}`;
}

function matchForFixture(fixture) {
  return `${fixture.teams?.home?.name || "Home"} vs ${fixture.teams?.away?.name || "Away"}`;
}

function minuteForFixture(fixture, event) {
  return event?.time?.elapsed ? `${event.time.elapsed}'` : fixture.fixture?.status?.elapsed ? `${fixture.fixture.status.elapsed}'` : "Live";
}

function recommendedLiveBet(fixture) {
  const home = fixture.goals?.home ?? 0;
  const away = fixture.goals?.away ?? 0;
  if (home === away) return "Over 1.5 live";
  return "Next goal / momentum watch";
}

function eventKey(prefix, fixtureId, event) {
  const elapsed = event?.time?.elapsed ?? "na";
  const team = event?.team?.id ?? event?.team?.name ?? "team";
  const player = event?.player?.id ?? event?.player?.name ?? "player";
  const detail = event?.detail ?? event?.comments ?? event?.type ?? "event";
  return `${prefix}:${fixtureId}:${elapsed}:${team}:${player}:${detail}`;
}

async function postIfNew(key, message) {
  if (wasSent(state, key)) {
    health.counters.duplicateAlertsSkipped += 1;
    logger.info("Duplicate alert skipped", { key });
    return false;
  }
  await sendTelegramMessage(message);
  health.lastTelegramPostAt = new Date().toISOString();
  health.counters.telegramPosts += 1;
  markSent(state, key);
  saveState(state);
  logger.info("Telegram alert sent", { key });
  return true;
}

async function checkLiveEvents() {
  logger.info("Live fixture check started");
  const fixtures = await fetchLiveFixtures();
  health.lastLiveCheckAt = new Date().toISOString();
  health.counters.liveChecks += 1;
  logger.info("Live fixture check completed", { fixtures: fixtures.length });

  for (const fixture of fixtures) {
    const fixtureId = fixture.fixture?.id;
    if (!fixtureId) continue;

    const previousScoreKey = `score:${fixtureId}`;
    const currentScore = scoreForFixture(fixture);
    const previousScore = state.sentAlerts[previousScoreKey];

    if (previousScore && previousScore !== currentScore) {
      logger.info("Goal detected by score movement", {
        fixtureId,
        match: matchForFixture(fixture),
        previousScore,
        currentScore,
      });
      await postIfNew(
        `goal:${fixtureId}:${currentScore}`,
        formatAdamAlert({
          match: matchForFixture(fixture),
          score: currentScore,
          minute: minuteForFixture(fixture),
          recommendedBet: recommendedLiveBet(fixture),
          confidence: "Live signal",
          extra: "Goal detected live.",
        }),
      );
    }
    state.sentAlerts[previousScoreKey] = currentScore;

    const events = await fetchFixtureEvents(fixtureId);
    for (const event of events) {
      if (event.type === "Goal") {
        logger.info("Goal event detected", {
          fixtureId,
          match: matchForFixture(fixture),
          minute: event.time?.elapsed,
          team: event.team?.name,
          player: event.player?.name,
        });
        await postIfNew(
          eventKey("goal-event", fixtureId, event),
          formatAdamAlert({
            match: matchForFixture(fixture),
            score: currentScore,
            minute: minuteForFixture(fixture, event),
            recommendedBet: recommendedLiveBet(fixture),
            confidence: "Live signal",
            extra: `Goal: ${event.team?.name || ""} ${event.player?.name || ""}`.trim(),
          }),
        );
      }

      if (event.type === "Card" && String(event.detail || "").toLowerCase().includes("red")) {
        logger.info("Red card event detected", {
          fixtureId,
          match: matchForFixture(fixture),
          minute: event.time?.elapsed,
          team: event.team?.name,
          player: event.player?.name,
          detail: event.detail,
        });
        await postIfNew(
          eventKey("red-card", fixtureId, event),
          formatAdamAlert({
            match: matchForFixture(fixture),
            score: currentScore,
            minute: minuteForFixture(fixture, event),
            recommendedBet: "Live handicap / cards market value",
            confidence: "High impact event",
            extra: `Red card: ${event.team?.name || ""} ${event.player?.name || ""}`.trim(),
          }),
        );
      }
    }

    saveState(state);
  }
}

async function postDailyBestBets({ force = false } = {}) {
  const today = localDate();
  if (!force && state.lastDailyBetsDate === today) {
    logger.info("Daily best bets already sent", { date: today });
    return false;
  }

  logger.info("Daily best bets generation started", { date: today, force });
  const odds = await fetchAllOdds();
  const bets = rankBestBets(odds.events, { worldCupMode: config.worldCupMode });
  health.lastDailyCheckAt = new Date().toISOString();
  health.counters.dailyChecks += 1;
  if (!bets.length) {
    logger.warn("No daily best bets available", { date: today, oddsEvents: odds.events.length });
    return false;
  }

  await sendTelegramMessage(formatDailyBestBets(bets, today));
  health.lastTelegramPostAt = new Date().toISOString();
  health.counters.telegramPosts += 1;
  state.lastDailyBetsDate = today;
  saveState(state);
  logger.info("Daily best bets sent", { date: today, bets: bets.length });
  return true;
}

async function checkDailySchedule() {
  if (localHour() !== config.dailyBestBetsHour) return;
  await postDailyBestBets();
}

async function checkOddsMovement() {
  logger.info("Odds movement check started");
  const odds = await fetchAllOdds();
  const markets = odds.events.flatMap(extractMarkets);
  health.lastOddsCheckAt = new Date().toISOString();
  health.counters.oddsChecks += 1;
  logger.info("Odds movement check completed", { events: odds.events.length, markets: markets.length });

  for (const market of markets) {
    const snapshotKey = `${market.eventId}:${market.bookmaker}:${market.market}:${market.label}`;
    const previous = state.oddsSnapshot[snapshotKey];
    state.oddsSnapshot[snapshotKey] = market.price;

    if (!previous) continue;
    const movement = (market.price - previous) / previous;
    if (Math.abs(movement) < config.oddsMoveThreshold) continue;

    const direction = movement > 0 ? "drifted up" : "shortened";
    const confidence = `${Math.round(Math.min(92, 62 + Math.abs(movement) * 100))}%`;
    logger.info("Significant odds movement detected", {
      match: market.match,
      market: market.market,
      label: market.label,
      bookmaker: market.bookmaker,
      previous,
      current: market.price,
      movement,
    });
    await postIfNew(
      `odds:${snapshotKey}:${market.price}`,
      formatAdamAlert({
        match: market.match,
        score: "Pre-match",
        minute: "Odds movement",
        recommendedBet: `${market.label} at ${market.price.toFixed(2)} (${direction} from ${previous.toFixed(2)})`,
        confidence,
        extra: `Bookmaker: ${market.bookmaker}`,
      }),
    );
  }

  saveState(state);
}

async function runLoop() {
  validateConfig();
  startHealthServer(health);
  health.status = "running";
  logger.info("ADAM Alerts Telegram System started", {
    dailyBestBetsHour: config.dailyBestBetsHour,
    timezone: config.timezone,
    livePollSeconds: config.livePollSeconds,
    oddsPollSeconds: config.oddsPollSeconds,
    worldCupMode: config.worldCupMode,
  });

  let lastOddsCheck = 0;
  while (true) {
    const started = Date.now();
    try {
      health.status = "running";
      await checkLiveEvents();
      await checkDailySchedule();

      if (Date.now() - lastOddsCheck >= config.oddsPollSeconds * 1000) {
        await checkOddsMovement();
        lastOddsCheck = Date.now();
      }
    } catch (error) {
      health.status = "degraded";
      health.lastErrorAt = new Date().toISOString();
      health.lastError = error.message;
      health.counters.errors += 1;
      logger.error("Worker loop error", error);
    }

    const elapsed = Date.now() - started;
    await sleep(Math.max(1000, config.livePollSeconds * 1000 - elapsed));
  }
}

async function main() {
  validateConfig();
  const args = new Set(process.argv.slice(2));
  if (args.has("--daily")) {
    await postDailyBestBets({ force: true });
    return;
  }
  if (args.has("--once")) {
    await checkLiveEvents();
    await checkDailySchedule();
    await checkOddsMovement();
    return;
  }
  await runLoop();
}

main().catch((error) => {
  health.status = "degraded";
  health.lastErrorAt = new Date().toISOString();
  health.lastError = error.message;
  health.counters.errors += 1;
  logger.error("Fatal worker error", error);
  process.exitCode = 1;
});
