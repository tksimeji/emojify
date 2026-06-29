import { Client, GatewayIntentBits } from "discord.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

async function main(): Promise<void> {
  console.log("Starting...");

  const token = process.env.BOT_TOKEN;
  if (!token) {
    throw new Error("BOT_TOKEN not set");
  }

  client.once("clientReady", (readyClient) => {
    console.log(`Successfully logged in as ${readyClient.user.tag}!`);
  });

  client.on("error", (error) => {
    console.error("Discord client error:", error);
  });

  await client.login(token);
}

async function shutdown(signal: string): Promise<void> {
  console.log(`\nReceived ${signal}, shutting down...`);

  try {
    await client.destroy();
    console.log("Client destroyed successfully");
    process.exit(0);
  } catch (error) {
    console.log("Error during shutdown: ", error);
    process.exit(1);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

main().catch((error) => {
  console.error("Failed to start application:", error);
  process.exit(1);
});
