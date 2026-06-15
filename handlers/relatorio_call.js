const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
} = require('discord.js');
const { lerCallLog } = require('./log');

function formatarDuracao(ms) {
  const totalSeg = Math.floor(ms / 1000);
  const h = Math.floor(totalSeg / 3600);
  const m = Math.floor((totalSeg % 3600) / 60);
  const s = totalSeg % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function parsearData(input) {
  const hoje = new Date();
  const partes = input.trim().split(/[\/\-\.]/);
  if (partes.length < 2) return null;

  const dia = partes[0].padStart(2, '0');
  const mes = partes[1].padStart(2, '0');
  const ano = partes[2] ? partes[2] : String(hoje.getFullYear());

  if (isNaN(parseInt(dia)) || isNaN(parseInt(mes))) return null;
  return `${ano}-${mes}-${dia}`;
}

async function handleRelatorioChamada(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const diaRaw = interaction.options.getString('dia');
  const canal  = interaction.options.getChannel('canal');

  const chave = parsearData(diaRaw);
  if (!chave) {
    await interaction.editReply({ content: '❌ Data inválida. Use o formato `DD/MM` ou `DD/MM/AAAA`.' });
    return;
  }

  const log      = lerCallLog();
  const guildLog = log[interaction.guild.id];
  const registros = (guildLog && guildLog[chave]) ? guildLog[chave] : [];

  if (registros.length === 0) {
    await interaction.editReply({ content: `❌ Nenhum registro de call encontrado para **${diaRaw}**.` });
    return;
  }

  // Agrupa por userId, soma o tempo total
  const porUsuario = new Map();
  for (const r of registros) {
    const atual = porUsuario.get(r.userId) ?? { userName: r.userName, totalMs: 0, canais: new Set() };
    atual.totalMs += r.duration;
    atual.canais.add(r.channelName);
    porUsuario.set(r.userId, atual);
  }

  // Ordena por tempo decrescente
  const ordenado = [...porUsuario.entries()].sort((a, b) => b[1].totalMs - a[1].totalMs);

  // Formata data para exibição: YYYY-MM-DD → DD/MM/AAAA
  const [ano, mes, dia] = chave.split('-');
  const dataExibicao = `${dia}/${mes}/${ano}`;

  const linhas = ordenado.map(([userId, dados], i) => {
    const canaisStr = [...dados.canais].join(', ');
    return `**${i + 1}.** <@${userId}> — \`${dados.userName}\`\n⏱️ **${formatarDuracao(dados.totalMs)}** · 📢 ${canaisStr}`;
  });

  const totalPessoas = ordenado.length;
  const totalMs      = ordenado.reduce((acc, [, d]) => acc + d.totalMs, 0);

  const chunkSize = 15;
  const blocos    = [];
  for (let i = 0; i < linhas.length; i += chunkSize) {
    blocos.push(linhas.slice(i, i + chunkSize).join('\n\n'));
  }

  const container = new ContainerBuilder()
    .setAccentColor(0x5865F2)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `## 📊 Relatório de Call — ${dataExibicao}\n\n` +
      `👥 **Total de membros:** ${totalPessoas}\n` +
      `⏱️ **Tempo total acumulado:** ${formatarDuracao(totalMs)}\n`,
    ))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  for (const bloco of blocos) {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(bloco));
    if (bloco !== blocos[blocos.length - 1]) {
      container.addSeparatorComponents(new SeparatorBuilder().setDivider(false));
    }
  }

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `-# Relatório gerado por <@${interaction.user.id}> · <t:${Math.floor(Date.now() / 1000)}:f>`,
    ));

  try {
    await canal.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
    await interaction.editReply({ content: `✅ Relatório enviado em <#${canal.id}>!` });
  } catch (err) {
    await interaction.editReply({ content: `❌ Erro ao enviar relatório: \`${err.message}\`` });
  }
}

module.exports = { handleRelatorioChamada };
