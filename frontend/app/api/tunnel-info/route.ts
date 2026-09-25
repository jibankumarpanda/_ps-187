import { NextResponse } from 'next/server';
import os from 'os';
import fs from 'fs';
import path from 'path';

// Helper to get local LAN IPv4 address
function getLocalIP(): string {
  const interfaces = os.networkInterfaces();
  const candidates: string[] = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        // Exclude link-local (169.254.x.x)
        if (!iface.address.startsWith('169.254.')) {
          candidates.push(iface.address);
        }
      }
    }
  }

  // Prefer 192.168.x.x or 10.x.x.x or 172.16-31.x.x
  const privateIP = candidates.find(
    (ip) =>
      ip.startsWith('192.168.') ||
      ip.startsWith('10.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)
  );

  return privateIP || candidates[0] || '127.0.0.1';
}

// Helper to find active tunnel file
function getTunnelFile(): string {
  const possiblePaths = [
    path.join(process.cwd(), '.tunnel.json'),
    path.join(process.cwd(), 'frontend', '.tunnel.json'),
    '/Applications/Development/_ps-187/frontend/.tunnel.json',
    '/Applications/Development/_ps-187/.tunnel.json',
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        const data = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (data.tunnelUrl && typeof data.tunnelUrl === 'string') {
          return data.tunnelUrl;
        }
      } catch {}
    }
  }
  return '';
}

// Helper to query cloudflared metrics server on local ports
async function findActiveTunnelUrl(): Promise<string> {
  // 1. Check shared tunnel file
  const cached = getTunnelFile();
  if (cached) return cached;

  // 2. Query cloudflared metrics endpoints (default or common ports)
  const metricPorts = [20241, 20242, 20243, 20240, 20244];
  for (const port of metricPorts) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600);
      const res = await fetch(`http://127.0.0.1:${port}/metrics`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const text = await res.text();
        const match = text.match(/userHostname="([^"]+trycloudflare\.com)"/);
        if (match && match[1]) {
          const url = match[1].startsWith('http') ? match[1] : `https://${match[1]}`;
          try {
            fs.writeFileSync(
              path.join(process.cwd(), '.tunnel.json'),
              JSON.stringify({ tunnelUrl: url, updatedAt: Date.now() })
            );
          } catch {}
          return url;
        }
      }
    } catch {}
  }

  return '';
}

export async function GET() {
  const localIP = getLocalIP();
  const port = process.env.PORT || '3000';
  const tunnelUrl = await findActiveTunnelUrl();

  const mobileStreamUrl = tunnelUrl
    ? `${tunnelUrl}/cameras/mobile/stream`
    : `http://${localIP}:${port}/cameras/mobile/stream`;

  const localStreamUrl = `http://${localIP}:${port}/cameras/mobile/stream`;

  return NextResponse.json(
    {
      tunnelUrl: tunnelUrl || '',
      mobileStreamUrl,
      localStreamUrl,
      localIP,
      activeDevice: null,
      hasActivePhone: false,
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}
