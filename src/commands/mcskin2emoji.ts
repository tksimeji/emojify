import {
  type ChatInputCommandInteraction,
  Locale,
  PermissionFlagsBits,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
  SlashCommandBuilder,
} from "discord.js";
import { MinecraftSkinResolveError, provideMinecraftSkinEmoji } from "../providers/minecraft-skin.js";
import {
  describeEmojiCreateError,
  i18n,
  requireBotExpressionPermission,
  requireGuildPermission,
} from "../utils/command-helpers.js";

export function buildMCSkin2EmojiCommand(): RESTPostAPIChatInputApplicationCommandsJSONBody {
  return new SlashCommandBuilder()
    .setName("mcskin2emoji")
    .setDescription("Make a custom emoji from a Minecraft skin")
    .setDescriptionLocalization(Locale.Japanese, "Minecraftのスキンから絵文字をつくるよ")
    .setDefaultMemberPermissions(PermissionFlagsBits.CreateGuildExpressions)
    .addStringOption((option) =>
      option
        .setName("username")
        .setDescription("Minecraft username to use")
        .setDescriptionLocalization(Locale.Japanese, "スキンを使うMinecraftのユーザー名")
        .setRequired(true)
        .setMaxLength(16),
    )
    .toJSON();
}

export async function executeMCSkin2EmojiCommand(interaction: ChatInputCommandInteraction) {
  const guild = await requireGuildPermission(interaction, PermissionFlagsBits.CreateGuildExpressions);
  if (!guild) {
    return;
  }

  const username = interaction.options.getString("username", true).trim();

  await interaction.deferReply({ ephemeral: true });
  if (!(await requireBotExpressionPermission(interaction, guild))) {
    return;
  }

  try {
    const buffer = await provideMinecraftSkinEmoji({ username: username });
    const name = normalizeEmojiName(username);

    const emoji = await guild.emojis.create({
      attachment: buffer,
      name,
      reason: `Created by ${interaction.user.tag}`,
    });

    await interaction.editReply(
      i18n(interaction, {
        [Locale.EnglishUS]: `All set. ${emoji.toString()} is ready from \`${username}\` as \`:${emoji.name}:\`.`,
        [Locale.Japanese]: `できあがり。${emoji.toString()} は \`${username}\` さんのスキンで作ったよ。名前は \`:${emoji.name}:\` だよ。`,
      }),
    );
  } catch (error) {
    console.error("Failed to create Minecraft skin emoji:", error);
    await interaction.editReply(describeMinecraftSkinEmojiError(interaction, error));
  }
}

function describeMinecraftSkinEmojiError(interaction: ChatInputCommandInteraction, error: unknown) {
  if (!(error instanceof MinecraftSkinResolveError)) {
    return describeEmojiCreateError(interaction, error);
  }

  switch (error.code) {
    case "profile_not_found":
      return i18n(interaction, {
        [Locale.EnglishUS]: "That Minecraft username does not exist.",
        [Locale.Japanese]: "そのMinecraftユーザー名は見つかりませんでした。",
      });
    case "profile_api_error":
    case "session_api_error":
      return i18n(interaction, {
        [Locale.EnglishUS]: "The Minecraft profile API did not respond successfully. Try again later.",
        [Locale.Japanese]: "MinecraftのプロフィールAPIから正しく応答がありませんでした。時間をおいて再度お試しください。",
      });
    case "textures_missing":
    case "skin_missing":
      return i18n(interaction, {
        [Locale.EnglishUS]: "That Minecraft profile does not have a skin I can use.",
        [Locale.Japanese]: "そのMinecraftプロフィールには、使用できるスキンがありません。",
      });
    case "skin_fetch_error":
      return i18n(interaction, {
        [Locale.EnglishUS]: "I could not download the Minecraft skin image. Try again later.",
        [Locale.Japanese]: "Minecraftスキン画像をダウンロードできませんでした。時間をおいて再度お試しください。",
      });
  }
}

function normalizeEmojiName(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9_]+/g, "_")
    .replaceAll(/^_+|_+$/g, "")
    .slice(0, 32);

  return normalized.length >= 2 ? normalized : `mc_${Date.now().toString(36)}`;
}
