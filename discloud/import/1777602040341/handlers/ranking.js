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

const ARQUIVO = path.join(__dirname, '../data/ranking.json');
const IMG = 'https://cdn.discordapp.com/attachments/1497039765118255282/1497069523269058651/Logo_CRX_com_brilho_metalico_e_vermelho.jpg?ex=69ee2864&is=69ecd6e4&hm=27a99f4e3c95b941f73a2c4b924fd805b34d59519b976a2445c4d875f5b6c5fc&';

function lerDados() {
  try { return JSON.parse(fs.readFileSync(ARQUIVO, 'utf8')); } catch { return {}; }
}

function salvarDados(dados) {
  fs.writeFileSync(ARQUIVO, JSON.stringify(dados, null, 2));
}

// Extrai texto de todos os TextDisplay dentro de uma mensagem (Components v2)
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

async function construirContainer(guild) {
  const canal = await guild.channels.fetch(config.CANAL_CONTROLE);

  const contagem = new Map();
  let lastId     = null;
  let totalAcoes = 0;

  while (true) {
    const opcoes = { limit: 100 };
    if (lastId) opcoes.before = lastId;

    const msgs = await canal.messages.fetch(opcoes);
    if (msgs.size === 0) break;

    for (const msg of msgs.values()) {
      // Formato antigo: embed com título "Vitória"
      if (msg.embeds[0]?.title?.includes('Vitória')) {
        const listaField = msg.embeds[0].fields?.find((f) => f.name.includes('Lista'));
        if (!listaField) continue;
        let temParticipante = false;
        for (const m of listaField.value.matchAll(/<@(\d+)>/g)) {
          contagem.set(m[1], (contagem.get(m[1]) ?? 0) + 1);
          temParticipante = true;
        }
        if (temParticipante) totalAcoes++;
        continue;
      }

      // Formato novo: Components v2
      const text = extractMsgText(msg);
      if (!text.includes('Vitória')) continue;
      const listaSection = text.match(/Lista de Participantes:\n([\s\S]+?)\n\n📝/);
      if (!listaSection) continue;
      let temParticipante = false;
      for (const m of listaSection[1].matchAll(/<@(\d+)>/g)) {
        contagem.set(m[1], (contagem.get(m[1]) ?? 0) + 1);
        temParticipante = true;
      }
      if (temParticipante) totalAcoes++;
    }

    lastId = msgs.last()?.id;
    if (msgs.size < 100) break;
  }

  const icones = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

  let descricao;
  if (contagem.size === 0) {
    descricao = '*Nenhuma vitória registrada ainda.*';
  } else {
    const top10 = [...contagem.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    descricao = top10
      .map(([id, count], i) => {
        const trofeu = count >= 10 ? ' 🔥' : '';
        return `${icones[i]} <@${id}> **·** ${count} vitória${count !== 1 ? 's' : ''}${trofeu}`;
      })
      .join('\n');
  }

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
        '> Ranking atualizado automaticamente após cada ação vencida.\n\n' +
        descricao + '\n\n' +
        `⚔️ **Total de ações vencidas:** **${totalAcoes}**  ·  👥 **Membros no ranking:** **${Math.min(contagem.size, 10)}**\n\n` +
        `-# CRX  ·  Atualizado automaticamente`,
      ),
    );
}

async function atualizarRanking(guild) {
  try {
    const dados = lerDados();
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

    const dados = lerDados();

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

    salvarDados({ messageId: msg.id, channelId: canal.id });
    console.log(`[${new Date().toISOString()}] Mensagem de ranking enviada em: ${guild.name}`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao enviar ranking:`, err);
  }
}

module.exports = { handleRankingSetup, atualizarRanking };
