import { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { prisma } from '../../lib/prisma'

export async function authRoutes(app: FastifyInstance) {

    app.post('/login', async (request, reply) => {
        const { usuario, senha } = request.body as any

        const user = await prisma.users.findFirst({
            where: {
                usuario
            }
        })

        if (!user || !(await bcrypt.compare(senha, user.senha))) {
            return reply.status(401).send({ message: 'Credenciais inválidas' })
        }

        const token = app.jwt.sign(
            {
                id: user.id,
                name: user.usuario
            },
            { expiresIn: '7d' }
        )

        return { token }
    })
}