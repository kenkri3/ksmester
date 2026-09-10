import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'shortcut';

  // 1. iOS Configuration Profile (.mobileconfig WebClip)
  if (type === 'ios') {
    let iconBase64 = '';
    try {
      const iconPath = path.join(process.cwd(), 'public', 'apple-touch-icon.png');
      if (fs.existsSync(iconPath)) {
        iconBase64 = fs.readFileSync(iconPath).toString('base64');
      }
    } catch {
      // fallback if file read fails
    }

    const mobileConfigXml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>PayloadContent</key>
    <array>
        <dict>
            <key>FullScreen</key>
            <true/>
            ${iconBase64 ? `<key>Icon</key><data>${iconBase64}</data>` : ''}
            <key>IsRemovable</key>
            <true/>
            <key>Label</key>
            <string>VikingMester</string>
            <key>PayloadDescription</key>
            <string>VikingMester Snarvei</string>
            <key>PayloadDisplayName</key>
            <string>VikingMester</string>
            <key>PayloadIdentifier</key>
            <string>no.vikingmester.webclip</string>
            <key>PayloadType</key>
            <string>com.apple.webClip.managed</string>
            <key>PayloadUUID</key>
            <string>c1a2b3c4-d5e6-4789-80ab-cdef12345678</string>
            <key>PayloadVersion</key>
            <integer>1</integer>
            <key>Precomposed</key>
            <true/>
            <key>URL</key>
            <string>https://vikingmester.no?source=ios_profile</string>
        </dict>
    </array>
    <key>PayloadDisplayName</key>
    <string>VikingMester App</string>
    <key>PayloadIdentifier</key>
    <string>no.vikingmester.profile</string>
    <key>PayloadOrganization</key>
    <string>Vikingnet (AIChat Norge AS)</string>
    <key>PayloadRemovalDisallowed</key>
    <false/>
    <key>PayloadType</key>
    <string>Configuration</string>
    <key>PayloadUUID</key>
    <string>d2e3f4a5-b6c7-4890-91bc-def234567890</string>
    <key>PayloadVersion</key>
    <integer>1</integer>
</dict>
</plist>`;

    return new Response(mobileConfigXml, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-apple-aspen-config; charset=utf-8',
        'Content-Disposition': 'attachment; filename="VikingMester.mobileconfig"',
        'Cache-Control': 'no-cache',
      },
    });
  }

  // 2. Windows Internet Shortcut (.url)
  if (type === 'windows') {
    const urlContent = `[InternetShortcut]\r\nURL=https://vikingmester.no?source=desktop\r\nIconIndex=0\r\nIconFile=https://vikingmester.no/favicon.ico\r\n`;
    return new Response(urlContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/internet-shortcut; charset=utf-8',
        'Content-Disposition': 'attachment; filename="VikingMester.url"',
        'Cache-Control': 'no-cache',
      },
    });
  }

  // 3. Universal / Android / Desktop HTML Launcher (.html)
  const htmlLauncher = `<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="VikingMester">
  <meta name="theme-color" content="#0A192F">
  <title>VikingMester</title>
  <link rel="icon" href="https://vikingmester.no/icon-192.png">
  <link rel="apple-touch-icon" href="https://vikingmester.no/apple-touch-icon.png">
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0A192F;
      color: #fff;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 24px;
      text-align: center;
    }
    .card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 28px;
      padding: 40px 28px;
      max-width: 400px;
      width: 100%;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    .logo {
      font-size: 32px;
      font-weight: 900;
      letter-spacing: -0.5px;
      margin-bottom: 8px;
    }
    .logo span {
      color: #9D00FF;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      background: rgba(157, 0, 255, 0.15);
      color: #c084fc;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      margin-bottom: 16px;
      border: 1px solid rgba(157, 0, 255, 0.3);
    }
    p {
      color: #94a3b8;
      font-size: 14px;
      line-height: 1.5;
      margin: 0 0 24px 0;
    }
    .btn {
      display: block;
      width: 100%;
      padding: 16px;
      background: linear-gradient(135deg, #9D00FF, #7A00CC);
      color: #fff;
      text-decoration: none;
      border-radius: 16px;
      font-weight: 800;
      font-size: 14px;
      box-shadow: 0 10px 25px -5px rgba(157, 0, 255, 0.4);
      transition: transform 0.15s ease;
    }
    .btn:active { transform: scale(0.97); }
    .spinner {
      width: 24px;
      height: 24px;
      border: 3px solid rgba(255,255,255,0.2);
      border-top-color: #9D00FF;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 16px auto 0;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
  <script>
    // Automatic immediate redirect
    window.location.replace("https://vikingmester.no?source=shortcut");
  </script>
</head>
<body>
  <div class="card">
    <div class="badge">VikingMester PRO</div>
    <div class="logo">Viking<span>Mester</span></div>
    <p>Åpner Norges ledende autonome KS- og HMS-system for byggeplassen...</p>
    <a class="btn" href="https://vikingmester.no?source=shortcut">Åpne VikingMester nå &rarr;</a>
    <div class="spinner"></div>
  </div>
</body>
</html>`;

  return new Response(htmlLauncher, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': 'attachment; filename="VikingMester-Snarvei.html"',
      'Cache-Control': 'no-cache',
    },
  });
}
