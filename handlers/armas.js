const {
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
} = require('discord.js');
const config = require('../config');

const IMG = 'https://cdn.discordapp.com/attachments/1497039765118255282/1497069523269058651/Logo_CRX_com_brilho_metalico_e_vermelho.jpg?ex=69ee2864&is=69ecd6e4&hm=27a99f4e3c95b941f73a2c4b924fd805b34d59519b976a2445c4d875f5b6c5fc&';

async function handleArmasChannel(client, guild) {
  try {
    const channel = await guild.channels.fetch(config.CANAL_ARMAS_BTN);
    if (!channel) return;

    const mensagens = await channel.messages.fetch({ limit: 50 });
    const jaExiste = mensagens.some(
      (m) => m.author.id === client.user.id && m.flags.has(MessageFlags.IsComponentsV2),
    );

    if (jaExiste) {
      console.log(`[${new Date().toISOString()}] Mensagem de armas já existe — nenhuma ação necessária.`);
      return;
    }

    const container = new ContainerBuilder()
      .setAccentColor(0xFF0000)
      .addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL(IMG),
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          '# SOLICITAÇÃO DE ARMAS — CRX\n\n' +
          'Clique no botão abaixo para solicitar armas e munição.\n\n' +
          '**1.** Clique em **Solicitar Armas**\n' +
          '**2.** Preencha o formulário com a arma e quantidade de munição\n' +
          '**3.** Aguarde a aprovação da staff\n\n' +
          '-# Solicitações serão analisadas pela equipe.',
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('armas_solicitar').setLabel('🔫 Solicitar Armas').setStyle(ButtonStyle.Danger),
        ),
      );

    await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
    console.log(`[${new Date().toISOString()}] Mensagem de armas enviada em: ${guild.name}`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao enviar mensagem de armas:`, err);
  }
}

async function handleArmasBotao(interaction) {
  const modal = new ModalBuilder().setCustomId('modal_armas').setTitle('Solicitar Armas');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('armas_arma')
        .setLabel('Arma solicitada')
        .setPlaceholder('Ex: Pistola, Fuzil, Escopeta...')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(100)
        .setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('armas_muni')
        .setLabel('Quantidade de munição')
        .setPlaceholder('Ex: 200')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(10)
        .setRequired(true),
    ),
  );

  await interaction.showModal(modal);
}

async function handleModalArmas(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const { member } = interaction;
  const arma = interaction.fields.getTextInputValue('armas_arma');
  const muni = interaction.fields.getTextInputValue('armas_muni');

  try {
    const canalLog = await interaction.guild.channels.fetch(config.CANAL_ARMAS_LOG);
    const timestamp = `<t:${Math.floor(Date.now() / 1000)}:f>`;

    const container = new ContainerBuilder()
      .setAccentColor(0xFEE75C)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## 🔫  Solicitação de Armas\n\n` +
          `**Solicitante:** ${member}  ·  \`${member.nickname || member.user.username}\`\n\n` +
          `🔫 **Arma:** \`${arma}\`\n` +
          `🔶 **Munição:** \`${muni} balas\`\n\n` +
          `-# Solicitado em ${timestamp}`,
        ),
      );

    await canalLog.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
    await interaction.editReply({ content: '✅ Solicitação enviada! Aguarde a aprovação da staff.' });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao enviar solicitação de armas:`, err);
    await interaction.editReply({ content: '❌ Erro ao enviar a solicitação. Tente novamente mais tarde.' });
  }
}

module.exports = { handleArmasChannel, handleArmasBotao, handleModalArmas };
