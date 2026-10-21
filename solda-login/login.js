import { auth, db } from "../src/services/firebase/client.js";

import {
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  ref,
  get
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const email = document.getElementById("email");
const senha = document.getElementById("senha");

const btnEntrar = document.getElementById("btnEntrar");
const btnCriar = document.getElementById("btnCriar");

const mensagem = document.getElementById("mensagem");


// Mostra o motivo real da falha (antes, todo erro virava
// "Email ou senha incorretos", inclusive erro de banco/rede).
function explicarErroLogin(error) {
  const codigo = String(error?.code || "");
  const texto = String(error?.message || error || "");

  if (
    [
      "auth/invalid-credential",
      "auth/wrong-password",
      "auth/user-not-found",
      "auth/invalid-email",
      "auth/missing-password",
    ].includes(codigo)
  ) {
    return "Email ou senha incorretos.";
  }

  if (codigo === "auth/too-many-requests") {
    return "Muitas tentativas. Aguarde alguns minutos e tente de novo.";
  }

  if (codigo === "auth/network-request-failed") {
    return "Sem conexão com o servidor de login. Verifique a internet.";
  }

  if (/permission[_ ]denied/i.test(codigo + " " + texto)) {
    return "Login OK, mas o banco de dados recusou o acesso aos seus dados (permission denied). Avise o administrador do Firebase.";
  }

  return `Erro no login: ${codigo || texto}`;
}

// ================= LOGIN =================

btnEntrar.addEventListener(
  "click",
  async () => {

    try {

      const credencial =
        await signInWithEmailAndPassword(
          auth,
          email.value,
          senha.value
        );

     const usuario =
  credencial.user;


// ===============================
// BUSCAR DADOS DO USUÁRIO
// ===============================

const usuarioRef =
  ref(
    db,
    `usuarios/${usuario.uid}`
  );


const snapshot =
  await get(usuarioRef);


if (!snapshot.exists()) {

  mensagem.innerHTML =
    "Dados do usuário não encontrados.";

  return;
}


const dadosUsuario =
  snapshot.val();


// ===============================
// SALVAR DADOS DA SESSÃO
// ===============================

sessionStorage.setItem(
  "uid",
  usuario.uid
);

sessionStorage.setItem(
  "empresaId",
  dadosUsuario.empresaId || ""
);

sessionStorage.setItem(
  "tipoUsuario",
  dadosUsuario.tipoUsuario || ""
);

sessionStorage.setItem(
  "nomeUsuario",
  dadosUsuario.nome || ""
);


// ===============================
// LOGIN OK
// ===============================

mensagem.innerHTML =
  "Login realizado!";


console.log(
  "Usuário logado:",
  usuario.uid
);

console.log(
  "Empresa:",
  dadosUsuario.empresaId
);

console.log(
  "Tipo de usuário:",
  dadosUsuario.tipoUsuario
);


window.location.href =
  "../solda-system/index.html";

    } catch(error) {

      console.error("Falha no login:", error);

      mensagem.textContent =
        explicarErroLogin(error);
    }
  }
);


// ================= IR PRA CRIAR CONTA =================

btnCriar.addEventListener("click", () => {

  window.location.href =
    "criarConta.html";

});
