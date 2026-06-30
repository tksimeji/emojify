import {
  type ChatInputCommandInteraction,
  type Guild,
  type Interaction,
  Locale,
  type PermissionResolvable,
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
        [Locale.Japanese]: "絵文字を作成するサーバーからこのコマンドを実行してください。",
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
        [Locale.Japanese]: "このサーバーで絵文字を作成する権限がありません。",
      }),
      ephemeral: true,
    });
    return null;
  }

  return guild;
}
