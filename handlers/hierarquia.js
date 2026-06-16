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

const ARQUIVO = path.join(__dirname, '../data/hierarquia.json');
const IMG = 'https://media.discordapp.net/attachments/1392674632544419963/1392675113262125056/Never_Pure_1920.jpg?ex=69ee0f85&is=69ecbe05&hm=3846f1cabdd4a1b55ad17216f5cc52b41d4f9805ae4a1973687884d3f04d494d&width=1535&height=863&';

const ultimoFetchPorGuild = new Map();

const TIERS = [
  { emoji: '👑', nome: 'I — Líderes',               cargoKey: 'CARGO_HIER_1'  },
  { emoji: '🗡️', nome: 'II — Braço Direito',         cargoKey: 'CARGO_HIER_2'  },
  { emoji: '🔱', nome: 'III — Gerente Geral',        cargoKey: 'CARGO_HIER_3'  },
  { emoji: '⚡', nome: 'IV — Gerente Ação',           cargoKey: 'CARGO_HIER_4'  },
  { emoji: '💰', nome: 'V — Gerente Venda',           cargoKey: 'CARGO_HIER_5'  },
  { emoji: '🌾', nome: 'VI — Gerente Farm',           cargoKey: 'CARGO_HIER_6'  },
  { emoji: '📋', nome: 'VII — Gerência Recrutamento', cargoKey: 'CARGO_HIER_7'  },
  { emoji: '🪖', nome: 'VIII — Soldado',              cargoKey: 'CARGO_HIER_8'  },
  { emoji: '🔰', nome: 'IX — Soldado Teste',          cargoKey: 'CARGO_HIER_9'  },
  { emoji: '👤', nome: 'X — Membro',                  cargoKey: 'CARGO_HIER_10' },
];

function lerDados() {
  try { return JSON.parse(fs.readFileSync(ARQUIVO, 'utf8')); } catch { return {}; }
}

function salvarDados(dados) {
  fs.mkdirSync(path.dirname(ARQUIVO), { recursive: true });
  fs.writeFileSync(ARQUIVO, JSON.stringify(dados, null, 2));
}

async function construirPainel(guild) {
  const agora = Date.now();
  const ultimoFetch = ultimoFetchPorGuild.get(guild.id) ?? 0;
  if (agora - ultimoFetch > 30000) {
    ultimoFetchPorGuild.set(guild.id, agora);
    try { await guild.members.fetch(); } catch (err) {
      console.warn(`[hierarquia] members.fetch rate limited — usando cache: ${err.message}`);
    }
  }

  // Mapeia cada membro para o seu tier mais alto
  const tierDoMembro = new Map();
  TIERS.forEach((tier, i) => {
    const cargoId = config[tier.cargoKey];
    if (!cargoId) return;
    guild.members.cache.forEach((m) => {
      if (!m.user.bot && m.roles.cache.has(cargoId) && !tierDoMembro.has(m.id)) {
        tierDoMembro.set(m.id, i);
      }
    });
  });

  const linhas = TIERS.map((tier, i) => {
    const cargoId = config[tier.cargoKey];
    if (!cargoId) return `${tier.emoji} **${tier.nome}**\n*vazio*`;

    const membros = guild.members.cache
      .filter((m) => !m.user.bot && m.roles.cache.has(cargoId) && tierDoMembro.get(m.id) === i)
      .map((m) => `\`${m.displayName}\``)
      .sort((a, b) => {
        const num = (s) => parseInt(s.replace(/`/g, ''), 10) || Infinity;
        return num(a) - num(b);
      });

    const valor = membros.length > 0 ? membros.join('\n') : '*vazio*';
    return `${tier.emoji} **${tier.nome}**\n${valor}`;
  });

  return new ContainerBuilder()
    .setAccentColor(0xCC2222)
    .addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL(IMG),
      ),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        '## ⚔️  HIERARQUIA\n\n' +
        linhas.join('\n\n') + '\n\n' +
        `-# Estrutura Organizacional  ·  Atualizado automaticamente`,
      ),
    );
}

async function atualizarHierarquia(guild) {
  try {
    let dados = lerDados();

    // Se o JSON foi apagado (Discloud reiniciou), percorre todos os canais de texto
    // procurando a mensagem de hierarquia do bot
    if (!dados.messageId || !dados.channelId) {
      const canaisTexto = guild.channels.cache.filter((c) => c.isTextBased && c.isTextBased());
      let encontrado = false;
      for (const canal of canaisTexto.values()) {
        try {
          const msgs = await canal.messages.fetch({ limit: 20 });
          const existente = msgs.find(
            (m) => m.author.id === guild.client.user.id && m.flags.has(MessageFlags.IsComponentsV2),
          );
          if (existente) {
            dados = { messageId: existente.id, channelId: canal.id };
            salvarDados(dados);
            console.log(`[${new Date().toISOString()}] Hierarquia recuperada do canal #${canal.name}.`);
            encontrado = true;
            break;
          }
        } catch {}
      }
      if (!encontrado) return;
    }

    const canal = await guild.channels.fetch(dados.channelId);
    const msg   = await canal.messages.fetch(dados.messageId);
    const container = await construirPainel(guild);
    await msg.edit({ components: [container], flags: MessageFlags.IsComponentsV2 });
    console.log(`[${new Date().toISOString()}] Hierarquia atualizada: ${guild.name}`);
  } catch (err) {
    if (err.code === 10008 || err.code === 10003) {
      console.warn(`[${new Date().toISOString()}] Hierarquia órfã (mensagem/canal apagado) — limpando registro.`);
      salvarDados({});
    } else {
      console.error(`[${new Date().toISOString()}] Erro ao atualizar hierarquia:`, err);
    }
  }
}

async function handleHierarquiaSetup(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const canal = interaction.options.getChannel('canal');

  try {
    const container = await construirPainel(interaction.guild);

    const totalMembros = interaction.guild.members.cache.filter((m) => !m.user.bot).size;
    const diagLines = TIERS.map((t) => {
      const id    = config[t.cargoKey];
      const count = id ? interaction.guild.members.cache.filter((m) => !m.user.bot && m.roles.cache.has(id)).size : 0;
      return `${t.emoji} ${t.nome}: **${count}** membros (cargo: \`${id ?? 'não configurado'}\`)`;
    });

    const msg = await canal.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
    salvarDados({ messageId: msg.id, channelId: canal.id });
    await interaction.editReply({
      content:
        `✅ Painel enviado em ${canal}!\n\n` +
        `📊 **${totalMembros} membros** encontrados no cache:\n` +
        diagLines.join('\n'),
    });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao enviar hierarquia:`, err);
    await interaction.editReply({ content: `❌ Erro ao enviar o painel: \`${err.message}\`` });
  }
}

async function handleMemberUpdate(oldMember, newMember) {
  const hierIds = TIERS.map((t) => config[t.cargoKey]).filter(Boolean);
  const mudou   = hierIds.some((id) => oldMember.roles.cache.has(id) !== newMember.roles.cache.has(id));
  if (mudou) await atualizarHierarquia(newMember.guild);
}

module.exports = { handleHierarquiaSetup, atualizarHierarquia, handleMemberUpdate };
