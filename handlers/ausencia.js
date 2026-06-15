const {
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
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
const { dmEmbed } = require('../utils/dm');
const { temPermissao } = require('../utils/permissao');

const ARQUIVO = path.join(__dirname, '../data/ausencias.json');

const ausencias = new Map();

function lerDados() {
  try { return JSON.parse(fs.readFileSync(ARQUIVO, 'utf8')); } catch { return {}; }
}

function salvarDados() {
  const dados = {};
  for (const [id, a] of ausencias.entries()) dados[id] = a;
  fs.writeFileSync(ARQUIVO, JSON.stringify(dados, null, 2));
}

function formatarTempo(ms) {
  if (ms <= 0) return 'Encerrada';
  const totalMin = Math.floor(ms / 60000);
  const totalH   = Math.floor(totalMin / 60);
  const dias     = Math.floor(totalH / 24);
  const horas    = totalH % 24;

  if (dias > 1)                    return `${dias} dias`;
  if (dias === 1 && horas > 0)     return `1 dia e ${horas}h`;
  if (dias === 1)                  return '1 dia';
  if (totalH >= 1)                 return `${totalH} hora${totalH !== 1 ? 's' : ''}`;
  return `${totalMin} minuto${totalMin !== 1 ? 's' : ''}`;
}

function criarContainerAusencia(aus) {
  const restante  = aus.endTime - Date.now();
  const encerrada = restante <= 0;
  const tsRetorno = Math.floor(aus.endTime / 1000);

  const texto = encerrada
    ? `## ✅ Ausência Encerrada\n\n` +
      `<@${aus.userId}> retornou da ausência.\n\n` +
      `📅 **Duração:** ${aus.dias} dia${aus.dias !== 1 ? 's' : ''}\n` +
      `📋 **Motivo:** ${aus.motivo}\n\n` +
      `-# Ausência concluída`
    : `## 🏖️ Em Ausência — <@${aus.userId}>\n\n` +
      `⏳ **Tempo restante:** **${formatarTempo(restante)}**\n` +
      `📅 **Retorno previsto:** <t:${tsRetorno}:F>\n` +
      `📋 **Motivo:** ${aus.motivo}\n\n` +
      `-# Atualizado automaticamente`;

  return new ContainerBuilder()
    .setAccentColor(encerrada ? 0x57F287 : 0xFEE75C)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(texto));
}

function extrairTexto(msg) {
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

async function handleAusenciaSetup(client, guild) {
  try {
    const channel = await guild.channels.fetch(config.CANAL_AUSENCIA_BTN);
    if (!channel) return;

    const msgs = await channel.messages.fetch({ limit: 50 });
    const jaExiste = msgs.some(
      (m) => m.author.id === client.user.id && m.flags.has(MessageFlags.IsComponentsV2),
    );
    if (jaExiste) {
      console.log(`[${new Date().toISOString()}] Mensagem de ausência já existe.`);
      return;
    }

    const container = new ContainerBuilder()
      .setAccentColor(config.AUSENCIA_COR ?? 0x3498DB)
      .addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(config.getImg('AUSENCIA'))))
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `# ${config.AUSENCIA_TITULO}\n\n${config.AUSENCIA_DESC}`,
      ))
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('aus_solicitar').setLabel(config.AUSENCIA_BTN).setStyle(ButtonStyle.Primary),
        ),
      );

    await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
    console.log(`[${new Date().toISOString()}] Mensagem de ausência enviada em: ${guild.name}`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao enviar mensagem de ausência:`, err);
  }
}

async function handleAusenciaBotao(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('modal_ausencia')
    .setTitle('Solicitar Ausência');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('aus_dias')
        .setLabel('Quantos dias de ausência? (1 a 60)')
        .setPlaceholder('Ex: 7')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(3)
        .setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('aus_motivo')
        .setLabel('Motivo da ausência')
        .setPlaceholder('Ex: Viagem, problemas pessoais...')
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(300)
        .setRequired(true),
    ),
  );

  await interaction.showModal(modal);
}

async function handleModalAusencia(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const diasRaw = interaction.fields.getTextInputValue('aus_dias');
  const motivo  = interaction.fields.getTextInputValue('aus_motivo');
  const dias    = parseInt(diasRaw, 10);

  if (isNaN(dias) || dias < 1 || dias > 60) {
    await interaction.editReply({ content: '❌ Número de dias inválido. Use um valor entre 1 e 60.' });
    return;
  }

  const timestamp = `<t:${Math.floor(Date.now() / 1000)}:F>`;

  const container = new ContainerBuilder()
    .setAccentColor(0xFEE75C)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `## 🏖️ Solicitação de Ausência\n\n` +
      `**👤 Membro:** <@${interaction.user.id}>\n` +
      `**📅 Dias:** ${dias} dia${dias !== 1 ? 's' : ''}\n` +
      `**📋 Motivo:** ${motivo}\n` +
      `**🕐 Solicitado:** ${timestamp}\n\n` +
      `-# ⏳ Aguardando aprovação`,
    ))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`aus_aprovar_${interaction.user.id}_${dias}`).setLabel('✅ Aprovar').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`aus_reprovar_${interaction.user.id}`).setLabel('❌ Reprovar').setStyle(ButtonStyle.Danger),
      ),
    );

  try {
    const canal = await interaction.guild.channels.fetch(config.CANAL_AUSENCIA_APROVACAO);
    await canal.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
    await interaction.editReply({ content: '✅ **Solicitação enviada!** Aguarde a aprovação da staff.' });
  } catch (err) {
    await interaction.editReply({ content: `❌ Erro ao enviar solicitação: \`${err.message}\`` });
  }
}

async function handleAusenciaAprovar(interaction, userId, dias) {
  if (!temPermissao(interaction.member, config.CARGOS_AUSENCIA_ADM)) {
    await interaction.reply({ content: '❌ Você não tem permissão para aprovar ausências.', ephemeral: true });
    return;
  }
  await interaction.deferReply({ ephemeral: true });

  const texto  = extrairTexto(interaction.message);
  const match  = texto.match(/\*\*📋 Motivo:\*\* (.+)/);
  const motivo = match ? match[1].trim() : '—';

  const endTime = Date.now() + dias * 24 * 60 * 60 * 1000;
  const ausId   = `${userId}_${Date.now().toString(36)}`;
  const aus     = {
    userId, dias, motivo, endTime, encerrada: false,
    messageId: null, channelId: null, guildId: interaction.guild.id,
  };

  try {
    const canal = await interaction.guild.channels.fetch(config.CANAL_AUSENCIA_ATIVA);
    const msg   = await canal.send({ components: [criarContainerAusencia(aus)], flags: MessageFlags.IsComponentsV2 });
    aus.messageId = msg.id;
    aus.channelId = canal.id;
  } catch (err) {
    await interaction.editReply({ content: `❌ Erro ao publicar no canal de ausências: \`${err.message}\`` });
    return;
  }

  ausencias.set(ausId, aus);
  salvarDados();

  // Atualiza mensagem de aprovação
  const novoTexto = texto.replace('-# ⏳ Aguardando aprovação', `\n✅ **Aprovado por** <@${interaction.user.id}>`);
  await interaction.message.edit({
    components: [new ContainerBuilder().setAccentColor(0x57F287).addTextDisplayComponents(new TextDisplayBuilder().setContent(novoTexto))],
    flags: MessageFlags.IsComponentsV2,
  });

  try {
    const membro = await interaction.guild.members.fetch(userId);
    if (config.CARGO_AUSENCIA) {
      try { await membro.roles.add(config.CARGO_AUSENCIA); } catch {}
    }
    const tsRetorno = Math.floor(endTime / 1000);
    await membro.send(dmEmbed('✅ Ausência Aprovada',
      `Você está registrado como ausente no servidor **${interaction.guild.name}**.\n\n📅 **Retorno previsto:** <t:${tsRetorno}:F>\n📋 **Motivo:** ${motivo}\n\n-# Você receberá uma mensagem quando o prazo encerrar`,
      0x57F287));
  } catch {}

  await interaction.editReply({ content: `✅ Ausência de <@${userId}> aprovada por **${dias} dia${dias !== 1 ? 's' : ''}**!` });
}

async function handleAusenciaReprovar(interaction, userId) {
  if (!temPermissao(interaction.member, config.CARGOS_AUSENCIA_ADM)) {
    await interaction.reply({ content: '❌ Você não tem permissão para reprovar ausências.', ephemeral: true });
    return;
  }
  await interaction.deferReply({ ephemeral: true });

  const texto     = extrairTexto(interaction.message);
  const novoTexto = texto.replace('-# ⏳ Aguardando aprovação', `\n❌ **Reprovado por** <@${interaction.user.id}>`);
  await interaction.message.edit({
    components: [new ContainerBuilder().setAccentColor(0x3498DB).addTextDisplayComponents(new TextDisplayBuilder().setContent(novoTexto))],
    flags: MessageFlags.IsComponentsV2,
  });

  try {
    const membro = await interaction.guild.members.fetch(userId);
    await membro.send(dmEmbed('❌ Ausência Reprovada',
      `Sua solicitação não foi aceita no servidor **${interaction.guild.name}**.\nEntre em contato com a staff para mais informações.\n\n-# Never Pure — Sistema de Ausências`,
      0x3498DB));
  } catch {}

  await interaction.editReply({ content: `❌ Solicitação de <@${userId}> reprovada.` });
}

async function atualizarAusencias(client) {
  for (const [ausId, aus] of ausencias.entries()) {
    if (aus.encerrada) continue;

    try {
      const guild = client.guilds.cache.get(aus.guildId);
      if (!guild) continue;
      const canal = await guild.channels.fetch(aus.channelId);
      const msg   = await canal.messages.fetch(aus.messageId);
      const restante = aus.endTime - Date.now();

      if (restante <= 0) {
        aus.encerrada = true;
        salvarDados();
        await msg.edit({ components: [criarContainerAusencia(aus)], flags: MessageFlags.IsComponentsV2 });
        try {
          const membro = await guild.members.fetch(aus.userId);
          if (config.CARGO_AUSENCIA) {
            try { await membro.roles.remove(config.CARGO_AUSENCIA); } catch {}
          }
          await membro.send(dmEmbed('🏠 Ausência Encerrada',
            `Você está de volta ao servidor **${guild.name}**!\n\n📅 **Duração:** ${aus.dias} dia${aus.dias !== 1 ? 's' : ''}\n📋 **Motivo:** ${aus.motivo}\n\n-# Bem-vindo(a) de volta!`,
            0x57F287));
        } catch {}
      } else {
        await msg.edit({ components: [criarContainerAusencia(aus)], flags: MessageFlags.IsComponentsV2 });
      }
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Erro ao atualizar ausência ${ausId}:`, err.message);
    }
  }
}

async function restaurarAusencias(client) {
  const dados = lerDados();
  for (const [id, a] of Object.entries(dados)) {
    if (!a.encerrada) ausencias.set(id, a);
  }
  console.log(`[${new Date().toISOString()}] Ausências carregadas: ${ausencias.size}`);
  await atualizarAusencias(client);
  setInterval(() => atualizarAusencias(client), 60 * 60 * 1000);
}

module.exports = {
  handleAusenciaSetup,
  handleAusenciaBotao,
  handleModalAusencia,
  handleAusenciaAprovar,
  handleAusenciaReprovar,
  restaurarAusencias,
};
