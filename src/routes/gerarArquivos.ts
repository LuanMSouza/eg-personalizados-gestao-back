import { FastifyInstance } from 'fastify'
import { prisma } from '../../lib/prisma'
import { gerarImagemDocumento } from '../lib/gerarImagens'

type ItemOrcamento = { // Use nomes no singular para tipos de item único
    id: number
    quantidade: number
    valor_unitario: number
}

type DadosOrcamento = {
    nome: string
    whatsapp: string
    entrega: Date
    validade: Date
    itens: ItemOrcamento[]
    total: number
    txEntrega: number | string
    descontoValor: number
    descontoPorcento: number
    totalFinal: number
    obs: string
    endereco: string
    pago: boolean
}

function formatarValor(valor: number) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor);
}

export async function arquivosRoutes(app: FastifyInstance) {

    app.post('/orcamento',
        { onRequest: [app.authenticate] },
        async (request, reply) => {
            const {
                nome, whatsapp, validade,
                itens, total, txEntrega, descontoValor,
                descontoPorcento, totalFinal, obs, endereco
            } = request.body as DadosOrcamento

            try {

                const dataParaOPrisma = `${validade}T00:00:00Z`;

                const resultado = await prisma.$transaction(async (tx) => {

                    const novoOrcamento = await tx.vendas.create({
                        data: {
                            cliente: nome,
                            contato: BigInt(whatsapp),
                            data_entrega: null,
                            validade: dataParaOPrisma,
                            total_itens: total,
                            taxa_entrega: txEntrega || 0,
                            desconto_valor: descontoValor || 0,
                            desconto_porcento: descontoPorcento || 0,
                            valor_total: totalFinal,
                            obs: obs || null,
                            endereco: endereco || null,
                            orcamento: true,
                            status: 'orcamento',
                            pago: null
                        }
                    })

                    const ids = itens.map(i => i.id)

                    await tx.venda_itens.createMany({
                        data: itens.map(i => ({
                            venda_id: novoOrcamento.id,
                            produto_id: i.id || null,
                            produto: i.nome || null,
                            quantidade: Number(i.quantidade),
                            valor_unitario: i.valor_unitario
                        }))
                    })

                    return novoOrcamento
                })

                const dadosParaTemplate = {
                    data_orcamento: new Date(validade).toLocaleDateString('pt-BR'),
                    cliente_nome: nome,
                    cliente_whatsapp: String(whatsapp),
                    cliente_endereco: endereco || null,
                    produtos: itens.map(i => ({
                        nome: i.nome,
                        quantidade: i.quantidade,
                        valor_unitario: formatarValor(Number(i.valor_unitario || 0)),
                        valor_total: formatarValor(Number(i.quantidade) * Number(i.valor_unitario || 0))
                    })),
                    valor_inicial: formatarValor(Number(total || 0)),
                    desconto_porcentagem: descontoPorcento || 0,
                    valor_desconto_reais: formatarValor(Number(descontoValor || 0)),
                    taxa_entrega: formatarValor(Number(txEntrega || 0)),
                    valor_final: formatarValor(Number(totalFinal || 0)),
                    observacoes: obs || null
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
                nome, whatsapp, validade,
                itens, total, txEntrega, descontoValor,
                descontoPorcento, totalFinal, obs, endereco, pago
            } = request.body as DadosOrcamento

            try {
                // Ajuste da data para o formato que o Prisma aceita sem erro de fuso
                const dataParaOPrisma = validade ? `${validade}T00:00:00Z` : null;

                const resultado = await prisma.$transaction(async (tx) => {

                    const novaVenda = await tx.vendas.create({
                        data: {
                            cliente: nome,
                            contato: BigInt(whatsapp),
                            data_entrega: null,
                            validade: dataParaOPrisma,
                            total_itens: total,
                            taxa_entrega: txEntrega || 0,
                            desconto_valor: descontoValor || 0,
                            desconto_porcento: descontoPorcento || 0,
                            valor_total: totalFinal,
                            obs: obs || null,
                            endereco: endereco || null,
                            orcamento: false, // Aqui vira venda
                            status: 'pendente', // Status inicial de venda
                            pago: pago
                        }
                    })

                    await tx.venda_itens.createMany({
                        data: itens.map(i => ({
                            venda_id: novaVenda.id,
                            produto_id: i.id || null,
                            produto: i.nome || null,
                            quantidade: Number(i.quantidade),
                            valor_unitario: Number(i.valor_unitario)
                        }))
                    })

                    return novaVenda
                })

                const dadosParaTemplate = {
                    id: String(resultado.id), // Garantindo que o ID seja string (evita erro de BigInt)
                    data_venda: new Date().toLocaleDateString('pt-BR'),
                    cliente_nome: nome,
                    cliente_whatsapp: String(whatsapp),
                    cliente_endereco: endereco || null,
                    produtos: itens.map(i => ({
                        nome: i.nome,
                        quantidade: i.quantidade,
                        valor_unitario: formatarValor(Number(i.valor_unitario || 0)),
                        valor_total: formatarValor(Number(i.quantidade) * Number(i.valor_unitario || 0))
                    })),
                    valor_inicial: formatarValor(Number(total || 0)),
                    desconto_porcentagem: descontoPorcento || 0,
                    valor_desconto_reais: formatarValor(Number(descontoValor || 0)),
                    taxa_entrega: formatarValor(Number(txEntrega || 0)),
                    valor_final: formatarValor(Number(totalFinal || 0)),
                    observacoes: obs || null,
                    foi_concluido: pago
                }

                const imagem = await gerarImagemDocumento('venda', dadosParaTemplate)

                return reply.status(201).send({
                    ok: true,
                    id: Number(resultado.id),
                    image: imagem
                })

            } catch (error) {
                console.error(error)
                return reply.status(500).send({ error: 'Falha ao registrar venda' })
            }
        }
    )

}