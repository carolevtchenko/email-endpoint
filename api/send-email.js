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

  const { to_email, message, link, linkLabel } = req.body

  if (!to_email || !message || !link || !linkLabel) {
    return res.status(400).json({ error: 'Campos obrigatórios ausentes' })
  }

  try {
    const formattedMessage = message.replace(/\n/g, "<br />")

    const data = await resend.emails.send({
      from: 'Carol Levtchenko <reminder@carol-levtchenko.com>',
      to: to_email,
      subject: 'Portfolio - Senior Product Designer',
      html: `
        <p>${formattedMessage}</p>
        <p><a href="${link}" target="_blank">${linkLabel}</a></p>
      `
    })

    return res.status(200).json({ success: true, data })
  } catch (err) {
    console.error('Erro detalhado:', err)
    return res.status(500).json({ error: err.message })
  }
}
