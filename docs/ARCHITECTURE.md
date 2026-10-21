# Arquitetura

## Fluxo principal

```text
Páginas web
  ├─ Firebase Auth + Realtime Database
  └─ MQTT sobre WebSocket
          ↓
      HiveMQ Cloud
          ↓
       Node-RED
          ↓ Modbus TCP
          CLP
```

## Limites dos módulos

### Dados

`src/services/firebase/client.js` é o único ponto que inicializa o Firebase.
Os demais arquivos da pasta representam domínios: programas, pausas, produção
diária, produção atual, histórico e operadores. Eles mantêm temporariamente as
leituras e escritas legadas necessárias aos dados já existentes.

`new-program/firebase-programas.js` não contém regra de negócio. Ele apenas
publica no `window` os nomes que os controladores antigos ainda consomem.

### Máquina

`src/config/mqtt.js` concentra broker, tópicos e timeouts. O protocolo de
mensagens fica em `src/services/mqtt/protocol.js`; o contrato independente de
transporte fica em `src/services/machine/integration.js`; e
`new-program/mqtt-maquina.js` mantém conexão, correlação de comandos e a API
global da página.

### Interface

Cada rota continua em sua pasta original para preservar os links publicados.
Os scripts dentro dessas pastas são controladores de página. Código novo que
possa ser compartilhado deve entrar em `src`, sem adicionar novas regras aos
arquivos de compatibilidade.

### Integrações externas

- `node-red/flows.json`: tradução MQTT/Modbus e comunicação com o CLP.
- `Visao-computacional/Visao.py`: captura de câmera e publicação de gestos.
- `Visao-computacional/controle_gestos.py`: regra testável de estabilidade e
  repetição dos gestos.

## Regras para próximas alterações

1. Preserve os tópicos MQTT e os caminhos do Firebase ou faça uma migração de
   dados explícita.
2. Não remova a fachada global antes de converter todas as páginas consumidoras
   para imports diretos.
3. Toda nova regra reutilizável deve ficar fora do controlador da página.
4. Rode os testes JS e Python antes de publicar.
5. Mudanças que acionem saídas físicas precisam manter falha segura e ser
   validadas primeiro com o CLP ou simulador desconectado dos atuadores.
