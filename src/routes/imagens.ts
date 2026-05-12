import { FastifyInstance } from 'fastify'
import fs from 'fs'
import { prisma } from '../../lib/prisma';

export async function imagensRoutes(app: FastifyInstance) {

    app.post('/uppload',
        { onRequest: [app.authenticate] },
        async (request, reply) => {
            const parts = request.parts();

            let produto_id: string | undefined;
            let tema_id: string | undefined;
            let tema_criado: string | undefined;
            let fileBuffer: Buffer | undefined;
            let fileName: string | undefined;
            let mimeType: string | undefined;


            try {
                for await (const part of parts) {
                    if (part.type === 'file') {
                        fileBuffer = await part.toBuffer();
                        fileName = part.filename;
                        mimeType = part.mimetype;
                    } else {
                        if (part.fieldname === 'produto_id') produto_id = part.value as string;
                        if (part.fieldname === 'tema_id') tema_id = part.value as string;
                        if (part.fieldname === 'tema_criado') tema_criado = part.value as string;
                    }
                }

                if (!fileBuffer || !produto_id) {
                    return reply.status(400).send({ error: 'Arquivo ou ID do produto ausente.' });
                }

                // Alterado, vai pro VPS

                const projeto = 'EGP';
                const dir = `/var/www/uploads/${projeto}`;
                fs.mkdirSync(dir, { recursive: true });
                const fileName2 = `${Date.now()}-${fileName}`;
                fs.writeFileSync(`${dir}/${fileName2}`, fileBuffer);
                const publicUrl = `https://api.gestao.egpersonalizados.com.br/uploads/${projeto}/${fileName2}`;



                let novoTema

                if (tema_id === 'CRIAR' && tema_criado) {
                    const res = await prisma.temas.create({
                        data: {
                            nome: String(tema_criado)
                        }
                    })

                    novoTema = res
                    tema_id = String(res.id)
                }


                const novaImagem = await prisma.imagens.create({
                    data: {
                        produto_id: Number(produto_id),
                        tema_id: tema_id ? Number(tema_id) : null,
                        img_url: publicUrl
                    }
                });

                return reply.send({ ok: true, data: novaImagem, novoTema });

            } catch (error) {
                console.error('Erro no upload:', error);
                return reply.status(500).send({ error: 'Erro ao processar upload e salvar no banco' });
            }
        }
    );

    app.get('/',
        { onRequest: [app.authenticate] },
        async (request, reply) => {

            const res = await prisma.imagens.findMany({
                select: {
                    id: true,
                    img_url: true,
                    produtos: {
                        select: {
                            nome: true
                        }
                    },
                    temas: {
                        select: {
                            nome: true
                        }
                    }
                }
            })

            return res

        }
    )

    app.delete('/:id',
        { onRequest: [app.authenticate] },
        async (request, reply) => {
            const { id } = request.params as { id: string }

            try {
                await prisma.imagens.delete({
                    where: { id: Number(id) }
                })

                return reply.send({ ok: true })
            } catch (error) {
                console.error(error)
                return reply.status(500).send({ ok: false, error: 'Erro ao deletar' })
            }
        }
    )

}