import { createApp } from "./app.js";
import { config } from "./config.js";
import { logger } from "./utils/logger.js";

try {
  const app = await createApp();
  const server = app.listen(config.PORT, () => {
    logger.info(`Backend listening on http://localhost:${config.PORT}`);
  });

  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      logger.fatal(
        { port: config.PORT },
        `Port ${config.PORT} is already in use. Stop the other backend process and retry.`
      );
      process.exit(1);
      return;
    }
    logger.fatal({ error }, "Backend server failed");
    process.exit(1);
  });
} catch (error) {
  logger.fatal({ error }, "Failed to start backend");
  process.exit(1);
}
