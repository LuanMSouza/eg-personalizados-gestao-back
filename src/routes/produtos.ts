import { FastifyInstance } from 'fastify'
import { prisma } from '../../lib/prisma'

type Produto = {
    id?: number,
    nome: string,
    valor: number,
    custo: number,
    obs?: string
}

export async function produtosRoute(app: FastifyInstance) {

    app.get('/',
        { onRequest: [app.authenticate] },
        async (request, reply) => {

            try {
                const produtos = await prisma.produtos.findMany()
                return reply.status(200).send({ data: produtos })
            } catch (error) {
                return reply.status(500).send({ error: 'Erro ao procurar produtos!!' })
            }

        })


    app.post('/',
        { onRequest: [app.authenticate], },
        async (request, reply) => {
            const { nome, valor, custo, obs } = request.body as Produto

            if (!nome || !valor || !custo) {
                return reply.status(400).send({ error: 'Todos os dados são obrigatórios!!' })
            }

            try {
                const novoProduto = await prisma.produtos.create({
                    data: {
                        nome: nome,
                        preco_venda: valor,
                        preco_custo: custo,
                        obs: obs
                    }
                })

                return reply.status(201).send({ data: novoProduto })
            } catch (error) {
                return reply.status(500).send({ error: 'Erro ao cadastrar no banco.' })
            }

        }
    )

    app.put('/',
        { onRequest: [app.authenticate] },
        async (request, reply) => {

            const { id, nome, valor, custo, obs } = request.body as Produto

            try {
                if (!id || !nome || !custo || !valor) {
                    return reply.status(400).send({ error: 'Todos os dados são obrigatórios!!' })
                }

                const produtoAlterado = await prisma.produtos.update({
                    where: { id: Number(id) },
                    data: {
                        nome: nome,
                        preco_custo: custo,
                        preco_venda: valor,
                        obs: obs ?? null
                    }
                })

                return reply.status(200).send({ data: produtoAlterado })
            } catch (error) {
                return reply.status(501).send({ error })

            }

        }
    )

    app.delete('/',
        { onRequest: [app.authenticate] },
        async (request, reply) => {
            const id = request.body

            if (!id) {
                return reply.status(500).send({ error: 'ID Não informado!!' })
            }

            try {
                await prisma.produtos.delete({
                    where: {
                        id: Number(id)
                    }
                })

                return reply.status(204)
            } catch (error) {
                return reply.status(500).send({ error: error })
            }
        }
    )

}