const {
  ButtonBuilder, ButtonStyle, ActionRowBuilder,
  StringSelectMenuBuilder, ChannelSelectMenuBuilder, RoleSelectMenuBuilder,
  ModalBuilder, TextInputBuilder, TextInputStyle,
  EmbedBuilder,
} = require('discord.js');
const config = require('../config');

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ch  = (id)  => id ? `<#${id}>` : '`não configurado`';
const rl  = (id)  => id ? `<@&${id}>` : '`não configurado`';
const rls = (arr) => (arr?.length > 0) ? arr.map((id) => `<@&${id}>`).join(' ') : '`nenhum`';
const lst = (arr) => (arr?.length > 0) ? arr.join(', ') : '`nenhuma`';
const btn = (id, label, style) => new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(style);

const SECOES = [
  { value: 'recrutamento', label: 'Recrutamento',              emoji: '📋', description: 'Canal, aprovação, cargos' },
  { value: 'escalacao',    label: 'Escalação',                 emoji: '⚔️', description: 'Canais, cargos, ações predefinidas' },
  { value: 'farm',         label: 'Farm',                      emoji: '🌾', description: 'Canais e categorias de farm' },
  { value: 'venda',        label: 'Vendas',                    emoji: '💰', description: 'Canal e categoria de venda' },
  { value: 'armas',        label: 'Armas',                     emoji: '🔫', description: 'Canal de solicitação e log' },
  { value: 'codiguinho',   label: 'Codiguinho',                emoji: '🎟️', description: 'Canais e cargos do sistema de codiguinhos' },
  { value: 'ausencia',     label: 'Ausência',                  emoji: '🏖️', description: 'Canais e cargo de ausência' },
  { value: 'ticket',       label: 'Ticket',                    emoji: '🎫', description: 'Canal e categoria de ticket' },
  { value: 'ranking',      label: 'Ranking',                   emoji: '📊', description: 'Canal de ranking' },
  { value: 'logs',         label: 'Logs',                      emoji: '📝', description: 'Canais de log' },
  { value: 'advertencias', label: 'Advertências',              emoji: '⚠️', description: 'Cargos por nível de warn' },
  { value: 'setup',        label: 'Setup — Enviar Mensagens',  emoji: '🔧', description: 'Envia mensagens nos canais configurados' },
];

function menuEmbed() {
  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('⚙️  Configurações do Bot')
    .setDescription('Selecione o módulo que deseja configurar.\nAlterações são salvas imediatamente.');
}

function menuComponents() {
  return [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('cfg_menu')
        .setPlaceholder('Selecione o módulo...')
        .addOptions(SECOES),
    ),
  ];
}

// ─── Entrada principal ─────────────────────────────────────────────────────────
async function handleConfigurar(interaction) {
  await interaction.reply({ embeds: [menuEmbed()], components: menuComponents(), ephemeral: true });
}

async function handleConfigBack(interaction) {
  await interaction.update({ embeds: [menuEmbed()], components: menuComponents() });
}

async function handleConfigMenu(interaction) {
  const secao = interaction.values[0];
  const { embed, rows } = buildSecao(secao);
  await interaction.update({ embeds: [embed], components: rows });
}

// ─── Seções ────────────────────────────────────────────────────────────────────
function buildSecao(secao) {
  const c = config;

  const voltar = new ActionRowBuilder().addComponents(btn('cfg_back', '← Menu', ButtonStyle.Danger));

  switch (secao) {
    case 'recrutamento': return {
      embed: new EmbedBuilder().setColor(0x5865F2).setDescription(
        `## 📋 Recrutamento\n\n` +
        `📺 **Canal Recrutamento:** ${ch(c.CANAL_RECRUTAMENTO)}\n` +
        `📬 **Canal Aprovação:** ${ch(c.CANAL_APROVACAO)}\n` +
        `✅ **Cargo Aprovado:** ${rl(c.CARGO_APROVADO)}\n` +
        `👥 **Cargos Aprovadores:** ${rls(c.CARGOS_APROVACAO)}\n\n` +
        `**Painel:** ${c.RECRUTAMENTO_TITULO}  ·  🎨 #${(c.RECRUTAMENTO_COR ?? 0x3498DB).toString(16).padStart(6,'0').toUpperCase()}`,
      ),
      rows: [
        new ActionRowBuilder().addComponents(
          btn('cfg_ch_CANAL_RECRUTAMENTO', '📺 Canal Recrutamento', ButtonStyle.Primary),
          btn('cfg_ch_CANAL_APROVACAO',    '📬 Canal Aprovação',    ButtonStyle.Primary),
          btn('cfg_role_CARGO_APROVADO',   '✅ Cargo Aprovado',     ButtonStyle.Primary),
        ),
        new ActionRowBuilder().addComponents(
          btn('cfg_roles_CARGOS_APROVACAO',  '👥 Cargos Aprovadores', ButtonStyle.Secondary),
          btn('cfg_painel_recrutamento',     '✏️ Personalizar Painel', ButtonStyle.Secondary),
          btn('cfg_back', '← Menu', ButtonStyle.Danger),
        ),
      ],
    };

    case 'escalacao': return {
      embed: new EmbedBuilder().setColor(0x5865F2).setDescription(
        `## ⚔️ Escalação\n\n` +
        `📺 **Canal Setup:** ${ch(c.CANAL_CRIAR_ESCALACAO)}\n` +
        `⚔️ **Canal Escalações:** ${ch(c.CANAL_ESCALACAO)}\n` +
        `🗂️ **Canal Controle:** ${ch(c.CANAL_CONTROLE)}\n` +
        `👥 **Cargos:** ${rls(c.CARGOS_ESCALACAO)}\n` +
        `📻 **Rádio na escalação:** ${c.ESCALACAO_RADIO ? '✅ Ativado' : '❌ Desativado'}\n` +
        `📋 **Ações Predefinidas:** ${(c.ACOES_PREDEFINIDAS ?? []).length} configurada(s)\n\n` +
        `**Painel:** ${c.ESCALACAO_TITULO}  ·  🎨 #${(c.ESCALACAO_COR ?? 0x3498DB).toString(16).padStart(6,'0').toUpperCase()}`,
      ),
      rows: [
        new ActionRowBuilder().addComponents(
          btn('cfg_ch_CANAL_CRIAR_ESCALACAO', '📺 Canal Setup',      ButtonStyle.Primary),
          btn('cfg_ch_CANAL_ESCALACAO',       '⚔️ Canal Escalações', ButtonStyle.Primary),
          btn('cfg_ch_CANAL_CONTROLE',        '🗂️ Canal Controle',   ButtonStyle.Primary),
        ),
        new ActionRowBuilder().addComponents(
          btn('cfg_roles_CARGOS_ESCALACAO',  '👥 Cargos',             ButtonStyle.Secondary),
          btn('cfg_lista_ACOES_PREDEFINIDAS','📋 Ações Predefinidas',  ButtonStyle.Secondary),
          btn('cfg_escradio',                c.ESCALACAO_RADIO ? '📻 Rádio: ✅' : '📻 Rádio: ❌', ButtonStyle.Secondary),
        ),
        new ActionRowBuilder().addComponents(
          btn('cfg_painel_escalacao', '✏️ Personalizar Painel', ButtonStyle.Secondary),
          btn('cfg_back', '← Menu', ButtonStyle.Danger),
        ),
      ],
    };

    case 'farm': return {
      embed: new EmbedBuilder().setColor(0x5865F2).setDescription(
        `## 🌾 Farm\n\n` +
        `📺 **Canal Setup Farm:** ${ch(c.CANAL_FARM_BTN)}\n` +
        `📁 **Categoria Farm:** ${ch(c.CATEGORIA_FARM)}\n` +
        `👑 **Cargos Farm ADM:** ${rls(c.CARGOS_FARM_ADM)}\n` +
        `📁 **Categoria Farm ADM:** ${ch(c.CATEGORIA_FARM_ADM)}\n\n` +
        `**Painel:** ${c.FARM_TITULO}  ·  🎨 #${(c.FARM_COR ?? 0x57F287).toString(16).padStart(6,'0').toUpperCase()}`,
      ),
      rows: [
        new ActionRowBuilder().addComponents(
          btn('cfg_ch_CANAL_FARM_BTN',     '📺 Canal Setup', ButtonStyle.Primary),
          btn('cfg_ch_CATEGORIA_FARM',     '📁 Cat. Farm',   ButtonStyle.Primary),
          btn('cfg_ch_CATEGORIA_FARM_ADM', '📁 Cat. ADM',    ButtonStyle.Primary),
        ),
        new ActionRowBuilder().addComponents(
          btn('cfg_roles_CARGOS_FARM_ADM', '👑 Cargos ADM',          ButtonStyle.Secondary),
          btn('cfg_painel_farm',           '✏️ Personalizar Painel', ButtonStyle.Secondary),
          btn('cfg_back', '← Menu', ButtonStyle.Danger),
        ),
      ],
    };

    case 'venda': return {
      embed: new EmbedBuilder().setColor(0x5865F2).setDescription(
        `## 💰 Vendas\n\n` +
        `📺 **Canal Setup Venda:** ${ch(c.CANAL_VENDA_BTN)}\n` +
        `📁 **Categoria Venda:** ${ch(c.CATEGORIA_VENDA)}\n\n` +
        `**Painel:** ${c.VENDA_TITULO}  ·  🎨 #${(c.VENDA_COR ?? 0xFF0000).toString(16).padStart(6,'0').toUpperCase()}`,
      ),
      rows: [
        new ActionRowBuilder().addComponents(
          btn('cfg_ch_CANAL_VENDA_BTN',  '📺 Canal Setup',         ButtonStyle.Primary),
          btn('cfg_ch_CATEGORIA_VENDA',  '📁 Categoria',           ButtonStyle.Primary),
          btn('cfg_painel_venda',        '✏️ Personalizar Painel', ButtonStyle.Secondary),
          btn('cfg_back', '← Menu', ButtonStyle.Danger),
        ),
      ],
    };

    case 'armas': return {
      embed: new EmbedBuilder().setColor(0x5865F2).setDescription(
        `## 🔫 Armas\n\n` +
        `📺 **Canal Setup Armas:** ${ch(c.CANAL_ARMAS_BTN)}\n` +
        `📬 **Canal Log Armas:** ${ch(c.CANAL_ARMAS_LOG)}\n\n` +
        `**Painel:** ${c.ARMAS_TITULO}  ·  🎨 #${(c.ARMAS_COR ?? 0xFF0000).toString(16).padStart(6,'0').toUpperCase()}`,
      ),
      rows: [
        new ActionRowBuilder().addComponents(
          btn('cfg_ch_CANAL_ARMAS_BTN',  '📺 Canal Setup',         ButtonStyle.Primary),
          btn('cfg_ch_CANAL_ARMAS_LOG',  '📬 Canal Log',           ButtonStyle.Primary),
          btn('cfg_painel_armas',        '✏️ Personalizar Painel', ButtonStyle.Secondary),
          btn('cfg_back', '← Menu', ButtonStyle.Danger),
        ),
      ],
    };

    case 'codiguinho': return {
      embed: new EmbedBuilder().setColor(0x5865F2).setDescription(
        `## 🎟️ Codiguinho\n\n` +
        `📺 **Canal Setup:** ${ch(c.CANAL_CODIGUINHO_BTN)}\n` +
        `📬 **Canal Aprovação:** ${ch(c.CANAL_CODIGUINHO_LOG)}\n` +
        `👥 **Cargos Admin:** ${rls(c.CARGOS_CODIGUINHO_ADM)}\n\n` +
        `**Painel:** ${c.CODIGUINHO_TITULO}  ·  🎨 #${(c.CODIGUINHO_COR ?? 0xFF0000).toString(16).padStart(6,'0').toUpperCase()}`,
      ),
      rows: [
        new ActionRowBuilder().addComponents(
          btn('cfg_ch_CANAL_CODIGUINHO_BTN',     '📺 Canal Setup',     ButtonStyle.Primary),
          btn('cfg_ch_CANAL_CODIGUINHO_LOG',     '📬 Canal Aprovação', ButtonStyle.Primary),
          btn('cfg_roles_CARGOS_CODIGUINHO_ADM', '👥 Cargos Admin',    ButtonStyle.Secondary),
        ),
        new ActionRowBuilder().addComponents(
          btn('cfg_painel_codiguinho', '✏️ Personalizar Painel', ButtonStyle.Secondary),
          btn('cfg_back', '← Menu', ButtonStyle.Danger),
        ),
      ],
    };

    case 'ausencia': return {
      embed: new EmbedBuilder().setColor(0x5865F2).setDescription(
        `## 🏖️ Ausência\n\n` +
        `📺 **Canal Setup:** ${ch(c.CANAL_AUSENCIA_BTN)}\n` +
        `📬 **Canal Aprovação:** ${ch(c.CANAL_AUSENCIA_APROVACAO)}\n` +
        `📋 **Canal Ativas:** ${ch(c.CANAL_AUSENCIA_ATIVA)}\n` +
        `🏷️ **Cargo Ausência:** ${rl(c.CARGO_AUSENCIA)}\n\n` +
        `**Painel:** ${c.AUSENCIA_TITULO}  ·  🎨 #${(c.AUSENCIA_COR ?? 0xFEE75C).toString(16).padStart(6,'0').toUpperCase()}`,
      ),
      rows: [
        new ActionRowBuilder().addComponents(
          btn('cfg_ch_CANAL_AUSENCIA_BTN',       '📺 Canal Setup',     ButtonStyle.Primary),
          btn('cfg_ch_CANAL_AUSENCIA_APROVACAO', '📬 Canal Aprovação', ButtonStyle.Primary),
          btn('cfg_ch_CANAL_AUSENCIA_ATIVA',     '📋 Canal Ativas',    ButtonStyle.Primary),
        ),
        new ActionRowBuilder().addComponents(
          btn('cfg_role_CARGO_AUSENCIA', '🏷️ Cargo Ausência',       ButtonStyle.Primary),
          btn('cfg_painel_ausencia',     '✏️ Personalizar Painel',  ButtonStyle.Secondary),
          btn('cfg_back', '← Menu', ButtonStyle.Danger),
        ),
      ],
    };

    case 'ticket': return {
      embed: new EmbedBuilder().setColor(0x5865F2).setDescription(
        `## 🎫 Ticket\n\n` +
        `📺 **Canal Setup Ticket:** ${ch(c.CANAL_TICKET_BTN)}\n` +
        `📁 **Categoria Ticket:** ${ch(c.CATEGORIA_TICKET)}\n\n` +
        `**Painel:** ${c.TICKET_TITULO}  ·  🎨 #${(c.TICKET_COR ?? 0x3498DB).toString(16).padStart(6,'0').toUpperCase()}`,
      ),
      rows: [
        new ActionRowBuilder().addComponents(
          btn('cfg_ch_CANAL_TICKET_BTN', '📺 Canal Setup',         ButtonStyle.Primary),
          btn('cfg_ch_CATEGORIA_TICKET', '📁 Categoria',           ButtonStyle.Primary),
          btn('cfg_painel_ticket',       '✏️ Personalizar Painel', ButtonStyle.Secondary),
          btn('cfg_back', '← Menu', ButtonStyle.Danger),
        ),
      ],
    };

    case 'ranking': return {
      embed: new EmbedBuilder().setColor(0x5865F2).setDescription(
        `## 📊 Ranking\n\n` +
        `📺 **Canal Ranking:** ${ch(c.CANAL_RANKING)}`,
      ),
      rows: [
        new ActionRowBuilder().addComponents(
          btn('cfg_ch_CANAL_RANKING', '📺 Canal Ranking', ButtonStyle.Primary),
          btn('cfg_back', '← Menu', ButtonStyle.Danger),
        ),
      ],
    };

    case 'logs': return {
      embed: new EmbedBuilder().setColor(0x5865F2).setDescription(
        `## 📝 Logs\n\n` +
        `🟢 **Log Entrada:** ${ch(c.CANAL_LOG_ENTRADA)}\n` +
        `🔴 **Log Saída:** ${ch(c.CANAL_LOG_SAIDA)}\n` +
        `🔄 **Log Atualização:** ${ch(c.CANAL_LOG_ATUALIZACAO)}\n` +
        `🎙️ **Log Voz (call):** ${ch(c.CANAL_LOG_VOZ)}\n` +
        `⚠️ **Canal Warns:** ${ch(c.CANAL_WARNS)}`,
      ),
      rows: [
        new ActionRowBuilder().addComponents(
          btn('cfg_ch_CANAL_LOG_ENTRADA',     '🟢 Log Entrada',     ButtonStyle.Primary),
          btn('cfg_ch_CANAL_LOG_SAIDA',       '🔴 Log Saída',       ButtonStyle.Primary),
          btn('cfg_ch_CANAL_LOG_ATUALIZACAO', '🔄 Log Atualização', ButtonStyle.Primary),
        ),
        new ActionRowBuilder().addComponents(
          btn('cfg_ch_CANAL_LOG_VOZ',  '🎙️ Log Voz',     ButtonStyle.Primary),
          btn('cfg_ch_CANAL_WARNS',    '⚠️ Canal Warns', ButtonStyle.Primary),
          btn('cfg_back', '← Menu', ButtonStyle.Danger),
        ),
      ],
    };

    case 'advertencias': return {
      embed: new EmbedBuilder().setColor(0x5865F2).setDescription(
        `## ⚠️ Advertências\n\n` +
        `1️⃣ **Warn Nível 1:** ${rl(c.CARGO_WARN_1)}\n` +
        `2️⃣ **Warn Nível 2:** ${rl(c.CARGO_WARN_2)}\n` +
        `3️⃣ **Warn Nível 3:** ${rl(c.CARGO_WARN_3)}\n` +
        `4️⃣ **Warn Nível 4:** ${rl(c.CARGO_WARN_4)}`,
      ),
      rows: [
        new ActionRowBuilder().addComponents(
          btn('cfg_role_CARGO_WARN_1', '1️⃣ Warn 1', ButtonStyle.Primary),
          btn('cfg_role_CARGO_WARN_2', '2️⃣ Warn 2', ButtonStyle.Primary),
          btn('cfg_role_CARGO_WARN_3', '3️⃣ Warn 3', ButtonStyle.Primary),
          btn('cfg_role_CARGO_WARN_4', '4️⃣ Warn 4', ButtonStyle.Primary),
        ),
        new ActionRowBuilder().addComponents(btn('cfg_back', '← Menu', ButtonStyle.Danger)),
      ],
    };

    case 'setup': return {
      embed: new EmbedBuilder().setColor(0x5865F2).setDescription(
        `## 🔧 Setup — Enviar Mensagens\n\n` +
        `Clique para enviar a mensagem de setup no canal configurado para cada módulo.\n\n` +
        `-# Certifique-se de que os canais estão configurados antes de enviar.`,
      ),
      rows: [
        new ActionRowBuilder().addComponents(
          btn('cfg_setup_recrutamento', '📋 Recrutamento', ButtonStyle.Success),
          btn('cfg_setup_escalacao',    '⚔️ Escalação',    ButtonStyle.Success),
          btn('cfg_setup_farm',         '🌾 Farm',         ButtonStyle.Success),
          btn('cfg_setup_ausencia',     '🏖️ Ausência',     ButtonStyle.Success),
        ),
        new ActionRowBuilder().addComponents(
          btn('cfg_setup_venda',      '💰 Vendas',     ButtonStyle.Success),
          btn('cfg_setup_armas',      '🔫 Armas',      ButtonStyle.Success),
          btn('cfg_setup_ticket',     '🎫 Ticket',     ButtonStyle.Success),
          btn('cfg_setup_ranking',    '📊 Ranking',    ButtonStyle.Success),
          btn('cfg_setup_codiguinho', '🎟️ Codiguinho', ButtonStyle.Success),
        ),
        new ActionRowBuilder().addComponents(btn('cfg_back', '← Menu', ButtonStyle.Danger)),
      ],
    };

    default: return {
      embed: new EmbedBuilder().setColor(0xFF0000).setDescription('❌ Seção desconhecida.'),
      rows: [new ActionRowBuilder().addComponents(btn('cfg_back', '← Menu', ButtonStyle.Danger))],
    };
  }
}

// ─── Editar canal ──────────────────────────────────────────────────────────────
async function handleConfigChBtn(interaction, field) {
  await interaction.update({
    embeds: [new EmbedBuilder().setColor(0x5865F2).setDescription(
      `**Selecione o canal para alterar \`${field}\`**\nAtual: ${ch(config[field])}`,
    )],
    components: [
      new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder().setCustomId(`cfg_ch_sel_${field}`).setPlaceholder('Selecione o canal...'),
      ),
      new ActionRowBuilder().addComponents(btn('cfg_back', '← Cancelar', ButtonStyle.Danger)),
    ],
  });
}

async function handleConfigChSel(interaction, field) {
  const id = interaction.values[0];
  config.salvarConfig({ [field]: id });
  await interaction.update({
    embeds: [new EmbedBuilder().setColor(0x57F287).setDescription(`✅ **${field}** definido para ${ch(id)}`)],
    components: [new ActionRowBuilder().addComponents(btn('cfg_back', '← Menu', ButtonStyle.Secondary))],
  });
}

// ─── Editar cargo único ────────────────────────────────────────────────────────
async function handleConfigRoleBtn(interaction, field) {
  await interaction.update({
    embeds: [new EmbedBuilder().setColor(0x5865F2).setDescription(
      `**Selecione o cargo para \`${field}\`**\nAtual: ${rl(config[field])}`,
    )],
    components: [
      new ActionRowBuilder().addComponents(
        new RoleSelectMenuBuilder().setCustomId(`cfg_role_sel_${field}`).setPlaceholder('Selecione o cargo...'),
      ),
      new ActionRowBuilder().addComponents(btn('cfg_back', '← Cancelar', ButtonStyle.Danger)),
    ],
  });
}

async function handleConfigRoleSel(interaction, field) {
  const id = interaction.values[0];
  config.salvarConfig({ [field]: id });
  await interaction.update({
    embeds: [new EmbedBuilder().setColor(0x57F287).setDescription(`✅ **${field}** definido para ${rl(id)}`)],
    components: [new ActionRowBuilder().addComponents(btn('cfg_back', '← Menu', ButtonStyle.Secondary))],
  });
}

// ─── Gerenciar array de cargos ─────────────────────────────────────────────────
async function handleConfigRolesBtn(interaction, field) {
  const atual = config[field] || [];

  // Monta opções do StringSelectMenu com nomes dos cargos
  let rmRow = null;
  if (atual.length > 0) {
    const opts = await Promise.all(atual.map(async (id) => {
      try {
        const role = await interaction.guild.roles.fetch(id);
        return { label: role ? role.name : `ID: ${id}`, value: id };
      } catch {
        return { label: `ID: ${id}`, value: id };
      }
    }));
    rmRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`cfg_roles_rm_${field}`)
        .setPlaceholder('➖ Remover cargo da lista...')
        .addOptions(opts),
    );
  }

  const addRow = new ActionRowBuilder().addComponents(
    new RoleSelectMenuBuilder().setCustomId(`cfg_roles_add_${field}`).setPlaceholder('➕ Adicionar cargo...'),
  );

  const btnsRow = new ActionRowBuilder().addComponents(
    btn(`cfg_roles_clr_${field}`, '🗑️ Limpar Todos', ButtonStyle.Danger),
    btn('cfg_back', '← Menu', ButtonStyle.Secondary),
  );

  const rows = rmRow ? [addRow, rmRow, btnsRow] : [addRow, btnsRow];

  await interaction.update({
    embeds: [new EmbedBuilder().setColor(0x5865F2).setDescription(
      `## 👥 Cargos — \`${field}\`\n\n**Atuais:** ${rls(atual)}`,
    )],
    components: rows,
  });
}

async function handleConfigRolesAdd(interaction, field) {
  const id    = interaction.values[0];
  const atual = config[field] || [];
  if (atual.includes(id)) {
    await interaction.reply({ content: `⚠️ O cargo ${rl(id)} já está na lista.`, ephemeral: true });
    return;
  }
  const novo = [...atual, id];
  config.salvarConfig({ [field]: novo });
  await interaction.update({
    embeds: [new EmbedBuilder().setColor(0x57F287).setDescription(`✅ Cargo adicionado!\n\n**Lista:** ${rls(novo)}`)],
    components: [new ActionRowBuilder().addComponents(
      btn(`cfg_roles_${field}`, '↩ Voltar Cargos', ButtonStyle.Secondary),
      btn('cfg_back', '← Menu', ButtonStyle.Danger),
    )],
  });
}

async function handleConfigRolesRm(interaction, field) {
  const id   = interaction.values[0];
  const novo = (config[field] || []).filter((x) => x !== id);
  config.salvarConfig({ [field]: novo });
  await interaction.update({
    embeds: [new EmbedBuilder().setColor(0x57F287).setDescription(`✅ Cargo removido.\n\n**Lista:** ${rls(novo)}`)],
    components: [new ActionRowBuilder().addComponents(
      btn(`cfg_roles_${field}`, '↩ Voltar Cargos', ButtonStyle.Secondary),
      btn('cfg_back', '← Menu', ButtonStyle.Danger),
    )],
  });
}

async function handleConfigRolesClr(interaction, field) {
  config.salvarConfig({ [field]: [] });
  await interaction.update({
    embeds: [new EmbedBuilder().setColor(0x57F287).setDescription(`✅ Lista de cargos \`${field}\` limpa.`)],
    components: [new ActionRowBuilder().addComponents(btn('cfg_back', '← Menu', ButtonStyle.Secondary))],
  });
}

// ─── Gerenciar lista de strings (ações predefinidas) ──────────────────────────
async function handleConfigListaBtn(interaction, field) {
  const atual  = config[field] || [];
  const isAcao = field === 'ACOES_PREDEFINIDAS';
  const rows   = [];

  if (atual.length > 0) {
    const opts = atual.map((item, i) => {
      let label = item;
      if (isAcao) {
        const idx = item.lastIndexOf(':');
        if (idx >= 0) label = `${item.slice(0, idx).trim()} (${item.slice(idx + 1).trim()} vagas)`;
      }
      if (label.length > 100) label = label.slice(0, 97) + '...';
      return { label, value: String(i) };
    });
    rows.push(new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`cfg_lista_rm_${field}`)
        .setPlaceholder('❌ Remover item...')
        .addOptions(opts),
    ));
  }

  rows.push(new ActionRowBuilder().addComponents(
    btn(`cfg_lista_add_${field}`, isAcao ? '➕ Adicionar Ação' : '➕ Adicionar', ButtonStyle.Success),
    btn(`cfg_lista_clr_${field}`, '🗑️ Limpar Tudo', ButtonStyle.Danger),
    btn('cfg_back', '← Menu', ButtonStyle.Secondary),
  ));

  const descExtra = isAcao ? '\n\n-# Formato: **Nome:Quantidade** — ex: `Banco Central:11`' : '';

  await interaction.update({
    embeds: [new EmbedBuilder().setColor(0x5865F2).setDescription(
      `## 📋 ${isAcao ? 'Ações Predefinidas' : field}\n\n` +
      `**Atuais:**\n${atual.length > 0 ? atual.map((a) => `• ${a}`).join('\n') : '`nenhuma`'}` +
      descExtra,
    )],
    components: rows,
  });
}

async function handleConfigListaAddBtn(interaction, field) {
  const isAcao = field === 'ACOES_PREDEFINIDAS';
  const modal  = new ModalBuilder()
    .setCustomId(`modal_cfg_lista_${field}`)
    .setTitle(isAcao ? 'Adicionar Ação' : 'Adicionar Item');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('cfg_lista_valor')
        .setLabel(isAcao ? 'Nome:Quantidade (ex: Banco Central:11)' : 'Valor')
        .setPlaceholder(isAcao ? 'Ex: Banco Central:11' : 'Digite o valor...')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(80)
        .setRequired(true),
    ),
  );
  await interaction.showModal(modal);
}

async function handleModalConfigLista(interaction, field) {
  const valor = interaction.fields.getTextInputValue('cfg_lista_valor').trim();
  const atual = config[field] || [];

  if (atual.includes(valor)) {
    await interaction.reply({ content: `⚠️ \`${valor}\` já está na lista.`, ephemeral: true });
    return;
  }

  const novo = [...atual, valor];
  config.salvarConfig({ [field]: novo });
  await interaction.reply({
    content: `✅ **${valor}** adicionado às ações predefinidas.\n\n**Lista:** ${lst(novo)}`,
    ephemeral: true,
  });
}

async function handleConfigListaRm(interaction, field) {
  const idx  = parseInt(interaction.values[0], 10);
  const atual = config[field] || [];
  const item  = atual[idx];
  const novo  = atual.filter((_, i) => i !== idx);
  config.salvarConfig({ [field]: novo });
  await interaction.update({
    embeds: [new EmbedBuilder().setColor(0x57F287).setDescription(
      `✅ \`${item}\` removido.\n\n**Lista:** ${lst(novo)}`,
    )],
    components: [new ActionRowBuilder().addComponents(
      btn(`cfg_lista_${field}`, '↩ Voltar Lista', ButtonStyle.Secondary),
      btn('cfg_back', '← Menu', ButtonStyle.Danger),
    )],
  });
}

async function handleConfigListaClr(interaction, field) {
  config.salvarConfig({ [field]: [] });
  await interaction.update({
    embeds: [new EmbedBuilder().setColor(0x57F287).setDescription('✅ Lista de ações limpa.')],
    components: [new ActionRowBuilder().addComponents(btn('cfg_back', '← Menu', ButtonStyle.Secondary))],
  });
}

// ─── Personalizar painel (título, desc, cor, botão, imagem) ───────────────────
const PAINEL_KEYS = {
  recrutamento: { titulo: 'RECRUTAMENTO_TITULO', desc: 'RECRUTAMENTO_DESC', cor: 'RECRUTAMENTO_COR', btnKey: 'RECRUTAMENTO_BTN' },
  escalacao:    { titulo: 'ESCALACAO_TITULO',    desc: 'ESCALACAO_DESC',    cor: 'ESCALACAO_COR',    btnKey: null },
  farm:         { titulo: 'FARM_TITULO',         desc: 'FARM_DESC',         cor: 'FARM_COR',         btnKey: 'FARM_BTN' },
  venda:        { titulo: 'VENDA_TITULO',        desc: 'VENDA_DESC',        cor: 'VENDA_COR',        btnKey: 'VENDA_BTN' },
  armas:        { titulo: 'ARMAS_TITULO',        desc: 'ARMAS_DESC',        cor: 'ARMAS_COR',        btnKey: 'ARMAS_BTN' },
  codiguinho:   { titulo: 'CODIGUINHO_TITULO',   desc: 'CODIGUINHO_DESC',   cor: 'CODIGUINHO_COR',   btnKey: 'CODIGUINHO_BTN' },
  ticket:       { titulo: 'TICKET_TITULO',       desc: 'TICKET_DESC',       cor: 'TICKET_COR',       btnKey: null },
  ausencia:     { titulo: 'AUSENCIA_TITULO',     desc: 'AUSENCIA_DESC',     cor: 'AUSENCIA_COR',     btnKey: 'AUSENCIA_BTN' },
};

async function handleConfigPainelBtn(interaction, modulo) {
  const keys = PAINEL_KEYS[modulo];
  if (!keys) { await interaction.reply({ content: '❌ Módulo não suporta personalização.', ephemeral: true }); return; }

  const corNum = config[keys.cor] ?? 0;
  const corHex = corNum.toString(16).padStart(6, '0').toUpperCase();

  const modal = new ModalBuilder()
    .setCustomId(`modal_cfg_painel_${modulo}`)
    .setTitle(`Personalizar — ${modulo}`);

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('painel_titulo')
        .setLabel('Título do painel')
        .setValue(String(config[keys.titulo] ?? ''))
        .setStyle(TextInputStyle.Short)
        .setMaxLength(80)
        .setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('painel_desc')
        .setLabel('Descrição (suporta markdown)')
        .setValue(String(config[keys.desc] ?? ''))
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(1000)
        .setRequired(false),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('painel_cor')
        .setLabel('Cor (hex sem # — ex: 3498DB)')
        .setValue(corHex)
        .setStyle(TextInputStyle.Short)
        .setMaxLength(6)
        .setRequired(false),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('painel_btn')
        .setLabel('Texto do botão principal (se houver)')
        .setValue(keys.btnKey ? String(config[keys.btnKey] ?? '') : '—')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(60)
        .setRequired(false),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('painel_img')
        .setLabel('URL da imagem padrão (deixe em branco p/ manter)')
        .setValue(String(config.IMG_PADRAO ?? ''))
        .setStyle(TextInputStyle.Short)
        .setMaxLength(500)
        .setRequired(false),
    ),
  );

  await interaction.showModal(modal);
}

async function handleModalConfigPainel(interaction, modulo) {
  const keys = PAINEL_KEYS[modulo];
  if (!keys) { await interaction.reply({ content: '❌ Módulo desconhecido.', ephemeral: true }); return; }

  const titulo = interaction.fields.getTextInputValue('painel_titulo').trim();
  const desc   = interaction.fields.getTextInputValue('painel_desc').trim();
  const corHex = interaction.fields.getTextInputValue('painel_cor').trim().replace(/^#/, '').replace(/^0x/i, '');
  const btnTxt = interaction.fields.getTextInputValue('painel_btn').trim();
  const imgUrl = interaction.fields.getTextInputValue('painel_img').trim();

  const updates = {};
  if (titulo) updates[keys.titulo] = titulo;
  if (desc)   updates[keys.desc]   = desc;

  if (corHex && /^[0-9A-Fa-f]{6}$/.test(corHex)) {
    updates[keys.cor] = parseInt(corHex, 16);
  }

  if (keys.btnKey && btnTxt && btnTxt !== '—') {
    updates[keys.btnKey] = btnTxt;
  }

  if (imgUrl && imgUrl.startsWith('http')) {
    updates['IMG_PADRAO'] = imgUrl;
  }

  config.salvarConfig(updates);
  await interaction.reply({
    content: `✅ Painel de **${modulo}** atualizado! Use **Setup → Enviar Mensagens** para repostar no canal.`,
    ephemeral: true,
  });
}

// ─── Toggle rádio na escalação ─────────────────────────────────────────────────
async function handleConfigEscRadio(interaction) {
  const novo = !config.ESCALACAO_RADIO;
  config.salvarConfig({ ESCALACAO_RADIO: novo });
  await interaction.update({
    embeds: [new EmbedBuilder().setColor(0x57F287).setDescription(
      `✅ Campo de rádio na escalação: **${novo ? '✅ Ativado' : '❌ Desativado'}**\n\n` +
      `-# Quando ativado, ao criar uma escalação será solicitada a frequência de rádio.`,
    )],
    components: [new ActionRowBuilder().addComponents(btn('cfg_back', '← Menu', ButtonStyle.Secondary))],
  });
}

// ─── Setup — enviar mensagem no canal configurado ──────────────────────────────
async function handleConfigSetup(interaction, modulo, client) {
  await interaction.deferUpdate();
  const guild = interaction.guild;

  const mapa = {
    recrutamento: () => require('./botao').handleRecrutamentoChannel(client, guild),
    escalacao:    () => require('./escalacao').handleEscalacaoChannel(client, guild),
    farm:         () => require('./farm').handleFarmChannel(client, guild),
    venda:        () => require('./venda').handleVendaChannel(client, guild),
    armas:        () => require('./armas').handleArmasChannel(client, guild),
    ticket:       () => require('./ticket').handleTicketChannel(client, guild),
    ranking:      () => require('./ranking').handleRankingSetup(client, guild),
    codiguinho:   () => require('./codiguinho').handleCodiguinhoChannel(client, guild),
    ausencia:     () => require('./ausencia').handleAusenciaSetup(client, guild),
  };

  const fn = mapa[modulo];
  if (!fn) { await interaction.followUp({ content: '❌ Módulo desconhecido.', ephemeral: true }); return; }

  try {
    await fn();
    await interaction.followUp({ content: `✅ Mensagem de **${modulo}** enviada!`, ephemeral: true });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro no setup via configurar:`, err);
    await interaction.followUp({ content: '❌ Erro ao enviar. Verifique se o canal está configurado e o bot tem permissão.', ephemeral: true });
  }
}

module.exports = {
  handleConfigurar,
  handleConfigBack,
  handleConfigMenu,
  handleConfigChBtn,
  handleConfigChSel,
  handleConfigRoleBtn,
  handleConfigRoleSel,
  handleConfigRolesBtn,
  handleConfigRolesAdd,
  handleConfigRolesRm,
  handleConfigRolesClr,
  handleConfigListaBtn,
  handleConfigListaAddBtn,
  handleModalConfigLista,
  handleConfigListaRm,
  handleConfigListaClr,
  handleConfigSetup,
  handleConfigPainelBtn,
  handleModalConfigPainel,
  handleConfigEscRadio,
};
