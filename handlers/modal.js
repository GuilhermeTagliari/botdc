const {
  UserSelectMenuBuilder,
  ActionRowBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
} = require('discord.js');
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

  const select = new UserSelectMenuBuilder()
    .setCustomId('selecionar_recrutador')
    .setPlaceholder('🤝 Selecione quem te recrutou...')
    .setMinValues(1)
    .setMaxValues(1);

  const container = new ContainerBuilder()
    .setAccentColor(0x5865F2)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## 📋 Ficha de Recrutamento\n\n` +
        `Última etapa: selecione o membro que te recrutou.\n\n` +
        `**👤 Nome:** ${nome}  ·  **🪪 ID:** \`${id}\`  ·  **📞 Telefone:** ${telefone}`,
      ),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(select),
    );

  await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
}

module.exports = { handleModal };
