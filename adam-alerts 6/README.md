# ADAM Alerts

Node.js Telegram alert worker for football betting intelligence.

## Railway Start Command

```bash
npm start
```

## Scripts

```bash
npm start
npm run alerts
npm run alerts:once
npm run test:telegram
```

## Health Check

```http
GET /health
```

Response:

```json
{
  "status": "ok",
  "service": "ADAM Alerts"
}
```

## Environment Variables

Set these in Railway. Do not commit real secret values.

```bash
API_FOOTBALL_KEY=
ODDS_API_KEY=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHANNEL_ID=@adambet_alert
```

Optional:

```bash
TIMEZONE=America/New_York
WORLD_CUP_MODE=true
LIVE_POLL_SECONDS=60
ODDS_POLL_SECONDS=300
DAILY_BEST_BETS_HOUR=8
ODDS_MOVE_THRESHOLD=0.12
ADAM_ALERTS_STATE_PATH=/data/adam-alerts-state.json
DRY_RUN=false
```

## What Runs 24/7

- API-Football live match polling every 60 seconds.
- Immediate Telegram goal alerts.
- Immediate Telegram red card alerts.
- Daily betting report every morning at 8:00 AM in `TIMEZONE`.
- FIFA World Cup match prioritization when `WORLD_CUP_MODE=true`.
- Significant odds movement monitoring through The Odds API.
- Duplicate alert prevention with local state.
- Railway restart-on-failure through `railway.json`.

## Railway Deployment

1. Push this project to GitHub.
2. Open Railway and create a new project.
3. Choose `Deploy from GitHub repo`.
4. Select this repository.
5. In the Railway service, open `Variables`.
6. Add:

```bash
API_FOOTBALL_KEY=your_api_football_key
ODDS_API_KEY=your_odds_api_key
TELEGRAM_BOT_TOKEN=your_full_telegram_bot_token
TELEGRAM_CHANNEL_ID=@adambet_alert
TIMEZONE=America/New_York
WORLD_CUP_MODE=true
LIVE_POLL_SECONDS=60
ODDS_POLL_SECONDS=300
DAILY_BEST_BETS_HOUR=8
DRY_RUN=false
```

7. Confirm the start command is:

```bash
npm start
```

8. Deploy the service.
9. Open the Railway public URL plus `/health`.
10. Confirm the response is:

```json
{
  "status": "ok",
  "service": "ADAM Alerts"
}
```

11. Run this locally or from Railway logs/console to verify Telegram:

```bash
npm run test:telegram
```

12. Confirm the bot posts to `@adambet_alert`.

## Notes

The Telegram bot must be an admin in `@adambet_alert`. Railway will keep the worker running after Codex is closed because the process runs on Railway infrastructure, not inside the Codex session.
