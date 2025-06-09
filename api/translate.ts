import type { IncomingMessage, ServerResponse } from 'http';
import fetch from 'node-fetch';

async function parseJsonBody(req: IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  const bodyStr = Buffer.concat(chunks).toString();
  return JSON.parse(bodyStr);
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  try {
    const { text, source = 'en', target = 'zh-CN' } = await parseJsonBody(req);

    if (!text || typeof text !== 'string') {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Missing or invalid text' }));
      return;
    }

    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${process.env.GOOGLE_TRANSLATE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: text,
          source,
          target,
          format: 'text',
        }),
      }
    );

    const data = await response.json() as {
  data?: {
    translations?: { translatedText: string }[];
  };
};

    const translation = data.data?.translations?.[0]?.translatedText;

    if (!translation) {
      throw new Error('Translation failed');
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ translation }));
  } catch (err) {
    console.error('[Google Translate error]', err);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Translation failed' }));
  }
}
