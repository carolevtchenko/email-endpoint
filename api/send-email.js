import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// Converte <br> reais/escapados em \n e remove quaisquer tags HTML
function toPlainText(input = '') {
  let s = String(input).replace(/\r\n/g, '\n')
  s = s.replace(/&lt;br\s*\/?&gt;/gi, '\n').replace(/<br\s*\/?>/gi, '\n')
  s = s.replace(/<[^>]+>/g, '')
  return s
}

// Normaliza espaços e *colapsa* linhas vazias; remove linhas vazias no início/fim
function tidyLines(s = '') {
  return s
    .replace(/\u00A0/g, ' ')          // NBSP -> espaço comum
    .replace(/[\u2000-\u200B]/g, ' ') // thin/zero-width -> espaço
    .replace(/^[ \t]+/gm, '')         // trim esquerda por linha
    .replace(/[ \t]+$/gm, '')         // trim direita por linha
    .replace(/\n{3,}/g, '\n\n')       // 3+ quebras -> 1 linha em branco
    .replace(/^\s*\n+/, '')           // remove linhas vazias iniciais
    .replace(/\n+\s*$/, '')           // remove linhas vazias finais
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' })

  const { to_email, message, link, linkLabel, signature } = req.body

  // Mantém os campos obrigatórios como no seu código original
  if (!to_email || !message || !link || !linkLabel || !signature) {
    return res.status(400).json({ error: 'Campos obrigatórios ausentes' })
  }

  try {
    const msg = escapeHtml(tidyLines(toPlainText(message)))
    const sig = escapeHtml(tidyLines(toPlainText(signature)))

    const html = `
      <div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #000000;">
        <!-- mensagem -->
        <div style="margin: 0; white-space: pre-line;">
          ${msg}
        </div>

        <!-- 1 quebra entre mensagem e CV -->
        <br />

        <!-- CV no formato "texto: URL" -->
        <div style="margin: 0;">
          ${escapeHtml(linkLabel)}: <a href="${link}" target="_blank" rel="noopener noreferrer">${escapeHtml(link)}</a>
        </div>

        <!-- 1 quebra entre CV e assinatura -->
        <br />

        <!-- assinatura -->
        <div style="margin: 0; white-space: pre-line;">
          ${sig}
        </div>
      </div>
    `

    const data = await resend.emails.send({
      from: 'Carol Levtchenko <reminder@carol-levtchenko.com>',
      to: to_email,
      subject: 'Portfolio - Senior Product Designer',
      html,
    })

    return res.status(200).json({ success: true, data })
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error)
    return res.status(500).json({ error: 'Erro ao enviar o e-mail' })
  }
}
