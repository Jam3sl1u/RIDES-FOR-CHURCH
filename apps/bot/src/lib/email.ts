import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendDriverEmail(opts: {
  to: string;
  driverName: string;
  rows: { fullName: string; phoneNumber: string; pickupLocation: string }[];
}) {
  if (!resend) {
    console.warn("RESEND_API_KEY not set — skipping email to", opts.to);
    return;
  }

  const list = opts.rows
    .map(
      (r, i) =>
        `<tr><td style="padding:6px 12px;">${i + 1}.</td><td style="padding:6px 12px;font-weight:600;">${r.fullName}</td><td style="padding:6px 12px;">${r.phoneNumber}</td><td style="padding:6px 12px;">${r.pickupLocation}</td></tr>`
    )
    .join("");

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "rides@example.com",
    to: opts.to,
    subject: "🚗 Your Sunday riders",
    html: `
      <div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:560px;margin:0 auto;color:#16243d;">
        <h2 style="color:#16243d;">Hi ${opts.driverName}!</h2>
        <p>Here are your riders this Sunday, listed in pickup order:</p>
        <table style="border-collapse:collapse;background:#faf8f4;border-radius:8px;width:100%;">
          <thead><tr style="text-align:left;color:#5b6b85;font-size:12px;text-transform:uppercase;">
            <th style="padding:6px 12px;"></th><th style="padding:6px 12px;">Name</th><th style="padding:6px 12px;">Phone</th><th style="padding:6px 12px;">Pickup</th>
          </tr></thead>
          <tbody>${list}</tbody>
        </table>
        <p style="margin-top:16px;">Thanks for serving! 🙏</p>
      </div>`,
  });
}
