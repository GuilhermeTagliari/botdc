const { UserSelectMenuBuilder, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const { pendingFichas } = require('../state');

async function handleModal(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const nome     = interaction.fields.getTextInputValue('campo_nome');
  const id       = interaction.fields.getTextInputValue('campo_id');
  const telefone = interaction.fields.getTextInputValue('campo_telefone');
  const userId   = interaction.user.id;

  if (!/^\d+$/.test(id)) {
    await interaction.editReply({ content: '❌ O campo **ID** aceita apenas números. Preencha a ficha novamente.' });
    return;
  }

  pendingFichas.set(userId, { nome, id, telefone });

  const embed = new EmbedBuilder()
    .setTitle('📋 Ficha de Recrutamento')
    .setDescription('Última etapa: selecione o membro que te recrutou.')
    .setColor(0x5865F2)
    .addFields(
      { name: '👤 Nome',     value: nome,     inline: true },
      { name: '🪪 ID',       value: id,       inline: true },
      { name: '📞 Telefone', value: telefone, inline: true },
    );

  const select = new UserSelectMenuBuilder()
    .setCustomId('selecionar_recrutador')
    .setPlaceholder('🤝 Selecione quem te recrutou...')
    .setMinValues(1)
    .setMaxValues(1);

  const row = new ActionRowBuilder().addComponents(select);

  await interaction.editReply({ embeds: [embed], components: [row] });
}

module.exports = { handleModal };
