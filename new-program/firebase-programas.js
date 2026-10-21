// Fachada de compatibilidade para as páginas existentes.
// A implementação por domínio fica em src/services/firebase.
import {
  atualizarMotivoPausaFirebase,
  buscarPausasEmpresaFirebase,
  finalizarPausaFirebase,
  iniciarPausaFirebase,
} from "../src/services/firebase/pausas.js";
import { buscarOperadoresEmpresaFirebase } from "../src/services/firebase/operadores.js";
import {
  carregarProgramaFirebase,
  excluirProgramaFirebase,
  listarProgramasFirebase,
  salvarProgramaFirebase,
} from "../src/services/firebase/programas.js";
import {
  buscarHistoricoDiarioFirebase,
  buscarProducaoDiaFirebase,
  salvarProducaoDiaFirebase,
} from "../src/services/firebase/producao-diaria.js";
import {
  buscarHistoricoProducaoFirebase,
  salvarHistoricoProducaoFirebase,
} from "../src/services/firebase/historico.js";
import {
  buscarProducaoAtualFirebase,
  buscarProducaoAtualOperadorFirebase,
  cancelarProducaoAtualFirebase,
  observarProducaoAtualFirebase,
  observarProducaoAtualOperadorFirebase,
  removerProducaoAtualFirebase,
  salvarProducaoAtualFirebase,
} from "../src/services/firebase/producao-atual.js";
import { obterContextoVisaoFirebase } from "../src/services/firebase/session.js";

Object.assign(window, {
  atualizarMotivoPausaFirebase,
  buscarHistoricoDiarioFirebase,
  buscarHistoricoProducaoFirebase,
  buscarOperadoresEmpresaFirebase,
  buscarPausasEmpresaFirebase,
  buscarProducaoAtualFirebase,
  buscarProducaoAtualOperadorFirebase,
  buscarProducaoDiaFirebase,
  cancelarProducaoAtualFirebase,
  carregarProgramaFirebase,
  excluirProgramaFirebase,
  finalizarPausaFirebase,
  iniciarPausaFirebase,
  listarProgramasFirebase,
  observarProducaoAtualFirebase,
  observarProducaoAtualOperadorFirebase,
  obterContextoVisaoFirebase,
  removerProducaoAtualFirebase,
  salvarHistoricoProducaoFirebase,
  salvarProducaoAtualFirebase,
  salvarProducaoDiaFirebase,
  salvarProgramaFirebase,
});
