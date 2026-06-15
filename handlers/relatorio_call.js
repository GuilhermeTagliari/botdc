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

  const d = parseInt(dia, 10);
  const m = parseInt(mes, 10);
  if (isNaN(d) || isNaN(m) || d < 1 || d > 31 || m < 1 || m > 12) return null;
  return `${ano}-${mes}-${dia}`;
}

async function handleRelatorioChamada(interaction) {
  await interaction.deferReply();

  const diaRaw      = interaction.options.getString('dia');
  const canalVoz    = interaction.options.getChannel('canal');

  const chave = parsearData(diaRaw);
  if (!chave) {
    await interaction.editReply({ content: '❌ Data inválida. Use o formato `DD/MM` ou `DD/MM/AAAA`.' });
    return;
  }

  const log       = lerCallLog();
  const guildLog  = log[interaction.guild.id];
  const todos     = (guildLog && guildLog[chave]) ? guildLog[chave] : [];

  const registros = todos.filter((r) => r.channelId === canalVoz.id);

  if (registros.length === 0) {
    const [ano, mes, dia] = chave.split('-');
    await interaction.editReply({
      content: `❌ Nenhum registro encontrado para **${dia}/${mes}/${ano}** em **${canalVoz.name}**.`,
    });
    return;
  }

  // Agrupa por userId e soma tempo total
  const porUsuario = new Map();
  for (const r of registros) {
    const atual = porUsuario.get(r.userId) ?? { userName: r.userName, totalMs: 0 };
    atual.totalMs += r.duration;
    porUsuario.set(r.userId, atual);
  }

  const ordenado = [...porUsuario.entries()].sort((a, b) => b[1].totalMs - a[1].totalMs);

  const [ano, mes, dia] = chave.split('-');
  const dataExibicao = `${dia}/${mes}/${ano}`;

  const linhas = ordenado.map(([userId, dados], i) =>
    `**${i + 1}.** <@${userId}> — \`${dados.userName}\` · ⏱️ **${formatarDuracao(dados.totalMs)}**`,
  );

  const totalPessoas = ordenado.length;
  const totalMs      = ordenado.reduce((acc, [, d]) => acc + d.totalMs, 0);

  const chunkSize = 20;
  const blocos    = [];
  for (let i = 0; i < linhas.length; i += chunkSize) {
    blocos.push(linhas.slice(i, i + chunkSize).join('\n'));
  }

  const container = new ContainerBuilder()
    .setAccentColor(0x5865F2)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `## 📊 Relatório de Call — ${dataExibicao}\n` +
      `🔊 **Canal:** ${canalVoz.name}\n\n` +
      `👥 **Total de membros:** ${totalPessoas}   ·   ⏱️ **Tempo acumulado:** ${formatarDuracao(totalMs)}`,
    ))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  for (const bloco of blocos) {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(bloco));
  }

  container
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `-# Gerado por <@${interaction.user.id}> · <t:${Math.floor(Date.now() / 1000)}:f>`,
    ));

  await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
}

module.exports = { handleRelatorioChamada };
