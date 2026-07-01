import {
  type ChatInputCommandInteraction,
  Locale,
  PermissionFlagsBits,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
  SlashCommandBuilder,
} from "discord.js";
import { MinecraftSkinResolveError, provideMinecraftSkinEmoji } from "../providers/minecraft-skin.js";
import { i18n, requireGuildPermission } from "../utils/command-helpers.js";
import { describeEmojiCreateError, isValidEmojiName, normalizeEmojiName } from "../utils/emoji-helpers.js";

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
    .addStringOption((option) =>
      option
        .setName("register_as")
        .setDescription("Register the emoji with this name")
        .setDescriptionLocalization(Locale.Japanese, "この名前で絵文字を登録します")
        .setRequired(false)
        .setMaxLength(16),
    )
    .toJSON();
}

export async function executeMCSkin2EmojiCommand(interaction: ChatInputCommandInteraction) {
  const guild = await requireGuildPermission(interaction, PermissionFlagsBits.CreateGuildExpressions);
  if (!guild) {
    return;
  }

  console.log(
    `${interaction.user.displayName} used /${interaction.commandName} in ${guild.name} (${guild.memberCount} members)`,
  );

  const username = interaction.options.getString("username", true).trim();
  const registerAs = interaction.options.getString("register_as", false);

  if (registerAs && !isValidEmojiName(registerAs)) {
    await interaction.reply(
      i18n(interaction, {
        [Locale.EnglishUS]: `\`${registerAs}\` is not a valid emoji name: https://support.discord.com/hc/en-us/articles/360036479811-How-to-Add-Custom-Emojis-on-Discord`,
        [Locale.Japanese]: `\`${registerAs}\` は絵文字名として使用できません: https://support.discord.com/hc/en-us/articles/360036479811-How-to-Add-Custom-Emojis-on-Discord`,
      }),
    );
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const attachment = await provideMinecraftSkinEmoji({ username: username });
    const name = registerAs ?? normalizeEmojiName(username);

    const emoji = await guild.emojis.create({
      attachment,
      name,
      reason: `Created by ${interaction.user.tag}`,
    });

    await interaction.editReply(
      i18n(interaction, {
        [Locale.EnglishUS]: `All set. ${emoji.toString()} is registered as \`:${emoji.name}:\`.`,
        [Locale.Japanese]: `できあがり。${emoji.toString()} を \`:${emoji.name}:\` として登録しました。`,
      }),
    );
  } catch (error) {
    console.error("Failed to create emoji:", error);
    await interaction.editReply(describeMinecraftSkinEmojiError(interaction, error));
  }
}

function describeMinecraftSkinEmojiError(interaction: ChatInputCommandInteraction, error: unknown): string {
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
        [Locale.EnglishUS]: "The Mojang API did not respond successfully. Try again later.",
        [Locale.Japanese]: "Mojang APIから正しく応答がありませんでした。時間をおいて再度お試しください。",
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
