const {
  EmbedBuilder,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
  MessageFlags,
} = require('discord.js');
const config = require('../config');
const { temPermissao } = require('../utils/permissao');
const { dmEmbed } = require('../utils/dm');

// Extrai todo o texto dos componentes v2 de uma mensagem
function extrairTexto(message) {
  const getText = (comp) => {
    if (!comp) return '';
    const type = comp.type ?? comp.data?.type;
    const content = comp.content ?? comp.data?.content;
    if (type === 10) return typeof content === 'string' ? content : '';
    const children = comp.components ?? comp.data?.components ?? [];
    const accessory = comp.accessory ?? comp.data?.accessory ?? null;
    const parts = Array.isArray(children) ? children.map(getText) : [];
    if (accessory) parts.push(getText(accessory));
    return parts.filter(Boolean).join('\n');
  };
  return message.components.map(getText).filter(Boolean).join('\n');
}

async function handleAprovacao(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const isAprovar = interaction.customId.startsWith('aprovar_');
  const userId    = interaction.customId.split('_')[1];
  const aprovador = interaction.member;
  const timestamp = `<t:${Math.floor(Date.now() / 1000)}:F>`;

  if (!temPermissao(aprovador, config.CARGOS_APROVACAO)) {
    await interaction.editReply({ content: '❌ Você não tem permissão para aprovar ou reprovar fichas.' });
    return;
  }

  let membro;
  try {
    membro = await interaction.guild.members.fetch(userId);
  } catch {
    await interaction.editReply({ content: '❌ Membro não encontrado — pode ter saído do servidor.' });
    return;
  }

  // Detecta formato antigo (embed) ou novo (Components v2)
  const isEmbedAntigo = interaction.message.embeds.length > 0;

  let nomeCampo;
  let idCampo;

  if (isEmbedAntigo) {
    const embedOriginal = interaction.message.embeds[0];
    nomeCampo = embedOriginal.fields.find((f) => f.name.includes('Nome'))?.value ?? 'Desconhecido';
    idCampo   = embedOriginal.fields.find((f) => f.name.includes('ID'))?.value?.replace(/`/g, '') ?? 'Desconhecido';
  } else {
    const texto = extrairTexto(interaction.message);
    nomeCampo   = texto.match(/\*\*👤 Nome:\*\* ([^\n]+)/)?.[1]?.trim() ?? 'Desconhecido';
    idCampo     = texto.match(/\*\*🪪 ID:\*\* `([^`]+)`/)?.[1] ?? 'Desconhecido';
  }

  if (isAprovar) {
    const avisos = [];

    try {
      await membro.setNickname(`${idCampo} | ${nomeCampo}`);
    } catch (err) {
      avisos.push(err.code === 50013
        ? '⚠️ Sem permissão para renomear — verifique a hierarquia de cargos do bot.'
        : `⚠️ Nick não atualizado: ${err.message}`);
    }

    try {
      const cargo = await interaction.guild.roles.fetch(config.CARGO_APROVADO);
      if (cargo) await membro.roles.add(cargo);
    } catch (err) {
      avisos.push(`⚠️ Cargo não atribuído: ${err.message}`);
    }

    if (config.CARGO_VISITANTE) {
      try { await membro.roles.remove(config.CARGO_VISITANTE); } catch {}
    }

    if (isEmbedAntigo) {
      const embedAtualizado = EmbedBuilder.from(interaction.message.embeds[0])
        .setColor(0x57F287)
        .setFooter({ text: '✅ Aprovado' })
        .addFields({ name: '✅ Aprovado por', value: `<@${aprovador.id}> • ${timestamp}`, inline: false });
      await interaction.message.edit({ embeds: [embedAtualizado], components: [] });
    } else {
      const textoAtual = extrairTexto(interaction.message);
      const novoTexto  = textoAtual + `\n\n✅ **Aprovado por** <@${aprovador.id}>  ·  ${timestamp}`;
      const container  = new ContainerBuilder()
        .setAccentColor(0x57F287)
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(novoTexto))
            .setThumbnailAccessory(new ThumbnailBuilder().setURL(membro.user.displayAvatarURL({ dynamic: true }))),
        );
      await interaction.message.edit({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    try {
      await membro.send(dmEmbed('✅ Ficha Aprovada',
        `Bem-vindo(a) ao time! Seu apelido foi atualizado e o cargo foi atribuído.\nSe tiver alguma dúvida, fale com um membro da staff.\n\n-# Never Pure — Sistema de Recrutamento`,
        0x57F287));
    } catch {}

    await interaction.editReply({
      content: avisos.length > 0
        ? `✅ Ficha de <@${userId}> aprovada!\n\n${avisos.join('\n')}`
        : `✅ Ficha de <@${userId}> aprovada com sucesso!`,
    });
  } else {
    if (isEmbedAntigo) {
      const embedAtualizado = EmbedBuilder.from(interaction.message.embeds[0])
        .setColor(0x3498DB)
        .setFooter({ text: '❌ Reprovado' })
        .addFields({ name: '❌ Reprovado por', value: `<@${aprovador.id}> • ${timestamp}`, inline: false });
      await interaction.message.edit({ embeds: [embedAtualizado], components: [] });
    } else {
      const textoAtual = extrairTexto(interaction.message);
      const novoTexto  = textoAtual + `\n\n❌ **Reprovado por** <@${aprovador.id}>  ·  ${timestamp}`;
      const container  = new ContainerBuilder()
        .setAccentColor(0x3498DB)
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(novoTexto))
            .setThumbnailAccessory(new ThumbnailBuilder().setURL(membro.user.displayAvatarURL({ dynamic: true }))),
        );
      await interaction.message.edit({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    try {
      await membro.send(dmEmbed('❌ Ficha Reprovada',
        `Infelizmente sua solicitação não foi aceita desta vez.\nEntre em contato com um recrutador para mais informações.\n\n-# Never Pure — Sistema de Recrutamento`,
        0x3498DB));
    } catch {}

    await interaction.editReply({ content: `❌ Ficha de <@${userId}> reprovada.` });
  }
}

module.exports = { handleAprovacao };
