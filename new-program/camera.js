import {
  CHAVE_SESSAO,
  VALIDADE_MS,
  lerSessao,
  validarItens,
} from "./visao-core.mjs";
import { CameraGestos } from "./visao-camera.mjs";

// ==========================================
// MQTT - VISAO COMPUTACIONAL DO CELULAR
// ==========================================

const MQTT_URL =
  "wss://d86f195585704b50bc165c7872060e82.s1.eu.hivemq.cloud:8884/mqtt";

const MQTT_TOPICO_GESTO = "soldatech/maquina/comando";
const MQTT_TOPICO_RESPOSTA = "soldatech/maquina/resposta";
const MQTT_TOPICO_ERRO = "soldatech/maquina/erro";

let mqttVisao = null;
let ultimoEventoEnviado = null;
let mesaLigadaPorGesto = false;

// Resposta do Node-RED/CLP ao gesto que acabou de ser enviado.
function tratarRespostaGesto(topico, payload) {
  let dados;

  try {
    dados = JSON.parse(payload.toString());
  } catch {
    return;
  }

  if (!dados?.idEvento || dados.idEvento !== ultimoEventoEnviado) {
    return;
  }

  if (topico === MQTT_TOPICO_ERRO) {
    el("resultado").textContent = `Máquina não executou: ${dados.mensagem}`;
    el("producao").textContent = "Comando recusado";
    return;
  }

  mesaLigadaPorGesto = dados.acao === "MESA_START";
  el("resultado").textContent = `${dados.mensagem} Confirmado pelo CLP.`;
  el("producao").textContent = mesaLigadaPorGesto
    ? "Mesa girando (máquina real)"
    : "Máquina parada";
}

/*
Segurança: se a câmera fechar (aba em segundo plano,
tela bloqueada, sair da página) depois de um START,
manda PAUSA. Máquina acionada por câmera não pode
continuar girando sem a câmera olhando.
*/
function pararMaquinaSeCameraFechar() {
  if (!mesaLigadaPorGesto || !mqttVisao?.connected) {
    return;
  }

  mesaLigadaPorGesto = false;
  ultimoEventoEnviado = crypto.randomUUID();
  mqttVisao.publish(
    MQTT_TOPICO_GESTO,
    JSON.stringify({
      tipo: "GESTO_VISAO",
      gesto: "PAUSA",
      origem: "CELULAR_CAMERA_FECHADA",
      timestamp: Date.now(),
      idEvento: ultimoEventoEnviado,
    }),
    { qos: 1, retain: false },
  );
}

function conectarMQTTVisao(usuario, senha) {
  if (!window.mqtt?.connect) {
    throw new Error("Biblioteca MQTT não carregada.");
  }

  if (mqttVisao) {
    mqttVisao.end(true);
  }

  mqttVisao = window.mqtt.connect(MQTT_URL, {
    clientId: `soldatouch-celular-${crypto.randomUUID()}`,
    username: usuario,
    password: senha,
    clean: true,
    reconnectPeriod: 3000,
    connectTimeout: 10000,
  });

  mqttVisao.on("connect", () => {
    el("conexao").textContent = "MQTT conectado";
    mqttVisao.subscribe([MQTT_TOPICO_RESPOSTA, MQTT_TOPICO_ERRO], { qos: 0 });
  });

  mqttVisao.on("message", tratarRespostaGesto);

  mqttVisao.on("close", () => {
    el("conexao").textContent = "MQTT desconectado";
  });

  mqttVisao.on("error", (erro) => {
    console.error("[VISÃO MQTT]", erro);
  });
}

function publicarGestoMQTT(gesto) {
  if (!mqttVisao?.connected) {
    throw new Error("MQTT desconectado. Gesto não enviado.");
  }

  if (!["START", "PAUSA"].includes(gesto)) {
    throw new Error("Gesto inválido.");
  }

  const mensagem = {
    tipo: "GESTO_VISAO",
    gesto,
    origem: "CELULAR",
    timestamp: Date.now(),
    idEvento: crypto.randomUUID(),
  };

  ultimoEventoEnviado = mensagem.idEvento;

  return new Promise((resolve, reject) => {
    mqttVisao.publish(
      MQTT_TOPICO_GESTO,
      JSON.stringify(mensagem),
      { qos: 1, retain: false },
      (erro) => {
        if (erro) reject(erro);
        else resolve(mensagem);
      },
    );
  });
}

conectarMQTTVisao("SoldaTouch", "MQtesteVisao");

const el = (id) => document.getElementById(id);
let sessao, contexto, identidade, pararObservacao, expiracao;
let validando = false;
let geracaoValidacao = 0;
let encerrada = false;
const camera = new CameraGestos({
  video: el("video"),
  mediaDevices: navigator.mediaDevices,
  aoEstado(estado, mensagem) {
    el("estadoCamera").textContent = mensagem;
    el("seloCamera").textContent =
      estado === "ativa" ? "Ao vivo · processamento local" : "Câmera desligada";
    el("ativar").disabled = estado === "preparando" || estado === "ativa";
    el("encerrar").disabled = !["ativa", "preparando"].includes(estado);
    el("alternar").disabled = estado !== "ativa";
    el("video").classList.toggle("frontal", camera.lado === "user");
    if (estado === "ativa") void verificarCameras();
  },
  aoResultado(gesto, resultado) {
    el("gesto").textContent =
      { START: "MÃO ABERTA — START", PAUSA: "MÃO FECHADA — PAUSA" }[gesto] ||
      "AGUARDANDO GESTO";
    el("deteccao").textContent =
      gesto === "SEM_MAO"
        ? "Nenhuma mão detectada."
        : gesto === "DESCONHECIDO"
          ? "Gesto desconhecido ou mais de uma mão. Mostre uma palma aberta ou um punho fechado."
          : "Mantenha o gesto estável para confirmar a intenção.";
    const categoria = resultado?.gestures?.[0]?.[0];
    el("deteccao").textContent +=
      ` Mãos: ${resultado?.landmarks?.length || 0}. ${categoria?.categoryName || "Sem categoria"}: ${Math.round((categoria?.score || 0) * 100)}%.`;
  },
  async aoGesto(gesto) {
    // Modo livre (sem login/produção configurada): o gesto vai direto para a máquina.
    if (!sessao) {
      try {
        const mensagem = await publicarGestoMQTT(gesto);
        el("resultado").textContent =
          `${mensagem.gesto} enviado à máquina. Aguardando confirmação do CLP...`;
        el("producao").textContent = "Gesto enviado · aguardando o CLP";
      } catch (erro) {
        el("resultado").textContent = erro.message;
      }
      return;
    }
    try {
      // Releitura impede reutilizar configuração substituída em outra navegação desta aba.
      const atual = lerSessao(sessionStorage, contexto);
      if (
        atual.id !== sessao?.id ||
        JSON.stringify(atual) !== JSON.stringify(sessao)
      )
        throw new Error("A configuração mudou. Volte e configure novamente.");
      if (!el("simulacaoVirtual").hidden) {
        try {
          const controlar =
            el("simulacaoVirtual").contentWindow?.controlarSimulacaoPorGesto;
          if (!controlar)
            throw new Error("A simulação 3D ainda está carregando.");
          const retorno = await controlar(gesto);
          el("resultado").textContent = retorno.mensagem;
          el("producao").textContent =
            `${retorno.estado} · somente simulação 3D`;
        } catch (erro) {
          el("resultado").textContent = erro.message;
        }
        return;
      }
      const mensagem = await publicarGestoMQTT(gesto);

      el("resultado").textContent =
        `${mensagem.gesto} enviado à máquina. Aguardando confirmação do CLP...`;

      el("producao").textContent = "Gesto enviado · aguardando o CLP";
    } catch (erro) {
      invalidar(erro.message);
    }
  },
});

async function verificarCameras() {
  try {
    const dispositivos = await navigator.mediaDevices.enumerateDevices();
    el("alternar").hidden =
      dispositivos.filter((d) => d.kind === "videoinput").length < 2;
  } catch {
    el("alternar").hidden = true;
  }
}

function invalidar(mensagem) {
  pararMaquinaSeCameraFechar();
  ++geracaoValidacao;
  sessao = null;
  contexto = null;
  clearTimeout(expiracao);
  camera.parar(mensagem);
  el("simulacaoVirtual").src = "about:blank";
  el("simulacaoVirtual").hidden = true;
  el("abrirSimulacao").disabled = true;
  el("conexao").textContent = mqttVisao?.connected
    ? "MQTT conectado"
    : "MQTT desconectado";
  el("quantidade").textContent = "—";
  el("programas").replaceChildren();
  el("resultado").textContent = "Nenhuma solicitação enviada.";
  el("revalidar").hidden = false;
}

// Sem login ou sem produção configurada: a câmera funciona e o gesto vai direto para a máquina.
function entrarModoLivre(motivo) {
  const item = document.createElement("li");
  item.textContent =
    "Modo livre (sem login): mão aberta gira a mesa, punho fechado para tudo.";
  el("programas").replaceChildren(item);
  el("quantidade").textContent = "—";
  el("conexao").textContent = mqttVisao?.connected
    ? "MQTT conectado"
    : "Conectando ao MQTT...";
  el("ativar").disabled = false;
  el("revalidar").hidden = true;
  console.info("[VISÃO] Modo livre:", motivo);
}

async function preparar(ativarAutomaticamente = false) {
  if (validando || encerrada) return;
  validando = true;
  const geracao = ++geracaoValidacao;
  el("revalidar").disabled = true;
  el("conexao").textContent = "Conectando";
  try {
    if (!navigator.onLine)
      throw new Error(
        "Sem conexão. Reconecte e toque em Tentar conexão novamente.",
      );
    identidade ||= await import("./visao-identidade.js");
    const usuario = await identidade.obterContexto();
    const configuracao = lerSessao(sessionStorage, usuario);
    const programas = await identidade.listarProgramas();
    validarItens(configuracao.itens, programas);
    const conferido = await identidade.obterContexto();
    if (
      usuario.uid !== conferido.uid ||
      usuario.empresaId !== conferido.empresaId
    )
      throw new Error("A conta mudou. Volte e configure novamente.");
    if (geracao !== geracaoValidacao || encerrada || document.hidden) return;
    sessao = configuracao;
    contexto = usuario;
    const lista = configuracao.itens.map((item) => {
      const li = document.createElement("li");
      li.textContent = `${item.nome} · ${item.quantidade} peça(s)`;
      return li;
    });
    el("programas").replaceChildren(...lista);
    el("programaVirtual").replaceChildren(
      ...configuracao.itens.map((item) => {
        const option = document.createElement("option");
        option.value = item.programa;
        option.textContent = item.nome;
        return option;
      }),
    );
    el("abrirSimulacao").disabled = false;
    el("quantidade").textContent =
      `${configuracao.itens.reduce((s, i) => s + i.quantidade, 0)} peça(s)`;
    el("conexao").textContent = "Modo demonstração · configuração validada";
    el("revalidar").hidden = true;
    el("ativar").disabled = false;
    el("estadoCamera").textContent =
      "Configuração pronta. Toque em Ativar câmera se necessário.";
    clearTimeout(expiracao);
    expiracao = setTimeout(
      () => invalidar("A configuração expirou. Volte e configure novamente."),
      Math.max(0, configuracao.criadaEm + VALIDADE_MS - Date.now()),
    );
    pararObservacao?.();
    pararObservacao = identidade.observarUsuario((uid) => {
      if (uid !== usuario.uid) {
        sessionStorage.removeItem(CHAVE_SESSAO);
        invalidar(
          "A conta mudou ou foi desconectada. Volte e entre novamente.",
        );
      }
    });
    // A caixa de permissão pode permanecer aberta indefinidamente; não bloquear revalidação.
    if (ativarAutomaticamente) void camera.iniciar();
  } catch (erro) {
    if (geracao === geracaoValidacao) {
      entrarModoLivre(erro.message);
      if (ativarAutomaticamente) void camera.iniciar();
    }
  } finally {
    validando = false;
    el("revalidar").disabled = false;
  }
}

el("ativar").addEventListener("click", () => {
  void camera.iniciar();
});
el("abrirSimulacao").addEventListener("click", () => {
  if (!sessao) return;
  camera.filtro.reiniciar(true);
  el("simulacaoVirtual").src =
    `./novoprograma.html?programaVisao=${encodeURIComponent(el("programaVirtual").value)}&quantidade=${sessao.itens.find((item) => item.programa === el("programaVirtual").value).quantidade}`;
  el("simulacaoVirtual").hidden = false;
  el("resultado").textContent =
    "Preparando o modelo e os pontos. Retire a mão antes do próximo gesto.";
});
el("encerrar").addEventListener("click", () => camera.parar());
el("alternar").addEventListener("click", () => {
  void camera.alternar();
});
el("revalidar").addEventListener("click", () => void preparar());
document
  .querySelectorAll("a")
  .forEach((link) => link.addEventListener("click", () => camera.parar()));
document.addEventListener("visibilitychange", () => {
  if (document.hidden)
    invalidar(
      "Câmera encerrada enquanto a página estava em segundo plano. Toque em Ativar câmera para continuar.",
    );
});
window.addEventListener("offline", () =>
  invalidar(
    "Conexão interrompida. Nenhum gesto será reenviado. Reconecte e valide novamente.",
  ),
);
window.addEventListener("online", () => {
  el("revalidar").hidden = false;
});
window.addEventListener("pagehide", () => {
  pararMaquinaSeCameraFechar();
  encerrada = true;
  ++geracaoValidacao;
  camera.parar();
  pararObservacao?.();
  clearTimeout(expiracao);
});
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    encerrada = false;
    invalidar("Valide a configuração e ative a câmera novamente.");
  }
});
void preparar(true);
