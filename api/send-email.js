import { Resend } from 'resend'
const resend = new Resend(process.env.RESEND_API_KEY)

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Converte <br> reais/escapados em \n e remove quaisquer tags
function toPlainText(input = '') {
  let s = String(input).replace(/\r\n/g, '\n')
  s = s.replace(/&lt;br\s*\/?&gt;/gi, '\n').replace(/<br\s*\/?>/gi, '\n')
  s = s.replace(/<[^>]+>/g, '')
  return s
}

// Remove indentação e espaços excessivos (inclui NBSP/thin spaces)
function normalizeSpaces(s = '') {
  return s
    .replace(/\u00A0/g, ' ')          // NBSP -> espaço
    .replace(/[\u2000-\u200B]/g, ' ') // thin/zero-width -> espaço
    .replace(/^[ \t]+/gm, '')         // tira indent no começo da linha
    .replace(/[ \t]+$/gm, '')         // tira espaços no fim da linha
    .replace(/[ \t]{2,}/g, ' ')       // colapsa múltiplos espaços
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' })

  const { to_email, message, link, linkLabel, signature } = req.body
  if (!to_email || !message || !link || !linkLabel || !signature) {
    return res.status(400).json({ error: 'Campos obrigatórios ausentes' })
  }

  try {
    const msg = escapeHtml(normalizeSpaces(toPlainText(message)))
    const sig = escapeHtml(normalizeSpaces(toPlainText(signature)))

    const data = await resend.emails.send({
      from: 'Carol Levtchenko <reminder@carol-levtchenko.com>',
      to: to_email,
      subject: 'Portfolio - Senior Product Designer',
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #000000;">
          <!-- pre-line: mantém \\n como quebra, colapsa múltiplos espaços -->
          <div style="margin: 0 0 16px 0; white-space: pre-line;">
            ${msg}
          </div>

          <div style="margin: 0 0 16px 0; white-space: pre-line;">
           ${escapeHtml(linkLabel)}: <a href="${link}" target="_blank" rel="noopener noreferrer">${escapeHtml(link)}</a>
          </div>

          <div style="margin: 0; white-space: pre-line;">
            ${sig}
          </div>
        </div>
      `,
    })

    return res.status(200).json({ success: true, data })
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error)
    return res.status(500).json({ error: 'Erro ao enviar o e-mail' })
  }
}
