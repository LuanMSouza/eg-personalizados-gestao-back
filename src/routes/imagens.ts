import { FastifyInstance } from 'fastify'
import { supabase } from '../lib/supabase'
import { prisma } from '../../lib/prisma';

export async function imagensRoutes(app: FastifyInstance) {

    app.post('/uppload', { onRequest: [app.authenticate] }, async (request, reply) => {
        const parts = request.parts();

        let produto_id: string | undefined;
        let tema_id: string | undefined;
        let fileBuffer: Buffer | undefined;
        let fileName: string | undefined;
        let mimeType: string | undefined;

        try {
            for await (const part of parts) {
                // Verifica se a parte é um arquivo
                if (part.type === 'file') {
                    fileBuffer = await part.toBuffer();
                    fileName = part.filename;
                    mimeType = part.mimetype;
                } else {
                    // Se não for arquivo, é um campo de texto (MultipartValue)
                    if (part.fieldname === 'produto_id') {
                        produto_id = part.value as string;
                    }
                    if (part.fieldname === 'tema_id') {
                        tema_id = part.value as string;
                    }
                }
            }

            // Validação simples
            if (!fileBuffer || !produto_id) {
                return reply.status(400).send({ error: 'Arquivo ou ID do produto ausente.' });
            }

            // 2. Subir para o Supabase Storage
            const path = `produtos/${Date.now()}-${fileName}`;
            const { data: storageData, error: storageError } = await supabase.storage
                .from('produtos') // Substitua pelo nome real do seu bucket
                .upload(path, fileBuffer, {
                    contentType: mimeType,
                    upsert: true
                });

            if (storageError) throw storageError;

            const { data: urlData } = supabase.storage
                .from('produtos')
                .getPublicUrl(path);

            const publicUrl = urlData.publicUrl;

            const novaImagem = await prisma.imagens.create({
                data: {
                    produto_id: Number(produto_id),
                    tema_id: tema_id ? Number(tema_id) : null,
                    img_url: publicUrl // Verifique se o campo no banco é 'img_url' em vez de 'url'
                }
            });

            return reply.send({ ok: true, data: novaImagem });

        } catch (error) {
            console.error('Erro no upload:', error);
            return reply.status(500).send({ error: 'Erro ao processar upload e salvar no banco' });
        }
    });

}