import { Resend } from 'resend'
const resend = new Resend(process.env.RESEND_API_KEY)

// helpers (mesmos do seu endpoint final com 1 quebra)
function toPlainText(input = '') {
  let s = String(input).replace(/\r\n/g, '\n')
  s = s.replace(/&lt;br\s*\/?&gt;/gi, '\n').replace(/<br\s*\/?>/gi, '\n')
  s = s.replace(/<[^>]+>/g, '')
  return s
}
function tidyLines(s = '') {
  return s
    .replace(/\u00A0/g, ' ')
    .replace(/[\u2000-\u200B]/g, ' ')
    .replace(/^[ \t]+/gm, '')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s*\n+/, '')
    .replace(/\n+\s*$/, '')
}
function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
function normalizeUrl(u = '') {
  const s = String(u).trim()
  if (!s) return ''
  return /^https?:\/\//i.test(s) ? s : `https://${s}`
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' })

  // 👇 agora aceitamos displayLink (opcional)
  const { to_email, message, link, linkLabel, signature, displayLink } = req.body

  // mesmos obrigatórios de antes
  if (!to_email || !message || !link || !linkLabel || !signature) {
    return res.status(400).json({ error: 'Campos obrigatórios ausentes' })
  }

  try {
    const msg = escapeHtml(tidyLines(toPlainText(message)))
    const sig = escapeHtml(tidyLines(toPlainText(signature)))

    const href = normalizeUrl(link) // para onde o <a> vai
    const linkText = escapeHtml((displayLink && displayLink.trim()) || link) // o que aparece

    const html = `
      <div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #000000;">
        <div style="margin: 0; white-space: pre-line;">${msg}</div>
        <br />
        <div style="margin: 0;">
          ${escapeHtml(linkLabel)}: <a href="${href}" target="_blank" rel="noopener noreferrer">${linkText}</a>
        </div>
        <br />
        <div style="margin: 0; white-space: pre-line;">${sig}</div>
      </div>
    `

    const data = await resend.emails.send({
      from: 'Carol Levtchenko <reminder@carol-levtchenko.com>',
      to: to_email,
      subject: 'Portfolio - Senior Product Designer',
      html,
    })

    return res.status(200).json({ success: true, data })
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error)
    return res.status(500).json({ error: 'Erro ao enviar o e-mail' })
  }
}
