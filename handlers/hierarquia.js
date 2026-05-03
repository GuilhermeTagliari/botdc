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
const IMG = 'https://cdn.discordapp.com/attachments/1497039765118255282/1497069523269058651/Logo_CRX_com_brilho_metalico_e_vermelho.jpg?ex=69ee2864&is=69ecd6e4&hm=27a99f4e3c95b941f73a2c4b924fd805b34d59519b976a2451c4d875f5b6c5fc&';

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

  const totalMembros = guild.members.cache.filter((m) => !m.user.bot).size;
  console.log(`[hierarquia] Membros no cache: ${totalMembros}`);
  TIERS.forEach((t) => {
    const id = config[t.cargoKey];
    const roleExiste = id ? guild.roles.cache.has(id) : false;
    const count = id ? guild.members.cache.filter((m) => !m.user.bot && m.roles.cache.has(id)).size : 0;
    console.log(`[hierarquia] ${t.nome} | cargoId=${id} | roleExiste=${roleExiste} | membros=${count}`);
  });

  const linhas = TIERS.map((tier) => {
    const cargoId = config[tier.cargoKey];
    if (!cargoId) return `${tier.emoji} **${tier.nome}**\n*vazio*`;

    const membros = guild.members.cache
      .filter((m) => !m.user.bot && m.roles.cache.has(cargoId))
      .map((m) => `\`${m.displayName}\``);

    const valor = membros.length > 0 ? membros.join(' ') : '*vazio*';
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
    const dados = lerDados();
    if (!dados.messageId || !dados.channelId) return;

    const canal = await guild.channels.fetch(dados.channelId);
    const msg   = await canal.messages.fetch(dados.messageId);
    const container = await construirPainel(guild);
    await msg.edit({ components: [container], flags: MessageFlags.IsComponentsV2 });
    console.log(`[${new Date().toISOString()}] Hierarquia atualizada: ${guild.name}`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao atualizar hierarquia:`, err);
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
