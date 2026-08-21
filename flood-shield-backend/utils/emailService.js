const nodemailer = require('nodemailer');

/**
 * Creates a Nodemailer transporter using Gmail SMTP.
 * Credentials come from environment variables:
 *   GMAIL_USER         — your Gmail address
 *   GMAIL_APP_PASSWORD — 16-char App Password from Google Account → Security
 */
const createTransporter = () => {
  const user = (process.env.GMAIL_USER || '').trim();
  const pass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass },
    connectionTimeout: 12000,
    greetingTimeout: 12000,
    socketTimeout: 20000
  });
};

/**
 * Sends an NGO Representative invite email.
 * @param {Object} opts
 * @param {string} opts.toEmail          - Recipient email address
 * @param {string} opts.toName           - Representative's name
 * @param {string} opts.inviteToken      - Generated invite token
 * @param {string} opts.campaignName     - Name of the assigned campaign (or empty for logistics)
 * @param {string} opts.assignedHub      - Name of the assigned logistics hub (or empty for campaign)
 * @param {string} opts.ngoName          - Name of the sending NGO
 * @param {string} opts.registrationUrl  - Full URL to the registration page
 * @param {string} [opts.inviteType]     - 'campaign' (default) or 'logistics'
 */
const sendNGOInviteEmail = async ({ toEmail, toName, inviteToken, campaignName, assignedHub, ngoName, registrationUrl, inviteType }) => {
  const transporter = createTransporter();

  // Determine theme based on invite type (auto-detect from token prefix NR-HUB-)
  const isLogistics = inviteType === 'logistics' || (inviteToken || '').startsWith('NR-HUB-');

  const accentColor  = isLogistics ? '#3b82f6' : '#34d399';
  const accentLight  = isLogistics ? '#93c5fd' : '#6ee7b7';
  const headerBg1    = isLogistics ? '#1e3a5f' : '#064e3b';
  const headerBg2    = isLogistics ? '#1d4ed8' : '#065f46';
  const stepNumBg    = isLogistics ? '#3b82f6' : '#34d399';
  const stepNumColor = isLogistics ? '#ffffff'  : '#0f172a';
  const badgeBg      = isLogistics ? '#1e3a5f' : '#064e3b';
  const ctaBg        = isLogistics ? '#3b82f6' : '#34d399';
  const ctaColor     = isLogistics ? '#ffffff'  : '#0f172a';

  const subtitle      = isLogistics ? 'NGO Logistics Hub Representative Invitation' : 'NGO Campaign Representative Invitation';
  const assignedLabel = isLogistics ? (assignedHub || 'Assigned Logistics Hub') : (campaignName || 'Assigned Campaign');
  const badgeIcon     = isLogistics ? '🏭' : '📍';
  const roleDisplay   = isLogistics ? 'Logistics Hub Representative' : 'Campaign Representative';
  const roleLabel     = roleDisplay;
  const subjectLine   = isLogistics
    ? `🌊 You've been invited as a Logistics Hub Rep — Token: ${inviteToken}`
    : `🌊 You've been invited as an NGO Campaign Rep — Token: ${inviteToken}`;

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #0f172a; margin: 0; padding: 0; color: #e2e8f0; }
    .wrapper { max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 16px; overflow: hidden; }
    .header { background: linear-gradient(135deg, ${headerBg1}, ${headerBg2}); padding: 32px 40px; text-align: center; }
    .header h1 { color: ${accentColor}; font-size: 22px; margin: 0 0 6px; letter-spacing: -0.5px; }
    .header p { color: ${accentLight}; font-size: 13px; margin: 0; }
    .body { padding: 36px 40px; }
    .greeting { font-size: 16px; color: #cbd5e1; margin-bottom: 24px; }
    .token-box { background: #0f172a; border: 2px solid ${accentColor}; border-radius: 12px; padding: 20px 28px; margin: 24px 0; text-align: center; }
    .token-label { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #64748b; margin-bottom: 8px; }
    .token-value { font-family: 'Courier New', monospace; font-size: 26px; font-weight: 900; color: ${accentColor}; letter-spacing: 4px; }
    .campaign-badge { display: inline-block; background: ${badgeBg}; color: ${accentLight}; border-radius: 20px; padding: 6px 16px; font-size: 13px; font-weight: 600; margin-top: 10px; }
    .steps { background: #0f172a; border-radius: 12px; padding: 20px 28px; margin: 24px 0; }
    .steps h3 { color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 14px; }
    .step { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px; font-size: 14px; color: #cbd5e1; }
    .step-num { background: ${stepNumBg}; color: ${stepNumColor}; border-radius: 50%; width: 22px; height: 22px; font-size: 12px; font-weight: 900; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
    .cta { text-align: center; margin: 28px 0 0; }
    .cta a { background: ${ctaBg}; color: ${ctaColor}; text-decoration: none; font-weight: 800; font-size: 15px; padding: 14px 36px; border-radius: 10px; display: inline-block; }
    .footer { text-align: center; padding: 20px 40px; font-size: 11px; color: #475569; border-top: 1px solid #1e293b; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>🌊 Flood Shield Platform</h1>
      <p>${subtitle}</p>
    </div>
    <div class="body">
      <p class="greeting">Hello <strong>${toName}</strong>,</p>
      <p style="color:#94a3b8; font-size:14px; line-height:1.7;">
        <strong style="color:#e2e8f0;">${ngoName}</strong> has assigned you as a
        <strong style="color:${accentColor};">${roleDisplay}</strong> for the following ${isLogistics ? 'logistics center' : 'campaign'}:
      </p>

      <div class="token-box">
        <div class="token-label">Your Invite Token</div>
        <div class="token-value">${inviteToken}</div>
        <div class="campaign-badge">${badgeIcon} ${assignedLabel}</div>
      </div>

      <div class="steps">
        <h3>How to Register</h3>
        <div class="step"><div class="step-num">1</div><span>Click the <strong>Register Now</strong> button below</span></div>
        <div class="step"><div class="step-num">2</div><span>Click <strong>"Register Account"</strong> on the login page</span></div>
        <div class="step"><div class="step-num">3</div><span>Select role: <strong style="color:${accentColor};">NGO Representative</strong></span></div>
        <div class="step"><div class="step-num">4</div><span>Enter your invite token: <strong style="color:${accentColor}; font-family:monospace;">${inviteToken}</strong></span></div>
        <div class="step"><div class="step-num">5</div><span>Complete your registration and start ${isLogistics ? 'managing logistics' : 'coordinating'}!</span></div>
      </div>

      <div class="cta">
        <a href="${registrationUrl}">📲 Register Now</a>
      </div>

      <p style="color:#475569; font-size:12px; margin-top:28px; line-height:1.6;">
        This invite token is unique to you. Do not share it with others.<br/>
        If you did not expect this email, please ignore it.
      </p>
    </div>
    <div class="footer">
      Flood Shield Platform · Sent by ${ngoName} via Flood Shield<br/>
      © ${new Date().getFullYear()} Flood Shield Intelligence Platform
    </div>
  </div>
</body>
</html>
  `.trim();

  const info = await transporter.sendMail({
    from: `"Flood Shield Platform" <${process.env.GMAIL_USER}>`,
    to: `"${toName}" <${toEmail}>`,
    subject: subjectLine,
    html: htmlBody,
    text: `
Flood Shield — ${subtitle}

Hello ${toName},

${ngoName} has assigned you as a ${roleLabel} for: ${assignedLabel}

YOUR INVITE TOKEN: ${inviteToken}

Steps to Register:
1. Visit: ${registrationUrl}
2. Click "Register Account"
3. Select role: NGO Representative
4. Enter token: ${inviteToken}
5. Complete registration

This token is unique to you. Do not share it.
    `.trim()
  });

  return info;
};

/**
 * Sends a Government Representative invite email.
 */
const sendGovInviteEmail = async ({ toEmail, toName, inviteToken, shelterName, assignedHub, adminName, registrationUrl, inviteType }) => {
  const transporter = createTransporter();

  // Determine theme based on invite type
  const isLogistics = inviteType === 'logistics' || (inviteToken || '').startsWith('GR-HUB-');

  const accentColor  = isLogistics ? '#3b82f6' : '#f59e0b';
  const accentLight  = isLogistics ? '#93c5fd' : '#fcd34d';
  const headerBg1    = isLogistics ? '#1e3a5f' : '#451a03';
  const headerBg2    = isLogistics ? '#1d4ed8' : '#78350f';
  const stepNumBg    = isLogistics ? '#3b82f6' : '#f59e0b';
  const stepNumColor = isLogistics ? '#ffffff'  : '#0f172a';
  const badgeBg      = isLogistics ? '#1e3a5f' : '#451a03';
  const ctaBg        = isLogistics ? '#3b82f6' : '#f59e0b';
  const ctaColor     = isLogistics ? '#ffffff'  : '#0f172a';

  const subtitle      = isLogistics ? 'Government Logistics Hub Representative Invitation' : 'Government Shelter Representative Invitation';
  const assignedLabel = isLogistics ? (assignedHub || 'Assigned Logistics Hub') : (shelterName || 'Assigned Shelter');
  const badgeIcon     = isLogistics ? '🏭' : '🏠';
  const roleDisplay   = isLogistics ? 'Govt Logistics Hub Representative' : 'Govt Shelter Representative';
  const roleLabel     = roleDisplay;
  const subjectLine   = isLogistics
    ? `🏛️ You've been invited as a Govt Logistics Hub Rep — Token: ${inviteToken}`
    : `🏛️ You've been invited as a Govt Shelter Rep — Token: ${inviteToken}`;

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #0f172a; margin: 0; padding: 0; color: #e2e8f0; }
    .wrapper { max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 16px; overflow: hidden; }
    .header { background: linear-gradient(135deg, ${headerBg1}, ${headerBg2}); padding: 32px 40px; text-align: center; }
    .header h1 { color: ${accentColor}; font-size: 22px; margin: 0 0 6px; letter-spacing: -0.5px; }
    .header p { color: ${accentLight}; font-size: 13px; margin: 0; }
    .body { padding: 36px 40px; }
    .greeting { font-size: 16px; color: #cbd5e1; margin-bottom: 24px; }
    .token-box { background: #0f172a; border: 2px solid ${accentColor}; border-radius: 12px; padding: 20px 28px; margin: 24px 0; text-align: center; }
    .token-label { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #64748b; margin-bottom: 8px; }
    .token-value { font-family: 'Courier New', monospace; font-size: 26px; font-weight: 900; color: ${accentColor}; letter-spacing: 4px; }
    .campaign-badge { display: inline-block; background: ${badgeBg}; color: ${accentLight}; border-radius: 20px; padding: 6px 16px; font-size: 13px; font-weight: 600; margin-top: 10px; }
    .steps { background: #0f172a; border-radius: 12px; padding: 20px 28px; margin: 24px 0; }
    .steps h3 { color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 14px; }
    .step { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px; font-size: 14px; color: #cbd5e1; }
    .step-num { background: ${stepNumBg}; color: ${stepNumColor}; border-radius: 50%; width: 22px; height: 22px; font-size: 12px; font-weight: 900; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
    .cta { text-align: center; margin: 28px 0 0; }
    .cta a { background: ${ctaBg}; color: ${ctaColor}; text-decoration: none; font-weight: 800; font-size: 15px; padding: 14px 36px; border-radius: 10px; display: inline-block; }
    .footer { text-align: center; padding: 20px 40px; font-size: 11px; color: #475569; border-top: 1px solid #1e293b; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>🌊 Flood Shield Platform</h1>
      <p>${subtitle}</p>
    </div>
    <div class="body">
      <p class="greeting">Hello <strong>${toName}</strong>,</p>
      <p style="color:#94a3b8; font-size:14px; line-height:1.7;">
        <strong style="color:#e2e8f0;">${adminName}</strong> has assigned you as a
        <strong style="color:${accentColor};">${roleDisplay}</strong> for the following ${isLogistics ? 'logistics center' : 'shelter'}:
      </p>

      <div class="token-box">
        <div class="token-label">Your Invite Token</div>
        <div class="token-value">${inviteToken}</div>
        <div class="campaign-badge">${badgeIcon} ${assignedLabel}</div>
      </div>

      <div class="steps">
        <h3>How to Register</h3>
        <div class="step"><div class="step-num">1</div><span>Click the <strong>Register Now</strong> button below</span></div>
        <div class="step"><div class="step-num">2</div><span>Click <strong>"Register Account"</strong> on the login page</span></div>
        <div class="step"><div class="step-num">3</div><span>Select role: <strong style="color:${accentColor};">Govt Representative</strong></span></div>
        <div class="step"><div class="step-num">4</div><span>Enter your invite token: <strong style="color:${accentColor}; font-family:monospace;">${inviteToken}</strong></span></div>
        <div class="step"><div class="step-num">5</div><span>Complete your registration and start ${isLogistics ? 'managing logistics' : 'managing your shelter'}!</span></div>
      </div>

      <div class="cta">
        <a href="${registrationUrl}">📲 Register Now</a>
      </div>

      <p style="color:#475569; font-size:12px; margin-top:28px; line-height:1.6;">
        This invite token is unique to you. Do not share it with others.<br/>
        If you did not expect this email, please ignore it.
      </p>
    </div>
    <div class="footer">
      Flood Shield Platform · Sent by ${adminName} via Flood Shield<br/>
      © ${new Date().getFullYear()} Flood Shield Intelligence Platform
    </div>
  </div>
</body>
</html>
  `.trim();

  const info = await transporter.sendMail({
    from: '"Flood Shield Platform" <' + process.env.GMAIL_USER + '>',
    to: '"' + toName + '" <' + toEmail + '>',
    subject: subjectLine,
    html: htmlBody,
    text: 'Flood Shield — ' + subtitle + '\\n\\nHello ' + toName + ',\\n\\n' + adminName + ' has assigned you as a ' + roleLabel + ' for: ' + assignedLabel + '\\n\\nYOUR INVITE TOKEN: ' + inviteToken + '\\n\\nSteps to Register:\\n1. Visit: ' + registrationUrl + '\\n2. Click "Register Account"\\n3. Select role: Govt Representative\\n4. Enter token: ' + inviteToken + '\\n5. Complete registration\\n\\nThis token is unique to you. Do not share it.'
  });

  return info;
};

module.exports = { sendNGOInviteEmail, sendGovInviteEmail };
