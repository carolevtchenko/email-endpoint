import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * 1) Extrai <a> existentes e limpa style/class
 * 2) Autolinka apenas URLs “nuas” em texto (fora de tags)
 * 3) Restaura os <a> originais limpos
 * 4) Converte quebras de linha em <br />
 */
function normalizeMessage(html = '') {
  const anchors = []
  // 1) captura <a>...</a> (não mexemos nelas aqui; só limpamos style/class)
  let tmp = html.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, (m) => {
    const cleaned = m
      .replace(/\sstyle="[^"]*"/gi, '')
      .replace(/\sclass="[^"]*"/gi, '')
    anchors.push(cleaned)
    return `__A_TAG_${anchors.length - 1}__`
  })

  // 2) autolinka http(s), www. e domínios simples, apenas quando precedidos por espaço/início ou '>'
  tmp = tmp.replace(
    /(^|[\s>])((?:https?:\/\/[^\s<]+)|(?:www\.[^\s<]+)|(?:[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s<]*)?))/gi,
    (_, prefix, raw) => {
      // remove pontuação terminal comum
      const m = raw.match(/^(.*?)([).,!?]?)$/)
      const core = m ? m[1] : raw
      const trail = m ? m[2] : ''
      const href = /^https?:\/\//i.test(core) ? core : `https://${core}`
      return `${prefix}<a href="${href}" target="_blank" rel="noopener noreferrer">${core}</a>${trail}`
    }
  )

  // 3) restaura anchors originais (já sem style/class)
  tmp = tmp.replace(/__A_TAG_(\d+)__/g, (_, i) => anchors[Number(i)])

  // 4) \n -> <br />
  return tmp.replace(/\r\n/g, '\n').replace(/\n/g, '<br />')
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
    const formattedMessage = normalizeMessage(message)

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
