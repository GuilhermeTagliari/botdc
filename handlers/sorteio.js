const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const fs   = require('fs');
const path = require('path');

const ARQUIVO  = path.join(__dirname, '../data/sorteios.json');
const sorteios = new Map();

const IMG = 'https://cdn.discordapp.com/attachments/1497039765118255282/1497069523269058651/Logo_CRX_com_brilho_metalico_e_vermelho.jpg?ex=69ee2864&is=69ecd6e4&hm=27a99f4e3c95b941f73a2c4b924fd805b34d59519b976a2445c4d875f5b6c5fc&';

function lerDados() {
  try { return JSON.parse(fs.readFileSync(ARQUIVO, 'utf8')); } catch { return {}; }
}

function salvarDados() {
  const dados = {};
  for (const [id, s] of sorteios.entries()) {
    dados[id] = { ...s, participantes: [...s.participantes] };
  }
  fs.writeFileSync(ARQUIVO, JSON.stringify(dados, null, 2));
}

function criarEmbed(s) {
  return new EmbedBuilder()
    .setTitle('🎉  SORTEIO')
    .setColor(0xFF0000)
    .setDescription(`**Prêmio:** ${s.premio}`)
    .addFields(
      { name: '⏰ Encerra',       value: `<t:${Math.floor(s.fim / 1000)}:R>`, inline: true },
      { name: '👥 Participantes', value: `**${s.participantes.length}**`,      inline: true },
      { name: '📝 Criado por',    value: `<@${s.autorId}>`,                    inline: true },
    )
    .setImage(IMG)
    .setFooter({ text: 'CRX • Clique em Participar para entrar' })
    .setTimestamp();
}

function criarEmbedFinal(s, vencedor) {
  return new EmbedBuilder()
    .setTitle('🎉  SORTEIO ENCERRADO')
    .setColor(vencedor ? 0x57F287 : 0x99AAB5)
    .setDescription(`**Prêmio:** ${s.premio}`)
    .addFields(
      { name: '🏆 Vencedor',      value: vencedor ? `<@${vencedor}>` : '*Ninguém participou*', inline: true },
      { name: '👥 Participantes', value: `**${s.participantes.length}**`,                       inline: true },
      { name: '📝 Criado por',    value: `<@${s.autorId}>`,                                     inline: true },
    )
    .setImage(IMG)
    .setFooter({ text: 'CRX • Sorteio encerrado' })
    .setTimestamp();
}

async function encerrarSorteio(client, id) {
  const s = sorteios.get(id);
  if (!s || s.encerrado) return;
  s.encerrado = true;
  salvarDados();

  try {
    const guild    = await client.guilds.fetch(s.guildId);
    const canal    = await guild.channels.fetch(s.channelId);
    const msg      = await canal.messages.fetch(s.messageId);
    const vencedor = s.participantes.length > 0
      ? s.participantes[Math.floor(Math.random() * s.participantes.length)]
      : null;

    await msg.edit({ embeds: [criarEmbedFinal(s, vencedor)], components: [] });
    if (vencedor) {
      await canal.send({ content: `🎉 Parabéns <@${vencedor}>! Você ganhou **${s.premio}**!` });
    }
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao encerrar sorteio:`, err);
  }
}

async function handleSorteioCmd(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const canal  = interaction.options.getChannel('canal');
  const premio = interaction.options.getString('premio');
  const tempo  = interaction.options.getInteger('tempo');
  const fim    = Date.now() + tempo * 60 * 1000;
  const id     = Date.now().toString(36);

  const s = {
    premio, fim,
    participantes: [],
    channelId: canal.id,
    messageId: null,
    encerrado: false,
    autorId: interaction.user.id,
    guildId:  interaction.guild.id,
  };
  sorteios.set(id, s);

  try {
    const botao = new ButtonBuilder()
      .setCustomId(`sorteio_entrar_${id}`)
      .setLabel('🎟️ Participar')
      .setStyle(ButtonStyle.Primary);

    const msg = await canal.send({ embeds: [criarEmbed(s)], components: [new ActionRowBuilder().addComponents(botao)] });
    s.messageId = msg.id;
    salvarDados();

    setTimeout(() => encerrarSorteio(interaction.client, id), tempo * 60 * 1000);

    await interaction.editReply({ content: `✅ Sorteio criado em ${canal}! Encerra <t:${Math.floor(fim / 1000)}:R>.` });
  } catch {
    sorteios.delete(id);
    await interaction.editReply({ content: '❌ Não consegui criar o sorteio. Verifique as permissões.' });
  }
}

async function handleSorteioBtn(interaction, id) {
  await interaction.deferReply({ ephemeral: true });

  const s = sorteios.get(id);
  if (!s || s.encerrado) {
    await interaction.editReply({ content: '❌ Este sorteio já foi encerrado.' });
    return;
  }

  const userId  = interaction.user.id;
  const jaEntrou = s.participantes.includes(userId);

  if (jaEntrou) {
    s.participantes = s.participantes.filter((p) => p !== userId);
    await interaction.editReply({ content: '↩️ Você saiu do sorteio.' });
  } else {
    s.participantes.push(userId);
    await interaction.editReply({ content: '✅ Você entrou no sorteio! Clique novamente para sair.' });
  }
  salvarDados();

  try {
    const canal = await interaction.guild.channels.fetch(s.channelId);
    const msg   = await canal.messages.fetch(s.messageId);
    const botao = new ButtonBuilder().setCustomId(`sorteio_entrar_${id}`).setLabel('🎟️ Participar').setStyle(ButtonStyle.Primary);
    await msg.edit({ embeds: [criarEmbed(s)], components: [new ActionRowBuilder().addComponents(botao)] });
  } catch {}
}

async function restaurarSorteios(client) {
  const dados = lerDados();
  for (const [id, s] of Object.entries(dados)) {
    if (s.encerrado) continue;
    sorteios.set(id, { ...s, participantes: s.participantes ?? [] });
    const restante = s.fim - Date.now();
    if (restante <= 0) {
      encerrarSorteio(client, id);
    } else {
      setTimeout(() => encerrarSorteio(client, id), restante);
    }
  }
}

module.exports = { handleSorteioCmd, handleSorteioBtn, restaurarSorteios };
