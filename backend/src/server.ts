import { createApp } from "./app.js";
import { config } from "./config.js";
import { logger } from "./utils/logger.js";

try {
  const app = await createApp();
  app.listen(config.PORT, () => {
    logger.info(`Backend listening on http://localhost:${config.PORT}`);
  });
} catch (error) {
  logger.fatal({ error }, "Failed to start backend");
  process.exit(1);
}

