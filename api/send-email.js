export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" })
  }

  const { to_email, message, link } = req.body

  // Validação básica
  if (!to_email || !message || !link) {
    return res.status(400).json({ error: "Campos obrigatórios ausentes" })
  }

  try {
    const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        service_id: "service_aipp11z",      // substitua pelo seu ID real
        template_id: "template_67rqvo8",     // substitua aqui também
        user_id: "qDPNEj34N6_8efqw5",             // substitua com seu User ID
        template_params: {
          to_email,
          message,
          link
        }
      })
    })

    if (!response.ok) {
      throw new Error("Erro ao enviar o e-mail")
    }

    return res.status(200).json({ success: true })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
