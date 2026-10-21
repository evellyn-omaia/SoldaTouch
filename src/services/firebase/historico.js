import {
  get,
  push,
  ref,
  set,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

import { db } from "./client.js";
import { esperarUsuarioLogado } from "./session.js";

function obterEmpresaId() {
  const empresaId = sessionStorage.getItem("empresaId");

  if (!empresaId) {
    throw new Error("empresaId não encontrado na sessão.");
  }

  return empresaId;
}

export async function salvarHistoricoProducaoFirebase(dadosExecucao) {
  const usuario = await esperarUsuarioLogado();
  const empresaId = obterEmpresaId();
  const operadorNome =
    sessionStorage.getItem("nomeUsuario") ||
    usuario.displayName ||
    usuario.email ||
    "Operador";
  const dadosHistorico = {
    ...dadosExecucao,
    empresaId,
    operadorUid: usuario.uid,
    operadorNome,
    operadorEmail: usuario.email,
    uidUsuario: usuario.uid,
    emailUsuario: usuario.email,
    timestamp: Date.now(),
  };

  const registroAntigo = push(
    ref(db, `usuarios/${usuario.uid}/historicoProducao`),
  );
  await set(registroAntigo, dadosHistorico);

  const registroEmpresa = push(
    ref(db, `empresas/${empresaId}/historicoProducao`),
  );
  await set(registroEmpresa, dadosHistorico);
}

export async function buscarHistoricoProducaoFirebase() {
  const usuario = await esperarUsuarioLogado();
  const empresaId = obterEmpresaId();
  const snapshotEmpresa = await get(
    ref(db, `empresas/${empresaId}/historicoProducao`),
  );

  if (snapshotEmpresa.exists()) {
    const dadosEmpresa = Object.values(snapshotEmpresa.val());

    if (sessionStorage.getItem("tipoUsuario") === "admin") {
      return dadosEmpresa.sort(
        (a, b) => (a.timestamp || 0) - (b.timestamp || 0),
      );
    }

    return dadosEmpresa
      .filter(
        (registro) =>
          registro.operadorUid === usuario.uid ||
          registro.uidUsuario === usuario.uid,
      )
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  }

  const snapshotAntigo = await get(
    ref(db, `usuarios/${usuario.uid}/historicoProducao`),
  );

  return snapshotAntigo.exists()
    ? Object.values(snapshotAntigo.val()).sort(
        (a, b) => (a.timestamp || 0) - (b.timestamp || 0),
      )
    : [];
}
