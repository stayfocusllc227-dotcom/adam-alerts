import { config } from "./config.js";
import { fetchJson } from "./http.js";

function normalizeChannelId(value) {
  if (value.startsWith("https://t.me/")) return `@${value.replace("https://t.me/", "").replace(/^@/, "")}`;
  return value;
}

export async function sendTelegramMessage(text) {
  const channelId = normalizeChannelId(config.telegramChannelId);

  if (config.dryRun) {
    console.log(`[DRY_RUN] Telegram -> ${channelId}\n${text}\n`);
    return { ok: true, dryRun: true };
  }

  const url = new URL(`https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`);
  return fetchJson(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: channelId,
      text,
      disable_web_page_preview: true,
    }),
  });
}
