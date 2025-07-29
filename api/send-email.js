// api/send-email.js

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  // Responde prévia de CORS (preflight)
  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' })
  }

  const { to_email, message, link } = req.body

  if (!to_email || !message || !link) {
    return res.status(400).json({ error: 'Campos obrigatórios ausentes' })
  }

  try {
    const data = await resend.emails.send({
      from: 'reminder@carol-levtchenko.com',
      to: to_email,
      subject: 'Lembrete sobre sua visita ao meu portfólio',
      html: `
        <p>${message.replace(/\n/g, "<br />")}</p>
        <p><a href="${link}" target="_blank">Confira meu portfólio</a></p>
      `
    })

    return res.status(200).json({ success: true, data })
  } catch (err) {
    console.error('Erro detalhado:', err)
    return res.status(500).json({ error: err.message })
  }
}
