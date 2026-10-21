# SoldaTech — ponte Node-RED entre o app e o CLP

Esta pasta contém um flow do Node-RED (`flows.json`) que liga o app web (o
"gêmeo digital" em `new-program/novoprograma.html`) à máquina real através de
um CLP, usando **Modbus TCP**. Ele assina os mesmos tópicos MQTT que o
navegador já usa (`new-program/mqtt-maquina.js`), então **nada muda no
frontend** além de ligar o checkbox "Controlar a máquina real (CLP)" na tela
de produção quando tudo estiver testado.

```
Navegador (novoprograma.js)
      │  MQTT (wss://.../mqtt)
      ▼
Broker MQTT (HiveMQ Cloud)
      │  MQTT seguro (mqtts://...:8883)
      ▼
Node-RED (este flow)
      │  Modbus TCP
      ▼
CLP  →  motores / relés / sensores da máquina real
```

## 1. Instalar o Node-RED

No PC que fica na mesma rede do CLP:

1. Instale o [Node.js LTS](https://nodejs.org/).
2. Instale o Node-RED globalmente:
   ```bash
   npm install -g --unsafe-perm node-red
   ```
3. Rode uma vez para criar a pasta de usuário (`~/.node-red` no Linux/Mac,
   `%USERPROFILE%\.node-red` no Windows):
   ```bash
   node-red
   ```
   Deixe rodando e abra `http://localhost:1880` no navegador para confirmar
   que abriu. Depois pode fechar com Ctrl+C.

## 2. Instalar a dependência Modbus

Este flow fala Modbus TCP usando o pacote `modbus-serial` (não é um node
visual do Node-RED, é uma biblioteca chamada de dentro de um node Function —
isso evita depender de um node-contrib de terceiros com esquema de
configuração instável).

Dentro da pasta de usuário do Node-RED:

```bash
cd ~/.node-red        # ou %USERPROFILE%\.node-red no Windows
npm install modbus-serial
```

Depois edite `~/.node-red/settings.js` e adicione o módulo ao
`functionGlobalContext` (procure esse bloco no arquivo, geralmente já existe
comentado):

```js
functionGlobalContext: {
    modbusSerial: require('modbus-serial'),
},
```

No mesmo arquivo, troque o bloco `contextStorage` (comentado) por este — é
onde a calibração do encoder Z fica salva em disco
(`~/.node-red/context/global/global.json`), pra sobreviver a reinícios:

```js
contextStorage: {
    default: { module: "memory" },
    arquivo: { module: "localfilesystem", config: { flushInterval: 5 } },
},
```

Reinicie o Node-RED depois de salvar o `settings.js`.

## 3. Importar o flow

1. Abra `http://localhost:1880`.
2. Menu (☰) → **Import** → cole o conteúdo de `flows.json` (ou arraste o
   arquivo) → **Import**.
3. Ainda não clique em **Deploy**. Primeiro faça os ajustes do passo 4.

## 4. Ajustar para o seu CLP

Tudo que precisa mudar está em **dois lugares**:

### 4.1. Node "Conectar ao CLP (on start)"

Clique duas vezes nele e edite:

- `clpConfig.ip` / `clpConfig.port` / `clpConfig.unitId` — endereço do CLP na
  rede e o unit id/estação Modbus configurado nele.
- `clpRegs` — o mapa de coils e registradores. Os números que estão lá
  (`0, 1, 2, 3...`) são **placeholders**: substitua pelos endereços reais que
  o programa do seu CLP usa para:
  - `coils.jogCima` / `jogBaixo` — sobe/desce o eixo Z manualmente.
  - `coils.mesaStart` — liga/desliga o giro contínuo da mesa.
  - `coils.soldaOn` — liga/desliga a solda/indutor.
  - `holdingRegisters.zAlvoDecimm` — posição Z alvo enviada pelo app durante
    a execução automática de um programa (**em décimos de mm**, ex.: 15.5 mm
    vira `155`, porque registradores Modbus são inteiros).
  - `holdingRegisters.mesaAlvoDecigraus` — reservado para ângulo alvo da
    mesa, se seu CLP suportar posicionamento (hoje o app só usa
    start/stop contínuo pela `MESA_START`/`MESA_STOP`).
  - `encoderZ` — onde está a contagem do encoder do eixo Z (ver seção 7).
    É isso que faz o gêmeo digital seguir a posição real da máquina.

Fale com quem programou/vai programar o CLP (a lógica ladder/estruturada)
para decidir esses endereços — este flow só define **o contrato do lado do
Node-RED**, a lógica de movimento em si (rampas de aceleração, fins de
curso, intertravamentos de segurança) continua sendo responsabilidade do
programa do CLP, como em qualquer máquina industrial.

### 4.2. Node MQTT "SoldaTech HiveMQ Cloud" (config, clique no ícone de broker)

Já vem apontando para o mesmo cluster que o site usa
(`d86f195585704b50bc165c7872060e82.s1.eu.hivemq.cloud`, porta **8883**, TLS
ligado). O usuário/senha **não** ficam no `flows.json`: preencha na aba
**Segurança** do broker (os mesmos de `src/config/mqtt.js`) e dê
Deploy — o Node-RED guarda criptografado em `flows_cred.json`. Veja a nota
de segurança abaixo.

## 5. Testar sem arriscar a máquina

Antes de ligar em um CLP de verdade, vale validar a lógica com um simulador
Modbus TCP (ex.: `diagslave`, `ModbusPal`, ou até outra instância do
`modbus-serial` rodando um servidor de teste). Aponte `clpConfig.ip/port`
para o simulador, dê Deploy, e use o botão de teste MQTT do app
(`window.testarMQTT()` no console do navegador, ou o próprio app) para
conferir se comando → resposta funciona antes de tocar em motores reais.

**Nunca** teste o jog/solda pela primeira vez com o CLP já ligado aos
motores/indutor de verdade sem supervisão e sem confirmar que a parada de
emergência (`coils.emergencia`) está funcionando.

## 6. Ligar o modo "máquina real" no app

Com o Node-RED conectado e publicando `STATUS` (você verá o `statusClp`
mudar para "CONECTADO" no painel do app), abra a tela de produção
(`novoprograma.html`) e marque o checkbox **"Controlar a máquina real
(CLP)"** no painel do canto superior direito. A partir daí:

- Segurar os botões de subir/descer o indutor (ou as setas do teclado) envia
  `JOG_CIMA`/`JOG_BAIXO`/`JOG_PARAR` para o CLP em vez de só mover a cena 3D.
- Ligar a solda envia `SOLDA_ON`/`SOLDA_OFF`.
- Girar a mesa envia `MESA_START`/`MESA_STOP`.
- A execução automática de um programa envia `MOVER_PONTO` para cada ponto
  e espera a confirmação `PONTO_ATINGIDO` do CLP (via este flow).
- A posição do modelo 3D deixa de ser assumida e passa a refletir a posição
  **real** informada pelo CLP (mensagens `STATUS`).

O checkbox fica **desligado por padrão** (modo simulação) e a preferência é
salva por navegador — assim ninguém liga sem querer o controle de uma
máquina real.

## 7. Encoder do eixo Z

O encoder é lido pelo contador rápido `%HSC0` do M221 (entradas I0.0/I0.1).
O Modbus não enxerga o `%HSC0` direto, então o ladder copia o valor para
uma palavra de memória, que o Node-RED lê ~10x por segundo.

**No EcoStruxure Machine Expert Basic:**

1. Configuração do `%HSC0`: tipo **Fase dupla [Quadratura X4]** (encoder
   A/B) e **palavra dupla (32 bits)** marcada.
2. Um rung novo só com um **bloco de operação** ligado direto no trilho:
   `%MD100 := %HSC0.VD`. (`%MD100` = `%MW100` + `%MW101` = holding registers
   100 e 101. Confira antes que `%MW100`/`%MW101` não são usados em outro
   lugar do programa.)
3. Recomendado: ligar um contato do **fim de curso de cima** na entrada `S`
   do `%HSC0` — assim o contador zera sozinho toda vez que o eixo encosta no
   topo, e a posição continua certa mesmo depois de desligar o CLP.
4. Transferir para o CLP, colocar em RUN e **desconectar o EcoStruxure** (o
   M221 só aceita uma conexão Modbus TCP por vez).

Se o `%HSC0` ficar em palavra simples, copie `%MW100 := %HSC0.V` e troque
`encoderZ.palavras` para `1` no node "Conectar ao CLP".

**No app (tela Novo Programa, painel CLP):** com "Controlar a máquina real"
marcado, encoste o eixo no fim de curso de cima e aperte **Marcar topo**;
depois no de baixo e aperte **Marcar base**. A partir daí o Z exibido, o
modelo 3D e os pontos salvos usam a posição real. Se o CLP for desligado e o
contador zerar fora do topo (sem o passo 3 acima), basta encostar no topo e
apertar **Marcar topo** de novo — a base é ajustada junto.

## 8. Visão computacional (gestos)

A página `new-program/camera.html` (celular, pelo GitHub Pages) e o
`Visao-computacional/Visao.py` (câmera do PC) publicam gestos no HiveMQ:

| Origem | Tópico | Mensagem |
|---|---|---|
| `camera.html` | `soldatech/maquina/comando` | `{ tipo: "GESTO_VISAO", gesto, origem, timestamp, idEvento }` |
| `Visao.py` | `soldatech/visao/gesto` | `{ tipo: "GESTO_VISAO", gesto }` |

No Node-RED:

- **START** (mão aberta) → liga `%M12` (mesa girando).
- **PAUSA** (punho fechado) → desliga `%M10`, `%M11` e `%M12` (para tudo).
- START que chegue com mais de 15 s de atraso é **ignorado** (a mesa não
  liga sozinha por causa de uma mensagem velha); PAUSA é sempre obedecido.
- A resposta (`resposta`/`erro`) volta com o mesmo `idEvento`, e a página da
  câmera mostra se o CLP confirmou ou por que não executou.
- `REGISTRAR_GESTO` (câmera dentro da simulação 3D) só é registrado, não
  aciona a máquina.

PAUSA por gesto **não** é parada de emergência — a emergência física
(`%I0.4`) continua sendo a garantia de segurança.

## Nota de segurança

Hoje o broker HiveMQ do app usa uma credencial fixa, visível em texto puro
no código do navegador (`src/config/mqtt.js`). Qualquer pessoa que
abrir o DevTools do navegador consegue ler usuário/senha e, em tese, publicar
mensagens em `soldatech/maquina/status` fingindo ser o CLP, ou mandar
comandos direto para o tópico de comando. Antes de ligar isso em uma máquina
com motores/indutor de verdade, recomendo:

1. Criar uma credencial **separada** para o Node-RED (feito acima).
2. Configurar ACLs no HiveMQ Cloud para que o usuário do navegador
   (`soldatech-web`) só possa **publicar** em `soldatech/maquina/comando` e
   **assinar** `status`/`resposta`/`erro` — nunca publicar nesses três
   últimos. Só o Node-RED deveria conseguir publicar `status`/`resposta`/
   `erro`.
