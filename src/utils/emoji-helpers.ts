import { DiscordAPIError, type Interaction, Locale, RESTJSONErrorCodes } from "discord.js";
import { i18n } from "./command-helpers.js";

const EMOJI_NAME_PATTERN = /^[A-Za-z0-9_]{2,32}$/;

export function isValidEmojiName(name: string): boolean {
  return EMOJI_NAME_PATTERN.test(name);
}

export function normalizeEmojiName(name: string): string {
  if (isValidEmojiName(name)) {
    return name;
  }

  return name
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9_]+/g, "_")
    .replaceAll(/^_+|_+$/g, "")
    .slice(0, 32)
    .padEnd(2, "_");
}

export function describeEmojiCreateError(interaction: Interaction, error: unknown): string {
  if (error instanceof DiscordAPIError) {
    if (error.code === RESTJSONErrorCodes.MaximumNumberOfEmojisReached) {
      return i18n(interaction, {
        [Locale.EnglishUS]: "This server has no available custom emoji slots.",
        [Locale.Japanese]: "このサーバーには、カスタム絵文字の空き枠がありません。",
      });
    }

    if (error.code === RESTJSONErrorCodes.MissingPermissions) {
      return i18n(interaction, {
        [Locale.EnglishUS]: "I do not have permission to create expressions in this server.",
        [Locale.Japanese]: "Botに絵文字を作成する権限がありません。",
      });
    }
  }

  return i18n(interaction, {
    [Locale.EnglishUS]: "Sorry! I couldn't create that emoji because Discord API rejected the request.",
    [Locale.Japanese]: "DiscordへのAPIリクエストが失敗したため、絵文字を作成できませんでした。",
  });
}
