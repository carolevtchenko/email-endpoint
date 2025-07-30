import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://carol-levtchenko.com")
  res.setHeader("Access-Control-Allow-Credentials", "true")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' })
  }

  const { to_email, message, portfolioLink, signature } = req.body

  if (!to_email || !message || !portfolioLink || !signature) {
    return res.status(400).json({ error: 'Campos obrigatórios ausentes' })
  }

  try {
    const formattedMessage = message.replace(/\n/g, '<br />')

    const data = await resend.emails.send({
      from: 'Carol Levtchenko <reminder@carol-levtchenko.com>',
      to: to_email,
      subject: 'Portfolio - Senior Product Designer',
      html: `
        <div style="font-family: Inter, sans-serif; color: #4B0055; font-size: 16px; line-height: 1.6;">
          <p>${formattedMessage}</p>
          <p>👉 <a href="${portfolioLink}" target="_blank" style="color: #2979FF;">carol-levtchenko.com</a></p>
          <br />
          <p><a href="https://github.com/carolevtchenko/carol-levtchenko-cv/blob/main/CarolLevtchenko_ProductDesigner_Resume.pdf" target="_blank" style="color: #2979FF;">Click here to view my resume</a></p>
          <br />
          <p>${signature}</p>
        </div>
      `
    })

    return res.status(200).json({ success: true, data })
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error)
    return res.status(500).json({ error: 'Erro ao enviar o e-mail' })
  }
}
