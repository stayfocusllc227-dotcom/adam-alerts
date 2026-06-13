import { validateConfig } from "./config.js";
import { logger } from "./logger.js";
import { sendTelegramMessage } from "./telegram.js";

async function main() {
  validateConfig();
  const result = await sendTelegramMessage("✅ ADAM Alerts is online.");
  logger.info("Telegram connectivity test delivered", {
    ok: result.ok,
    messageId: result.result?.message_id,
    chat: result.result?.chat?.username || result.result?.chat?.title,
  });
}

main().catch((error) => {
  logger.error("Telegram connectivity test failed", error);
  process.exitCode = 1;
});
