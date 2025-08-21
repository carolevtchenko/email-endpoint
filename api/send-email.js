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

// Converte <br> (ou &lt;br&gt;) em \n e remove quaisquer tags restantes.
// Resultado: TEXTO PURO, pronto para ser exibido com pre-wrap.
function toPlainText(input = '') {
  let s = String(input).replace(/\r\n/g, '\n')
  s = s
    .replace(/&lt;br\s*\/?&gt;/gi, '\n') // <br> escapado
    .replace(/<br\s*\/?>/gi, '\n')      // <br> real
  s = s.replace(/<[^>]+>/g, '')         // remove quaisquer tags
  return s
}

// Prepara para HTML com white-space: pre-wrap
function preWrapHtml(input = '') {
  return escapeHtml(toPlainText(input))
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
    const msg = preWrapHtml(message)
    const sig = preWrapHtml(signature)

    const data = await resend.emails.send({
      from: 'Carol Levtchenko <reminder@carol-levtchenko.com>',
      to: to_email,
      subject: 'Portfolio - Senior Product Designer',
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #000000;">
          <!-- Gmail vai autolinkar URLs do texto abaixo -->
          <div style="margin: 0 0 16px 0; white-space: pre-wrap;">
            ${msg}
          </div>

          <div style="margin: 0 0 16px 0;">
            <a href="${link}" target="_blank" rel="noopener noreferrer">${escapeHtml(linkLabel)}</a>
          </div>

          <div style="margin: 0; white-space: pre-wrap;">
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
