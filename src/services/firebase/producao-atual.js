import {
  get,
  onValue,
  ref,
  remove,
  set,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

import { db } from "./client.js";
import { salvarHistoricoProducaoFirebase } from "./historico.js";
import { finalizarPausaFirebase } from "./pausas.js";
import { esperarUsuarioLogado } from "./session.js";

function obterEmpresaId() {
  const empresaId = sessionStorage.getItem("empresaId");

  if (!empresaId) {
    throw new Error("empresaId não encontrado na sessão.");
  }

  return empresaId;
}

export async function salvarProducaoAtualFirebase(dados) {
  const usuario = await esperarUsuarioLogado();
  const empresaId = obterEmpresaId();
  const operadorNome =
    sessionStorage.getItem("nomeUsuario") ||
    usuario.displayName ||
    usuario.email ||
    "Operador";
  const dadosProducao = {
    ...dados,
    empresaId,
    operadorUid: usuario.uid,
    operadorNome,
    operadorEmail: usuario.email,
    uidUsuario: usuario.uid,
    emailUsuario: usuario.email,
    ultimaAtualizacao: Date.now(),
  };

  // Mantém a escrita dupla enquanto houver clientes ou dados legados.
  await set(ref(db, `usuarios/${usuario.uid}/producaoAtual`), dadosProducao);
  await set(
    ref(db, `empresas/${empresaId}/producaoAtual/${usuario.uid}`),
    dadosProducao,
  );
}

export async function buscarProducaoAtualFirebase() {
  const usuario = await esperarUsuarioLogado();
  const empresaId = obterEmpresaId();
  const snapshotEmpresa = await get(
    ref(db, `empresas/${empresaId}/producaoAtual/${usuario.uid}`),
  );

  if (snapshotEmpresa.exists()) {
    return snapshotEmpresa.val();
  }

  const snapshotAntigo = await get(
    ref(db, `usuarios/${usuario.uid}/producaoAtual`),
  );

  return snapshotAntigo.exists() ? snapshotAntigo.val() : null;
}

async function validarOperadorParaConsultaAdmin(operadorUid) {
  await esperarUsuarioLogado();
  const empresaId = obterEmpresaId();
  const tipoUsuario = sessionStorage.getItem("tipoUsuario");
  const uid = String(operadorUid || "").trim();

  if (tipoUsuario !== "admin") {
    throw new Error(
      "Apenas administradores podem consultar a produção de operadores.",
    );
  }

  if (!uid) {
    throw new Error("UID do operador não informado.");
  }

  const snapshotOperador = await get(ref(db, `usuarios/${uid}`));

  if (!snapshotOperador.exists()) {
    throw new Error("Operador não encontrado.");
  }

  const operador = snapshotOperador.val();

  if (operador.tipoUsuario !== "operador") {
    throw new Error("O usuário selecionado não é um operador.");
  }

  if (operador.empresaId !== empresaId) {
    throw new Error(
      "O operador selecionado não pertence à empresa do administrador.",
    );
  }

  return { empresaId, operadorUid: uid };
}

export async function buscarProducaoAtualOperadorFirebase(operadorUid) {
  const consulta = await validarOperadorParaConsultaAdmin(operadorUid);
  const snapshot = await get(
    ref(
      db,
      `empresas/${consulta.empresaId}/producaoAtual/${consulta.operadorUid}`,
    ),
  );

  return snapshot.exists() ? snapshot.val() : null;
}

export async function observarProducaoAtualOperadorFirebase(
  operadorUid,
  callback,
) {
  if (typeof callback !== "function") {
    throw new Error("Callback de observação não informado.");
  }

  const consulta = await validarOperadorParaConsultaAdmin(operadorUid);
  const producaoRef = ref(
    db,
    `empresas/${consulta.empresaId}/producaoAtual/${consulta.operadorUid}`,
  );

  return onValue(
    producaoRef,
    (snapshot) => callback(snapshot.exists() ? snapshot.val() : null),
    (erro) => callback(null, erro),
  );
}

export async function removerProducaoAtualFirebase() {
  const usuario = await esperarUsuarioLogado();
  const empresaId = obterEmpresaId();

  await remove(ref(db, `empresas/${empresaId}/producaoAtual/${usuario.uid}`));
  await remove(ref(db, `usuarios/${usuario.uid}/producaoAtual`));
}

export async function cancelarProducaoAtualFirebase() {
  const usuario = await esperarUsuarioLogado();
  const empresaId = obterEmpresaId();
  let snapshot = await get(
    ref(db, `empresas/${empresaId}/producaoAtual/${usuario.uid}`),
  );

  if (!snapshot.exists()) {
    snapshot = await get(ref(db, `usuarios/${usuario.uid}/producaoAtual`));
  }

  if (!snapshot.exists()) {
    throw new Error("Nenhuma produção pendente encontrada.");
  }

  const producao = snapshot.val();

  if (
    producao.status !== "PAUSADO" &&
    producao.status !== "AGUARDANDO_PECA" &&
    producao.status !== "AGUARDANDO_INICIO"
  ) {
    throw new Error("A produção precisa estar parada para ser cancelada.");
  }

  if (producao.pausaIdAtual) {
    try {
      await finalizarPausaFirebase(producao.pausaIdAtual);
      console.log("Pausa encerrada devido ao cancelamento da produção.");
    } catch (erro) {
      console.error("Erro ao encerrar pausa durante cancelamento:", erro);
      throw erro;
    }
  }

  const agora = new Date();
  const fila = Array.isArray(producao.fila) ? producao.fila : [];
  const indiceAtual = Number(producao.indiceFila) || 0;

  for (let i = 0; i < indiceAtual; i += 1) {
    const item = fila[i];

    if (!item) {
      continue;
    }

    await salvarHistoricoProducaoFirebase({
      data: agora.toLocaleDateString("pt-BR"),
      hora: agora.toLocaleTimeString("pt-BR"),
      programa: item.nome || item.programa,
      chavePrograma: item.programa,
      quantidade: Number(item.quantidade) || 0,
      quantidadePlanejada: Number(item.quantidade) || 0,
      quantidadeConcluida: Number(item.quantidade) || 0,
      percentual: 100,
      status: "Concluído",
      origem: "cancelamento-fila",
    });
  }

  const quantidadeTotal = Number(producao.quantidadeTotal) || 0;
  const quantidadeConcluida = Number(producao.quantidadeConcluida) || 0;
  const percentual =
    quantidadeTotal > 0
      ? Math.round((quantidadeConcluida / quantidadeTotal) * 100)
      : 0;

  await salvarHistoricoProducaoFirebase({
    data: agora.toLocaleDateString("pt-BR"),
    hora: agora.toLocaleTimeString("pt-BR"),
    programa: producao.programa || "Programa",
    chavePrograma: producao.programa || "Programa",
    quantidade: quantidadeConcluida,
    quantidadePlanejada: quantidadeTotal,
    quantidadeConcluida,
    percentual,
    status: "Cancelado",
    indiceFila: indiceAtual,
    pontoAtual: Number(producao.pontoAtual) || 0,
    origem: "cancelamento",
  });

  await remove(ref(db, `empresas/${empresaId}/producaoAtual/${usuario.uid}`));
  await remove(ref(db, `usuarios/${usuario.uid}/producaoAtual`));

  return {
    programa: producao.programa,
    quantidadeTotal,
    quantidadeConcluida,
    percentual,
  };
}

export async function observarProducaoAtualFirebase(callback) {
  const usuario = await esperarUsuarioLogado();
  const empresaId = obterEmpresaId();
  const producaoEmpresaRef = ref(
    db,
    `empresas/${empresaId}/producaoAtual/${usuario.uid}`,
  );

  return onValue(producaoEmpresaRef, async (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val());
      return;
    }

    const snapshotAntigo = await get(
      ref(db, `usuarios/${usuario.uid}/producaoAtual`),
    );
    callback(snapshotAntigo.exists() ? snapshotAntigo.val() : null);
  });
}
