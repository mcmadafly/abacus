/**
 * Account emails:
 *  - `notifySignup` — tell the admin a new account was created.
 *  - `welcomeUser`  — a personal founder welcome to the new user.
 * Both are best-effort and never throw into the request path.
 */
import { resendSendEmail } from "./resend";

const SANS =
  "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const SERIF = "'Newsreader', Georgia, 'Times New Roman', serif";
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Whether Resend is configured well enough to actually send. */
function canSend(env: Env): boolean {
  return Boolean(
    env.RESEND_API_KEY &&
      !env.RESEND_API_KEY.includes("placeholder") &&
      env.DIGEST_FROM_EMAIL,
  );
}

/**
 * A short, human welcome from the founder — sent once when an account is first
 * created. Deliberately plain and personal (no big marketing layout): a real
 * note asking for feedback and a recommendation. Replies go to ADMIN_EMAIL so
 * feedback reaches a real inbox.
 */
export async function welcomeUser(
  env: Env,
  opts: { email: string },
): Promise<void> {
  if (!canSend(env)) return;

  const html = `<!doctype html><html><head><meta charset="utf-8" />
<link href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,500&family=Hanken+Grotesk:wght@400;500;600&display=swap" rel="stylesheet" /></head>
<body style="margin:0;background:#0b0a16;font-family:${SANS}">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" bgcolor="#0b0a16" style="background:#0b0a16;padding:28px 12px"><tr><td align="center">
    <table width="480" cellpadding="0" cellspacing="0" role="presentation" style="width:480px;max-width:480px;background:#141124;border:1px solid #2a2640;border-radius:16px;overflow:hidden">
      <tr><td height="3" style="height:3px;line-height:3px;font-size:1px;background:#5b46e5">&nbsp;</td></tr>
      <tr><td style="padding:30px 32px 34px">
        <table cellpadding="0" cellspacing="0" role="presentation"><tr>
          <td width="26" style="width:26px"><img src="https://abacuslytics.com/brandmark.png" width="26" height="26" alt="Abacus" style="display:block;border:0" /></td>
          <td style="padding-left:9px;font-family:${SANS};font-size:16px;font-weight:600;color:#f4f2fb">Abacus</td>
        </tr></table>
        <p style="margin:24px 0 0;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.07em;text-transform:uppercase;color:#857fa0">A welcome from the founder</p>
        <h1 style="margin:7px 0 0;font-family:${SERIF};font-size:24px;font-weight:500;color:#f7f5fd">Hey — thanks for signing up.</h1>
        <p style="margin:18px 0 0;font-family:${SANS};font-size:14.5px;line-height:1.65;color:#cfcbe0">I'm Adam, the person building Abacus — a real human, not an autoresponder. I read every reply to this address, so if anything is confusing, missing, or just annoying, hit reply and tell me. Your feedback genuinely shapes what I build next.</p>
        <p style="margin:14px 0 0;font-family:${SANS};font-size:14.5px;line-height:1.65;color:#cfcbe0">We're a tiny project trying to grow. If Abacus is useful to you, it would mean the world if you'd recommend it to a friend or share it:</p>
        <p style="margin:18px 0 0"><a href="https://abacuslytics.com/" style="font-family:${SANS};font-size:14.5px;font-weight:600;color:#a99bff;text-decoration:none">https://abacuslytics.com/ →</a></p>
        <p style="margin:24px 0 0;font-family:${SANS};font-size:14.5px;line-height:1.65;color:#cfcbe0">Thanks again,<br />Adam<br /><span style="color:#857fa0">Founder, Abacus</span></p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  await resendSendEmail(env.RESEND_API_KEY, {
    from: env.DIGEST_FROM_EMAIL,
    to: [opts.email],
    subject: "Welcome to Abacus — a note from the founder",
    html,
    replyTo: env.ADMIN_EMAIL || undefined,
  });
}

export async function notifySignup(
  env: Env,
  opts: { email: string; userId: string; totalAccounts: number },
): Promise<void> {
  if (!env.ADMIN_EMAIL || !canSend(env)) return;

  const html = `<!doctype html><html><head><meta charset="utf-8" />
<link href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,500&family=Hanken+Grotesk:wght@400;500;600&display=swap" rel="stylesheet" /></head>
<body style="margin:0;background:#0b0a16;font-family:${SANS}">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" bgcolor="#0b0a16" style="background:#0b0a16;padding:28px 12px"><tr><td align="center">
    <table width="460" cellpadding="0" cellspacing="0" role="presentation" style="width:460px;max-width:460px;background:#141124;border:1px solid #2a2640;border-radius:16px;overflow:hidden">
      <tr><td height="3" style="height:3px;line-height:3px;font-size:1px;background:#5b46e5">&nbsp;</td></tr>
      <tr><td style="padding:26px 28px">
        <table cellpadding="0" cellspacing="0" role="presentation"><tr>
          <td width="26" style="width:26px"><img src="https://abacuslytics.com/brandmark.png" width="26" height="26" alt="Abacus" style="display:block;border:0" /></td>
          <td style="padding-left:9px;font-family:${SANS};font-size:16px;font-weight:600;color:#f4f2fb">Abacus</td>
        </tr></table>
        <p style="margin:22px 0 0;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.07em;text-transform:uppercase;color:#857fa0">New signup</p>
        <h1 style="margin:6px 0 0;font-family:${SERIF};font-size:23px;font-weight:500;color:#f7f5fd">${esc(opts.email)}</h1>
        <p style="margin:14px 0 0;font-family:${SANS};font-size:13.5px;line-height:1.6;color:#b9b4cc">A new account just signed up to Abacus. You now have <b style="color:#f4f2fb">${opts.totalAccounts.toLocaleString()}</b> ${opts.totalAccounts === 1 ? "account" : "accounts"}.</p>
        <p style="margin:8px 0 0;font-family:'JetBrains Mono',monospace;font-size:11px;color:#6f6a87">${esc(opts.userId)}</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  await resendSendEmail(env.RESEND_API_KEY, {
    from: env.DIGEST_FROM_EMAIL,
    to: [env.ADMIN_EMAIL],
    subject: `New Abacus signup: ${opts.email}`,
    html,
  });
}
