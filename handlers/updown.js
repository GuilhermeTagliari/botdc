const {
  ButtonBuilder, ButtonStyle, ActionRowBuilder,
  ModalBuilder, TextInputBuilder, TextInputStyle,
  UserSelectMenuBuilder, RoleSelectMenuBuilder,
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
  MediaGalleryBuilder, MediaGalleryItemBuilder,
  MessageFlags,
} = require('discord.js');
const config = require('../config');

// userId → { tipo, membroId, cargoAntesId, cargoNovoId }
const pending = new Map();

async function handleUpDownChannel(client, guild) {
  if (!config.CANAL_UPDOWN_BTN) return;
  const channel = await guild.channels.fetch(config.CANAL_UPDOWN_BTN).catch(() => null);
  if (!channel) return;

  const container = new ContainerBuilder()
    .setAccentColor(config.UPDOWN_COR ?? 0x3498DB)
    .addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(config.getImg('UPDOWN'))),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# ${config.UPDOWN_TITULO ?? 'UP / REBAIXAMENTO'}\n\n` +
        `${config.UPDOWN_DESC ?? 'Registre promoções e rebaixamentos clicando nos botões abaixo.'}\n\n` +
        `-# Ao registrar, o bot removerá o cargo anterior, adicionará o novo cargo e renomeará o membro automaticamente.`,
      ),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('updown_up').setLabel('⬆️ Registrar Up').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('updown_down').setLabel('⬇️ Registrar Rebaixamento').setStyle(ButtonStyle.Danger),
      ),
    );

  const mensagens = await channel.messages.fetch({ limit: 50 });
  const existente = mensagens.find((m) => m.author.id === client.user.id && m.flags.has(MessageFlags.IsComponentsV2));
  if (existente) {
    await existente.edit({ components: [container], flags: MessageFlags.IsComponentsV2 });
  } else {
    await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
}

function buildSelecaoMsg(userId, tipo) {
  const p     = pending.get(userId) ?? {};
  const isUp  = tipo === 'up';
  const pronto = !!(p.membroId && (p.cargoAntesId || p.cargoNovoId));

  const linhas = [
    `**${isUp ? '⬆️ Registrar Promoção' : '⬇️ Registrar Rebaixamento'}**\n`,
    `👤 **Membro:** ${p.membroId ? `<@${p.membroId}>` : '`não selecionado`'}`,
    `📌 **Cargo a remover:** ${p.cargoAntesId ? `<@&${p.cargoAntesId}>` : '`opcional`'}`,
    `${isUp ? '⬆️' : '⬇️'} **Cargo a adicionar:** ${p.cargoNovoId ? `<@&${p.cargoNovoId}>` : '`opcional`'}`,
    `-# Selecione ao menos um dos cargos.`,
  ].join('\n');

  return {
    content: linhas,
    components: [
      new ActionRowBuilder().addComponents(
        new UserSelectMenuBuilder()
          .setCustomId(`updown_sel_membro_${tipo}`)
          .setPlaceholder('1. Selecione o membro...'),
      ),
      new ActionRowBuilder().addComponents(
        new RoleSelectMenuBuilder()
          .setCustomId(`updown_sel_antes_${tipo}`)
          .setPlaceholder('2. Cargo anterior...'),
      ),
      new ActionRowBuilder().addComponents(
        new RoleSelectMenuBuilder()
          .setCustomId(`updown_sel_novo_${tipo}`)
          .setPlaceholder('3. Novo cargo...'),
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`updown_confirm_${tipo}`)
          .setLabel('✅ Confirmar e adicionar motivo')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(!pronto),
      ),
    ],
    ephemeral: true,
  };
}

async function handleUpBtn(interaction) {
  pending.set(interaction.user.id, { tipo: 'up' });
  await interaction.reply(buildSelecaoMsg(interaction.user.id, 'up'));
}

async function handleDownBtn(interaction) {
  pending.set(interaction.user.id, { tipo: 'down' });
  await interaction.reply(buildSelecaoMsg(interaction.user.id, 'down'));
}

async function handleUpDownSelMembro(interaction, tipo) {
  const p = pending.get(interaction.user.id) ?? { tipo };
  p.membroId = interaction.values[0];
  pending.set(interaction.user.id, p);
  await interaction.update(buildSelecaoMsg(interaction.user.id, tipo));
}

async function handleUpDownSelAntes(interaction, tipo) {
  const p = pending.get(interaction.user.id) ?? { tipo };
  p.cargoAntesId = interaction.values[0];
  pending.set(interaction.user.id, p);
  await interaction.update(buildSelecaoMsg(interaction.user.id, tipo));
}

async function handleUpDownSelNovo(interaction, tipo) {
  const p = pending.get(interaction.user.id) ?? { tipo };
  p.cargoNovoId = interaction.values[0];
  pending.set(interaction.user.id, p);
  await interaction.update(buildSelecaoMsg(interaction.user.id, tipo));
}

async function handleUpDownConfirm(interaction, tipo) {
  const p = pending.get(interaction.user.id);
  if (!p?.membroId || (!p?.cargoAntesId && !p?.cargoNovoId)) {
    await interaction.reply({ content: '❌ Selecione o membro e ao menos um cargo antes de confirmar.', ephemeral: true });
    return;
  }

  const isUp = tipo === 'up';
  const modal = new ModalBuilder()
    .setCustomId(`modal_updown_${tipo}`)
    .setTitle(isUp ? 'Registrar Promoção (Up)' : 'Registrar Rebaixamento');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('ud_apelido')
        .setLabel('Novo apelido do membro')
        .setPlaceholder('Ex: 1234 | João Silva')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(32)
        .setRequired(true),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('ud_motivo')
        .setLabel('Motivo / Observação')
        .setPlaceholder('Descreva o motivo')
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(400)
        .setRequired(true),
    ),
  );
  await interaction.showModal(modal);
}

async function handleModalUpDown(interaction, tipo) {
  await interaction.deferReply({ ephemeral: true });
  const apelido = interaction.fields.getTextInputValue('ud_apelido').trim();
  const motivo  = interaction.fields.getTextInputValue('ud_motivo').trim();

  const p = pending.get(interaction.user.id);
  pending.delete(interaction.user.id);

  if (!p?.membroId || (!p?.cargoAntesId && !p?.cargoNovoId)) {
    await interaction.editReply({ content: '❌ Sessão expirada. Tente novamente clicando no botão.' });
    return;
  }

  const isUp   = tipo === 'up';
  const cor    = isUp ? 0x57F287 : 0xED4245;
  const titulo = isUp ? '⬆️  Promoção Registrada' : '⬇️  Rebaixamento Registrado';
  const erros  = [];

  // Aplica as mudanças no membro
  let membro;
  try {
    membro = await interaction.guild.members.fetch(p.membroId);
  } catch {
    await interaction.editReply({ content: '❌ Membro não encontrado no servidor.' });
    return;
  }

  if (p.cargoAntesId) { try { await membro.roles.remove(p.cargoAntesId); } catch { erros.push('remover cargo anterior'); } }
  if (p.cargoNovoId)  { try { await membro.roles.add(p.cargoNovoId); }    catch { erros.push('adicionar novo cargo'); } }
  try { await membro.setNickname(apelido); }         catch { erros.push('renomear membro'); }

  const linhaAntes = p.cargoAntesId ? `\n📌 **Cargo removido:** <@&${p.cargoAntesId}>` : '';
  const linhaNovo  = p.cargoNovoId  ? `\n${isUp ? '⬆️' : '⬇️'} **Cargo adicionado:** <@&${p.cargoNovoId}>` : '';

  const text =
    `## ${titulo}\n\n` +
    `👤 **Membro:** <@${p.membroId}>\n` +
    `🏷️ **Novo apelido:** \`${apelido}\`` +
    linhaAntes + linhaNovo + `\n` +
    `📋 **Motivo:** ${motivo}\n\n` +
    `📝 Registrado por <@${interaction.user.id}>  ·  <t:${Math.floor(Date.now() / 1000)}:f>`;

  const container = new ContainerBuilder()
    .setAccentColor(cor)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));

  if (config.CANAL_UPDOWN_LOG) {
    try {
      const canalLog = await interaction.guild.channels.fetch(config.CANAL_UPDOWN_LOG);
      await canalLog.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } catch (err) {
      console.error(`[updown] Erro ao enviar log:`, err.message);
    }
  }

  const avisoErros = erros.length > 0 ? `\n⚠️ Não foi possível: ${erros.join(', ')} (verifique as permissões do bot).` : '';
  await interaction.editReply({ content: `${isUp ? '⬆️' : '⬇️'} Registro concluído!${avisoErros}` });
}

module.exports = {
  handleUpDownChannel,
  handleUpBtn,
  handleDownBtn,
  handleUpDownSelMembro,
  handleUpDownSelAntes,
  handleUpDownSelNovo,
  handleUpDownConfirm,
  handleModalUpDown,
};
