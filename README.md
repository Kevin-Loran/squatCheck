# SquatCheck 🏋️

Analisador de agachamento em tempo real via câmera no navegador.

## Stack

- React 18 + Vite
- MediaPipe Tasks Vision (Dia 2)
- Canvas 2D API para overlay
- Deploy no Vercel (HTTPS automático)

## Rodando localmente

```bash
npm install
npm run dev
```

> ⚠️ A câmera no Chrome/Safari desktop pode pedir permissão por HTTP também.
> Em celular, é necessário HTTPS — use o link do Vercel após o deploy.

## Deploy (Vercel)

```bash
# Instale a CLI do Vercel
npm i -g vercel

# Deploy direto
vercel

# Ou conecte o repositório no vercel.com para deploy automático via git push
```

O `vercel.json` já configura os headers COEP/COOP necessários para o SharedArrayBuffer
que o MediaPipe WASM usa.

## Estrutura do projeto

```
src/
├── hooks/
│   ├── useCamera.js    # getUserMedia, permissões, flip de câmera
│   └── useCanvas.js    # canvas overlay, drawSkeleton, drawAngle
├── components/
│   ├── CameraView.jsx  # vídeo + canvas + guia de posicionamento
│   ├── FeedbackPanel.jsx # overlay de feedback em tempo real
│   └── StartScreen.jsx # tela de permissão e instruções
└── App.jsx             # orquestrador principal
```

## Próximas etapas (Dia 2)

- Instalar `@mediapipe/tasks-vision`
- Criar `usePoseLandmarker` hook
- Integrar com `useCanvas.drawSkeleton`
- Testar no celular real

## Ângulos de câmera suportados

**Lateral (recomendado):** detecta profundidade do agachamento e inclinação do tronco

**Frontal (futuro):** detecta joelhos em valgo (fechando para dentro)
