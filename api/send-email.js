import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' })
  }

  const { to_email, message, link, linkLabel, signature } = req.body

  if (!to_email || !message || !link || !linkLabel || !signature) {
    return res.status(400).json({ error: 'Campos obrigatórios ausentes' })
  }

  try {
    const formattedMessage = message.replace(/\n/g, '<br />')

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
              <a href="${link}" target="_blank">${linkLabel}</a>
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
