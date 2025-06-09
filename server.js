require('dotenv').config();
const WebSocket = require('ws');
const { WebSocket: DGSocket } = require('ws');
const http = require('http');

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
const PORT = process.env.PORT || 3000;

const server = http.createServer();
const wss = new WebSocket.Server({ server });

wss.on('connection', (clientSocket) => {
  console.log('🧠 客户端已连接');

  // 初始化 Deepgram 连接
  const dgSocket = new DGSocket('wss://api.deepgram.com/v1/listen', {
    headers: {
      Authorization: `Token ${DEEPGRAM_API_KEY}`,
    },
  });

  dgSocket.on('open', () => {
    console.log('🎯 Deepgram WebSocket 连接成功');

    // 从客户端收到音频 → 转发给 Deepgram
    clientSocket.on('message', (audio) => {
      if (dgSocket.readyState === DGSocket.OPEN) {
        dgSocket.send(audio);
      }
    });
  });

  // Deepgram 返回识别结果 → 转发给客户端
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
  console.log(`🚀 gaibang-backend 正在运行：ws://localhost:${PORT}`);
});
