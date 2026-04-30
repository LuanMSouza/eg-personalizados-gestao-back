import 'dotenv/config'
import Fastify from 'fastify'
import { FastifyRequest, FastifyReply } from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
// rotas

import { authRoutes } from './routes/auth'
import { produtosRoute } from './routes/produtos'
import { arquivosRoutes } from './routes/gerarArquivos'
import { vendasRoutes } from './routes/vendas'
import { imagensRoutes } from './routes/imagens'

const app = Fastify({ logger: true })

app.register(multipart)

app.register(jwt, {
    secret: process.env.JWT_SECRET || 'uma-frase-muito-secreta-aqui'
})

app.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        // O jwtVerify procura o token no Header 'Authorization: Bearer <TOKEN>'
        await request.jwtVerify()
    } catch (err) {
        reply.status(401).send({ message: 'Token inválido ou ausente' })
    }
})

async function start() {

    await app.register(cors, {
        origin: [
            'http://localhost:5173',
            'http://gestao.egpersonalizados.com.br',
            'https://ghestao.egpersonalizados.com.br'
        ],
        methods: ['GET', 'POST', 'PUT', 'DELETE']
    });


    await app.register(authRoutes, { prefix: '/auth' })
    await app.register(produtosRoute, { prefix: '/produtos' })
    await app.register(arquivosRoutes, { prefix: '/gerar' })
    await app.register(vendasRoutes, { prefix: '/vendas' })
    await app.register(imagensRoutes, { prefix: '/imagens' })


    try {
        await app.listen({
            port: 3333,
            host: '0.0.0.0'
        })

        console.log("🚀 Server running at http://localhost:3333")
    } catch (err) {
        app.log.error(err)
        process.exit(1)
    }
}

start()

// Modules

import "@fastify/jwt"

declare module "fastify" {
    export interface FastifyInstance {
        authenticate: any;
    }
}