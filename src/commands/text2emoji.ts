import {
  type ChatInputCommandInteraction,
  Locale,
  PermissionFlagsBits,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
  SlashCommandBuilder,
} from 'discord.js';
import {provideTextEmoji} from '../providers/text.js';
import {
  describeEmojiCreateError,
  i18n,
  requireBotExpressionPermission,
  requireGuildPermission,
} from '../utils/command-helpers.js';

const DEFAULT_COLOR = "#EC71A1";

const COLORS = [
  { name: "Pink", name_localizations: { [Locale.Japanese]: "ピンク" }, value: DEFAULT_COLOR },
  { name: "Cyan", name_localizations: { [Locale.Japanese]: "シアン" }, value: "#3AB0C7" },
  { name: "Green", name_localizations: { [Locale.Japanese]: "グリーン" }, value: "#38BA91" },
  { name: "Gold", name_localizations: { [Locale.Japanese]: "ゴールド" }, value: "#EAA822" },
  { name: "Blurple", name_localizations: { [Locale.Japanese]: "ブラー プル" }, value: "#5865F2" },
];

export function buildText2EmojiCommand(): RESTPostAPIChatInputApplicationCommandsJSONBody {
  return new SlashCommandBuilder()
    .setName("text2emoji")
    .setDescription("Make a little custom emoji from text")
    .setDescriptionLocalization(Locale.Japanese, "文字から小さな絵文字をつくるよ")
    .setDefaultMemberPermissions(PermissionFlagsBits.CreateGuildExpressions)
    .addStringOption((option) =>
      option
        .setName("text")
        .setDescription("Text to place on the emoji")
        .setDescriptionLocalization(Locale.Japanese, "絵文字にのせる文字")
        .setRequired(true)
        .setMaxLength(16),
    )
    .addStringOption((option) =>
      option
        .setName("color")
        .setDescription("Color for the text")
        .setDescriptionLocalization(Locale.Japanese, "文字の色")
        .setRequired(false)
        .setChoices(...COLORS),
    )
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("Name for the new emoji")
        .setDescriptionLocalization(Locale.Japanese, "新しい絵文字の名前")
        .setRequired(false)
        .setMaxLength(16),
    )
    .toJSON();
}

export async function executeText2EmojiCommand(interaction: ChatInputCommandInteraction) {
  const guild = await requireGuildPermission(interaction, PermissionFlagsBits.CreateGuildExpressions);
  if (!guild) {
    return;
  }

  const text = interaction.options.getString("text", true).trim();
  const color = interaction.options.getString("color", false) ?? DEFAULT_COLOR;
  const name = resolveEmojiName(interaction.options.getString("name", false));

  await interaction.deferReply({ ephemeral: true });
  if (!(await requireBotExpressionPermission(interaction, guild))) {
    return;
  }

  try {
    const buffer = await provideTextEmoji({ text, color });

    const emoji = await guild.emojis.create({
      attachment: buffer,
      name,
      reason: `Created by ${interaction.user.tag}`,
    });

    await interaction.editReply(
      i18n(interaction, {
        [Locale.EnglishUS]: `All set. ${emoji.toString()} is ready as \`:${emoji.name}:\`.`,
        [Locale.Japanese]: `できあがり。${emoji.toString()} は \`:${emoji.name}:\` で使ってね。`,
      }),
    );
  } catch (error) {
    console.error("Failed to create text emoji:", error);
    await interaction.editReply(describeEmojiCreateError(interaction, error));
  }
}

function resolveEmojiName(inputName: string | null) {
  return normalizeEmojiName(inputName ?? "") || `emoji_${Date.now().toString(36)}`;
}

function normalizeEmojiName(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9_]+/g, "_")
    .replaceAll(/^_+|_+$/g, "")
    .slice(0, 32);

  if (normalized.length >= 2) {
    return normalized;
  }

  return normalized ? `emoji_${normalized}`.slice(0, 32) : "";
}
