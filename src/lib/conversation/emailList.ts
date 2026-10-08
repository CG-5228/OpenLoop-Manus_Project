import type { Commitment, Message } from "../../types/openloop";

export const MAX_EMAILS = 100;
export const MAX_EMAIL_LIST_BYTES = 1_048_576;
export const MAX_EMAIL_TEXT_CHARACTERS = 100_000;

export interface EmailRecord {
  id: string;
  from: string;
  to: string[];
  subject: string;
  body: string;
  sentAt: string | null;
}

export interface EmailFilters {
  query?: string;
  sender?: string;
  fromDate?: string;
  toDate?: string;
}

function stringField(value: unknown, label: string, max: number, required = true): string {
  if (typeof value !== "string" || (required && !value.trim()) || value.length > max) {
    throw new Error(`${label} must be ${required ? "a non-empty" : "a"} string of at most ${max} characters.`);
  }
  return value;
}

function explicitTimestamp(value: unknown, label: string): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-](?:0\d|1[0-3]):[0-5]\d|[+-]14:00)$/.test(value)) {
    throw new Error(`${label} must be an ISO timestamp with a known timezone, or blank/null.`);
  }
  const date = value.slice(0, 10);
  const calendar = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(Date.parse(value)) || Number.isNaN(calendar.getTime()) || calendar.toISOString().slice(0, 10) !== date || Number(value.slice(11, 13)) > 23 || Number(value.slice(14, 16)) > 59 || (value[16] === ":" && Number(value.slice(17, 19)) > 59)) {
    throw new Error(`${label} contains an invalid date or time.`);
  }
  return value;
}

export function validateEmailList(value: unknown): EmailRecord[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error("Provide a non-empty email list.");
  if (value.length > MAX_EMAILS) throw new Error(`Import at most ${MAX_EMAILS} emails.`);
  const ids = new Set<string>();
  let characters = 0;
  const emails = value.map((raw: unknown, index): EmailRecord => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(`Email ${index + 1} must be an object.`);
    const record = raw as Record<string, unknown>;
    const id = stringField(record.id ?? `email-${index + 1}`, `Email ${index + 1} id`, 80).trim();
    if (ids.has(id)) throw new Error(`Duplicate email id: ${id}`);
    ids.add(id);
    const from = stringField(record.from, `Email ${index + 1} from`, 200).trim();
    const recipientValue = record.to ?? [];
    const to = typeof recipientValue === "string" ? recipientValue.split(/[,;]/).map(item => item.trim()).filter(Boolean) : recipientValue;
    if (!Array.isArray(to) || to.length > 20) throw new Error(`Email ${index + 1} to must be a string or at most 20 recipients.`);
    const email: EmailRecord = {
      id, from,
      to: to.map(item => stringField(item, `Email ${index + 1} recipient`, 200).trim()),
      subject: stringField(record.subject ?? "", `Email ${index + 1} subject`, 300, false),
      body: stringField(record.body, `Email ${index + 1} body`, MAX_EMAIL_TEXT_CHARACTERS),
      sentAt: explicitTimestamp(record.sentAt, `Email ${index + 1} sentAt`),
    };
    characters += emailToMessage(email).text.length;
    if (characters > MAX_EMAIL_TEXT_CHARACTERS) throw new Error("Use at most 100,000 combined email/context characters.");
    return email;
  });
  return emails;
}

/** Plain-text blocks use an explicit separator; a quoted From: line never creates a new email. */
export function parseEmailList(text: string): EmailRecord[] {
  if (new TextEncoder().encode(text).byteLength > MAX_EMAIL_LIST_BYTES) throw new Error("The email list must be at most 1 MiB.");
  if (!text.trim()) throw new Error("Paste an email list first.");
  if (text.trimStart().startsWith("[")) {
    let value: unknown;
    try { value = JSON.parse(text); } catch { throw new Error("The email list is not valid JSON."); }
    return validateEmailList(value);
  }
  const blocks = text.replace(/\r\n?/g, "\n").split(/^===EMAIL===\s*$/m).filter(block => block.trim());
  return validateEmailList(blocks.map((block, index) => {
    const lines = block.trim().split("\n");
    const fields: Record<string, string> = {};
    let cursor = 0;
    while (cursor < lines.length) {
      const header = lines[cursor].match(/^(From|To|Subject|Date):\s*(.*)$/i);
      if (!header) break;
      const key = header[1].toLowerCase();
      if (Object.prototype.hasOwnProperty.call(fields, key)) throw new Error(`Email ${index + 1} has a duplicate ${key} header.`);
      fields[key] = header[2];
      cursor += 1;
    }
    if (!fields.from) throw new Error(`Email ${index + 1} needs a From: header. Separate emails with ===EMAIL===.`);
    while (lines[cursor] === "") cursor += 1;
    return { id: `email-${index + 1}`, from: fields.from, to: fields.to ?? "", subject: fields.subject ?? "", sentAt: fields.date || null, body: lines.slice(cursor).join("\n") };
  }));
}

export function filterEmailList(emails: EmailRecord[], filters: EmailFilters): EmailRecord[] {
  const query = filters.query?.trim().toLocaleLowerCase("en") ?? "";
  return emails.filter(email => {
    if (filters.sender && email.from !== filters.sender) return false;
    const date = email.sentAt?.slice(0, 10);
    if (filters.fromDate && (!date || date < filters.fromDate)) return false;
    if (filters.toDate && (!date || date > filters.toDate)) return false;
    return !query || [email.from, ...email.to, email.subject, email.body].join("\n").toLocaleLowerCase("en").includes(query);
  });
}

export function selectedVisibleEmails(emails: EmailRecord[], filters: EmailFilters, selected: ReadonlySet<string>): EmailRecord[] {
  return filterEmailList(emails, filters).filter(email => selected.has(email.id));
}

export function emailToMessage(email: EmailRecord): Message {
  return {
    id: email.id,
    conversationId: `email-${email.id}`,
    sender: email.from,
    text: `Subject: ${email.subject || "(no subject)"}\nTo: ${email.to.length ? email.to.join(", ") : "Unknown recipient"}\n\n${email.body}`,
    sentAt: email.sentAt,
    source: "paste",
  };
}

export function emailIdsWithCommitments(emails: EmailRecord[], commitments: Commitment[]): Set<string> {
  const ids = new Set(emails.map(email => email.id));
  for (const item of commitments) {
    const email = emails.find(record => record.id === item.sourceMessageId);
    if (!ids.has(item.sourceMessageId) || !email || !item.evidenceQuote.trim() || !emailToMessage(email).text.includes(item.evidenceQuote)) {
      throw new Error("The AI response cannot be traced to the analysed email evidence.");
    }
  }
  return new Set(commitments.map(item => item.sourceMessageId));
}

export const SAMPLE_EMAIL_LIST: EmailRecord[] = [
  { id: "report", from: "James", to: ["Me"], subject: "Report for review", body: "Hi Me, I'll email you the revised report tomorrow. Thanks!", sentAt: "2026-10-08T10:00:00Z" },
  { id: "newsletter", from: "Newsletter", to: ["Me"], subject: "Weekly news", body: "Here are this week's articles and product updates. Enjoy reading!", sentAt: "2026-10-08T09:00:00Z" },
  { id: "slides", from: "Me", to: ["Sarah"], subject: "Presentation slides", body: "Hi Sarah, I'll send Sarah the final slides by Friday.", sentAt: "2026-10-08T11:00:00Z" },
  { id: "tentative", from: "Alex", to: ["Me"], subject: "Weekend ideas", body: "I might look at the design sometime. Maybe we could discuss it next week.", sentAt: null },
];

export const EMAIL_BLOCK_EXAMPLE = "From: James\nTo: Me\nSubject: Report\nDate: 2026-10-08T10:00:00Z\n\nI'll email you the report tomorrow.\n===EMAIL===\nFrom: Newsletter\nTo: Me\nSubject: Weekly news\n\nRead our latest articles.";
