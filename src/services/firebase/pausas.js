import {
  get,
  push,
  ref,
  set,
  update,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

import { db } from "./client.js";
import { esperarUsuarioLogado, obterEmpresaId } from "./session.js";

export async function iniciarPausaFirebase(
  motivo = "Sem motivo",
  inicioTimestampInformado = null,
) {
  const usuario = await esperarUsuarioLogado();
  const empresaId = obterEmpresaId();
  const operadorNome =
    sessionStorage.getItem("nomeUsuario") ||
    usuario.displayName ||
    usuario.email ||
    "Operador";
  const motivoFinal = motivo || "Sem motivo";
  const inicioTimestamp = Number(inicioTimestampInformado) || Date.now();
  const novaPausa = push(ref(db, `empresas/${empresaId}/pausas`));

  await set(novaPausa, {
    empresaId,
    operadorUid: usuario.uid,
    operadorNome,
    operadorEmail: usuario.email || "",
    motivo: motivoFinal,
    inicioTimestamp,
    status: "ABERTA",
  });

  console.log("Pausa iniciada no Firebase:", {
    id: novaPausa.key,
    motivo: motivoFinal,
    operador: operadorNome,
  });

  return { id: novaPausa.key, inicioTimestamp, motivo: motivoFinal };
}

export async function atualizarMotivoPausaFirebase(pausaId, motivo) {
  await esperarUsuarioLogado();
  const empresaId = obterEmpresaId();

  if (!pausaId) {
    throw new Error("ID da pausa não informado.");
  }

  const pausaRef = ref(db, `empresas/${empresaId}/pausas/${pausaId}`);
  const snapshot = await get(pausaRef);

  if (!snapshot.exists()) {
    throw new Error("Pausa não encontrada.");
  }

  const pausa = snapshot.val();

  if (pausa.status !== "ABERTA") {
    throw new Error("Apenas pausas abertas podem ter o motivo atualizado.");
  }

  const motivoFinal = motivo || "Sem motivo";
  await update(pausaRef, { motivo: motivoFinal });

  return { id: pausaId, motivo: motivoFinal };
}

export async function finalizarPausaFirebase(pausaId) {
  await esperarUsuarioLogado();
  const empresaId = obterEmpresaId();

  if (!pausaId) {
    throw new Error("ID da pausa não informado.");
  }

  const pausaRef = ref(db, `empresas/${empresaId}/pausas/${pausaId}`);
  const snapshot = await get(pausaRef);

  if (!snapshot.exists()) {
    throw new Error("Pausa não encontrada.");
  }

  const pausa = snapshot.val();
  const fimTimestamp = Date.now();
  const inicioTimestamp = Number(pausa.inicioTimestamp) || fimTimestamp;
  const duracaoSegundos = Math.max(
    0,
    Math.floor((fimTimestamp - inicioTimestamp) / 1000),
  );

  await set(pausaRef, {
    ...pausa,
    fimTimestamp,
    duracaoSegundos,
    status: "FINALIZADA",
  });

  console.log("Pausa finalizada:", {
    id: pausaId,
    motivo: pausa.motivo,
    duracaoSegundos,
  });

  return { fimTimestamp, duracaoSegundos };
}

export async function buscarPausasEmpresaFirebase() {
  await esperarUsuarioLogado();
  const empresaId = obterEmpresaId();
  const tipoUsuario = sessionStorage.getItem("tipoUsuario");

  if (tipoUsuario !== "admin") {
    throw new Error("Apenas administradores podem consultar as pausas da empresa.");
  }

  const snapshot = await get(ref(db, `empresas/${empresaId}/pausas`));

  if (!snapshot.exists()) {
    return [];
  }

  return Object.entries(snapshot.val())
    .map(([id, pausa]) => ({ id, ...pausa }))
    .filter((pausa) => pausa.empresaId === empresaId);
}
