import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// 1) Escapa HTML do message para evitar tags soltas/indevidas
function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// 2) Autolinka apenas URLs “nuas” (http(s), www., ou domínio) no TEXTO escapado
function autoLinkText(plain = '') {
  const escaped = escapeHtml(plain)

  // substitui apenas fora de tags (não existem tags porque escapamos antes)
  return escaped.replace(
    /(^|[\s>])((?:https?:\/\/[^\s<]+)|(?:www\.[^\s<]+)|(?:[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[^\s<]*)?))/gi,
    (_, prefix, raw) => {
      // remove pontuação final comum para fora do link
      const m = raw.match(/^(.*?)([).,!?;:]*)$/)
      const core = m ? m[1] : raw
      const trail = m ? m[2] : ''
      const href = /^https?:\/\//i.test(core) ? core : `https://${core}`
      return `${prefix}<a href="${href}" target="_blank" rel="noopener noreferrer">${core}</a>${trail}`
    }
  )
  .replace(/\r\n|\n/g, '<br />')
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
    // Escapa + autolinka o message (sem estilos inline)
    const formattedMessage = autoLinkText(message)

    const data = await resend.emails.send({
      from: 'Carol Levtchenko <reminder@carol-levtchenko.com>',
      to: to_email,
      subject: 'Portfolio - Senior Product Designer',
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #000000;">
          <p style="margin: 0 0 16px 0;">
            ${formattedMessage}
          </p>

          <p style="margin: 0 0 16px 0;">
            <a href="${link}" target="_blank" rel="noopener noreferrer">${linkLabel}</a>
          </p>

          <p style="margin: 0;">
            ${escapeHtml(signature)}
          </p>
        </div>
      `,
    })

    return res.status(200).json({ success: true, data })
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error)
    return res.status(500).json({ error: 'Erro ao enviar o e-mail' })
  }
}

