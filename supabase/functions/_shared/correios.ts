// Alfa Informática — módulo compartilhado com a integração dos Correios
// (autenticação, cálculo de frete, geração de etiqueta, rastreio). Usado por
// correios-frete, mp-create-payment, correios-etiqueta e correios-rastreio.
//
// Autenticação CONFIRMADA via Swagger oficial do portal CWS (Correios Web
// Services), seção "Geração do token": "é necessário fazer uma requisição
// com 'Authorization: Basic', passando o usuário (Meu Correios) e senha
// (código de acesso)." — ou seja:
//   usuário = login da conta Meu Correios (não é nenhum dos campos originais
//             que a Alfa recebeu — é o login usado pra entrar no site);
//   senha   = a "chave de acesso" gerada em CWS > Chaves de acesso (formato
//             cws-ch1_...), NÃO o "código de acesso à API"/"token de
//             autenticação" originais (esses dois se mostraram obsoletos/
//             não correspondiam a nenhuma chave ativa — por isso o 401).
//
// Os endpoints de cálculo de frete/etiqueta/rastreio (calcularFrete,
// gerarEtiqueta, consultarRastreio) ainda não têm confirmação oficial —
// pontos marcados com "TODO CORREIOS" precisam ser validados contra a
// resposta real assim que a autenticação estiver funcionando (cada chamada
// já loga a resposta crua da Correios pra isso).

const API_BASE = Deno.env.get('CORREIOS_API_BASE') || 'https://api.correios.com.br';
// .trim() em tudo que vira credencial: colar um valor grande no terminal
// facilmente carrega uma quebra de linha ou espaço extra, e isso quebra o
// Basic Auth silenciosamente (o valor "parece" certo em qualquer print).
const MEU_CORREIOS_USUARIO = (Deno.env.get('CORREIOS_MEU_CORREIOS_USUARIO') || '').trim();
const CWS_CHAVE_ACESSO = (Deno.env.get('CORREIOS_CWS_CHAVE_ACESSO') || '').trim();
// Campos originais — confirmado que NÃO entram na autenticação (ver bloco
// acima). Mantidos só porque as secrets já existem; não são mais lidos por
// nenhuma chamada.
const TIPO_AUTORIZACAO = (Deno.env.get('CORREIOS_TIPO_AUTORIZACAO') || '').trim();
const NUMERO_CONTRATO = (Deno.env.get('CORREIOS_NUMERO_CONTRATO') || '').trim();
const ANO_CONTRATO = (Deno.env.get('CORREIOS_ANO_CONTRATO') || '').trim();
// Não vai na autenticação — usado só na geração de etiqueta (remetente).
const CODIGO_ADMINISTRATIVO = (Deno.env.get('CORREIOS_CODIGO_ADMINISTRATIVO') || '').trim();
// CEP de origem da loja — não é dado sensível, por isso o padrão já vem
// certo aqui (a secret CORREIOS_CEP_ORIGEM continua podendo sobrescrever,
// caso a origem mude no futuro).
const CEP_ORIGEM = Deno.env.get('CORREIOS_CEP_ORIGEM') || '78065443';

// Usado como fallback — por item sem peso/dimensão cadastrada, ou pro
// pedido inteiro se ninguém passar um pacote explícito pra calcularFrete().
export const PACOTE_PADRAO = {
  pesoKg: Number(Deno.env.get('CORREIOS_PACOTE_PESO_KG')) || 1,
  comprimentoCm: Number(Deno.env.get('CORREIOS_PACOTE_COMPRIMENTO_CM')) || 20,
  larguraCm: Number(Deno.env.get('CORREIOS_PACOTE_LARGURA_CM')) || 15,
  alturaCm: Number(Deno.env.get('CORREIOS_PACOTE_ALTURA_CM')) || 10,
};

export type PacoteInfo = { pesoKg: number; comprimentoCm: number; larguraCm: number; alturaCm: number };

// Agrega peso/dimensão real dos produtos de um pedido num pacote só —
// peso soma (peso × qty de cada item), comprimento/largura usam o maior
// item (assume que os outros cabem dentro), altura soma (assume
// empilhamento). Item sem peso/dimensão cadastrado usa PACOTE_PADRAO só
// pra aquele item, não trava o cálculo do pedido inteiro.
export function calcularPacoteAgregado(
  itens: Array<{ pesoKg: number | null | undefined; comprimentoCm: number | null | undefined; larguraCm: number | null | undefined; alturaCm: number | null | undefined; qty: number }>,
): PacoteInfo {
  let pesoKg = 0, comprimentoCm = 0, larguraCm = 0, alturaCm = 0;
  for (const item of itens) {
    const peso = item.pesoKg || PACOTE_PADRAO.pesoKg;
    const comp = item.comprimentoCm || PACOTE_PADRAO.comprimentoCm;
    const larg = item.larguraCm || PACOTE_PADRAO.larguraCm;
    const alt = item.alturaCm || PACOTE_PADRAO.alturaCm;
    pesoKg += peso * item.qty;
    comprimentoCm = Math.max(comprimentoCm, comp);
    larguraCm = Math.max(larguraCm, larg);
    alturaCm += alt * item.qty;
  }
  if (!itens.length) return { ...PACOTE_PADRAO };
  return { pesoKg, comprimentoCm, larguraCm, alturaCm };
}

// TODO CORREIOS (#4): confirmar se estes são os códigos de serviço
// habilitados no contrato — 03298/03220 são os códigos padrão de contrato
// (PAC/SEDEX), diferentes dos códigos avulsos (sem contrato).
export const SERVICOS = {
  PAC: { codigo: '03298', nome: 'Econômico (PAC)' },
  SEDEX: { codigo: '03220', nome: 'Expresso (SEDEX)' },
};

export function requireCepOrigem(): string {
  if (!CEP_ORIGEM || CEP_ORIGEM === '00000000') {
    throw new Error('CORREIOS_CEP_ORIGEM ainda não foi configurado — defina com `supabase secrets set CORREIOS_CEP_ORIGEM=...`.');
  }
  return CEP_ORIGEM;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Cache em memória do isolate — só ajuda quando o mesmo isolate atende mais
// de uma requisição seguida; se for um isolate novo, simplesmente reautentica.
// Não há nenhuma lógica que dependa desse cache pra funcionar corretamente.
let cachedToken: { token: string; expiresAt: number } | null = null;

// Mostra só o tamanho e as pontas de uma credencial — nunca o valor inteiro
// — o suficiente pra ver no log se uma secret está vazia, com espaço/quebra
// de linha grudada, ou visivelmente errada, sem expor o segredo.
function mask(v: string): string {
  if (!v) return '(vazio)';
  if (v.length <= 8) return `${v.length} chars`;
  return `${v.length} chars, "${v.slice(0, 3)}...${v.slice(-3)}"`;
}

async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token;
  }

  // URL/headers/corpo confirmados com exemplo cURL real do manual oficial;
  // usuário/senha do Basic Auth confirmados pelo Swagger do CWS (ver
  // comentário no topo do arquivo): usuário = login Meu Correios, senha =
  // chave de acesso gerada em CWS > Chaves de acesso.
  console.log('[correios] credenciais carregadas (mascaradas)', JSON.stringify({
    meuCorreiosUsuario: mask(MEU_CORREIOS_USUARIO),
    cwsChaveAcesso: mask(CWS_CHAVE_ACESSO),
    numeroContrato: mask(NUMERO_CONTRATO),
  }));

  const basic = btoa(`${MEU_CORREIOS_USUARIO}:${CWS_CHAVE_ACESSO}`);
  const url = `${API_BASE}/token/v1/autentica/contrato`;
  console.log('[correios] chamando autenticação', url);

  // User-Agent explícito: o exemplo oficial que funciona foi rodado via
  // curl (que manda "curl/x.x" por padrão); o fetch do Deno manda "Deno/x.x"
  // — se existir um firewall/gateway na frente da API dos Correios filtrando
  // por User-Agent de origem não-navegador, isso pode causar um 401 vazio
  // ANTES mesmo de checar a senha (explicaria a resposta sem nenhum detalhe
  // do motivo da recusa).
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'curl/8.4.0',
    },
    body: JSON.stringify({ numero: NUMERO_CONTRATO }),
  });
  const data = await res.json().catch(() => ({}));
  console.log('[correios] resposta crua da autenticação', res.status, JSON.stringify(data));
  if (!res.ok || !data.token) {
    throw new Error(`Falha ao autenticar com os Correios (status ${res.status}).`);
  }

  // TODO CORREIOS (#1): campo de expiração não confirmado — assumido
  // "expiraEm" como ISO string; se vier diferente (ex: segundos de TTL),
  // ajustar aqui. Fallback conservador de 1h caso o campo não venha.
  const expiresAt = data.expiraEm ? new Date(data.expiraEm).getTime() : Date.now() + 60 * 60 * 1000;
  cachedToken = { token: data.token, expiresAt };
  return data.token;
}

async function correiosFetch(path: string, init: RequestInit = {}, timeoutMs = 15000): Promise<Response> {
  const token = await getToken();
  return fetchWithTimeout(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  }, timeoutMs);
}

// Números da Correios vêm como string em formato brasileiro ("12,71" —
// vírgula decimal). Number("12,71") direto dá NaN.
function parseNumeroBR(v: unknown): number {
  return Number(String(v ?? '').replace(',', '.'));
}

export type OpcaoFrete = { codigo: string; nome: string; valor: number; prazoDias: number | null };

export async function calcularFrete(params: { cepDestino: string; pacote?: PacoteInfo }): Promise<OpcaoFrete[]> {
  const cepOrigem = requireCepOrigem();
  const cepDestino = params.cepDestino.replace(/\D/g, '');
  const { pesoKg, comprimentoCm, larguraCm, alturaCm } = params.pacote || PACOTE_PADRAO;

  const resultados = await Promise.allSettled(
    Object.values(SERVICOS).map(async (servico) => {
      // CONFIRMADO com resposta real: GET /preco/v1/nacional/{coProduto},
      // campo de preço final é "pcFinal" — mas vem como STRING no formato
      // brasileiro ("12,71", vírgula decimal), não number com ponto. Essa
      // resposta não traz prazo de entrega (é uma API "Prazo v3" separada,
      // ainda não integrada — prazoDias fica null por enquanto, o frontend
      // já mostra "—" nesse caso).
      const qs = new URLSearchParams({
        cepOrigem, cepDestino,
        psObjeto: String(pesoKg * 1000), // gramas
        comprimento: String(comprimentoCm), largura: String(larguraCm), altura: String(alturaCm),
      });
      const res = await correiosFetch(`/preco/v1/nacional/${servico.codigo}?${qs.toString()}`);
      const data = await res.json().catch(() => ({}));
      console.log('[correios] resposta crua de preço', servico.codigo, res.status, JSON.stringify(data));
      if (!res.ok) throw new Error(`Correios recusou cálculo para ${servico.codigo} (status ${res.status}).`);
      const valor = parseNumeroBR(data.pcFinal ?? data.valor ?? data.preco);
      if (!Number.isFinite(valor)) throw new Error(`Resposta de preço inesperada para ${servico.codigo}.`);

      // TODO CORREIOS: endpoint/campo do prazo ainda não confirmados por
      // resposta real (só o de preço foi confirmado até agora) — assumido
      // mesmo padrão de /preco (mesmo path base, "/prazo/"), campo
      // "prazoEntrega". Não derruba o preço se falhar — só fica sem prazo.
      let prazoDias: number | null = null;
      try {
        const resPrazo = await correiosFetch(`/prazo/v1/nacional/${servico.codigo}?${qs.toString()}`);
        const dataPrazo = await resPrazo.json().catch(() => ({}));
        console.log('[correios] resposta crua de prazo', servico.codigo, resPrazo.status, JSON.stringify(dataPrazo));
        if (resPrazo.ok) {
          const bruto = dataPrazo.prazoEntrega ?? dataPrazo.prazo ?? dataPrazo.dias;
          if (bruto != null) prazoDias = parseNumeroBR(bruto);
          if (prazoDias != null && !Number.isFinite(prazoDias)) prazoDias = null;
        }
      } catch (e) {
        console.error('[correios] falha ao consultar prazo (preço segue normal)', servico.codigo, String(e));
      }

      return { codigo: servico.codigo, nome: servico.nome, valor, prazoDias } as OpcaoFrete;
    }),
  );

  // Resiliente por serviço: se PAC falhar mas SEDEX funcionar (ou vice-versa),
  // ainda devolve o que deu certo em vez de derrubar o cálculo inteiro.
  const opcoes: OpcaoFrete[] = [];
  for (const r of resultados) {
    if (r.status === 'fulfilled') opcoes.push(r.value);
    else console.error('[correios] falha ao calcular frete de um serviço', String(r.reason));
  }
  if (!opcoes.length) throw new Error('Não foi possível calcular nenhuma opção de frete.');
  return opcoes;
}

export type Destinatario = {
  nome: string; cep: string; rua: string; numero: string; bairro: string; cidade: string; uf: string; telefone?: string;
};

export type ItemConteudo = { descricao: string; valor: number };

export type ResultadoEtiqueta = {
  trackingCode: string; prepostagemId: string | null; labelUrl: string | null; labelBase64: string | null; raw: any;
};

export async function gerarEtiqueta(params: { servicoCodigo: string; destinatario: Destinatario; conteudo: ItemConteudo[]; pacote?: PacoteInfo }): Promise<ResultadoEtiqueta> {
  const cepOrigem = requireCepOrigem();
  // TODO: correios-etiqueta (o chamador desta função) ainda não passa o
  // pacote real agregado do pedido — calcularFrete/correios-frete e
  // mp-create-payment já usam calcularPacoteAgregado(), etiqueta continua
  // no pacote fixo por enquanto (função nem está habilitada pelo contrato
  // ainda, não é prioridade agora).
  const { pesoKg, comprimentoCm, larguraCm, alturaCm } = params.pacote || PACOTE_PADRAO;

  // TODO CORREIOS (#5): endpoint/payload/formato de resposta não
  // confirmados — assumido POST /prepostagem/v1/prepostagens.
  const body = {
    remetente: { cep: cepOrigem, codigoAdministrativo: CODIGO_ADMINISTRATIVO },
    destinatario: {
      nome: params.destinatario.nome,
      endereco: {
        cep: params.destinatario.cep.replace(/\D/g, ''),
        logradouro: params.destinatario.rua,
        numero: params.destinatario.numero,
        bairro: params.destinatario.bairro,
        cidade: params.destinatario.cidade,
        uf: params.destinatario.uf,
      },
      telefone: params.destinatario.telefone || undefined,
    },
    servico: params.servicoCodigo,
    pesoInformado: pesoKg * 1000,
    dimensoes: { comprimento: comprimentoCm, largura: larguraCm, altura: alturaCm },
    declaracaoConteudo: params.conteudo.map((i) => ({ descricao: i.descricao, valor: i.valor })),
  };

  const res = await correiosFetch('/prepostagem/v1/prepostagens', { method: 'POST', body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  console.log('[correios] resposta crua de geração de etiqueta', res.status, JSON.stringify(data));
  if (!res.ok) throw new Error(`Correios recusou a geração da etiqueta (status ${res.status}).`);

  const trackingCode = data.codigoObjeto || data.codigoRastreio || data.objeto;
  if (!trackingCode) throw new Error('Resposta de geração de etiqueta sem código de rastreio.');

  return {
    trackingCode,
    prepostagemId: data.id ? String(data.id) : null,
    labelUrl: data.urlEtiqueta || null,
    labelBase64: data.etiquetaBase64 || null,
    raw: data,
  };
}

export type EventoRastreio = { dataHora: string | null; descricao: string; local: string | null };

export async function consultarRastreio(trackingCode: string): Promise<{ eventos: EventoRastreio[]; raw: any }> {
  // TODO CORREIOS (#6): endpoint/formato de resposta não confirmados —
  // assumido GET /srorastro/v1/objetos/{codigo}, com array "eventos".
  const res = await correiosFetch(`/srorastro/v1/objetos/${encodeURIComponent(trackingCode)}`);
  const data = await res.json().catch(() => ({}));
  console.log('[correios] resposta crua de rastreio', trackingCode, res.status, JSON.stringify(data));
  if (!res.ok) throw new Error(`Correios recusou a consulta de rastreio (status ${res.status}).`);

  const eventosRaw = data.eventos || data.objetos?.[0]?.eventos || [];
  const eventos: EventoRastreio[] = (Array.isArray(eventosRaw) ? eventosRaw : []).map((e: any) => ({
    dataHora: e.dtHrCriado || e.data || null,
    descricao: e.descricao || e.status || JSON.stringify(e),
    local: e.unidade?.nome || e.local || null,
  }));
  return { eventos, raw: data };
}

export type EnderecoCep = { cep: string; logradouro: string; bairro: string; cidade: string; uf: string };

export async function consultarCep(cep: string): Promise<EnderecoCep> {
  // TODO CORREIOS: endpoint/campos não confirmados por resposta real —
  // assumido GET /cep/v1/enderecos/{cep}, mesmo padrão de path das outras
  // APIs v3 (/preco/v1/nacional, /prazo/v1/nacional).
  const cepLimpo = cep.replace(/\D/g, '');
  const res = await correiosFetch(`/cep/v1/enderecos/${cepLimpo}`);
  const data = await res.json().catch(() => ({}));
  console.log('[correios] resposta crua de CEP', cepLimpo, res.status, JSON.stringify(data));
  if (!res.ok) throw new Error(`Correios recusou a consulta de CEP (status ${res.status}).`);

  const logradouro = data.logradouro || data.rua || data.tipoLogradouro || '';
  const bairro = data.bairro || '';
  const cidade = data.localidade || data.cidade || data.municipio || '';
  const uf = data.uf || data.siglaUf || data.estado || '';
  if (!cidade || !uf) throw new Error('Resposta de CEP inesperada (sem cidade/UF).');

  return { cep: cepLimpo, logradouro, bairro, cidade, uf };
}
