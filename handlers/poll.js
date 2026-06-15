const {
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
} = require('discord.js');

const polls = new Map();

function criarContainer(poll, id) {
  const total = poll.opcoes.reduce((acc, op) => acc + op.votos.size, 0);

  const linhasOpcoes = poll.opcoes.map((op, i) => {
    const pct    = total > 0 ? Math.round((op.votos.size / total) * 100) : 0;
    const cheios = Math.round(pct / 10);
    const barra  = '`' + '█'.repeat(cheios) + '░'.repeat(10 - cheios) + '`';
    return `**${i + 1}. ${op.texto}**\n${barra} **${pct}%** — ${op.votos.size} voto${op.votos.size !== 1 ? 's' : ''}`;
  }).join('\n\n');

  const text =
    `## 📊  ${poll.pergunta}\n\n` +
    `${linhasOpcoes}\n\n` +
    `👥 **Total de votos:** **${total}**  ·  📝 Criado por <@${poll.autorId}>\n\n` +
    `-# Never Pure  ·${poll.encerrada ? 'Votação encerrada' : 'Clique nos botões abaixo para votar'}`;

  const container = new ContainerBuilder()
    .setAccentColor(poll.encerrada ? 0x99AAB5 : 0x3498DB)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));

  if (!poll.encerrada) {
    const row = new ActionRowBuilder();
    poll.opcoes.forEach((op, i) => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`poll_voto_${id}_${i}`)
          .setLabel(`${i + 1}. ${op.texto.slice(0, 60)}`)
          .setStyle(ButtonStyle.Secondary),
      );
    });
    container
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addActionRowComponents(row);
  }

  return container;
}

async function handlePollCmd(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const pergunta = interaction.options.getString('pergunta');
  const opcoes   = [];
  for (let i = 1; i <= 4; i++) {
    const op = interaction.options.getString(`opcao${i}`);
    if (op) opcoes.push({ texto: op, votos: new Set() });
  }

  if (opcoes.length < 2) {
    await interaction.editReply({ content: '❌ Você precisa de pelo menos 2 opções.' });
    return;
  }

  const id   = Date.now().toString(36);
  const poll = {
    pergunta, opcoes,
    autorId:   interaction.user.id,
    messageId: null,
    channelId: interaction.channel.id,
    encerrada: false,
  };
  polls.set(id, poll);

  const msg = await interaction.channel.send({ components: [criarContainer(poll, id)], flags: MessageFlags.IsComponentsV2 });
  poll.messageId = msg.id;

  await interaction.editReply({ content: '✅ Votação criada!' });
}

async function handlePollVoto(interaction, id, opcaoIdx) {
  await interaction.deferReply({ ephemeral: true });

  const poll = polls.get(id);
  if (!poll || poll.encerrada) {
    await interaction.editReply({ content: '❌ Esta votação não existe ou já foi encerrada.' });
    return;
  }

  const idx     = parseInt(opcaoIdx);
  const userId  = interaction.user.id;
  const jaVotou = poll.opcoes[idx]?.votos.has(userId);

  poll.opcoes.forEach((op) => op.votos.delete(userId));
  if (!jaVotou && poll.opcoes[idx]) poll.opcoes[idx].votos.add(userId);

  try {
    const canal = await interaction.guild.channels.fetch(poll.channelId);
    const msg   = await canal.messages.fetch(poll.messageId);
    await msg.edit({ components: [criarContainer(poll, id)], flags: MessageFlags.IsComponentsV2 });
  } catch {}

  await interaction.editReply({
    content: jaVotou
      ? '↩️ Você removeu seu voto.'
      : `✅ Você votou em **${poll.opcoes[idx]?.texto}**!`,
  });
}

module.exports = { handlePollCmd, handlePollVoto };
