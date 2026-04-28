import { FastifyInstance } from 'fastify'
import { prisma } from '../../lib/prisma'
import { gerarImagemDocumento } from '../lib/gerarImagens'

type ItemOrcamento = { // Use nomes no singular para tipos de item único
    id: number
    quantidade: number
    valor_unt: number
}

type DadosOrcamento = {
    nome: string
    whatsapp: string
    entrega: Date
    validade: Date
    itens: ItemOrcamento[]
    total: number
    txEntrega: number
    descontoValor: number
    descontoPorcento: number
    totalFinal: number
    obs: string
    endereco: string
}

export async function arquivosRoutes(app: FastifyInstance) {

    app.post('/orcamento',
        { onRequest: [app.authenticate] },
        async (request, reply) => {
            const {
                nome, whatsapp, entrega, validade,
                itens, total, txEntrega, descontoValor,
                descontoPorcento, totalFinal, obs, endereco
            } = request.body as DadosOrcamento

            try {
                const resultado = await prisma.$transaction(async (tx) => {

                    const novoOrcamento = await tx.vendas.create({
                        data: {
                            cliente: nome,
                            contato: BigInt(whatsapp),
                            data_entrega: entrega || null,
                            validade: validade,
                            total_itens: total,
                            taxa_entrega: txEntrega,
                            desconto_valor: descontoValor,
                            desconto_porcento: descontoPorcento,
                            valor_total: totalFinal,
                            obs: obs || null,
                            endereco: endereco,
                            orcamento: true,
                            status: 'orcamento',
                            pago: null
                        }
                    })

                    const ids = itens.map(i => i.id)

                    await tx.venda_itens.createMany({
                        data: itens.map(i => ({
                            venda_id: novoOrcamento.id,
                            produto_id: i.id,
                            quantidade: i.quantidade,
                            valor_unitario: i.valor_unt
                        }))
                    })

                    return novoOrcamento
                })

                const produtosDB = await prisma.produtos.findMany({
                    where: { id: { in: itens.map(i => i.id) } }
                })

                const dadosParaTemplate = {
                    data_orcamento: new Date(validade).toLocaleDateString('pt-BR'),
                    cliente_nome: nome,
                    cliente_whatsapp: whatsapp,
                    cliente_endereco: endereco,
                    produtos: itens.map(i => ({
                        nome: produtosDB.find(p => p.id === i.id)?.nome || 'Item',
                        quantidade: i.quantidade,
                        valor_unitario: i.valor_unt.toFixed(2),
                        valor_total: (i.quantidade * i.valor_unt).toFixed(2)
                    })),
                    valor_inicial: total.toFixed(2),
                    desconto_porcentagem: descontoPorcento,
                    valor_desconto_reais: descontoValor.toFixed(2),
                    taxa_entrega: txEntrega.toFixed(2),
                    valor_final: totalFinal.toFixed(2),
                    observacoes: obs
                }

                const imagem = await gerarImagemDocumento('orcamento', dadosParaTemplate)

                return reply.status(201).send({
                    ok: true,
                    id: resultado.id,
                    image: imagem
                })

            } catch (error) {
                console.error(error)
                return reply.status(500).send({ error: 'Falha ao gerar orçamento' })
            }
        }
    )

    app.post('/venda',
        { onRequest: [app.authenticate] },
        async (request, reply) => {
            const {
                nome, whatsapp, entrega, validade,
                itens, total, txEntrega, descontoValor,
                descontoPorcento, totalFinal, obs, endereco
            } = request.body as DadosOrcamento

            try {
                const resultado = await prisma.$transaction(async (tx) => {

                    const novoOrcamento = await tx.vendas.create({
                        data: {
                            cliente: nome,
                            contato: BigInt(whatsapp),
                            data_entrega: entrega || null,
                            validade: validade,
                            total_itens: total,
                            taxa_entrega: txEntrega,
                            desconto_valor: descontoValor,
                            desconto_porcento: descontoPorcento,
                            valor_total: totalFinal,
                            obs: obs || null,
                            endereco: endereco,
                            orcamento: false,
                            status: 'pendente',
                            pago: null
                        }
                    })

                    await tx.venda_itens.createMany({
                        data: itens.map(i => ({
                            venda_id: novoOrcamento.id,
                            produto_id: i.id,
                            quantidade: i.quantidade,
                            valor_unitario: i.valor_unt
                        }))
                    })

                    return novoOrcamento
                })

                const produtosDB = await prisma.produtos.findMany({
                    where: { id: { in: itens.map(i => i.id) } }
                })

                const dadosParaTemplate = {
                    venda_id: resultado.id, // ID que acabou de ser gerado no banco
                    data_venda: new Date().toLocaleDateString('pt-BR'), // Data atual da venda

                    cliente_nome: nome,
                    cliente_whatsapp: whatsapp,
                    cliente_endereco: endereco || null,

                    foi_concluido: status === 'concluido' || status === 'pago',

                    produtos: itens.map(i => ({
                        nome: produtosDB.find(p => p.id === i.id)?.nome || 'Produto',
                        quantidade: i.quantidade,
                        valor_unitario: i.valor_unt.toFixed(2),
                        valor_total: (i.quantidade * i.valor_unt).toFixed(2)
                    })),

                    valor_inicial: total.toFixed(2),
                    valor_desconto_reais: descontoValor > 0 ? descontoValor.toFixed(2) : null,
                    taxa_entrega: txEntrega > 0 ? txEntrega.toFixed(2) : null,
                    valor_final: totalFinal.toFixed(2),

                    observacoes: obs || null
                }

                const imagem = await gerarImagemDocumento('venda', dadosParaTemplate)

                return reply.status(201).send({
                    ok: true,
                    id: resultado.id,
                    image: imagem
                })

            } catch (error) {
                console.error(error)
                return reply.status(500).send({ error: 'Falha ao gerar orçamento' })
            }
        }
    )

}