import { Resend } from 'resend'
import fetch from 'node-fetch'; // Usamos node-fetch para ambientes Node/Vercel (se não for Next.js/React runtime)

// --- Variável Global ---
const resend = new Resend(process.env.RESEND_API_KEY)
// --- Variável Global da IA ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 
const GEMINI_MODEL = "gemini-2.5-flash"; // Modelo leve para sumarização

// --- HELPER FUNCTIONS (Mantidas) ---
function toPlainText(input = '') {
  let s = String(input).replace(/\r\n/g, '\n')
  s = s.replace(/&lt;br\s*\/?&gt;/gi, '\n').replace(/<br\s*\/?>/gi, '\n')
  s = s.replace(/<[^>]+>/g, '')
  return s
}
function tidyLines(s = '') {
  return s
    .replace(/\u00A0/g, ' ')
    .replace(/[\u2000-\u200B]/g, ' ')
    .replace(/^[ \t]+/gm, '')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s*\n+/, '')
    .replace(/\n+\s*$/, '')
}
function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
function normalizeUrl(u = '') {
  const s = String(u).trim()
  if (!s) return ''
  return /^https?:\/\//i.test(s) ? s : `https://${s}`
}
// --- FIM DOS HELPER FUNCTIONS ---


// ----------------------------------------------------------------------
// FUNÇÃO DE SUMARIZAÇÃO DA IA (NOVA LÓGICA)
// ----------------------------------------------------------------------
async function summarizeConversation(conversationText) {
    if (!GEMINI_API_KEY) {
        return "⚠️ Não foi possível gerar o resumo. A chave da API Gemini está ausente.";
    }

    const systemPrompt = `
        You are an expert summary generator. Analyze the following conversation history between a User and Carol's Assistant. 
        Your task is to identify and summarize the key topics discussed.
        
        Rules:
        1. Identify the 3 to 5 main topics or groups of related questions.
        2. Provide a brief, engaging summary (2-3 sentences max) for each topic.
        3. Format the output strictly as a clean, unordered markdown list (* Topic: Summary).
        4. DO NOT include any conversation metadata, greetings, or the final signature.
        5. DO NOT include the assistant's initial welcome message or any explicit feedback messages (e.g., 'Yes', 'No', 'Thanks for your feedback!').
    `;

    const fullPrompt = systemPrompt + "\n\n### CONVERSATION TEXT\n" + conversationText;
    
    const url = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    
    try {
        const r = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
                generationConfig: { 
                    temperature: 0.2, // Baixa temperatura para fatos/resumos
                    maxOutputTokens: 1024 
                }
            })
        });

        const raw = await r.json();

        if (!r.ok || !raw.candidates?.[0]?.content?.parts) {
            console.error("Gemini API Error:", raw);
            return "⚠️ Failed to generate summary due to AI service error.";
        }

        return raw.candidates[0].content.parts.map(p => p.text).join('\n');
    } catch (e) {
        console.error("Error during AI summarization fetch:", e);
        return "⚠️ Failed to generate summary due to server connection error.";
    }
}
// ----------------------------------------------------------------------


export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' })

  const body = req.body;
  
  // ----------------------------------------------------------------------
  // 1. CHAVE DE DECISÃO: O NOVO FLUXO (AI ASSISTANT)
  // ----------------------------------------------------------------------
  if (body.raw_conversation_text && body.email_template) {
    const { to_email, user_name, raw_conversation_text, email_template } = body;
    
    if (!to_email || !email_template) {
        return res.status(400).json({ error: 'Campos obrigatórios do Assistente ausentes (e-mail ou template)' });
    }
    
    try {
        // A. Processamento da IA (Sumarização)
        const topicSummary = await summarizeConversation(raw_conversation_text);
        
        // B. Montagem do Template Final
        const finalEmailBody = email_template.replace('[[TOPIC_SUMMARY_PLACEHOLDER]]', tidyLines(topicSummary));
        
        // C. Envio do E-mail (Usando Resend)
        const data = await resend.emails.send({
            from: 'Carol Levtchenko <reminder@carol-levtchenko.com>',
            to: to_email,
            subject: `Highlights from your chat with Carol's AI Assistant`,
            html: finalEmailBody.replace(/\n/g, '<br />'), // Converte quebras de linha em HTML
        });

        return res.status(200).json({ success: true, flow: "AI_SUMMARY", data });
        
    } catch (error) {
        console.error('Erro ao enviar e-mail (AI Flow):', error)
        return res.status(500).json({ error: 'Erro ao enviar o e-mail (Fluxo AI)' })
    }
  } 
  
  // ----------------------------------------------------------------------
  // 2. FLUXO EXISTENTE (FALLBACK)
  // ----------------------------------------------------------------------
  else {
    // 👇 Campos obrigatórios do fluxo antigo
    const { to_email, message, link, linkLabel, signature, displayLink } = body

    // ⚠️ VALIDAÇÃO ORIGINAL MANTIDA ⚠️
    if (!to_email || !message || !link || !linkLabel || !signature) {
      return res.status(400).json({ error: 'Campos obrigatórios ausentes' })
    }

    try {
      const msg = escapeHtml(tidyLines(toPlainText(message)))
      const sig = escapeHtml(tidyLines(toPlainText(signature)))

      const href = normalizeUrl(link) 
      const linkText = escapeHtml((displayLink && displayLink.trim()) || link) 

      const html = `
        <div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #000000;">
          <div style="margin: 0; white-space: pre-line;">${msg}</div>
          <br />
          <div style="margin: 0;">
            ${escapeHtml(linkLabel)}: <a href="${href}" target="_blank" rel="noopener noreferrer">${linkText}</a>
          </div>
          <br />
          <div style="margin: 0; white-space: pre-line;">${sig}</div>
        </div>
      `

      const data = await resend.emails.send({
        from: 'Carol Levtchenko <reminder@carol-levtchenko.com>',
        to: to_email,
        subject: 'Portfolio - Senior Product Designer',
        html,
      })

      return res.status(200).json({ success: true, flow: "ORIGINAL_LINK", data })
    } catch (error) {
      console.error('Erro ao enviar e-mail (Original Flow):', error)
      return res.status(500).json({ error: 'Erro ao enviar o e-mail (Fluxo Original)' })
    }
  }
}