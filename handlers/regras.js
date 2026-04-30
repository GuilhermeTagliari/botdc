const { EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const fs   = require('fs');
const path = require('path');

const ARQUIVO  = path.join(__dirname, '../data/regras.json');
const pendentes = new Map(); // userId -> channelId

const IMG = 'https://cdn.discordapp.com/attachments/1497039765118255282/1497069523269058651/Logo_CRX_com_brilho_metalico_e_vermelho.jpg?ex=69ee2864&is=69ecd6e4&hm=27a99f4e3c95b941f73a2c4b924fd805b34d59519b976a2445c4d875f5b6c5fc&';

function lerDados() {
  try { return JSON.parse(fs.readFileSync(ARQUIVO, 'utf8')); } catch { return {}; }
}

function salvarDados(dados) {
  fs.writeFileSync(ARQUIVO, JSON.stringify(dados, null, 2));
}

async function handleRegrasSetupCmd(interaction) {
  const canal = interaction.options.getChannel('canal');
  pendentes.set(interaction.user.id, canal.id);

  const modal = new ModalBuilder()
    .setCustomId('modal_regras')
    .setTitle('Painel de Regras');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('regras_texto')
        .setLabel('Regras do servidor')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Digite as regras aqui...\nUse **negrito**, *itálico*, etc.')
        .setMaxLength(4000)
        .setRequired(true),
    ),
  );

  await interaction.showModal(modal);
}

async function handleRegrasModal(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const channelId = pendentes.get(interaction.user.id);
  if (!channelId) {
    await interaction.editReply({ content: '❌ Sessão expirada. Use /regras-setup novamente.' });
    return;
  }
  pendentes.delete(interaction.user.id);

  const texto = interaction.fields.getTextInputValue('regras_texto');
  const dados = lerDados();

  const embed = new EmbedBuilder()
    .setTitle('📜  Regras do Servidor')
    .setColor(0xFF0000)
    .setDescription(texto)
    .setImage(IMG)
    .setFooter({ text: 'CRX • Leia e respeite as regras' })
    .setTimestamp();

  try {
    const canal = await interaction.guild.channels.fetch(channelId);

    if (dados.messageId && dados.channelId === channelId) {
      try {
        const msg = await canal.messages.fetch(dados.messageId);
        await msg.edit({ embeds: [embed] });
        await interaction.editReply({ content: '✅ Regras atualizadas!' });
        return;
      } catch {}
    }

    const msg = await canal.send({ embeds: [embed] });
    salvarDados({ messageId: msg.id, channelId: canal.id });
    await interaction.editReply({ content: '✅ Painel de regras enviado!' });
  } catch {
    await interaction.editReply({ content: '❌ Não consegui enviar no canal. Verifique as permissões.' });
  }
}

module.exports = { handleRegrasSetupCmd, handleRegrasModal };
