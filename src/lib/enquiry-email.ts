/**
 * Formats a website lead as an HTML email with a plain-text alternative. Server-only.
 * Every visitor-supplied value is HTML-escaped and labels are flattened to one line, so a submission can't
 * add markup, links or fake header lines to the staff email.
 */

export type LeadField = { label: string; value: string };
export type Lead = { kind: unknown; name: string; email: string; page: string; fields: LeadField[]; id: string; submittedAt?: Date };

const BRAND = { navy: "#1D567C", orange: "#EF9920", ink: "#1B2230", muted: "#5A6475", line: "#E3E7ED", soft: "#F4F6F9" };

/** Friendly names for the website forms' field names. Unknown names fall back to "camelCase" → "Camel case". */
const LABELS: Record<string, string> = {
  name: "Full name", email: "Email", phone: "Phone", nationality: "Nationality", message: "Message",
  destination: "Destination", jobTitle: "Job title", qualification: "Highest qualification", source: "How they found us",
  age: "Age", workExperience: "Work experience", monthlySalary: "Monthly salary", ielts: "IELTS score",
  studyLevel: "Study level", preferredCourse: "Preferred course", intake: "Preferred intake",
  gradePercentage: "Grade / percentage", bachelorsGpa: "Bachelor's GPA", gmatGre: "GMAT / GRE",
  investmentBudgetConfirmed: "Investment budget",
};

const oneLine = (text: string) => text.replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
const escape = (text: string) => text.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
const escapeBlock = (text: string) => escape(text.trim()).replace(/\r?\n/g, "<br>");

function humanLabel(label: string) {
  const clean = oneLine(label);
  if (LABELS[clean]) return LABELS[clean];
  if (/^[a-z]+(?:[A-Z][a-z0-9]*)+$/.test(clean)) return clean.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()).replace(/ (\w)/g, (_, c: string) => ` ${c.toLowerCase()}`);
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function formType(kind: unknown, page: string) {
  if (kind === "eligibility") return "Eligibility check";
  if (/contact/i.test(page)) return "Contact enquiry";
  return "Free assessment request";
}

type Contact = { phone: string; dial: string; nationality: string; message: string; destination: string };

/** Pulls the contact essentials out of the field list; everything else stays in the details table. */
function splitFields(fields: LeadField[]) {
  const contact: Contact = { phone: "", dial: "", nationality: "", message: "", destination: "" };
  const details: LeadField[] = [];
  for (const field of fields) {
    const label = oneLine(field.label);
    const value = field.value.trim();
    if (!value) continue;
    if (/^(full.?name|name|first.?name)$/i.test(label) || /^e-?mail( address)?$/i.test(label)) continue;
    if (/country.?code$/i.test(label)) { contact.dial = value.match(/\(([^)]+)\)/)?.[1] ?? oneLine(value); continue; }
    if (/^(phone|phone number|mobile|mobile number|whatsapp)$/i.test(label)) { contact.phone = oneLine(value); continue; }
    if (/^nationality$/i.test(label)) { contact.nationality = oneLine(value); continue; }
    if (/^(message|comments?|notes?)$/i.test(label)) { contact.message = value; continue; }
    if (/^destination$/i.test(label) && !contact.destination) contact.destination = oneLine(value);
    details.push({ label: humanLabel(label), value });
  }
  return { contact, details };
}

const dubaiTime = (date: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dubai", dateStyle: "medium", timeStyle: "short" }).format(date) + " (Dubai)";

export function renderLeadEmail(lead: Lead) {
  const name = oneLine(lead.name);
  const email = oneLine(lead.email);
  const page = oneLine(lead.page) || "/";
  const site = (process.env.SITE_ORIGIN || "https://pelicanmigration.ae").replace(/\/$/, "");
  const pageUrl = page.startsWith("/") ? `${site}${page}` : site;
  const type = formType(lead.kind, page);
  const { contact, details } = splitFields(lead.fields);
  const phone = [contact.dial, contact.phone].filter(Boolean).join(" ");
  const phoneDigits = phone.replace(/[^\d+]/g, "");
  const whatsapp = phoneDigits.replace(/^\+/, "");
  const when = dubaiTime(lead.submittedAt ?? new Date());

  const subject = `New lead: ${name} · ${type}${contact.destination ? ` · ${contact.destination}` : ""}`.slice(0, 200);

  const text = [
    `New ${type.toLowerCase()} from the website`,
    "",
    `Name:        ${name}`,
    `Email:       ${email}`,
    ...(phone ? [`Phone:       ${phone}`] : []),
    ...(contact.nationality ? [`Nationality: ${contact.nationality}`] : []),
    "",
    ...(contact.message ? ["Message:", ...contact.message.trim().split(/\r?\n/).map((line) => `  ${line}`), ""] : []),
    ...(details.length ? ["--- Submitted details (as entered by the visitor, unverified) ---", ...details.map((field) => `${field.label}: ${oneLine(field.value)}`), ""] : []),
    `Page:      ${pageUrl}`,
    `Submitted: ${when}`,
    `Reference: ${lead.id}`,
    "",
    "Reply to this email to answer the applicant directly.",
  ].join("\n");

  const button = (href: string, label: string, color: string) =>
    `<a href="${escape(href)}" style="display:inline-block;margin:0 8px 8px 0;padding:10px 18px;border-radius:6px;background:${color};color:#ffffff;font-weight:600;font-size:14px;text-decoration:none">${label}</a>`;
  const row = (label: string, valueHtml: string) =>
    `<tr><td style="padding:10px 0;border-bottom:1px solid ${BRAND.line};color:${BRAND.muted};font-size:13px;width:38%;vertical-align:top">${escape(label)}</td><td style="padding:10px 0 10px 12px;border-bottom:1px solid ${BRAND.line};color:${BRAND.ink};font-size:14px;font-weight:500;vertical-align:top;word-break:break-word">${valueHtml}</td></tr>`;

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(subject)}</title></head>
<body style="margin:0;padding:0;background:${BRAND.soft};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${BRAND.ink}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.soft};padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid ${BRAND.line}">
  <tr><td style="background:${BRAND.navy};padding:20px 24px">
    <div style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:.04em">PELICAN</div>
    <div style="color:#cfe0ec;font-size:11px;letter-spacing:.12em;text-transform:uppercase">Migration Consultants</div>
  </td></tr>
  <tr><td style="padding:24px 24px 8px">
    <span style="display:inline-block;padding:4px 10px;border-radius:999px;background:#FDF1DF;color:#9A5B00;font-size:12px;font-weight:600">${escape(type)}${contact.destination ? ` · ${escape(contact.destination)}` : ""}</span>
    <h1 style="margin:12px 0 4px;font-size:22px;line-height:1.3;color:${BRAND.ink}">${escape(name)}</h1>
    <div style="color:${BRAND.muted};font-size:13px">${escape(when)}</div>
  </td></tr>
  <tr><td style="padding:16px 24px 8px">
    ${button(`mailto:${email}`, "Reply by email", BRAND.navy)}${phoneDigits.length > 6 ? button(`tel:${phoneDigits}`, "Call", BRAND.orange) + button(`https://wa.me/${whatsapp}`, "WhatsApp", "#25A244") : ""}
  </td></tr>
  <tr><td style="padding:8px 24px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    ${row("Email", `<a href="mailto:${escape(email)}" style="color:${BRAND.navy}">${escape(email)}</a>`)}
    ${phone ? row("Phone", `<a href="tel:${escape(phoneDigits)}" style="color:${BRAND.navy}">${escape(phone)}</a>`) : ""}
    ${contact.nationality ? row("Nationality", escape(contact.nationality)) : ""}
  </table></td></tr>
  ${contact.message ? `<tr><td style="padding:20px 24px 0">
    <div style="font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:${BRAND.muted};margin-bottom:8px">Message</div>
    <div style="background:${BRAND.soft};border-left:3px solid ${BRAND.orange};padding:12px 14px;font-size:14px;line-height:1.55;white-space:normal;word-break:break-word">${escapeBlock(contact.message)}</div>
  </td></tr>` : ""}
  ${details.length ? `<tr><td style="padding:20px 24px 0">
    <div style="font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:${BRAND.muted};margin-bottom:4px">Submitted details</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${details.map((field) => row(field.label, escapeBlock(field.value))).join("")}</table>
  </td></tr>` : ""}
  <tr><td style="padding:24px">
    <div style="border-top:1px solid ${BRAND.line};padding-top:14px;color:${BRAND.muted};font-size:12px;line-height:1.6">
      Sent from <a href="${escape(pageUrl)}" style="color:${BRAND.navy}">${escape(pageUrl)}</a><br>
      Reference: ${escape(lead.id)}<br>
      Details are as entered by the visitor and have not been verified. Reply to this email to answer the applicant directly.
    </div>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

  return { subject, text, html };
}
