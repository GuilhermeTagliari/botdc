const {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const config = require('../config');

async function handleRecrutamentoChannel(client, guild) {
  try {
    const channel = await guild.channels.fetch(config.CANAL_RECRUTAMENTO);
    if (!channel) return;

    const mensagens = await channel.messages.fetch({ limit: 50 });
    const jaExiste = mensagens.some(
      (m) => m.author.id === client.user.id && m.embeds.length > 0 && m.components.length > 0,
    );

    if (jaExiste) {
      console.log(`[${new Date().toISOString()}] Mensagem de recrutamento já existe — nenhuma ação necessária.`);
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('RECRUTAMENTO CRX')
      .setDescription(
        'Quer fazer parte do nosso time? Preencha sua ficha clicando no botão abaixo.\n\n' +
        '**1.** Clique em **Preencher Ficha**\n' +
        '**2.** Preencha seus dados no formulário\n' +
        '**3.** Selecione quem te recrutou\n' +
        '**4.** Aguarde a análise de um recrutador\n\n' +
        '*Você será notificado via DM sobre a decisão.*',
      )
      .setColor(0xFF0000)
      .setImage('https://cdn.discordapp.com/attachments/1497039765118255282/1497069523269058651/Logo_CRX_com_brilho_metalico_e_vermelho.jpg?ex=69ee2864&is=69ecd6e4&hm=27a99f4e3c95b941f73a2c4b924fd805b34d59519b976a2445c4d875f5b6c5fc&')
      .setFooter({ text: 'CRX • Recrutamento' });

    const botao = new ButtonBuilder()
      .setCustomId('abrir_ficha')
      .setLabel('📝 Preencher Ficha')
      .setStyle(ButtonStyle.Primary);

    await channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(botao)] });
    console.log(`[${new Date().toISOString()}] Mensagem de recrutamento enviada em: ${guild.name}`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao inicializar canal de recrutamento:`, err);
  }
}

async function handleBotao(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('modal_ficha')
    .setTitle('Ficha de Recrutamento');

  const campoNome = new TextInputBuilder()
    .setCustomId('campo_nome')
    .setLabel('Nome completo')
    .setPlaceholder('Ex: João Silva')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(60)
    .setRequired(true);

  const campoId = new TextInputBuilder()
    .setCustomId('campo_id')
    .setLabel('ID (somente números)')
    .setPlaceholder('Ex: 12345')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(20)
    .setRequired(true);

  const campoTelefone = new TextInputBuilder()
    .setCustomId('campo_telefone')
    .setLabel('Telefone / WhatsApp')
    .setPlaceholder('Ex: (11) 99999-9999')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(20)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(campoNome),
    new ActionRowBuilder().addComponents(campoId),
    new ActionRowBuilder().addComponents(campoTelefone),
  );

  await interaction.showModal(modal);
}

module.exports = { handleRecrutamentoChannel, handleBotao };
