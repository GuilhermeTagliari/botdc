const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');
const {
  ChannelType,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
} = require('discord.js');
const config = require('../config');

// guildId → { canalId, canalNome, inicio, membros: Map<userId, { entrou, total, nome }> }
const sessaoAtiva = new Map();

function formatarDuracao(ms) {
  if (ms < 1000) return 'menos de 1s';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

async function handleEntrarVoz(interaction) {
  const canal = interaction.options.getChannel('canal');

  if (canal.type !== ChannelType.GuildVoice) {
    await interaction.reply({ content: '❌ Selecione um canal de **voz**.', ephemeral: true });
    return;
  }

  try {
    const existente = getVoiceConnection(interaction.guild.id);
    if (existente) existente.destroy();

    joinVoiceChannel({
      channelId: canal.id,
      guildId:   interaction.guild.id,
      adapterCreator: interaction.guild.voiceAdapterCreator,
      selfMute: true,
      selfDeaf: true,
    });

    // Iniciar sessão de rastreamento
    const agora   = Date.now();
    const membros = new Map();

    // Registrar membros já presentes no canal
    const canalResolvido = interaction.guild.channels.cache.get(canal.id);
    if (canalResolvido?.members) {
      for (const [userId, member] of canalResolvido.members) {
        if (member.user.bot) continue;
        membros.set(userId, { entrou: agora, total: 0, nome: member.displayName });
      }
    }

    sessaoAtiva.set(interaction.guild.id, {
      canalId: canal.id, canalNome: canal.name, inicio: agora, membros,
    });

    const qtd = membros.size;
    await interaction.reply({
      content: `✅ Bot entrou em ${canal} — rastreando tempo de chamada.\n-# ${qtd > 0 ? `${qtd} membro(s) já presentes registrados.` : 'Aguardando membros...'}`,
      ephemeral: true,
    });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao entrar no canal de voz:`, err);
    await interaction.reply({ content: '❌ Não consegui entrar no canal de voz. Verifique as permissões do bot.', ephemeral: true });
  }
}

async function handleSairVoz(interaction) {
  const connection = getVoiceConnection(interaction.guild.id);
  if (!connection) {
    await interaction.reply({ content: '❌ O bot não está em nenhum canal de voz.', ephemeral: true });
    return;
  }

  connection.destroy();

  const sessao = sessaoAtiva.get(interaction.guild.id);
  sessaoAtiva.delete(interaction.guild.id);

  if (!sessao) {
    await interaction.reply({ content: '✅ Bot saiu do canal de voz.', ephemeral: true });
    return;
  }

  // Finalizar tempo dos membros ainda presentes
  const agora    = Date.now();
  const durTotal = agora - sessao.inicio;

  for (const dados of sessao.membros.values()) {
    if (dados.entrou) {
      dados.total += agora - dados.entrou;
      dados.entrou = null;
    }
  }

  // Ordenar por maior tempo
  const entradas = [...sessao.membros.entries()]
    .filter(([, d]) => d.total > 0)
    .sort(([, a], [, b]) => b.total - a.total);

  const lista = entradas.length > 0
    ? entradas.map(([userId, d], i) =>
        `\`${i + 1}.\` <@${userId}> — **${formatarDuracao(d.total)}**`,
      ).join('\n')
    : '*Nenhum membro participou da sessão.*';

  const texto =
    `## 📞 Relatório de Chamada\n\n` +
    `🎙️ **Canal:** ${sessao.canalNome}\n` +
    `⏱️ **Duração total:** ${formatarDuracao(durTotal)}\n` +
    `👥 **Membros:** ${entradas.length}\n\n` +
    `**⏳ Tempo por membro:**\n${lista}\n\n` +
    `-# Encerrado por <@${interaction.user.id}>  ·  <t:${Math.floor(agora / 1000)}:f>`;

  const container = new ContainerBuilder()
    .setAccentColor(0x5865F2)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(texto));

  if (config.CANAL_LOG_VOZ) {
    try {
      const canalLog = await interaction.guild.channels.fetch(config.CANAL_LOG_VOZ);
      await canalLog.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Erro ao enviar relatório de voz:`, err);
    }
  }

  await interaction.reply({ content: `✅ Bot saiu do canal. Relatório enviado em <#${config.CANAL_LOG_VOZ ?? '?'}>!`, ephemeral: true });
}

// Chamado pelo voiceStateUpdate para atualizar a sessão enquanto o bot está no canal
function atualizarSessaoVoz(oldState, newState) {
  const member = newState.member ?? oldState.member;
  if (!member || member.user.bot) return;

  const sessao = sessaoAtiva.get(member.guild.id);
  if (!sessao) return;

  const agora  = Date.now();
  const estava = oldState.channelId === sessao.canalId;
  const entrou = newState.channelId === sessao.canalId;

  if (estava && !entrou) {
    // Saiu do canal do bot → acumula tempo
    const dados = sessao.membros.get(member.id);
    if (dados?.entrou) {
      dados.total += agora - dados.entrou;
      dados.entrou = null;
    }
  } else if (!estava && entrou) {
    // Entrou no canal do bot → começa a contar
    const existente = sessao.membros.get(member.id);
    sessao.membros.set(member.id, {
      entrou: agora,
      total:  existente?.total ?? 0,
      nome:   member.displayName,
    });
  }
}

module.exports = { handleEntrarVoz, handleSairVoz, atualizarSessaoVoz };
