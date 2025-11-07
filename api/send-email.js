import { Resend } from 'resend'
import fetch from 'node-fetch'; // Usamos node-fetch para ambientes Node/Vercel

// --- Variável Global ---
const resend = new Resend(process.env.RESEND_API_KEY)
// --- Variável Global da IA ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 
const GEMINI_MODEL = "gemini-2.5-flash"; 

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
// FUNÇÃO DE SUMARIZAÇÃO DA IA (MANTIDA)
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
                    temperature: 0.2, 
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
        
        // ------------------------------------------------------------
        // B. MONTAGEM E ESTILIZAÇÃO DO TEMPLATE (MUDANÇA AQUI)
        // ------------------------------------------------------------

        // 1. Preparar Resumo: Markdown * para bullet points HTML
        const topicSummaryHtml = topicSummary
            .replace(/\n/g, '<br/>')
            .replace(/\*/g, '•'); // Substitui * por • para visual de bullet

        // 2. Preparar Histórico: Converte o texto plano em blocos HTML estilizados
        // O formato é: \n\n[Date] Author:\nContent
        const conversationBlocks = email_template.split('\n\n').filter(Boolean);
        
        let historyHtml = conversationBlocks.map(block => {
            if (!block.includes(']:\n')) return ''; // Ignora a primeira linha 'Hello...'
            
            const [header, ...contentParts] = block.split(']:\n'); 
            const headerText = header + ']'; // [Date] Author
            const content = contentParts.join(':\n').trim(); // Conteúdo da bolha

            // Estilos das bolhas:
            const isUser = headerText.includes('You');
            const bgColor = isUser ? '#E8F5FF' : '#F0F0F0'; // Azul claro vs. Cinza claro
            const textColor = '#1a1a1a';
            const headerColor = isUser ? '#0070D2' : '#555555';

            return `
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 15px;">
                    <tr>
                        <td style="font-size: 11px; color: ${headerColor}; padding: 0 5px 3px 5px; font-weight: 600; font-family: Arial, sans-serif;">
                            ${headerText.replace(/\n/g, '')}
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: ${bgColor}; color: ${textColor}; padding: 12px; border-radius: 10px; font-size: 14px; line-height: 1.5; font-family: Arial, sans-serif;">
                            ${content.replace(/\n/g, '<br/>')}
                        </td>
                    </tr>
                </table>
            `;
        }).join('');

        // 3. Montagem do Template Final:
        // Substituir o placeholder do resumo
        let finalHtml = email_template.replace('[[TOPIC_SUMMARY_PLACEHOLDER]]', 
            `<div style="padding: 10px 0 20px 0; font-size: 14px; line-height: 1.5; color: #1a1a1a;">${topicSummaryHtml}</div>`
        );
        
        // 4. Remover o placeholder do histórico (que é o texto plano original) e inserir o histórico HTML
        // Primeiro: Limpar o bloco de texto plano do histórico original da template (entre 'Here\'s the history...' e 'Thanks for stopping by...')
        const regexHistoryBlock = /Here's the history of conversation you've had with my AI Assistant when visiting my portfolio as you asked for.([\s\S]*?)Thanks for stopping by and see you soon!/g;
        
        finalHtml = finalHtml.replace(regexHistoryBlock, (match, p1) => {
            // Este bloco agora insere o HTML das bolhas e as linhas de texto acima e abaixo.
            return `
                Here's the history of conversation you've had with my AI Assistant when visiting my portfolio as you asked for.
                <br/><br/>
                ${historyHtml}
                <br/>
                Thanks for stopping by and see you soon!
            `;
        });
        
        // 5. Estilização do Wrapper Principal
        const htmlWrapper = `
            <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
            <html xmlns="http://www.w3.org/1999/xhtml">
            <head>
                <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
                <title>Highlights from your chat with Carol's AI Assistant</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f4f4f4;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                        <td style="padding: 20px 0 30px 0;">
                            <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.05);">
                                <tr>
                                    <td style="padding: 30px 30px 10px 30px; color: #1a1a1a; font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6;">
                                        ${finalHtml.replace(/\n/g, '<br/>')}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 0 30px 30px 30px;">
                                        <p style="font-size: 12px; color: #999999; margin: 0; font-family: Arial, sans-serif;">
                                            This message was generated by Carol Levtchenko's AI Assistant.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `;

        // C. Envio do E-mail (Usando Resend)
        const data = await resend.emails.send({
            from: 'Carol Levtchenko <reminder@carol-levtchenko.com>',
            to: to_email,
            subject: `Highlights from your chat with Carol's AI Assistant`,
            html: htmlWrapper, // Envia o HTML estilizado
        });

        return res.status(200).json({ success: true, flow: "AI_SUMMARY", data });
        
    } catch (error) {
        console.error('Erro ao enviar e-mail (AI Flow):', error)
        return res.status(500).json({ error: 'Erro ao enviar o e-mail (Fluxo AI)' })
    }
  } 
  
  // ----------------------------------------------------------------------
  // 2. FLUXO EXISTENTE (FALLBACK) - MANTIDO
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

      // ⚠️ TEMPLATE HTML ORIGINAL MANTIDO ⚠️
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