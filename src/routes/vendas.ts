import { FastifyInstance } from 'fastify'
import { prisma } from '../../lib/prisma'
import { gerarImagemDocumento } from '../lib/gerarImagens';

export type Venda = {
    id: number;
    status?: string;
    valor_total: number; // Decimal vira number no front
    data_entrega?: string | Date;
    pago?: boolean;
    created_at?: string | Date;
    cliente: string;
    total_itens: number;
    taxa_entrega?: number;
    desconto_valor?: number;
    desconto_porcento?: number;
    contato?: string; // BigInt chega como string para não quebrar o JS
    endereco?: string;
    obs?: string;
    orcamento?: boolean;
    validade?: string | Date;
    venda_itens: Produto[]; // O tipo dos itens da venda
}

export type Produto = {
    id?: string;
    nome: string;
    preco_venda: number;
    preco_custo: number;
}

type TemplateTipo = 'orcamento' | 'venda'


function formatarValor(valor: number) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor);
}

export async function vendasRoutes(app: FastifyInstance) {

    app.get('/',
        { onRequest: [app.authenticate] },
        async (request, reply) => {
            try {
                const response = await prisma.vendas.findMany({
                    include: {
                        venda_itens: true
                    },
                    orderBy: {
                        id: 'desc'
                    }
                })

                const data = response.map(venda => ({
                    ...venda,
                    id: Number(venda.id),
                    contato: venda.contato ? String(venda.contato) : null,
                    // Se os itens também tiverem IDs BigInt, trate-os aqui:
                    venda_itens: venda.venda_itens.map(item => ({
                        ...item,
                        id: Number(item.id),
                        venda_id: Number(item.venda_id)
                    }))
                }))

                return { data }
            } catch (error) {
                console.error(error)
                return reply.status(500).send({ error: 'Erro ao buscar vendas com itens' })
            }
        }
    )

    app.put('/:id',
        { onRequest: [app.authenticate] },
        async (request, reply) => {
            const { id } = request.params as { id: string };
            const { id: _, venda_itens: __, ...dadosParaAtualizar } = request.body as any;

            try {
                const vendaAtualizada = await prisma.vendas.update({
                    where: {
                        id: Number(id)
                    },
                    data: {
                        ...dadosParaAtualizar,
                        orcamento: false
                    }
                });

                return reply.send({
                    ok: true,
                    data: {
                        ...vendaAtualizada,
                        id: Number(vendaAtualizada.id),
                        contato: vendaAtualizada.contato ? String(vendaAtualizada.contato) : null
                    }
                });

            } catch (error) {
                console.error(error);
                return reply.status(500).send({ error: 'Erro ao atualizar' });
            }
        }
    )

    app.post('/gerarArquivo',
        { onRequest: [app.authenticate] },
        async (request, reply) => {
            const dadosInput = request.body as any;

            try {
                const tipo: TemplateTipo = dadosInput.orcamento ? 'orcamento' : 'venda';

                const dadosFormatados = {
                    id: String(dadosInput.id || ''),
                    data_venda: dadosInput.created_at ? new Date(dadosInput.created_at).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR'),
                    data_orcamento: dadosInput.validade ? new Date(dadosInput.validade).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR'),

                    cliente_nome: dadosInput.cliente || dadosInput.nome,
                    cliente_whatsapp: String(dadosInput.contato || dadosInput.whatsapp || ''),
                    cliente_endereco: dadosInput.endereco || null,

                    produtos: (dadosInput.venda_itens || dadosInput.itens || []).map((i: any) => ({
                        nome: i.produto || i.nome,
                        quantidade: i.quantidade,
                        valor_unitario: formatarValor(Number(i.valor_unitario || i.valor_unt || 0)),
                        valor_total: formatarValor(Number(i.quantidade) * Number(i.valor_unitario || i.valor_unt || 0))
                    })),

                    valor_inicial: formatarValor(Number(dadosInput.total_itens || dadosInput.total || 0)),
                    desconto_porcentagem: dadosInput.desconto_porcento || dadosInput.descontoPorcento || 0,
                    valor_desconto_reais: formatarValor(Number(dadosInput.desconto_valor || dadosInput.descontoValor || 0)),
                    taxa_entrega: formatarValor(Number(dadosInput.taxa_entrega || dadosInput.txEntrega || 0)),
                    valor_final: formatarValor(Number(dadosInput.valor_total || dadosInput.totalFinal || 0)),

                    observacoes: dadosInput.obs || null,
                    foi_concluido: dadosInput.pago || false
                };

                const imagemBase64 = await gerarImagemDocumento(tipo, dadosFormatados);

                return reply.send({
                    ok: true,
                    image: imagemBase64
                });

            } catch (error) {
                console.error(error);
                return reply.status(500).send({ error: 'Falha ao gerar arquivo de imagem' });
            }
        }
    );
}