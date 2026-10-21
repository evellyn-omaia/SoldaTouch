import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { auth } from "./client.js";

export function esperarUsuarioLogado() {
  return new Promise((resolve, reject) => {
    const parar = onAuthStateChanged(auth, (usuario) => {
      parar();

      if (usuario) {
        resolve(usuario);
        return;
      }

      // Mantém o mesmo contrato da implementação anterior durante a migração.
      reject("Usuário não está logado.");
    });
  });
}

export function obterEmpresaId() {
  const empresaId = sessionStorage.getItem("empresaId");

  if (!empresaId) {
    throw new Error("Empresa do usuário não identificada.");
  }

  return empresaId;
}

export async function obterContextoVisaoFirebase() {
  let usuario;

  try {
    usuario = await esperarUsuarioLogado();
  } catch {
    throw new Error("Entre na sua conta para usar a câmera.");
  }

  const empresaId = sessionStorage.getItem("empresaId");

  if (!empresaId) {
    throw new Error("Empresa do usuário não identificada. Entre novamente.");
  }

  return { uid: usuario.uid, empresaId };
}
