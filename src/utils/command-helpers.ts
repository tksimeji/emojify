import {
  type ChatInputCommandInteraction,
  DiscordAPIError,
  type Guild,
  type Interaction,
  Locale,
  type PermissionResolvable,
  PermissionFlagsBits,
  RESTJSONErrorCodes,
} from "discord.js";

export function i18n(
  interaction: Interaction,
  translations: Partial<Record<Locale, string>> & Record<Locale.EnglishUS, string>,
): string {
  return translations[interaction.locale] ?? translations[Locale.EnglishUS];
}

export async function requireGuildPermission(
  interaction: ChatInputCommandInteraction,
  permission: PermissionResolvable,
): Promise<Guild | null> {
  const guild = interaction.guild;
  if (!guild) {
    await interaction.reply({
      content: i18n(interaction, {
        [Locale.EnglishUS]: "Use this command in a server so I can create the emoji there.",
        [Locale.Japanese]: "絵文字を作成するサーバー内でこのコマンドを実行してください。",
      }),
      ephemeral: true,
    });
    return null;
  }

  const guildMember = await guild.members.fetch(interaction.user.id);
  if (!guildMember.permissions.has(permission)) {
    await interaction.reply({
      content: i18n(interaction, {
        [Locale.EnglishUS]: "You need permission to create expressions in this server.",
        [Locale.Japanese]: "このサーバーで絵文字を作成する権限が必要です。",
      }),
      ephemeral: true,
    });
    return null;
  }

  return guild;
}

export async function requireBotExpressionPermission(interaction: ChatInputCommandInteraction, guild: Guild): Promise<boolean> {
  const botMember = guild.members.me ?? (await guild.members.fetchMe());
  if (botMember.permissions.has(PermissionFlagsBits.CreateGuildExpressions)) {
    return true;
  }

  await interaction.editReply(
    i18n(interaction, {
      [Locale.EnglishUS]: "I need permission to create expressions before I can add that emoji.",
      [Locale.Japanese]: "その絵文字を追加するには、Botに絵文字を作成する権限が必要です。",
    }),
  );
  return false;
}

export function describeEmojiCreateError(interaction: Interaction, error: unknown) {
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
        [Locale.Japanese]: "Botに、このサーバーで絵文字を作成する権限がありません。",
      });
    }
  }

  return i18n(interaction, {
    [Locale.EnglishUS]: "I couldn't create that emoji because Discord rejected the request.",
    [Locale.Japanese]: "Discordへの登録リクエストが失敗したため、絵文字を作成できませんでした。",
  });
}
