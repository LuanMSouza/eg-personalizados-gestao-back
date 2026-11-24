import { FastifyInstance } from 'fastify'
import fs from 'fs'
import { prisma } from '../../lib/prisma';

export async function imagensRoutes(app: FastifyInstance) {

    app.post('/uppload',
        { onRequest: [app.authenticate] },
        async (request, reply) => {
            const parts = request.parts();

            let produto_id: string | undefined;
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
                    }
                }

                if (!fileBuffer || !produto_id) {
                    return reply.status(400).send({ error: 'Arquivo ou ID do produto ausente.' });
                }

                if (!mimeType?.startsWith('image/')) {
                    return reply.status(400).send({ error: 'Envie só arquivos de imagem.' });
                }

                // Alterado, vai pro VPS

                const projeto = 'EGP';
                const dir = `/var/www/egp/uploads/${projeto}`;
                fs.mkdirSync(dir, { recursive: true });
                // nome sem espaço/acento: "WhatsApp Image 2026...jpeg" virava URL com %20
                const nomeLimpo = (fileName || 'foto.jpg')
                    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-zA-Z0-9.-]+/g, '-').replace(/-+/g, '-').slice(-80);
                const fileName2 = `${Date.now()}-${nomeLimpo}`;
                fs.writeFileSync(`${dir}/${fileName2}`, fileBuffer);
                const publicUrl = `https://api.gestao.egpersonalizados.com.br/uploads/${projeto}/${fileName2}`;


                const novaImagem = await prisma.imagens.create({
                    data: {
                        produto_id: Number(produto_id),
                        img_url: publicUrl
                    }
                });

                return reply.send({ ok: true, data: novaImagem });

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
                orderBy: { id: 'asc' },
                select: {
                    id: true,
                    produto_id: true,
                    img_url: true,
                    produtos: {
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