import { MQTT_CONFIG } from "../../config/mqtt.js";

export function converterPayloadParaTexto(payload) {
  if (typeof payload === "string") {
    return payload;
  }

  try {
    return payload?.toString?.() ?? "";
  } catch {
    return "";
  }
}

export function parsearMensagemMqtt(payload) {
  const texto = converterPayloadParaTexto(payload).trim();

  if (!texto) {
    return {
      valido: false,
      formato: "vazio",
      texto: "",
      dados: null,
      erro: "Payload vazio",
    };
  }

  try {
    const dados = JSON.parse(texto);
    const objetoValido =
      dados !== null && typeof dados === "object" && !Array.isArray(dados);

    return {
      valido: objetoValido,
      formato: "json",
      texto,
      dados: objetoValido ? dados : null,
      erro: objetoValido ? null : "O JSON precisa ser um objeto",
    };
  } catch (erro) {
    return {
      valido: true,
      formato: "texto",
      texto,
      dados: {
        mensagem: texto,
        legado: true,
      },
      erroParse: erro.message,
    };
  }
}

export function normalizarTipoMensagem(dados, categoria) {
  const tipoRecebido = dados?.tipo ?? dados?.evento;

  if (typeof tipoRecebido === "string" && tipoRecebido.trim()) {
    return tipoRecebido.trim().toUpperCase();
  }

  if (categoria === "STATUS") {
    return "STATUS";
  }

  if (categoria === "ERRO") {
    return "ERRO";
  }

  return null;
}

export function obterCategoriaTopico(topico) {
  if (topico === MQTT_CONFIG.topicos.status) {
    return "STATUS";
  }

  if (topico === MQTT_CONFIG.topicos.resposta) {
    return "RESPOSTA";
  }

  if (topico === MQTT_CONFIG.topicos.erro) {
    return "ERRO";
  }

  return null;
}

export function validarCamposMinimos(categoria, mensagemProcessada) {
  if (mensagemProcessada.formato === "texto") {
    return null;
  }

  const dados = mensagemProcessada.dados;

  if (categoria === "STATUS") {
    return Object.keys(dados).length > 0
      ? null
      : "Mensagem de status sem campos";
  }

  if (categoria === "RESPOSTA") {
    return typeof (dados.tipo ?? dados.evento) === "string"
      ? null
      : "Resposta sem campo tipo/evento";
  }

  if (categoria === "ERRO") {
    return dados.tipo || dados.mensagem || dados.codigo
      ? null
      : "Mensagem de erro sem tipo, mensagem ou código";
  }

  return null;
}
