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
const ARQUIVO_RESET   = path.join(__dirname, '../data/ranking_reset.json');
const IMG = 'https://media.discordapp.net/attachments/1392674632544419963/1392675113262125056/Never_Pure_1920.jpg?ex=69ee0f85&is=69ecbe05&hm=3846f1cabdd4a1b55ad17216f5cc52b41d4f9805ae4a1973687884d3f04d494d&width=1535&height=863&';

function lerResetAt() {
  try { return JSON.parse(fs.readFileSync(ARQUIVO_RESET, 'utf8')).resetAt ?? 0; } catch { return 0; }
}

function lerRanking() {
  try { return JSON.parse(fs.readFileSync(ARQUIVO_RANKING, 'utf8')); } catch { return {}; }
}

function salvarRanking(dados) {
  fs.writeFileSync(ARQUIVO_RANKING, JSON.stringify(dados, null, 2));
}

function lerStats() {
  try { return JSON.parse(fs.readFileSync(ARQUIVO_STATS, 'utf8')); } catch { return null; }
}

function salvarStats({ vitorias, derrotas, maxStreak, streakAtual, historico, totalVitorias, totalDerrotas, streak }) {
  const membros = {};
  const todosIds = new Set([...vitorias.keys(), ...derrotas.keys(), ...maxStreak.keys()]);
  for (const id of todosIds) {
    membros[id] = {
      vitorias:    vitorias.get(id)    ?? 0,
      derrotas:    derrotas.get(id)    ?? 0,
      maxStreak:   maxStreak.get(id)   ?? 0,
      streakAtual: streakAtual.get(id) ?? 0,
      historico:   historico.get(id)   ?? [],
    };
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
  const canal   = await guild.channels.fetch(config.CANAL_CONTROLE);
  const resetAt = lerResetAt();

  const vitorias = new Map();
  const derrotas = new Map();
  let totalVitorias = 0;
  let totalDerrotas = 0;

  // Coleta todas as ações em ordem (mais novo primeiro)
  const acoes = [];
  let lastId  = null;

  while (true) {
    const opcoes = { limit: 100 };
    if (lastId) opcoes.before = lastId;

    const msgs = await canal.messages.fetch(opcoes);
    if (msgs.size === 0) break;

    for (const msg of msgs.values()) {
      if (resetAt && msg.createdTimestamp <= resetAt) continue;

      // Formato antigo: embed com título "Vitória" (sem controle de derrota)
      if (msg.embeds[0]?.title?.includes('Vitória')) {
        const listaField = msg.embeds[0].fields?.find((f) => f.name.includes('Lista'));
        if (!listaField) continue;
        const participantes = [...listaField.value.matchAll(/<@(\d+)>/g)].map((m) => m[1]);
        for (const id of participantes) vitorias.set(id, (vitorias.get(id) ?? 0) + 1);
        if (participantes.length > 0) {
          totalVitorias++;
          acoes.push({ tipo: 'vitoria', participantes });
        }
        continue;
      }

      // Formato v2
      const text = extractMsgText(msg);
      if (!text) continue;

      const ehVitoria = text.includes('Vitória');
      const ehDerrota = text.includes('Derrota');
      if (!ehVitoria && !ehDerrota) continue;

      const listaSection = text.match(/Lista de Participantes:\*\*\n([\s\S]+?)\n\n📝/);
      if (!listaSection) continue;

      const participantes = [...listaSection[1].matchAll(/<@(\d+)>/g)].map((m) => m[1]);
      if (participantes.length === 0) continue;

      const nomeMatch = text.match(/⚔️ \*\*Ação:\*\* (.+?)  ·/);
      const nome      = nomeMatch ? nomeMatch[1] : '—';
      const ts        = Math.floor(msg.createdTimestamp / 1000);

      for (const id of participantes) {
        if (ehVitoria) vitorias.set(id, (vitorias.get(id) ?? 0) + 1);
        else           derrotas.set(id, (derrotas.get(id) ?? 0) + 1);
      }
      if (ehVitoria) totalVitorias++;
      else           totalDerrotas++;
      acoes.push({ tipo: ehVitoria ? 'vitoria' : 'derrota', participantes, nome, ts });
    }

    lastId = msgs.last()?.id;
    if (msgs.size < 100) break;
  }

  // Streak do servidor: conta vitórias consecutivas do mais recente
  let streak = 0;
  for (const acao of acoes) {
    if (acao.tipo === 'vitoria') streak++;
    else break;
  }

  // Streak atual por membro: mais novo primeiro, para na primeira derrota
  const streakAtual  = new Map();
  const streakParado = new Set();
  for (const acao of acoes) {
    for (const id of acao.participantes) {
      if (streakParado.has(id)) continue;
      if (acao.tipo === 'vitoria') {
        streakAtual.set(id, (streakAtual.get(id) ?? 0) + 1);
      } else {
        streakParado.add(id);
        streakAtual.set(id, 0);
      }
    }
  }

  // Maior streak por membro: processa em ordem cronológica (inverso)
  const maxStreak      = new Map();
  const streakContagem = new Map();
  for (const acao of [...acoes].reverse()) {
    for (const id of acao.participantes) {
      if (acao.tipo === 'vitoria') {
        const atual = (streakContagem.get(id) ?? 0) + 1;
        streakContagem.set(id, atual);
        if (atual > (maxStreak.get(id) ?? 0)) maxStreak.set(id, atual);
      } else {
        streakContagem.set(id, 0);
      }
    }
  }

  // Histórico por membro (últimas 20 ações, mais novo primeiro)
  const historico = new Map();
  for (const acao of acoes) {
    for (const id of acao.participantes) {
      if (!historico.has(id)) historico.set(id, []);
      const h = historico.get(id);
      if (h.length < 20) h.push({ tipo: acao.tipo, nome: acao.nome ?? '—', ts: acao.ts ?? null });
    }
  }

  const resultado = { vitorias, derrotas, maxStreak, streakAtual, historico, totalVitorias, totalDerrotas, streak };
  salvarStats(resultado);
  return resultado;
}

async function construirContainer(guild) {
  const { vitorias, totalVitorias, totalDerrotas, streak } = await coletarStats(guild);

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

  const streakText = streak >= 2 ? `${streak} vitórias seguidas 🔥` : 'Nenhuma';

  return new ContainerBuilder()
    .setAccentColor(0x3498DB)
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
        `⚔️ **Total de ações vencidas:** ${totalVitorias}\n` +
        `💀 **Total de ações perdidas:** ${totalDerrotas}\n` +
        `🔥 **Win Streak:** ${streakText}\n` +
        `👥 **Membros no ranking:** ${Math.min(vitorias.size, 10)}\n\n` +
        `-# Never Pure  ·  Atualizado automaticamente`,
      ),
    );
}

async function handleStats(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const membro = interaction.options.getUser('usuario') ?? interaction.user;

  try {
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
        membros[id] = {
          vitorias:    v,
          derrotas:    coletado.derrotas.get(id)    ?? 0,
          maxStreak:   coletado.maxStreak.get(id)   ?? 0,
          streakAtual: coletado.streakAtual.get(id) ?? 0,
        };
      }
    }

    const dados      = membros[membro.id] ?? { vitorias: 0, derrotas: 0, maxStreak: 0, streakAtual: 0, historico: [] };
    const v          = dados.vitorias;
    const d          = dados.derrotas;
    const kd         = calcKD(v, d);
    const total      = v + d;
    const melhorStr  = dados.maxStreak   ?? 0;
    const strAtual   = dados.streakAtual ?? 0;
    const hist       = dados.historico   ?? [];

    const rankLista = Object.entries(membros).sort((a, b) => b[1].vitorias - a[1].vitorias);
    const rankIdx   = rankLista.findIndex(([id]) => id === membro.id);
    const posicao   = rankIdx === -1 ? '*Sem posição*' : `#${rankIdx + 1}`;

    const histLinhas = hist.slice(0, 10).map((h) => {
      const icone = h.tipo === 'vitoria' ? '🏆' : '💀';
      const data  = h.ts ? `<t:${h.ts}:d>` : '—';
      return `${icone} ${h.nome} · ${data}`;
    });
    const histTexto = histLinhas.length > 0
      ? `\n**📜 Últimas ações:**\n${histLinhas.join('\n')}\n`
      : '';

    const texto =
      `## 📊 Stats — <@${membro.id}>\n\n` +
      `🏆 **Vitórias:** ${v}\n` +
      `💀 **Derrotas:** ${d}\n` +
      `⚔️ **V/D:** ${kd}\n` +
      `🔥 **Win Streak atual:** ${strAtual}\n` +
      `🏅 **Maior Win Streak:** ${melhorStr}\n` +
      `📋 **Ações participadas:** ${total}\n` +
      `🎖️ **Posição no ranking:** ${posicao}\n` +
      histTexto + '\n' +
      `-# Dados salvos em: ${salvo ? new Date(salvo.atualizadoEm).toLocaleString('pt-BR') : 'agora'}`;

    const container = new ContainerBuilder()
      .setAccentColor(0x3498DB)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(texto));

    await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao buscar stats:`, err);
    await interaction.editReply({ content: '❌ Erro ao buscar os stats. Tente novamente.' });
  }
}

async function atualizarRanking(guild) {
  try {
    let dados = lerRanking();

    // Se o JSON foi apagado (Discloud reiniciou), tenta recuperar a mensagem do canal
    if (!dados.messageId || !dados.channelId) {
      if (!config.CANAL_RANKING) return;
      try {
        const canal = await guild.channels.fetch(config.CANAL_RANKING);
        const msgs  = await canal.messages.fetch({ limit: 20 });
        const existente = msgs.find(
          (m) => m.author.id === guild.client.user.id && m.flags.has(MessageFlags.IsComponentsV2),
        );
        if (!existente) return;
        dados = { messageId: existente.id, channelId: canal.id };
        salvarRanking(dados);
        console.log(`[${new Date().toISOString()}] Ranking recuperado do canal (${existente.id}).`);
      } catch { return; }
    }

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

async function handleResetRanking(interaction) {
  await interaction.deferReply({ ephemeral: true });

  fs.writeFileSync(ARQUIVO_RESET, JSON.stringify({ resetAt: Date.now() }, null, 2));
  try { fs.writeFileSync(ARQUIVO_STATS, JSON.stringify({}, null, 2)); } catch {}

  await atualizarRanking(interaction.guild);

  await interaction.editReply({
    components: [
      new ContainerBuilder()
        .setAccentColor(0x57F287)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('✅ **Ranking resetado com sucesso!** Todos os dados foram apagados.')),
    ],
    flags: MessageFlags.IsComponentsV2,
  });
}

module.exports = { handleRankingSetup, atualizarRanking, handleStats, handleResetRanking };
