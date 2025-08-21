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

/**
 * Preserva quebras de linha e deixa só <a> como HTML (sem estilo).
 * - Converte <br> / &lt;br&gt; -> \n
 * - Remove tags (menos <a>)
 * - Saneia <a> existentes
 * - Autolinka URLs nuas
 */
function formatMessagePreservingLines(input = '') {
  // 0) normaliza quebras
  let s = String(input).replace(/\r\n/g, '\n')

  // 1) <br> literais ou escapados -> newline
  s = s
    .replace(/&lt;br\s*\/?&gt;/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')

  // 2) extrai e limpa <a> existentes
  const anchors = []
  s = s.replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, (m, inner) => {
    const hrefMatch = m.match(/\bhref\s*=\s*["']([^"']+)["']/i)
    const href = hrefMatch ? hrefMatch[1] : ''
    const text = inner.replace(/<[^>]*>/g, '') // sem tags internas
    const idx = anchors.push({ href, text }) - 1
    return `__A_TAG_${idx}__`
  })

  // 3) remove qualquer outra tag
  s = s.replace(/<[^>]+>/g, '')

  // 4) autolinka URLs “nuas”
  s = s.replace(
    /(^|[\s])((?:https?:\/\/[^\s<]+)|(?:www\.[^\s<]+)|(?:[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[^\s<]*)?))/gi,
    (_, prefix, raw) => {
      const m = raw.match(/^(.*?)([).,!?;:]*$)/) // tira pontuação terminal do link
      const core = m ? m[1] : raw
      const trail = m ? m[2] : ''
      const href = /^https?:\/\//i.test(core) ? core : `https://${core}`
      return `${prefix}<a href="${href}" target="_blank" rel="noopener noreferrer">${core}</a>${trail}`
    }
  )

  // 5) restaura <a> originais saneados (sem style/class)
  s = s.replace(/__A_TAG_(\d+)__/g, (_, i) => {
    const a = anchors[Number(i)]
    if (!a || !a.href) return escapeHtml(a?.text || '')
    return `<a href="${a.href}" target="_blank" rel="noopener noreferrer">${escapeHtml(a.text || a.href)}</a>`
  })

  // Resultado: HTML com <a> e quebras como '\n' (serão renderizadas via pre-wrap)
  return s
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
    const formattedMessage = formatMessagePreservingLines(message)

    const data = await resend.emails.send({
      from: 'Carol Levtchenko <reminder@carol-levtchenko.com>',
      to: to_email,
      subject: 'Portfolio - Senior Product Designer',
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #000000;">
          <!-- usa pre-wrap para renderizar \\n como quebra -->
          <div style="margin: 0 0 16px 0; white-space: pre-wrap;">
            ${formattedMessage}
          </div>

          <div style="margin: 0 0 16px 0;">
            <a href="${link}" target="_blank" rel="noopener noreferrer">${linkLabel}</a>
          </div>

          <div style="margin: 0; white-space: pre-wrap;">
            ${escapeHtml(signature)}
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
