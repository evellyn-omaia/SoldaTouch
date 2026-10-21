import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const apiEsperada = [
  "atualizarMotivoPausaFirebase",
  "buscarHistoricoDiarioFirebase",
  "buscarHistoricoProducaoFirebase",
  "buscarOperadoresEmpresaFirebase",
  "buscarPausasEmpresaFirebase",
  "buscarProducaoAtualFirebase",
  "buscarProducaoAtualOperadorFirebase",
  "buscarProducaoDiaFirebase",
  "cancelarProducaoAtualFirebase",
  "carregarProgramaFirebase",
  "excluirProgramaFirebase",
  "finalizarPausaFirebase",
  "iniciarPausaFirebase",
  "listarProgramasFirebase",
  "observarProducaoAtualFirebase",
  "observarProducaoAtualOperadorFirebase",
  "obterContextoVisaoFirebase",
  "removerProducaoAtualFirebase",
  "salvarHistoricoProducaoFirebase",
  "salvarProducaoAtualFirebase",
  "salvarProducaoDiaFirebase",
  "salvarProgramaFirebase",
].sort();

test("a fachada mantém a API global usada pelas páginas", async () => {
  const caminho = new URL("../new-program/firebase-programas.js", import.meta.url);
  const codigo = await readFile(caminho, "utf8");
  const bloco = codigo.match(/Object\.assign\(window,\s*\{([\s\S]*?)\}\);/);

  assert.ok(bloco, "Object.assign(window, ...) não encontrado");

  const apiPublicada = [...bloco[1].matchAll(/^\s*([\w$]+),?\s*$/gm)]
    .map((resultado) => resultado[1])
    .sort();

  assert.deepEqual(apiPublicada, apiEsperada);
});
