import assert from "node:assert/strict";
import test from "node:test";

import { criarServicoProgramas } from "../src/services/firebase/programas-core.mjs";

function criarCenario({ existe = true, valor = null } = {}) {
  const escritas = [];
  const exclusoes = [];
  const referenciasLidas = [];
  const banco = {};
  const criarReferencia = (bancoRecebido, caminho) => {
    assert.equal(bancoRecebido, banco);
    return caminho;
  };
  const servico = criarServicoProgramas({
    banco,
    criarReferencia,
    escrever: async (caminho, dados) => escritas.push({ caminho, dados }),
    ler: async (caminho) => {
      referenciasLidas.push(caminho);
      return {
        exists: () => existe,
        val: () => valor,
      };
    },
    excluir: async (caminho) => exclusoes.push(caminho),
    esperarUsuario: async () => ({ uid: "usuario-1", email: "op@teste.com" }),
    obterEmpresa: () => "empresa-1",
    agora: () => ({ toLocaleString: () => "DATA_FORMATADA" }),
  });

  return { servico, escritas, exclusoes, referenciasLidas };
}

test("salva programa no escopo da empresa e preserva o contrato atual", async () => {
  const { servico, escritas } = criarCenario();
  const chave = await servico.salvar(" A.B#C/D$E[F] ", { pontos: [1, 2] });

  assert.equal(chave, "A-B-C-D-E-F-");
  assert.deepEqual(escritas, [
    {
      caminho: "empresas/empresa-1/programas/A-B-C-D-E-F-",
      dados: {
        pontos: [1, 2],
        nome: " A.B#C/D$E[F] ",
        chave: "A-B-C-D-E-F-",
        uidUsuario: "usuario-1",
        emailUsuario: "op@teste.com",
        empresaId: "empresa-1",
        data: "DATA_FORMATADA",
      },
    },
  ]);
});

test("carrega, lista e exclui programas nos caminhos esperados", async () => {
  const programa = { nome: "Teste" };
  const { servico, exclusoes, referenciasLidas } = criarCenario({
    valor: programa,
  });

  assert.equal(await servico.carregar("Teste"), programa);
  assert.equal(await servico.listar(), programa);
  await servico.excluir("Teste");

  assert.deepEqual(referenciasLidas, [
    "empresas/empresa-1/programas/Teste",
    "empresas/empresa-1/programas",
  ]);
  assert.deepEqual(exclusoes, ["empresas/empresa-1/programas/Teste"]);
});

test("mantém os retornos vazios usados pelas telas", async () => {
  const { servico } = criarCenario({ existe: false });

  assert.equal(await servico.carregar("Inexistente"), null);
  assert.deepEqual(await servico.listar(), {});
});
