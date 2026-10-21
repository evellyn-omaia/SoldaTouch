# SoldaTech

Aplicação web estática para cadastro e execução de programas de solda, com
Firebase para autenticação/dados e MQTT + Node-RED para integração com o CLP.

## Estrutura

- `src/config`: configuração compartilhada pelos clientes web.
- `src/services/firebase`: acesso ao Firebase separado por domínio.
- `src/services/mqtt`: interpretação do protocolo MQTT.
- `src/services/machine`: contrato entre a interface e a máquina.
- `solda-login`, `solda-system`, `new-program` e demais pastas de tela:
  páginas e controladores específicos de cada fluxo.
- `node-red`: ponte MQTT/Modbus para o CLP.
- `Visao-computacional`: cliente de visão computacional para PC.
- `tests`: testes de contrato e integridade estrutural.

As URLs atuais das páginas foram preservadas para não quebrar o GitHub Pages.
O arquivo `new-program/firebase-programas.js` é uma fachada temporária que
mantém a API global consumida pelas telas enquanto a migração para módulos é
feita gradualmente.

## Validar alterações

Requer Node.js 20 ou mais recente:

```bash
npm test
```

Para validar também o controle de gestos em Python:

```bash
python -m unittest discover -s tests -p "test_*.py"
```

## Executar

Sirva a raiz por HTTP; abrir os arquivos diretamente com `file://` não suporta
corretamente os módulos JavaScript:

```bash
python -m http.server 5500
```

Abra `http://localhost:5500/`. Veja o guia operacional completo em
[`tutorial/03-COMO-RODAR-O-PROJETO.md`](tutorial/03-COMO-RODAR-O-PROJETO.md)
e a configuração do CLP em [`node-red/README.md`](node-red/README.md).

## Visão computacional no PC

```bash
python -m pip install -r Visao-computacional/requirements.txt
python Visao-computacional/Visao.py
```

O cliente lê `MQTT_HOST`, `MQTT_PORT`, `MQTT_TLS`, `MQTT_USER` e `MQTT_PASS`
do ambiente. Usuário e senha devem ser definidos juntos.

## Segurança

A configuração MQTT usada pelo navegador é pública por natureza. Antes de
operar uma máquina real, use usuários separados e ACLs no broker: o navegador
publica somente comandos, enquanto apenas a ponte Node-RED publica status,
respostas e erros. Intertravamentos e parada de emergência devem continuar no
CLP, independentemente da aplicação web.
