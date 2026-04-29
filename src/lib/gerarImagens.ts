import path from 'node:path'
import fs from 'node:fs'
import handlebars from 'handlebars'
import puppeteer from 'puppeteer'

type TemplateTipo = 'orcamento' | 'venda'

export async function gerarImagemDocumento(tipo: TemplateTipo, dados: any) {
    const logoPath = path.join(process.cwd(), 'public', 'newLogo.webP')
    const templatePath = path.join(process.cwd(), 'src', 'templates', `${tipo}.html`)

    const logoBuffer = fs.readFileSync(logoPath)
    const logoBase64 = `data:image/jpeg;base64,${logoBuffer.toString('base64')}`

    const htmlRaw = fs.readFileSync(templatePath, 'utf-8')

    const template = handlebars.compile(htmlRaw)
    const htmlFinal = template({
        ...dados,
        logo_base64: logoBase64,
        is_orcamento: tipo === 'orcamento' // Dica: permite usar condicionais no HTML
    })

    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    const page = await browser.newPage()
    await page.setViewport({ width: 800, height: 600 })
    await page.setContent(htmlFinal, { waitUntil: 'networkidle0' })

    const imageBuffer = await page.screenshot({
        type: 'png',
        fullPage: true
    })

    await browser.close()

    return `data:image/png;base64,${Buffer.from(imageBuffer).toString('base64')}`
}