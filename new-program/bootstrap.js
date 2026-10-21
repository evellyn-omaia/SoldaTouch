import "./firebase-programas.js";
import "./mqtt-maquina.js";

function carregarScriptClassico(caminho) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = caminho;
    script.onload = resolve;
    script.onerror = () =>
      reject(new Error(`Não foi possível carregar ${caminho}.`));
    document.body.appendChild(script);
  });
}

// O controlador legado depende das APIs globais acima e ainda expõe funções
// usadas pelos dois handlers inline da página. A ordem explícita evita corrida
// entre scripts module e defer durante a migração.
await carregarScriptClassico("./novoprograma.js");
await import("./simulacao-integrada.mjs");
