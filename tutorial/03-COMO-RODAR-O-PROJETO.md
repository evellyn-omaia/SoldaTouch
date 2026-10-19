# Como rodar o projeto (comandos do terminal)

O site fica hospedado no **GitHub Pages** e conversa com a máquina pela
nuvem (**HiveMQ Cloud**). No PC que está na mesma rede do CLP só precisa
rodar **uma coisa**: o **Node-RED**, que é a ponte entre a nuvem e o CLP.

```
Celular / PC (site no GitHub Pages)
        │  MQTT seguro (wss)
        ▼
HiveMQ Cloud
        │  MQTT seguro (mqtts)
        ▼
Node-RED (este PC, na rede do CLP)
        │  Modbus TCP
        ▼
CLP M221  →  motores / mesa
```

Precisa de **internet** neste PC (pro Node-RED alcançar o HiveMQ) e
**rede local com o CLP**.

---

## Terminal — Node-RED

```
node-red -p 1882
```

(Não precisa `cd` — o flow e a senha do HiveMQ já ficam guardados na
pasta de usuário do Node-RED, `%USERPROFILE%\.node-red`. A porta 1882
é só a do editor; usamos 1882 porque neste PC a 1880 está ocupada por
outro usuário do Windows. Se ela estiver livre, `node-red` também serve.)

Deixe a janela aberta — fechar derruba a ponte com a máquina.

Sinal de que deu certo (uns 15-20 segundos):

```
Server now running at http://127.0.0.1:1882/
[mqtt-broker:SoldaTech HiveMQ Cloud] Connected to broker: mqtts://...hivemq.cloud:8883
[function:Conectar ao CLP (on start) - AJUSTAR] Conectado ao CLP via Modbus TCP em 10.200.7.154:502
```

Se aparecer "Falha ao conectar ao CLP", o CLP não está na rede (desligado,
cabo, ou IP diferente de `10.200.7.154`). Não precisa reiniciar nada: o
Node-RED tenta de novo a cada 3 segundos e conecta sozinho quando o CLP
aparecer.

---

## Usar

- **Site**: o link do GitHub Pages do repositório (pasta raiz → `index.html`).
- **Controle por gestos (câmera)**: entre na conta → **Iniciar Produção** →
  escolha o programa e a quantidade → **Controlar por gestos (câmera)** →
  **Ativar câmera**.
  - **Mão aberta** (START): gira a mesa.
  - **Punho fechado** (PAUSA): para a mesa e o eixo Z.
  - Se a câmera fechar (sair da página, bloquear a tela), a máquina para.
  - A página mostra quando o CLP **confirmou** o gesto, ou o motivo de não
    ter executado (ex.: CLP desligado).
- **Novo Programa**: jog, salvar pontos e encoder, como antes (marque
  "Controlar a máquina real").

## Para parar

Clique na janela do Node-RED e aperte `Ctrl+C`.

## Rodar o site localmente (opcional)

Só se quiser testar mudanças antes de subir pro GitHub:

```
cd C:\Users\Aluno\Documents\SoldaTouch
python -m http.server 5500
```

e abra `http://localhost:5500/index.html`. (No celular a câmera só
funciona por HTTPS, então pelo celular use o link do GitHub Pages.)

## Se for rodar pela primeira vez num PC novo

Siga o `node-red/README.md` (instalar o Node-RED, o pacote Modbus e
colocar usuário/senha do HiveMQ na configuração do broker no editor).
