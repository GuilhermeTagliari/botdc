const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
} = require('discord.js');
const fs   = require('fs');
const path = require('path');
const config = require('../config');

const ARQUIVO_RANKING = path.join(__dirname, '../data/ranking.json');
const ARQUIVO_STATS   = path.join(__dirname, '../data/stats.json');
const IMG = 'https://cdn.discordapp.com/attachments/1497039765118255282/1497069523269058651/Logo_CRX_com_brilho_metalico_e_vermelho.jpg?ex=69ee2864&is=69ecd6e4&hm=27a99f4e3c95b941f73a2c4b924fd805b34d59519b976a2445c4d875f5b6c5fc&';

function lerRanking() {
  try { return JSON.parse(fs.readFileSync(ARQUIVO_RANKING, 'utf8')); } catch { return {}; }
}

function salvarRanking(dados) {
  fs.writeFileSync(ARQUIVO_RANKING, JSON.stringify(dados, null, 2));
}

function lerStats() {
  try { return JSON.parse(fs.readFileSync(ARQUIVO_STATS, 'utf8')); } catch { return null; }
}

function salvarStats({ vitorias, derrotas, totalVitorias, totalDerrotas, streak }) {
  const membros = {};
  for (const [id, v] of vitorias.entries()) {
    membros[id] = { vitorias: v, derrotas: derrotas.get(id) ?? 0 };
  }
  for (const [id, d] of derrotas.entries()) {
    if (!membros[id]) membros[id] = { vitorias: 0, derrotas: d };
  }
  fs.writeFileSync(ARQUIVO_STATS, JSON.stringify({
    membros,
    totalVitorias,
    totalDerrotas,
    streak,
    atualizadoEm: new Date().toISOString(),
  }, null, 2));
}

function extractMsgText(msg) {
  const getText = (comp) => {
    if (!comp) return '';
    const type    = comp.type    ?? comp.data?.type;
    const content = comp.content ?? comp.data?.content;
    if (type === 10) return typeof content === 'string' ? content : '';
    const children = comp.components ?? comp.data?.components ?? [];
    return Array.isArray(children) ? children.map(getText).join('\n') : '';
  };
  return msg.components.map(getText).filter(Boolean).join('\n');
}

function calcKD(v, d) {
  if (d === 0) return v === 0 ? '0.00' : `${v}.00`;
  return (v / d).toFixed(2);
}

async function coletarStats(guild) {
  const canal = await guild.channels.fetch(config.CANAL_CONTROLE);

  const vitorias = new Map();
  const derrotas = new Map();
  let totalVitorias = 0;
  let totalDerrotas = 0;
  let streak        = 0;
  let streakAtiva   = true;
  let lastId        = null;

  while (true) {
    const opcoes = { limit: 100 };
    if (lastId) opcoes.before = lastId;

    const msgs = await canal.messages.fetch(opcoes);
    if (msgs.size === 0) break;

    for (const msg of msgs.values()) {
      // Formato antigo: embed com título "Vitória" (sem controle de derrota)
      if (msg.embeds[0]?.title?.includes('Vitória')) {
        const listaField = msg.embeds[0].fields?.find((f) => f.name.includes('Lista'));
        if (!listaField) continue;
        for (const m of listaField.value.matchAll(/<@(\d+)>/g)) {
          vitorias.set(m[1], (vitorias.get(m[1]) ?? 0) + 1);
        }
        totalVitorias++;
        continue;
      }

      // Formato v2
      const text = extractMsgText(msg);
      if (!text) continue;

      const ehVitoria = text.includes('Vitória');
      const ehDerrota = text.includes('Derrota');
      if (!ehVitoria && !ehDerrota) continue;

      // Streak: mensagens chegam do mais novo ao mais antigo
      if (streakAtiva) {
        if (ehVitoria) streak++;
        else streakAtiva = false;
      }

      const listaSection = text.match(/Lista de Participantes:\*\*\n([\s\S]+?)\n\n📝/);
      if (!listaSection) continue;

      let tem = false;
      for (const m of listaSection[1].matchAll(/<@(\d+)>/g)) {
        if (ehVitoria) vitorias.set(m[1], (vitorias.get(m[1]) ?? 0) + 1);
        else           derrotas.set(m[1], (derrotas.get(m[1]) ?? 0) + 1);
        tem = true;
      }
      if (tem) {
        if (ehVitoria) totalVitorias++;
        else           totalDerrotas++;
      }
    }

    lastId = msgs.last()?.id;
    if (msgs.size < 100) break;
  }

  const resultado = { vitorias, derrotas, totalVitorias, totalDerrotas, streak };
  salvarStats(resultado);
  return resultado;
}

async function construirContainer(guild) {
  const { vitorias, derrotas, totalVitorias, totalDerrotas, streak } = await coletarStats(guild);

  const icones = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

  let descricao;
  if (vitorias.size === 0) {
    descricao = '*Nenhuma vitória registrada ainda.*';
  } else {
    const top10 = [...vitorias.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    descricao = top10
      .map(([id, v], i) => {
        const fogo = v >= 10 ? ' 🔥' : '';
        return `${icones[i]} <@${id}> **·** ${v} vitórias${fogo}`;
      })
      .join('\n');
  }

  const kdServidor = calcKD(totalVitorias, totalDerrotas);
  const streakLine = streak >= 2
    ? `🔥 **Streak atual:** ${streak} vitórias seguidas\n\n`
    : '';

  return new ContainerBuilder()
    .setAccentColor(0xFF0000)
    .addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL(IMG),
      ),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        '## 🏆  TOP 10 — Mais Vitórias em Ações\n\n' +
        '> Ranking atualizado automaticamente após cada ação.\n\n' +
        descricao + '\n\n' +
        streakLine +
        `⚔️ **Total de ações vencidas:** ${totalVitorias}  ·  💀 **Total de ações perdidas:** ${totalDerrotas}  ·  👥 **Membros no ranking:** ${Math.min(vitorias.size, 10)}\n\n` +
        `-# CRX  ·  Atualizado automaticamente`,
      ),
    );
}

async function handleStats(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const membro = interaction.options.getUser('usuario') ?? interaction.user;

  try {
    // Lê do arquivo; se não existir ainda, coleta ao vivo
    let membros, totalVitorias, totalDerrotas, streak;
    const salvo = lerStats();

    if (salvo) {
      ({ membros, totalVitorias, totalDerrotas, streak } = salvo);
    } else {
      const coletado = await coletarStats(interaction.guild);
      membros       = {};
      totalVitorias = coletado.totalVitorias;
      totalDerrotas = coletado.totalDerrotas;
      streak        = coletado.streak;
      for (const [id, v] of coletado.vitorias.entries()) {
        membros[id] = { vitorias: v, derrotas: coletado.derrotas.get(id) ?? 0 };
      }
    }

    const dados   = membros[membro.id] ?? { vitorias: 0, derrotas: 0 };
    const v       = dados.vitorias;
    const d       = dados.derrotas;
    const kd      = calcKD(v, d);
    const total   = v + d;

    const rankLista = Object.entries(membros).sort((a, b) => b[1].vitorias - a[1].vitorias);
    const rankIdx   = rankLista.findIndex(([id]) => id === membro.id);
    const posicao   = rankIdx === -1 ? '*Sem posição*' : `#${rankIdx + 1}`;

    const texto =
      `## 📊 Stats — <@${membro.id}>\n\n` +
      `🏆 **Vitórias:** ${v}\n` +
      `💀 **Derrotas:** ${d}\n` +
      `⚔️ **K/D:** ${kd}\n` +
      `📋 **Ações participadas:** ${total}\n` +
      `🏅 **Posição no ranking:** ${posicao}\n\n` +
      `-# Dados salvos em: ${salvo ? new Date(salvo.atualizadoEm).toLocaleString('pt-BR') : 'agora'}`;

    const container = new ContainerBuilder()
      .setAccentColor(0xFF0000)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(texto));

    await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao buscar stats:`, err);
    await interaction.editReply({ content: '❌ Erro ao buscar os stats. Tente novamente.' });
  }
}

async function atualizarRanking(guild) {
  try {
    const dados = lerRanking();
    if (!dados.messageId || !dados.channelId) return;

    const canal     = await guild.channels.fetch(dados.channelId);
    const msg       = await canal.messages.fetch(dados.messageId);
    const container = await construirContainer(guild);
    await msg.edit({ components: [container], flags: MessageFlags.IsComponentsV2 });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao atualizar ranking:`, err);
  }
}

async function handleRankingSetup(client, guild) {
  try {
    const canal = await guild.channels.fetch(config.CANAL_RANKING);
    if (!canal) return;

    const dados = lerRanking();

    if (dados.messageId && dados.channelId === canal.id) {
      try {
        await canal.messages.fetch(dados.messageId);
        console.log(`[${new Date().toISOString()}] Mensagem de ranking já existe — atualizando conteúdo.`);
        await atualizarRanking(guild);
        return;
      } catch {}
    }

    const container = await construirContainer(guild);
    const msg       = await canal.send({ components: [container], flags: MessageFlags.IsComponentsV2 });

    salvarRanking({ messageId: msg.id, channelId: canal.id });
    console.log(`[${new Date().toISOString()}] Mensagem de ranking enviada em: ${guild.name}`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao enviar ranking:`, err);
  }
}

module.exports = { handleRankingSetup, atualizarRanking, handleStats };
