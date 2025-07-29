export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { to_email, message, link } = req.body;

  // Validação básica
  if (!to_email || !message || !link) {
    return res.status(400).json({ error: "Campos obrigatórios ausentes" });
  }

  try {
    const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        service_id: "service_aipp11z",              // já preenchido
        template_id: "template_67rqvo8",            // preenchido
        user_id: "qDPNEj34N6_8efqw5",               // preenchido
        template_params: {
          to_email,
          message,
          link
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro do EmailJS: ${errorText}`);
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Erro detalhado:", err);
    return res.status(500).json({ error: err.message });
  }
}
