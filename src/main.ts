import { Client, Events, GatewayIntentBits } from "discord.js";
import { buildMCSkin2EmojiCommand, executeMCSkin2EmojiCommand } from "./commands/mcskin2emoji.js";
import { buildText2EmojiCommand, executeText2EmojiCommand } from "./commands/text2emoji.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

async function main(): Promise<void> {
  console.log("Starting...");

  const token = process.env.BOT_TOKEN;
  if (!token) {
    throw new Error("BOT_TOKEN not set");
  }

  client.once(Events.ClientReady, async (readyClient) => {
    console.log(`Successfully logged in as ${readyClient.user.tag}!`);

    await readyClient.application.commands.set([buildText2EmojiCommand(), buildMCSkin2EmojiCommand()]);
    console.log(`Registered global slash commands`);
  });

  client.on(Events.Error, (error) => {
    console.error("Discord client error:", error);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    if (interaction.commandName === "text2emoji") {
      await executeText2EmojiCommand(interaction);
    } else if (interaction.commandName === "mcskin2emoji") {
      await executeMCSkin2EmojiCommand(interaction);
    }
  });

  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) {
      return;
    }

    const botUser = client.user;
    if (!botUser || !message.mentions.has(botUser)) {
      return;
    }

    await message.reply({
      content: [
        `Hi ${message.author.displayName}, I'm ${botUser.displayName}.`,
        "I can create custom Discord emojis from text and Minecraft skins.",
        "Try `/text2emoji` or `/mcskin2emoji` to get started!",
      ].join("\n"),
    });
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
