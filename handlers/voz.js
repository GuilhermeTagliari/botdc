const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');
const { ChannelType } = require('discord.js');

async function handleEntrarVoz(interaction) {
  const canal = interaction.options.getChannel('canal');

  if (canal.type !== ChannelType.GuildVoice) {
    await interaction.reply({ content: '❌ Selecione um canal de **voz**.', ephemeral: true });
    return;
  }

  try {
    const existente = getVoiceConnection(interaction.guild.id);
    if (existente) existente.destroy();

    joinVoiceChannel({
      channelId: canal.id,
      guildId: interaction.guild.id,
      adapterCreator: interaction.guild.voiceAdapterCreator,
      selfMute: true,
      selfDeaf: true,
    });

    await interaction.reply({ content: `✅ Bot entrou em ${canal} (mutado e ensurdecido).`, ephemeral: true });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Erro ao entrar no canal de voz:`, err);
    await interaction.reply({ content: '❌ Não consegui entrar no canal de voz. Verifique as permissões do bot.', ephemeral: true });
  }
}

async function handleSairVoz(interaction) {
  const connection = getVoiceConnection(interaction.guild.id);
  if (!connection) {
    await interaction.reply({ content: '❌ O bot não está em nenhum canal de voz.', ephemeral: true });
    return;
  }
  connection.destroy();
  await interaction.reply({ content: '✅ Bot saiu do canal de voz.', ephemeral: true });
}

module.exports = { handleEntrarVoz, handleSairVoz };
