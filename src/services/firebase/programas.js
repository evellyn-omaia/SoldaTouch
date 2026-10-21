import {
  get,
  ref,
  remove,
  set,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

import { db } from "./client.js";
import { criarServicoProgramas } from "./programas-core.mjs";
import { esperarUsuarioLogado, obterEmpresaId } from "./session.js";

const servicoProgramas = criarServicoProgramas({
  banco: db,
  criarReferencia: ref,
  escrever: set,
  ler: get,
  excluir: remove,
  esperarUsuario: esperarUsuarioLogado,
  obterEmpresa: obterEmpresaId,
});

export const salvarProgramaFirebase = servicoProgramas.salvar;
export const carregarProgramaFirebase = servicoProgramas.carregar;
export const listarProgramasFirebase = servicoProgramas.listar;
export const excluirProgramaFirebase = servicoProgramas.excluir;
