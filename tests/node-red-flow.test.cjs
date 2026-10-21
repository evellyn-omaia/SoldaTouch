const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const fluxo = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../node-red/flows.json"), "utf8"),
);

function executarFuncaoNodeRed(codigo, ambiente) {
  const funcao = new Function(
    "global",
    "flow",
    "context",
    "node",
    "msg",
    "env",
    "setTimeout",
    codigo,
  );

  return funcao(
    ambiente.global,
    ambiente.flow,
    ambiente.context,
    ambiente.node,
    ambiente.msg,
    ambiente.env || { get: () => undefined },
    setTimeout,
  );
}

function criarArmazenamento(valores = {}) {
  const dados = new Map(Object.entries(valores));
  return {
    get: (chave) => dados.get(chave),
    set: (chave, valor) => dados.set(chave, valor),
  };
}

const liberarAssincrono = () => new Promise((resolve) => setImmediate(resolve));

test("MOVER_PONTO chega ao CLP e é confirmado quando o encoder atinge o alvo", async () => {
  const processar = fluxo.find((node) => node.id === "fnProcessarComando");
  const lerStatus = fluxo.find((node) => node.id === "fnLerStatus");
  const escritas = [];
  const mensagensComando = [];
  const mensagensStatus = [];
  const calibracao = {
    contagemTopo: 1_000,
    contagemBase: 0,
    zTopoMm: 55.2,
    zBaseMm: 53.2,
    atualizadoEm: 1,
  };
  const cliente = {
    writeRegister: async (registro, valor) => escritas.push({ registro, valor }),
  };
  const armazenamentoGlobal = criarArmazenamento({
    clpClient: cliente,
    clpRegs: {
      holdingRegisters: { zAlvoDecimm: 0, mesaAlvoDecigraus: 1 },
    },
    clpEstado: { conectado: true },
    calibracaoEncoder: {
      ler: () => calibracao,
      converter: () => 54.5,
    },
    lerEncoderZ: async () => 650,
  });
  const armazenamentoFluxo = criarArmazenamento();

  executarFuncaoNodeRed(processar.func, {
    global: armazenamentoGlobal,
    flow: armazenamentoFluxo,
    context: criarArmazenamento(),
    node: { send: (mensagem) => mensagensComando.push(mensagem), warn() {} },
    msg: {
      payload: {
        idComando: "cmd-ponto-1",
        comando: "MOVER_PONTO",
        dados: { ponto: 1, zMm: 54.5, anguloMesaGraus: 90 },
      },
    },
  });
  await liberarAssincrono();

  assert.deepEqual(escritas, [
    { registro: 0, valor: 545 },
    { registro: 1, valor: 900 },
  ]);
  assert.equal(mensagensComando[0][0].payload.tipo, "PONTO_RECEBIDO");
  assert.equal(armazenamentoFluxo.get("movimentoPendente").idComando, "cmd-ponto-1");

  const contextoStatus = criarArmazenamento({
    ultimaContagem: 650,
    ultimaMudancaEm: Date.now() - 1_000,
    ultimoEnvio: 0,
    versaoCalibracaoEnviada: 1,
  });

  executarFuncaoNodeRed(lerStatus.func, {
    global: armazenamentoGlobal,
    flow: armazenamentoFluxo,
    context: contextoStatus,
    node: { send: (mensagem) => mensagensStatus.push(mensagem), warn() {} },
    msg: {},
  });
  await liberarAssincrono();

  assert.equal(mensagensStatus[0][0].payload.tipo, "STATUS");
  assert.equal(mensagensStatus[0][1].payload.tipo, "PONTO_ATINGIDO");
  assert.equal(mensagensStatus[0][1].payload.idComando, "cmd-ponto-1");
  assert.equal(armazenamentoFluxo.get("movimentoPendente"), null);
  assert.equal(lerStatus.outputs, 2);
  assert.deepEqual(lerStatus.wires, [["mqttOutStatus"], ["mqttOutResposta"]]);
});
