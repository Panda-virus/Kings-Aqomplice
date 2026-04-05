import OpenAI from 'openai';
import { scanOutput } from '../middleware/guardrails.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

const SYSTEM_PROMPT = `You are the Legal Intelligence assistant for Kings Aqomplice, a law firm. Your role is to:
- Answer general questions about the firm, its practice areas, and approach
- Provide informational responses only — never legal advice
- Never guarantee outcomes, predict success rates, or give courtroom tactics
- Never provide tax evasion, illegal, or unlawful advice
- Direct users to schedule a consultation for substantive legal matters
- Be professional, precise, and institutional in tone
- Keep responses concise and structured`;

export async function getAIResponse(messages) {
  if (!process.env.OPENAI_API_KEY) {
    return {
      content: 'AI assistance is not currently configured. Please contact us directly for inquiries.',
      raw: null,
    };
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages,
      ],
      max_tokens: 500,
      temperature: 0.3,
    });

    const raw = completion.choices[0]?.message?.content || '';
    const { safe, text } = scanOutput(raw);

    return {
      content: text,
      raw: safe ? raw : null,
    };
  } catch (err) {
    console.error('AI service error:', err.message);
    return {
      content: 'I was unable to process your request. Please try again or contact us directly.',
      raw: null,
    };
  }
}
