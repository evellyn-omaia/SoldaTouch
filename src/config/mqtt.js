// Configuração pública do cliente web. Credenciais embarcadas no navegador
// não são secretas; a segurança deve ser garantida pelas ACLs do broker.
export const MQTT_CONFIG = Object.freeze({
  brokerUrl:
    "wss://d86f195585704b50bc165c7872060e82.s1.eu.hivemq.cloud:8884/mqtt",
  credenciais: Object.freeze({
    usuario: "SoldaTouch",
    senha: "MQtesteVisao",
  }),
  topicos: Object.freeze({
    comando: "soldatech/maquina/comando",
    status: "soldatech/maquina/status",
    resposta: "soldatech/maquina/resposta",
    erro: "soldatech/maquina/erro",
  }),
  clpTimeoutMs: 10_000,
  comandoTimeoutMs: 8_000,
  intervaloStatusMs: 1_000,
});
