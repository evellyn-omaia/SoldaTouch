import {
  equalTo,
  get,
  orderByChild,
  query,
  ref,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

import { db } from "./client.js";
import { esperarUsuarioLogado, obterEmpresaId } from "./session.js";

export async function buscarOperadoresEmpresaFirebase() {
  await esperarUsuarioLogado();
  const empresaId = obterEmpresaId();
  const tipoUsuario = sessionStorage.getItem("tipoUsuario");

  if (tipoUsuario !== "admin") {
    throw new Error("Apenas administradores podem consultar os operadores.");
  }

  const consulta = query(
    ref(db, "usuarios"),
    orderByChild("empresaId"),
    equalTo(empresaId),
  );
  const snapshot = await get(consulta);

  if (!snapshot.exists()) {
    return [];
  }

  const operadores = [];

  snapshot.forEach((filho) => {
    const dados = filho.val();

    if (dados.tipoUsuario !== "operador") {
      return;
    }

    operadores.push({
      uid: filho.key,
      nome: dados.nome || dados.email || "Operador",
      email: dados.email || "",
      empresaId: dados.empresaId,
    });
  });

  operadores.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  console.log("Operadores da empresa:", operadores);

  return operadores;
}
