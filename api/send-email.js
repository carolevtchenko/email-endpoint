import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

/** Deixa todos os links do message como <a> sem estilo, iguais ao Gmail */
function unifyLinks(html = '') {
  // 1) Auto-linka URLs "nuas" (http(s) ou domínio)
  const autoLinked = html.replace(
    // captura início de linha ou char que não seja @/alfa-num
    /(^|[^@/A-Za-z0-9])(https?:\/\/[^\s<]+|(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s<]*)?)/gi,
    (_, prefix, url) => {
      const href = /^https?:\/\//i.test(url) ? url : `https://${url}`
      return `${prefix}<a href="${href}" target="_blank" rel="noopener noreferrer">${url}</a>`
    }
  )

  // 2) Remove estilos/classes de <a> que já existam no message (se houver)
  return autoLinked
    .replace(/(<a\b[^>]*?)\sstyle="[^"]*"/gi, '$1')
    .replace(/(<a\b[^>]*?)\sclass="[^"]*"/gi, '$1')
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
    const formattedMessage = unifyLinks(message.replace(/\n/g, '<br />'))

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
            ${signature}
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
