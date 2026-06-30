import * as path from "node:path";
import { tokenizerNode } from "@saeris/kuromoji";
import {
  type ChatInputCommandInteraction,
  Locale,
  PermissionFlagsBits,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
  SlashCommandBuilder,
} from "discord.js";
import { toRomaji } from "wanakana";
import { provideTextEmoji } from "../providers/text.js";
import { i18n, requireGuildPermission } from "../utils/command-helpers.js";
import { describeEmojiCreateError, isValidEmojiName } from "../utils/emoji-helpers.js";

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
    .setDescription("Make a custom emoji from text")
    .setDescriptionLocalization(Locale.Japanese, "文字から小さな絵文字をつくるよ")
    .setDefaultMemberPermissions(PermissionFlagsBits.CreateGuildExpressions)
    .addStringOption((option) =>
      option
        .setName("text")
        .setDescription("Text to place on the emoji")
        .setDescriptionLocalization(Locale.Japanese, "絵文字にする文字")
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
        .setName("register_as")
        .setDescription("Register the emoji with this name")
        .setDescriptionLocalization(Locale.Japanese, "この名前で絵文字を登録します")
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
    const attachment = await provideTextEmoji({ text, color });
    const name = registerAs ?? (await convertToRomaji(text));

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
    await interaction.editReply(describeEmojiCreateError(interaction, error));
  }
}

async function convertToRomaji(text: string) {
  const dicPath = path.resolve(process.cwd(), "node_modules/@saeris/kuromoji/dict");

  const tokenizer = await tokenizerNode(dicPath);

  const tokens = tokenizer.tokenize(text);
  const readingText = tokens.map((token) => token.reading ?? token.surface_form).join("");
  return toRomaji(readingText);
}
