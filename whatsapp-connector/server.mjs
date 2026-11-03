import http from 'node:http';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import pino from 'pino';

const PORT = process.env.PORT || 3001;

let sock = null;
let isConnected = false;
let currentQrDataUrl = null;

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('./baileys_auth');

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    logger: pino({ level: 'silent' }),
    browser: ['PrimeCell Loja', 'Chrome', '1.0.0'],
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      currentQrDataUrl = await QRCode.toDataURL(qr);
      console.log(
        '[WhatsApp Conector] Novo QR Code gerado! Abra a tela de Cobranças no sistema para escanear.'
      );
    }

    if (connection === 'close') {
      isConnected = false;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(
        '[WhatsApp Conector] Conexão encerrada. Reconectando:',
        shouldReconnect
      );
      if (shouldReconnect) {
        setTimeout(connectToWhatsApp, 3000);
      }
    } else if (connection === 'open') {
      isConnected = true;
      currentQrDataUrl = null;
      console.log(
        '✅ [WhatsApp Conector] WhatsApp da Loja conectado e pronto em http://localhost:' +
          PORT
      );
    }
  });
}

connectToWhatsApp().catch((err) =>
  console.error('Erro ao iniciar conector WhatsApp:', err)
);

const server = http.createServer(async (req, res) => {
  // Permite que o painel hospedado na Vercel acesse o localhost:3001 do PC da loja
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        ok: true,
        connected: isConnected,
        qrDataUrl: currentQrDataUrl,
      })
    );
    return;
  }

  if (req.method === 'POST' && req.url === '/send') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        const { phone, message } = JSON.parse(body);
        if (!sock || !isConnected) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              ok: false,
              error: 'WhatsApp ainda não pareado no conector local.',
            })
          );
          return;
        }

        const digits = String(phone).replace(/\D/g, '');
        const jid = `${digits}@s.whatsapp.net`;

        // Simula "digitando..." por 1.5s antes de enviar para humanizar ainda mais
        await sock.sendPresenceUpdate('composing', jid);
        await new Promise((r) => setTimeout(r, 1500));
        await sock.sendPresenceUpdate('paused', jid);

        await sock.sendMessage(jid, { text: message });

        console.log(`[Disparo Cadenciado] Mensagem enviada para ${digits}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, to: digits }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            ok: false,
            error: err instanceof Error ? err.message : 'Erro no envio',
          })
        );
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Rota não encontrada' }));
});

server.listen(PORT, () => {
  console.log(
    `🚀 Conector Local WhatsApp da Loja rodando em http://localhost:${PORT}`
  );
});
