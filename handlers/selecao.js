const {
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
  SeparatorBuilder,
  MessageFlags,
} = require('discord.js');
const { pendingFichas } = require('../state');
const config = require('../config');
const { txt } = require('../textos');

async function handleSelecaoRecrutador(interaction) {
  await interaction.deferUpdate();

  const userId = interaction.user.id;
  const dados  = pendingFichas.get(userId);

  if (!dados) {
    await interaction.followUp({ content: '❌ Sessão expirada. Preencha a ficha novamente.', ephemeral: true });
    return;
  }

  pendingFichas.delete(userId);

  const recrutadorId = interaction.values[0];
  const timestamp    = `<t:${Math.floor(Date.now() / 1000)}:F>`;

  const container = new ContainerBuilder()
    .setAccentColor(0xFEE75C)
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## 📋  Nova Ficha de Recrutamento\n` +
            `Uma nova ficha aguarda aprovação.\n\n` +
            `**👤 Nome:** ${dados.nome}\n` +
            `**🪪 ID:** \`${dados.id}\`\n` +
            `**🎮 Número in game:** ${dados.telefone}\n` +
            `**👥 Discord:** <@${userId}>\n` +
            `**🤝 Recrutado por:** <@${recrutadorId}>\n` +
            `**🕐 Data/hora:** ${timestamp}\n\n` +
            `-# ⏳ Aguardando aprovação`,
          ),
        )
        .setThumbnailAccessory(
          new ThumbnailBuilder().setURL(interaction.user.displayAvatarURL({ dynamic: true })),
        ),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`aprovar_${userId}`).setLabel(txt('recrut.btn_aprovar', '✅ Aprovar')).setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`reprovar_${userId}`).setLabel(txt('recrut.btn_reprovar', '❌ Reprovar')).setStyle(ButtonStyle.Danger),
      ),
    );

  try {
    const canal = await interaction.guild.channels.fetch(config.CANAL_APROVACAO);
    await canal.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao enviar ficha:`, err);
    await interaction.editReply({
      components: [new ContainerBuilder().setAccentColor(0x3498DB).addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ **Erro ao enviar ficha.** Tente novamente.'))],
      flags: MessageFlags.IsComponentsV2,
    });
    return;
  }

  await interaction.editReply({
    components: [new ContainerBuilder().setAccentColor(0x57F287).addTextDisplayComponents(new TextDisplayBuilder().setContent('✅ **Ficha enviada!** Aguarde a aprovação de um recrutador.'))],
    flags: MessageFlags.IsComponentsV2,
  });
}

module.exports = { handleSelecaoRecrutador };
