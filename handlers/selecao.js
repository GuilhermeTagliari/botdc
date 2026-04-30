const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { pendingFichas } = require('../state');
const config = require('../config');

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

  const embed = new EmbedBuilder()
    .setTitle('📋  Nova Ficha de Recrutamento')
    .setColor(0xFEE75C)
    .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
    .setDescription('Uma nova ficha aguarda aprovação.')
    .addFields(
      { name: '👤 Nome',          value: dados.nome,            inline: true },
      { name: '🪪 ID',            value: `\`${dados.id}\``,     inline: true },
      { name: '📞 Telefone',      value: dados.telefone,        inline: true },
      { name: '👥 Discord',       value: `<@${userId}>`,        inline: true },
      { name: '🤝 Recrutado por', value: `<@${recrutadorId}>`,  inline: true },
      { name: '🕐 Data/hora',     value: timestamp,             inline: true },
    )
    .setFooter({ text: '⏳ Aguardando aprovação' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`aprovar_${userId}`).setLabel('✅ Aprovar').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`reprovar_${userId}`).setLabel('❌ Reprovar').setStyle(ButtonStyle.Danger),
  );

  try {
    const canal = await interaction.guild.channels.fetch(config.CANAL_APROVACAO);
    await canal.send({ embeds: [embed], components: [row] });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao enviar ficha:`, err);
    await interaction.editReply({ content: '❌ Erro ao enviar ficha. Tente novamente.', components: [] });
    return;
  }

  await interaction.editReply({ content: '✅ Ficha enviada! Aguarde a aprovação de um recrutador.', components: [] });
}

module.exports = { handleSelecaoRecrutador };
