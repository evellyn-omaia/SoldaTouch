import {
  get,
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

function obterDataLocalISO() {
  const agora = new Date();

  return [
    agora.getFullYear(),
    String(agora.getMonth() + 1).padStart(2, "0"),
    String(agora.getDate()).padStart(2, "0"),
  ].join("-");
}

export async function salvarProducaoDiaFirebase(filaProducao, tempoTotal) {
  const usuario = await esperarUsuarioLogado();
  const empresaId = obterEmpresaId();
  const operadorNome =
    sessionStorage.getItem("nomeUsuario") ||
    usuario.displayName ||
    usuario.email ||
    "Operador";
  const hoje = obterDataLocalISO();
  let totalPecas = 0;
  const programas = {};

  filaProducao.forEach((item) => {
    totalPecas += Number(item.quantidade) || 0;
    programas[item.programa] = {
      quantidade: Number(item.quantidade) || 0,
    };
  });

  const caminhoEmpresa =
    `empresas/${empresaId}/producao/${hoje}/${usuario.uid}`;
  const caminhoAntigo = `usuarios/${usuario.uid}/producao/${hoje}`;
  let snapshotAnterior = await get(ref(db, caminhoEmpresa));

  if (!snapshotAnterior.exists()) {
    snapshotAnterior = await get(ref(db, caminhoAntigo));
  }

  const producaoAnterior = snapshotAnterior.exists()
    ? snapshotAnterior.val()
    : { totalPecas: 0, totalProgramas: 0, programas: {} };

  Object.entries(programas).forEach(([nome, dados]) => {
    const quantidadeAnterior =
      producaoAnterior.programas?.[nome]?.quantidade || 0;
    programas[nome].quantidade = quantidadeAnterior + dados.quantidade;
  });

  const dadosProducao = {
    totalPecas: (Number(producaoAnterior.totalPecas) || 0) + totalPecas,
    totalProgramas: Object.keys({
      ...producaoAnterior.programas,
      ...programas,
    }).length,
    programas: { ...producaoAnterior.programas, ...programas },
    tempoTotal,
    ultimaAtualizacao: new Date().toLocaleString("pt-BR"),
    empresaId,
    operadorUid: usuario.uid,
    operadorNome,
    operadorEmail: usuario.email,
    uidUsuario: usuario.uid,
    emailUsuario: usuario.email,
  };

  // O caminho antigo continua sendo atualizado enquanto houver dados legados.
  await set(ref(db, caminhoEmpresa), dadosProducao);
  await set(ref(db, caminhoAntigo), dadosProducao);
}

export async function buscarProducaoDiaFirebase() {
  const usuario = await esperarUsuarioLogado();
  const empresaId = obterEmpresaId();
  const hoje = obterDataLocalISO();
  const snapshotEmpresa = await get(
    ref(db, `empresas/${empresaId}/producao/${hoje}/${usuario.uid}`),
  );

  if (snapshotEmpresa.exists()) {
    return snapshotEmpresa.val();
  }

  const snapshotAntigo = await get(
    ref(db, `usuarios/${usuario.uid}/producao/${hoje}`),
  );

  return snapshotAntigo.exists()
    ? snapshotAntigo.val()
    : { totalPecas: 0, totalProgramas: 0, programas: {} };
}

function adicionarDiaAoHistorico({
  historico,
  dataISO,
  dia,
  empresaId,
  operadorUid,
  operadorNome,
}) {
  const partes = dataISO.split("-");

  if (partes.length !== 3) {
    return;
  }

  const ano = Number(partes[0]);
  const mes = Number(partes[1]);
  const numeroDia = Number(partes[2]);

  Object.entries(dia.programas || {}).forEach(([programa, info]) => {
    historico.push({
      programa,
      quantidade: Number(info.quantidade) || 0,
      data: `${String(numeroDia).padStart(2, "0")}/${String(mes).padStart(
        2,
        "0",
      )}/${ano}`,
      hora: "--",
      timestamp: new Date(ano, mes - 1, numeroDia, 12, 0, 0).getTime(),
      tempo: dia.tempoTotal || "00:00",
      eficiencia: 98,
      status: "Concluído",
      origem: "producao-diaria",
      ...(empresaId ? { empresaId } : {}),
      ...(operadorUid ? { operadorUid } : {}),
      ...(operadorNome ? { operadorNome } : {}),
    });
  });
}

export async function buscarHistoricoDiarioFirebase() {
  const usuario = await esperarUsuarioLogado();
  const empresaId = obterEmpresaId();
  const tipoUsuario = sessionStorage.getItem("tipoUsuario");
  const historico = [];
  const snapshotEmpresa = await get(ref(db, `empresas/${empresaId}/producao`));

  if (snapshotEmpresa.exists()) {
    Object.entries(snapshotEmpresa.val()).forEach(([dataISO, operadores]) => {
      const operadoresDoDia =
        tipoUsuario === "admin"
          ? Object.entries(operadores || {})
          : [[usuario.uid, operadores?.[usuario.uid]]];

      operadoresDoDia.forEach(([operadorUid, dia]) => {
        if (!dia) {
          return;
        }

        adicionarDiaAoHistorico({
          historico,
          dataISO,
          dia,
          empresaId,
          operadorUid,
          operadorNome:
            dia.operadorNome ||
            (operadorUid === usuario.uid
              ? sessionStorage.getItem("nomeUsuario") ||
                usuario.email ||
                "Operador"
              : "Operador"),
        });
      });
    });

    if (historico.length > 0) {
      return historico;
    }
  }

  const snapshotAntigo = await get(ref(db, `usuarios/${usuario.uid}/producao`));

  if (!snapshotAntigo.exists()) {
    return [];
  }

  Object.entries(snapshotAntigo.val()).forEach(([dataISO, dia]) => {
    adicionarDiaAoHistorico({ historico, dataISO, dia });
  });

  return historico;
}
