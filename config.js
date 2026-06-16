require('dotenv').config();
const { supabase } = require('./supabase');

function parseIds(env) {
  return env ? env.split(',').map((s) => s.trim()).filter(Boolean) : [];
}

let _overrides = {};

const config = {
  CANAL_RECRUTAMENTO:    process.env.CANAL_RECRUTAMENTO,
  CANAL_APROVACAO:       process.env.CANAL_APROVACAO,
  CARGO_APROVADO:        process.env.CARGO_APROVADO,

  CANAL_ESCALACAO:         process.env.CANAL_ESCALACAO,
  CANAL_CONTROLE:          process.env.CANAL_CONTROLE,
  CANAL_CRIAR_ESCALACAO:   process.env.CANAL_CRIAR_ESCALACAO,

  CANAL_FARM_BTN:       process.env.CANAL_FARM_BTN,
  CATEGORIA_FARM:       process.env.CATEGORIA_FARM,
  CARGOS_FARM_ADM:      parseIds(process.env.CARGOS_FARM_ADM),
  CATEGORIA_FARM_ADM:   process.env.CATEGORIA_FARM_ADM,
  CARGOS_FARM_ELITE:    parseIds(process.env.CARGOS_FARM_ELITE),
  CATEGORIA_FARM_ELITE: process.env.CATEGORIA_FARM_ELITE,
  CARGO_FARM_APROVAR:   process.env.CARGO_FARM_APROVAR || '1497039755639128152',

  CARGO_AUSENCIA:           process.env.CARGO_AUSENCIA,
  CANAL_AUSENCIA_BTN:       process.env.CANAL_AUSENCIA_BTN,
  CANAL_AUSENCIA_APROVACAO: process.env.CANAL_AUSENCIA_APROVACAO,
  CANAL_AUSENCIA_ATIVA:     process.env.CANAL_AUSENCIA_ATIVA,
  CARGOS_AUSENCIA_ADM:      parseIds(process.env.CARGOS_AUSENCIA_ADM),

  CANAL_VENDA_BTN:       process.env.CANAL_VENDA_BTN,
  CANAL_VENDA_LOG:       process.env.CANAL_VENDA_LOG,

  CANAL_ARMAS_BTN:       process.env.CANAL_ARMAS_BTN,
  CANAL_ARMAS_LOG:       process.env.CANAL_ARMAS_LOG,
  CARGOS_ARMAS_ADM:      parseIds(process.env.CARGOS_ARMAS_ADM),

  CANAL_CODIGUINHO_BTN:  process.env.CANAL_CODIGUINHO_BTN,
  CANAL_CODIGUINHO_LOG:  process.env.CANAL_CODIGUINHO_LOG,
  CARGOS_CODIGUINHO_ADM: parseIds(process.env.CARGOS_CODIGUINHO_ADM),

  CANAL_RANKING:         process.env.CANAL_RANKING,

  CANAL_TICKET_BTN:    process.env.CANAL_TICKET_BTN,
  CATEGORIA_TICKET:    process.env.CATEGORIA_TICKET,

  CANAL_LOG_ENTRADA:    process.env.CANAL_LOG_ENTRADA,
  CANAL_LOG_SAIDA:      process.env.CANAL_LOG_SAIDA,
  CANAL_LOG_ATUALIZACAO: process.env.CANAL_LOG_ATUALIZACAO,
  CANAL_LOG_VOZ:        process.env.CANAL_LOG_VOZ,
  CANAL_WARNS:          process.env.CANAL_WARNS,

  CARGOS_APROVACAO:  parseIds(process.env.CARGOS_APROVACAO),
  CARGOS_ESCALACAO:  parseIds(process.env.CARGOS_ESCALACAO),

  CARGO_WARN_1: process.env.CARGO_WARN_1,
  CARGO_WARN_2: process.env.CARGO_WARN_2,
  CARGO_WARN_3: process.env.CARGO_WARN_3,
  CARGO_WARN_4: process.env.CARGO_WARN_4,

  CARGO_HIER_1:  process.env.CARGO_HIER_1,
  CARGO_HIER_2:  process.env.CARGO_HIER_2,
  CARGO_HIER_3:  process.env.CARGO_HIER_3,
  CARGO_HIER_4:  process.env.CARGO_HIER_4,
  CARGO_HIER_5:  process.env.CARGO_HIER_5,
  CARGO_HIER_6:  process.env.CARGO_HIER_6,
  CARGO_HIER_7:  process.env.CARGO_HIER_7,
  CARGO_HIER_8:  process.env.CARGO_HIER_8,
  CARGO_HIER_9:  process.env.CARGO_HIER_9,
  CARGO_HIER_10: process.env.CARGO_HIER_10,

  RANKING_PEDIR_VALOR: false, // pede o valor da ação ao registrar vitória
  PRODUTOS_VENDA: [],

  // ─── Categorias de escalação ──────────────────────────────────────────────
  CATEGORIAS_ESCALACAO: [
    { nome: 'Ação Grande', emoji: '🔴', acoes: [
      { nome: 'Niobio',        qty: 15 },
      { nome: 'Banco Central', qty: 11 },
      { nome: 'Porto',         qty: 10 },
      { nome: 'Galinheiro',    qty: 10 },
      { nome: 'Banco Paleto',  qty: 8  },
      { nome: 'Hotel Rosa',    qty: 8  },
    ]},
    { nome: 'Ação Média', emoji: '🟡', acoes: [
      { nome: 'Flecca',                  qty: 8 },
      { nome: 'Joia',                    qty: 8 },
      { nome: 'Açougue',                 qty: 8 },
      { nome: 'Teatro',                  qty: 8 },
      { nome: 'Estacionamento (Marrom)', qty: 8 },
      { nome: 'Bob Cat',                 qty: 8 },
      { nome: 'Automar',                 qty: 8 },
      { nome: 'Aeroporto Trevor',        qty: 6 },
    ]},
    { nome: 'Ação Pequena', emoji: '🟢', acoes: [
      { nome: 'OBS',             qty: 10 },
      { nome: 'Mergulhador',     qty: 8  },
      { nome: 'Auditorio',       qty: 6  },
      { nome: 'Campo de Golf',   qty: 5  },
      { nome: 'Commedy',         qty: 5  },
      { nome: 'Estabulo',        qty: 5  },
      { nome: 'Plannet',         qty: 5  },
      { nome: 'Navio Cargueiro', qty: 4  },
      { nome: 'Yellow',          qty: 4  },
      { nome: 'Lojinha',         qty: 4  },
      { nome: 'Ammu',            qty: 3  },
      { nome: 'Bebidas',         qty: 3  },
      { nome: 'Fast Food',       qty: 3  },
      { nome: 'Hyper Mercado',   qty: 3  },
      { nome: 'Mc Donald',       qty: 3  },
    ]},
  ],

  // ─── Textos customizáveis (modais e botões) ──────────────────────────────────────
  TEXTOS:            {},

  // ─── Imagens ──────────────────────────────────────────────
  IMG_PADRAO:        'https://media.discordapp.net/attachments/1392674632544419963/1392675113262125056/Never_Pure_1920.jpg?ex=69ee0f85&is=69ecbe05&hm=3846f1cabdd4a1b55ad17216f5cc52b41d4f9805ae4a1973687884d3f04d494d&width=1535&height=863&',
  RECRUTAMENTO_IMG:  null,
  ESCALACAO_IMG:     null,
  FARM_IMG:          null,
  VENDA_IMG:         null,
  ARMAS_IMG:         null,
  AUSENCIA_IMG:      null,
  TICKET_IMG:        null,

  // ─── Recrutamento ─────────────────────────────────────────
  RECRUTAMENTO_TITULO: 'RECRUTAMENTO',
  RECRUTAMENTO_DESC:   'Quer fazer parte do nosso time? Preencha sua ficha clicando no botão abaixo.\n\n**1.** Clique em **Preencher Ficha**\n**2.** Preencha seus dados no formulário\n**3.** Selecione quem te recrutou\n**4.** Aguarde a análise\n\n-# Você será notificado via DM sobre a decisão.',
  RECRUTAMENTO_COR:    0x3498DB,
  RECRUTAMENTO_BTN:    '📝 Preencher Ficha',

  // ─── Escalação ────────────────────────────────────────────
  ESCALACAO_TITULO:    'ESCALAÇÃO',
  ESCALACAO_DESC:      'Selecione a ação no menu abaixo para criar uma escalação.\n\n-# Somente Soldado ou superior pode criar escalações.',
  ESCALACAO_COR:       0x3498DB,
  ESCALACAO_RADIO:     false, // exibe campo de rádio ao criar escalação

  // ─── Farm ─────────────────────────────────────────────────
  FARM_TITULO:         'SALA DE FARM',
  FARM_DESC:           'Clique no botão abaixo para criar uma sala de farm.',
  FARM_COR:            0x57F287,
  FARM_BTN:            '🌾 Criar Sala',

  // ─── Vendas ───────────────────────────────────────────────
  VENDA_TITULO:        'REGISTRO DE VENDA',
  VENDA_DESC:          'Registre sua venda clicando no botão abaixo.',
  VENDA_COR:           0xFF0000,
  VENDA_BTN:           '💰 Registrar Venda',

  // ─── Armas ────────────────────────────────────────────────
  ARMAS_TITULO:        'SOLICITAÇÃO DE ARMAS',
  ARMAS_DESC:          'Solicite armas clicando no botão abaixo.',
  ARMAS_COR:           0xFF0000,
  ARMAS_BTN:           '🔫 Solicitar Armas',

  // ─── Codiguinho ───────────────────────────────────────────
  CODIGUINHO_TITULO:   'SOLICITAÇÃO DE CODIGUINHO',
  CODIGUINHO_DESC:     'Clique no botão abaixo para solicitar um codiguinho.\n\n-# Sujeito à disponibilidade de estoque.',
  CODIGUINHO_COR:      0xFF0000,
  CODIGUINHO_BTN:      '🎟️ Solicitar Codiguinho',

  // ─── Ticket ───────────────────────────────────────────────
  TICKET_TITULO:       'SUPORTE',
  TICKET_DESC:         'Abra um ticket para falar com a equipe clicando no botão abaixo.',
  TICKET_COR:          0x3498DB,

  // ─── Ausência ─────────────────────────────────────────────
  AUSENCIA_TITULO:     'AUSÊNCIA',
  AUSENCIA_DESC:       'Precisa se ausentar? Clique no botão abaixo para solicitar.',
  AUSENCIA_COR:        0xFEE75C,
  AUSENCIA_BTN:        '🏖️ Solicitar Ausência',
};

async function carregarConfigRemoto() {
  const { data, error } = await supabase
    .from('bot_estado')
    .select('valor')
    .eq('chave', 'botconfig')
    .single();
  if (error && error.code !== 'PGRST116') {
    console.error('[config] Erro ao carregar do Supabase:', error.message);
    return;
  }
  _overrides = (data?.valor) ?? {};
  for (const [k, v] of Object.entries(_overrides)) {
    if (v !== null && v !== undefined) config[k] = v;
  }
}

function salvarConfig(updates) {
  _overrides = { ..._overrides, ...updates };
  for (const [k, v] of Object.entries(updates)) config[k] = v;
  supabase
    .from('bot_estado')
    .upsert({ chave: 'botconfig', valor: _overrides, atualizado_em: new Date().toISOString() }, { onConflict: 'chave' })
    .then(({ error }) => { if (error) console.error('[config] Erro ao salvar no Supabase:', error.message); });
}

module.exports = config;
module.exports.salvarConfig        = salvarConfig;
module.exports.carregarConfigRemoto = carregarConfigRemoto;
module.exports.getImg = (modulo) => config[`${modulo}_IMG`] || config.IMG_PADRAO;
