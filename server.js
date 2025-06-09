require('dotenv').config();
const express = require('express');
const http = require('http');
const { WebSocket: DGSocket } = require('ws');
const WebSocket = require('ws');

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
const PORT = process.env.PORT || 3000;

// ✅ 初始化 express
const app = express();
app.use(express.json());

// ✅ 提供一个基础 HTTP 路由（Render 用于端口探测）
app.get('/', (req, res) => {
  res.send('🎉 gaibang-backend 正在运行');
});

// ✅ 启动 HTTP + WS 服务
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (clientSocket) => {
  console.log('🧠 客户端已连接');

  const dgSocket = new DGSocket('wss://api.deepgram.com/v1/listen', {
    headers: {
      Authorization: `Token ${DEEPGRAM_API_KEY}`,
    },
  });

  dgSocket.on('open', () => {
    console.log('🎯 Deepgram WebSocket 连接成功');

    clientSocket.on('message', (audio) => {
      if (dgSocket.readyState === DGSocket.OPEN) {
        dgSocket.send(audio);
      }
    });
  });

  dgSocket.on('message', (msg) => {
    try {
      const data = JSON.parse(msg);
      const transcript = data.channel?.alternatives?.[0]?.transcript;
      if (transcript && transcript.length > 0) {
        clientSocket.send(JSON.stringify({ transcript }));
      }
    } catch (e) {
      console.error('解析 Deepgram 消息失败:', e);
    }
  });

  dgSocket.on('error', (err) => {
    console.error('❌ Deepgram 连接错误:', err);
    clientSocket.close();
  });

  clientSocket.on('close', () => {
    console.log('👋 客户端断开连接');
    dgSocket.close();
  });
});

server.listen(PORT, () => {
  console.log(`🚀 gaibang-backend 正在运行：http://localhost:${PORT}`);
});
