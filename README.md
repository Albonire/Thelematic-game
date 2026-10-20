# HADES·NET — Protocolo del Inframundo

**GameJam de Telemática** · Videojuego 2D isométrico hecho con **Phaser 3** y controlado con el cuerpo mediante **MediaPipe Pose Landmarker**. Inspirado en *Hades II* (Supergiant Games): Melinoë desciende por tres regiones del Inframundo, elige bendiciones olímpicas, esquiva telegrafías magenta y derrota a los guardianes de cada región.

## Regiones (como en Hades II: Erebo → Océano → Campos de Lamento)

| Región | Salas | Ambiente | Peligro propio | Guardián |
|--------|-------|----------|----------------|----------|
| **Erebo** | 1-2 | Bosque de piedra, Sello de Bruja tallado, árboles como obstáculos, sarcófagos y setas | — (región de aprendizaje) | — |
| **Océano** | 3-5 | Cubierta del navío fantasma, pilares con tentáculos, barriles y oro | **Respiraderos de vapor** que estallan cíclicamente (dañan a todos) | **Capitán Náufrago** (ancla, lluvia de lanzas, marea) |
| **Campos de Lamento** | 6-8 | Praderas de asfódelos, lápidas, árboles muertos, espinos | **Miasma** errante que frena y drena Magia | **Fantasma del Lamento** (se teletransporta, guadaña, invoca urnas) |

Cada sala tiene un trazado distinto (obstáculos, atrezo y peligros definidos en `LAYOUTS`), y el suelo, las paredes, las puertas y las partículas ambientales se generan por bioma.

**Enemigos:** Sombra (embestida), Lamentador (carga espectral), Lancero (lanza a distancia), Arquero (abanico de tres flechas), Caparazón (armazón con Firewall), Lamia (hostigamiento a distancia), Urna de almas (explota al acercarse o al romperse), Marinero ahogado (ancla, con Firewall) y los dos guardianes. Las salas contienen vasijas rompibles que dejan Salud o Magia.

## Concepto de Telemática como regla del juego

Cada enemigo es un **paquete** del Inframundo. El combate replica el *Combination Attack* de Hades II con el **saludo de tres vías de TCP**:

| Paso | Habilidad | Qué hace |
|------|-----------|----------|
| **SYN** | Ataque (combo de bastón) | Abre la conexión con el enemigo |
| **SYN-ACK** | Especial (dardo lunar) | Solo avanza si ya hay SYN |
| **ACK** | Conjuro (Círculo de Hécate) | Cierra el handshake → **ESTABLISHED** |

* **ESTABLISHED** → daño ×3 + extra, rompe el **Firewall** (barra cian) y explota en cadena sobre los vecinos.
* **RST** → lanzar el Conjuro con solo SYN reinicia la conexión.
* **TTL** → la barrita bajo los puntos del enemigo (4 s). Si expira, el handshake se pierde (Hermes lo alarga).
* **Firewall** → Marineros ahogados y los guardianes llevan armadura; solo un ESTABLISHED la rompe de golpe.
* **Ω Omega** → suelta rápido para la versión normal; mantén pulsado Ataque (golpe lunar en área), Especial (luna perforante) o Conjuro (el círculo estalla). Cuestan Magia y te frenan mientras cargas, como en Hades II.
* Los puntos sobre cada enemigo (azul / dorado / verde) muestran el estado del handshake en tiempo real.

Además la práctica de red: los **gestos viajan por WebSocket (TCP)** entre dos portátiles y se mide la **latencia (RTT), jitter y pérdida** con ACKs por paquete, con exportación a CSV y captura en Wireshark.

## Ejecutar

Requisitos: Node.js ≥ 18.

```bash
npm install
npm run dev          # desarrollo → http://localhost:5173
npm run build        # genera dist/
npm run preview      # sirve dist/ en local
```

> La cámara necesita un contexto seguro: usa `http://localhost:…` (o HTTPS). MediaPipe (WASM + modelo `pose_landmarker_lite.task`) viene incluido en `public/` y funciona sin Internet; si faltara, se descarga del CDN automáticamente.

## Controles (todos funcionan a la vez)

| Acción | Teclado / ratón | Mando | Cuerpo (cámara) |
|--------|-----------------|-------|-----------------|
| Mover | WASD / flechas | Stick izq. | Inclinarte a los lados / acercarte-alejarte |
| SYN · Ataque (mantener = Ω) | J · clic izq. | X / RT | Mano derecha sobre el hombro, o golpe de brazo rápido |
| SYN-ACK · Especial (mantener = Ω) | K · clic der. | Y / RB | Mano izquierda sobre el hombro |
| ACK · Conjuro | L / Q | B / LT | Ambas manos arriba (mantener = **Ω Omega**) |
| Esquiva (Blink) | Espacio | A | Agacharte o saltar |
| Sprint | Shift | LB | Inclinación extrema |
| Apuntar | Ratón | Stick der. | Auto-puntería al enemigo más cercano |
| Panel / pausa | Esc · P | Start | — |

Procesado de landmarks (`src/game/pose.ts`): imagen en espejo, suavizado exponencial, **calibración** de la postura neutra (~1,6 s, tecla `C`), zona muerta, umbrales con histéresis y detección de golpes por velocidad de la muñeca. Todos los umbrales se ajustan en el panel *Cuerpo · cámara* mientras se ve la medición en vivo.

## Transmitir gestos entre dos portátiles

1. En un equipo: `node server/relay.mjs` (puerto 8080; muestra su IP en la red local).
2. En **cada** portátil abre el juego en su propio `localhost` (la cámara exige contexto seguro) → `Esc` → pestaña **Red · latencia**.
3. Escribe la misma URL del relay (`ws://IP:8080`) y la misma sala → *Conectar*.
4. El equipo con cámara marca **Enviar mis gestos**; el otro marca **Recibir gestos remotos** y su Melinoë obedece.

Protocolo (JSON sobre WebSocket): `hello` → `welcome`; `in {seq, ts, s}` (gestos a 30 Hz) → el receptor responde `ack {seq, ts}` → el emisor calcula **RTT = ahora − ts**. `ping/pong` mide además el RTT contra el relay. Se muestran RTT actual/promedio/mín/máx, jitter, pérdida (ACK que no llegan en 1,5 s) y gráfica; el slider **Latencia artificial** añade retardo al enviar para el análisis; **Descargar CSV** exporta `t_ms, seq, rtt_ms, oneway_est_ms, extra_delay_ms`.

Wireshark: captura en tu interfaz y filtra `tcp.port == 8080` o `websocket` (verás el handshake TCP, el *101 Switching Protocols* y las tramas `in`/`ack`/`ping`).

## Estructura

```
server/relay.mjs          Relay WebSocket por salas + ping/pong
src/App.tsx               Título, atajos y paneles (React + Tailwind)
src/ui/                   Panel (reglas, cuerpo, red) y ventana de cámara
src/game/
  config.ts               Proyección isométrica 2:1 (mundo ↔ pantalla)
  art_env.ts art_chars.ts Arte 100 % procedural (suelo, muros, puertas, personajes…)
  audio.ts                Sonido sintetizado con WebAudio
  input.ts pose.ts net.ts Entrada unificada · MediaPipe · WebSocket/latencia
  state.ts                Estado de la partida y catálogo de bendiciones
  scenes/                 Boot, Game (combate, IA, jefe) y UI (HUD)
public/mediapipe, models  WASM y modelo de MediaPipe (uso sin conexión)
```
