const { EmbedBuilder } = require('discord.js');
const fs   = require('fs');
const path = require('path');
const config = require('../config');

const ARQUIVO = path.join(__dirname, '../data/ranking.json');

function lerDados() {
  try { return JSON.parse(fs.readFileSync(ARQUIVO, 'utf8')); } catch { return {}; }
}

function salvarDados(dados) {
  fs.writeFileSync(ARQUIVO, JSON.stringify(dados, null, 2));
}

async function construirEmbed(guild) {
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
      const embed = msg.embeds[0];
      if (!embed?.title?.includes('Vitória')) continue;

      const listaField = embed.fields?.find((f) => f.name.includes('Lista'));
      if (!listaField) continue;

      const matches = listaField.value.matchAll(/<@(\d+)>/g);
      let temParticipante = false;
      for (const m of matches) {
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

  return new EmbedBuilder()
    .setTitle('🏆  TOP 10 — Mais Vitórias em Ações')
    .setColor(0xFF0000)
    .setDescription('> Ranking atualizado automaticamente após cada ação vencida.\n​')
    .addFields(
      { name: '🎖️ Classificação', value: descricao, inline: false },
      { name: '⚔️ Total de ações vencidas', value: `**${totalAcoes}**`, inline: true },
      { name: '👥 Membros no ranking', value: `**${Math.min(contagem.size, 10)}**`, inline: true },
    )
    .setImage('https://cdn.discordapp.com/attachments/1497039765118255282/1497069523269058651/Logo_CRX_com_brilho_metalico_e_vermelho.jpg?ex=69ee2864&is=69ecd6e4&hm=27a99f4e3c95b941f73a2c4b924fd805b34d59519b976a2445c4d875f5b6c5fc&')
    .setFooter({ text: 'CRX • Atualizado automaticamente' })
    .setTimestamp();
}

async function atualizarRanking(guild) {
  try {
    const dados = lerDados();
    if (!dados.messageId || !dados.channelId) return;

    const canal = await guild.channels.fetch(dados.channelId);
    const msg   = await canal.messages.fetch(dados.messageId);
    const embed = await construirEmbed(guild);
    await msg.edit({ embeds: [embed] });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao atualizar ranking:`, err);
  }
}

async function handleRankingSetup(client, guild) {
  try {
    const canal = await guild.channels.fetch(config.CANAL_RANKING);
    if (!canal) return;

    const dados = lerDados();

    // Tenta reutilizar mensagem existente
    if (dados.messageId && dados.channelId === canal.id) {
      try {
        await canal.messages.fetch(dados.messageId);
        console.log(`[${new Date().toISOString()}] Mensagem de ranking já existe — atualizando conteúdo.`);
        await atualizarRanking(guild);
        return;
      } catch { /* mensagem foi deletada, cria nova */ }
    }

    const embed = await construirEmbed(guild);
    const msg   = await canal.send({ embeds: [embed] });

    salvarDados({ messageId: msg.id, channelId: canal.id });
    console.log(`[${new Date().toISOString()}] Mensagem de ranking enviada em: ${guild.name}`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao enviar ranking:`, err);
  }
}

module.exports = { handleRankingSetup, atualizarRanking };
