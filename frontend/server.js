const http = require('http');
const { parse } = require('url');
const next = require('next');
const { WebSocketServer, WebSocket } = require('ws');
const { spawn } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Store active tunnel URL and connected devices state
let activeTunnelUrl = '';
let activeMobileDevice = null;
const receivers = new Set();
const senders = new Map(); // ws -> deviceInfo

function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push({ name, address: iface.address });
      }
    }
  }
  return ips;
}

let activeTunnelProcess = null;
let restartTimer = null;

// Start Cloudflare Tunnel
function startCloudflareTunnel() {
  if (activeTunnelProcess) {
    try {
      activeTunnelProcess.kill('SIGTERM');
    } catch {}
    activeTunnelProcess = null;
  }

  activeTunnelUrl = '';
  try {
    console.log('[Tunnel] Starting Cloudflare Quick Tunnel for mobile access...');
    const cloudflaredBin = fs.existsSync('/opt/homebrew/bin/cloudflared')
      ? '/opt/homebrew/bin/cloudflared'
      : fs.existsSync('/usr/local/bin/cloudflared')
      ? '/usr/local/bin/cloudflared'
      : 'cloudflared';

    const tunnel = spawn(cloudflaredBin, ['tunnel', '--url', `http://127.0.0.1:${port}`]);
    activeTunnelProcess = tunnel;

    const handleOutput = (data) => {
      const text = data.toString();
      const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
      if (match && match[0] !== activeTunnelUrl) {
        activeTunnelUrl = match[0];
        try {
          fs.writeFileSync(
            path.join(__dirname, '.tunnel.json'),
            JSON.stringify({ tunnelUrl: activeTunnelUrl, updatedAt: Date.now() })
          );
        } catch {}
        printBanner();
      }
    };

    tunnel.stdout.on('data', handleOutput);
    tunnel.stderr.on('data', handleOutput);

    tunnel.on('close', (code) => {
      console.log(`[Tunnel] Cloudflare tunnel closed with code ${code}`);
      activeTunnelProcess = null;
      activeTunnelUrl = '';
      clearTimeout(restartTimer);
      restartTimer = setTimeout(() => {
        console.log('[Tunnel] Auto-reconnecting tunnel...');
        startCloudflareTunnel();
      }, 2500);
    });

    process.on('exit', () => {
      if (activeTunnelProcess) activeTunnelProcess.kill();
    });
  } catch (err) {
    console.warn('[Tunnel] Could not launch cloudflared automatically:', err.message);
  }
}

function printBanner() {
  const localIPs = getLocalIPs();
  const mobileLink = activeTunnelUrl
    ? `${activeTunnelUrl}/cameras/mobile/stream`
    : `http://${localIPs[0]?.address || 'localhost'}:${port}/cameras/mobile/stream`;

  console.log('\n');
  console.log('  ╔══════════════════════════════════════════════════════════════════╗');
  console.log('  ║             📱 IBVAP MOBILE CCTV TRANSMITTER SYSTEM             ║');
  console.log('  ╠══════════════════════════════════════════════════════════════════╣');
  console.log(`  ║  💻 Local Dashboard:  http://localhost:${port}/cameras/mobile           ║`);
  if (activeTunnelUrl) {
    console.log('  ║                                                                  ║');
    console.log('  ║  ✨ PUBLIC SECURE HTTPS LINK (TAP ON YOUR PHONE):                ║');
    console.log(`  ║  👉 ${mobileLink.padEnd(59)}║`);
    console.log('  ║                                                                  ║');
    console.log('  ║  ✅ Valid Cloudflare SSL: 100% Trusted on iOS Safari & Android    ║');
    console.log('  ║  ✅ Camera permission will work immediately (no SSL warnings)    ║');
    console.log('  ║  ✅ Works on Wi-Fi, Mobile Data (4G/5G), and Hotspot             ║');
  } else {
    console.log('  ║  ⏳ Initializing Cloudflare tunnel for direct mobile link...     ║');
  }
  console.log('  ╚══════════════════════════════════════════════════════════════════╝');
  console.log('\n');
}

app.prepare().then(() => {
  const server = http.createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      const { pathname } = parsedUrl;

      // API: Return tunnel info for frontend QR code and link generator
      if (pathname === '/api/tunnel-info') {
        const query = parsedUrl.query || {};
        if (query.refresh === 'true' || query.restart === 'true') {
          startCloudflareTunnel();
          await new Promise((resolve) => setTimeout(resolve, 2500));
        }

        let currentTunnel = '';
        try {
          const cache = JSON.parse(fs.readFileSync(path.join(__dirname, '.tunnel.json'), 'utf8'));
          if (cache.tunnelUrl) currentTunnel = cache.tunnelUrl;
        } catch {}
        if (!currentTunnel) currentTunnel = activeTunnelUrl;

        const localIPs = getLocalIPs();
        const primaryLocalIP = localIPs[0]?.address || 'localhost';
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end(
          JSON.stringify({
            tunnelUrl: currentTunnel,
            mobileStreamUrl: currentTunnel
              ? `${currentTunnel}/cameras/mobile/stream`
              : `http://${primaryLocalIP}:${port}/cameras/mobile/stream`,
            localStreamUrl: `http://${primaryLocalIP}:${port}/cameras/mobile/stream`,
            localIP: primaryLocalIP,
            activeDevice: senders.size > 0 ? Array.from(senders.values())[0] : null,
            activeDevices: Array.from(senders.values()),
            hasActivePhone: senders.size > 0,
            deviceCount: senders.size,
          })
        );
        return;
      }

      // API: Proxy camera frame to Python ML service (YOLOv11 Inference)
      if (pathname === '/api/ml/analyze-frame') {
        const cameraId = parsedUrl.query?.camera_id || 'CAM_04';
        const mlReq = http.request(
          `http://127.0.0.1:8000/analyze/frame?camera_id=${encodeURIComponent(cameraId)}`,
          {
            method: 'POST',
            headers: req.headers,
          },
          (mlRes) => {
            res.writeHead(mlRes.statusCode, mlRes.headers);
            mlRes.pipe(res);
          }
        );
        mlReq.on('error', (e) => {
          res.writeHead(503, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ error: 'ML Service offline', detail: e.message }));
        });
        req.pipe(mlReq);
        return;
      }

      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  // WebSocket Server for real-time mobile camera frame relay & signaling
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const parsedUrl = parse(req.url);
    if (parsedUrl.pathname === '/api/camera-stream') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws, req) => {
    let clientRole = 'unknown';

    ws.on('message', (message, isBinary) => {
      // Binary frame from mobile camera -> relay to all desktop receivers
      if (isBinary) {
        const senderInfo = senders.get(ws);
        const senderId = ws.senderId || (senderInfo ? senderInfo.id : 'CAM_MOB_01');
        const idBuf = Buffer.from(senderId, 'utf8');
        
        // Frame format for multiCam receivers: [1 byte: idLength][idLength bytes: senderId UTF-8][JPEG Payload]
        const header = Buffer.alloc(1 + idBuf.length);
        header.writeUInt8(idBuf.length, 0);
        idBuf.copy(header, 1);
        const taggedMessage = Buffer.concat([header, message]);

        for (const receiver of receivers) {
          if (receiver.readyState === WebSocket.OPEN) {
            // Drop frame if receiver is backed up to eliminate latency lag
            if (receiver.bufferedAmount > 0) continue;
            if (receiver.isMultiCam) {
              receiver.send(taggedMessage, { binary: true });
            } else {
              receiver.send(message, { binary: true });
            }
          }
        }
        return;
      }

      // JSON control message
      try {
        const data = JSON.parse(message.toString());

        if (data.type === 'register') {
          clientRole = data.role; // 'sender' (phone) or 'receiver' (laptop)

          if (clientRole === 'sender') {
            const rawId = data.deviceId || data.device?.id;
            const assignedId = rawId || `CAM_MOB_${String(senders.size + 1).padStart(2, '0')}`;
            ws.senderId = assignedId;

            const deviceInfo = {
              id: assignedId,
              name: data.device?.name || `Mobile Unit ${senders.size + 1}`,
              type: data.device?.type || 'iphone',
              battery: data.device?.battery ?? 100,
              resolution: data.device?.resolution || '1280x720',
              facingMode: data.device?.facingMode || 'environment',
              connectedAt: new Date().toISOString(),
            };

            senders.set(ws, deviceInfo);
            activeMobileDevice = deviceInfo;

            console.log(`[Stream] 📱 Mobile Camera Connected: ${deviceInfo.name} (${deviceInfo.id}) [Total: ${senders.size}]`);

            // Broadcast to all desktop receivers that a mobile camera connected
            const alertMsg = JSON.stringify({
              type: 'mobile_connected',
              deviceId: assignedId,
              device: deviceInfo,
              devices: Array.from(senders.values()),
            });
            for (const r of receivers) {
              if (r.readyState === WebSocket.OPEN) r.send(alertMsg);
            }
          } else if (clientRole === 'receiver') {
            ws.isMultiCam = !!data.multiCam;
            receivers.add(ws);
            // Inform receiver about current mobile streams
            ws.send(
              JSON.stringify({
                type: 'status',
                hasMobileSender: senders.size > 0,
                devices: Array.from(senders.values()),
                device: senders.size > 0 ? Array.from(senders.values())[0] : null,
              })
            );
          }
        } else if (data.type === 'telemetry') {
          // Update device battery / resolution / status
          const dev = senders.get(ws);
          if (dev) {
            if (data.device) {
              Object.assign(dev, data.device);
            }
            const telMsg = JSON.stringify({
              type: 'telemetry',
              deviceId: dev.id,
              device: dev,
              devices: Array.from(senders.values()),
            });
            for (const r of receivers) {
              if (r.readyState === WebSocket.OPEN) {
                r.send(telMsg);
              }
            }
          }
        } else if (data.type === 'signal') {
          // WebRTC signaling relay between phone and laptop
          const targets = clientRole === 'sender' ? receivers : senders.keys();
          for (const target of targets) {
            if (target.readyState === WebSocket.OPEN) {
              target.send(JSON.stringify({ type: 'signal', data: data.data }));
            }
          }
        }
      } catch (err) {
        console.error('[Stream] Message parse error:', err);
      }
    });

    ws.on('close', () => {
      if (clientRole === 'sender') {
        const removed = senders.get(ws);
        senders.delete(ws);
        activeMobileDevice = senders.size > 0 ? Array.from(senders.values())[0] : null;

        if (removed) {
          console.log(`[Stream] 📱 Mobile Camera Disconnected: ${removed.name} (${removed.id}) [Remaining: ${senders.size}]`);
          const disconnectMsg = JSON.stringify({
            type: 'mobile_disconnected',
            deviceId: removed.id,
            devices: Array.from(senders.values()),
          });
          for (const r of receivers) {
            if (r.readyState === WebSocket.OPEN) r.send(disconnectMsg);
          }
        }
      } else if (clientRole === 'receiver') {
        receivers.delete(ws);
      }
    });
  });

  server.listen(port, () => {
    printBanner();
    startCloudflareTunnel();
  });
});
