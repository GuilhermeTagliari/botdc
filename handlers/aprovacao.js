const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const { temPermissao } = require('../utils/permissao');

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

  const embedOriginal = interaction.message.embeds[0];
  const nomeCampo = embedOriginal.fields.find((f) => f.name.includes('Nome'))?.value ?? 'Desconhecido';
  const idCampo   = embedOriginal.fields.find((f) => f.name.includes('ID'))?.value?.replace(/`/g, '') ?? 'Desconhecido';

  if (isAprovar) {
    const avisos = [];

    try {
      await membro.setNickname(`${idCampo} | ${nomeCampo}`);
    } catch (err) {
      if (err.code === 50013) {
        avisos.push('⚠️ Sem permissão para renomear — verifique a hierarquia de cargos do bot.');
      } else {
        avisos.push(`⚠️ Nick não atualizado: ${err.message}`);
      }
    }

    try {
      const cargo = await interaction.guild.roles.fetch(config.CARGO_APROVADO);
      if (cargo) await membro.roles.add(cargo);
    } catch (err) {
      avisos.push(`⚠️ Cargo não atribuído: ${err.message}`);
    }

    const embedAtualizado = EmbedBuilder.from(embedOriginal)
      .setColor(0x57F287)
      .setFooter({ text: '✅ Aprovado' })
      .addFields({ name: '✅ Aprovado por', value: `<@${aprovador.id}> • ${timestamp}`, inline: false });

    await interaction.message.edit({ embeds: [embedAtualizado], components: [] });

    try {
      await membro.send(
        `✅ **Sua ficha foi aprovada!**\n\n` +
        `Bem-vindo(a) ao time! Seu apelido foi atualizado e o cargo foi atribuído.\n` +
        `Se tiver alguma dúvida, fale com um membro da staff.`,
      );
    } catch {}

    await interaction.editReply({
      content: avisos.length > 0
        ? `✅ Ficha de <@${userId}> aprovada!\n\n${avisos.join('\n')}`
        : `✅ Ficha de <@${userId}> aprovada com sucesso!`,
    });
  } else {
    const embedAtualizado = EmbedBuilder.from(embedOriginal)
      .setColor(0xED4245)
      .setFooter({ text: '❌ Reprovado' })
      .addFields({ name: '❌ Reprovado por', value: `<@${aprovador.id}> • ${timestamp}`, inline: false });

    await interaction.message.edit({ embeds: [embedAtualizado], components: [] });

    try {
      await membro.send(
        `❌ **Sua ficha foi reprovada.**\n\n` +
        `Infelizmente sua solicitação não foi aceita desta vez.\n` +
        `Entre em contato com um recrutador para mais informações.`,
      );
    } catch {}

    await interaction.editReply({ content: `❌ Ficha de <@${userId}> reprovada.` });
  }
}

module.exports = { handleAprovacao };
