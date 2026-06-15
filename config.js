require('dotenv').config();
const fs   = require('fs');
const path = require('path');

function parseIds(env) {
  return env ? env.split(',').map((s) => s.trim()).filter(Boolean) : [];
}

const ARQUIVO = path.join(__dirname, 'data/botconfig.json');

function lerArquivo() {
  try { return JSON.parse(fs.readFileSync(ARQUIVO, 'utf8')); } catch { return {}; }
}

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
  CARGO_FARM_APROVAR:   process.env.CARGO_FARM_APROVAR || '1497039755639128152',

  CARGO_AUSENCIA:           process.env.CARGO_AUSENCIA,
  CANAL_AUSENCIA_BTN:       process.env.CANAL_AUSENCIA_BTN,
  CANAL_AUSENCIA_APROVACAO: process.env.CANAL_AUSENCIA_APROVACAO,
  CANAL_AUSENCIA_ATIVA:     process.env.CANAL_AUSENCIA_ATIVA,

  CANAL_VENDA_BTN:       process.env.CANAL_VENDA_BTN,
  CATEGORIA_VENDA:       process.env.CATEGORIA_VENDA,

  CANAL_ARMAS_BTN:       process.env.CANAL_ARMAS_BTN,
  CANAL_ARMAS_LOG:       process.env.CANAL_ARMAS_LOG,

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

  ACOES_PREDEFINIDAS: [], // formato: "Nome da Ação:quantidade" por item

  // ─── Imagem padrão ────────────────────────────────────────
  IMG_PADRAO: 'https://media.discordapp.net/attachments/1392674632544419963/1392675113262125056/Never_Pure_1920.jpg?ex=69ee0f85&is=69ecbe05&hm=3846f1cabdd4a1b55ad17216f5cc52b41d4f9805ae4a1973687884d3f04d494d&width=1535&height=863&',

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

function carregarConfig() {
  const saved = lerArquivo();
  for (const [k, v] of Object.entries(saved)) {
    if (v !== null && v !== undefined) config[k] = v;
  }
}

function salvarConfig(updates) {
  const saved = lerArquivo();
  const novo  = { ...saved, ...updates };
  fs.writeFileSync(ARQUIVO, JSON.stringify(novo, null, 2));
  for (const [k, v] of Object.entries(updates)) config[k] = v;
}

carregarConfig();

module.exports = config;
module.exports.salvarConfig   = salvarConfig;
module.exports.carregarConfig = carregarConfig;
