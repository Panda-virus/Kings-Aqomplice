/**
 * Kings Aqomplice — Output Guardrails
 * Scans AI/assistant output for prohibited patterns. Firm liability protection.
 */

const PROHIBITED_PATTERNS = [
  /\bguarantee\b/i,
  /\bguaranteed\b/i,
  /\b100%\s*(certain|certainty|success|win)/i,
  /\b\d+%\s*(chance|probability|likely|certain)/i,
  /\b(courtroom|trial)\s+tactics?\b/i,
  /\btax\s+evasion\b/i,
  /\b(illegal|unlawful)\s+advice\b/i,
  /\b(guarantee|promise)\s+(you|we|i)\s+(will|can)\b/i,
  /\b(always|never)\s+works?\b/i,
  /\b(guaranteed|certain)\s+outcome\b/i,
];

const BOUNDARY_MESSAGE = `I cannot provide that type of information. For specific legal advice tailored to your situation, please schedule a consultation with our team.`;

export function scanOutput(text) {
  if (!text || typeof text !== 'string') return { safe: true, text: '' };

  let sanitized = text;
  let triggered = false;

  for (const pattern of PROHIBITED_PATTERNS) {
    if (pattern.test(sanitized)) {
      triggered = true;
      break;
    }
  }

  if (triggered) {
    return { safe: false, text: BOUNDARY_MESSAGE };
  }

  return { safe: true, text: sanitized };
}
