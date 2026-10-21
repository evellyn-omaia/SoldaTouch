export function criarIntegracaoFisica() {
  const adaptadores = {
    movimentoManual: null,
    soldagem: null,
  };

  return Object.freeze({
    registrarMovimentoManual(adaptador) {
      if (
        !adaptador ||
        typeof adaptador.iniciar !== "function" ||
        typeof adaptador.parar !== "function"
      ) {
        throw new TypeError(
          "O adaptador de movimento manual deve fornecer iniciar(direcao) e parar().",
        );
      }

      adaptadores.movimentoManual = adaptador;
      return () => {
        if (adaptadores.movimentoManual === adaptador) {
          adaptadores.movimentoManual = null;
        }
      };
    },

    registrarSoldagem(adaptador) {
      if (!adaptador || typeof adaptador.definirAtiva !== "function") {
        throw new TypeError(
          "O adaptador de soldagem deve fornecer definirAtiva(ativa, contexto).",
        );
      }

      adaptadores.soldagem = adaptador;
      return () => {
        if (adaptadores.soldagem === adaptador) {
          adaptadores.soldagem = null;
        }
      };
    },

    iniciarMovimentoManual(direcao) {
      const direcaoNormalizada = String(direcao || "").toUpperCase();

      if (!["CIMA", "BAIXO"].includes(direcaoNormalizada)) {
        throw new TypeError("A direção deve ser CIMA ou BAIXO.");
      }

      return adaptadores.movimentoManual
        ? adaptadores.movimentoManual.iniciar(direcaoNormalizada)
        : false;
    },

    pararMovimentoManual() {
      return adaptadores.movimentoManual
        ? adaptadores.movimentoManual.parar()
        : false;
    },

    definirSoldagemAtiva(ativa, contexto = {}) {
      return adaptadores.soldagem
        ? adaptadores.soldagem.definirAtiva(Boolean(ativa), contexto)
        : false;
    },

    obterCapacidades() {
      return {
        movimentoManual: Boolean(adaptadores.movimentoManual),
        soldagem: Boolean(adaptadores.soldagem),
      };
    },
  });
}
