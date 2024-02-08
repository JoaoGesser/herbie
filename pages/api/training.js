import {OpenAI  } from "openai";
import {Pool} from "pg";
import {Readable} from "stream";
const fs = require('fs');

const pool = new Pool({
    user: 'herbie',
    host: 'localhost',
    database: 'herbie',
    password: 'root',
    port: 5432,
  });
const openai = new OpenAI();
export default async function (req, res) {
    console.log("Entrouu!")
    try {
        const client = await pool.connect();
    
        try {
          // Execute consultas SQL para obter dados de múltiplas entidades
          const result1 = await client.query(`
                SELECT m.id, m.conteudo, mv.observacao, c.codigo, c.descricao  FROM mensagem m
                inner join mensagem_validacao mv on m.id = mv.mensagem_id    
                inner join categoria c on c.id = mv.categoria_id                        
          `).then(resultado => {
            const linhas = resultado.rows;

            // Estrutura para armazenar os resultados agrupados por usuário
            const resultadosAgrupados = [];
        
            for (const linha of linhas) {
              const { id, conteudo, observacao, codigo, descricao } = linha;
        
              // Se o usuário ainda não estiver no objeto agrupado, crie uma entrada para ele
              if (!resultadosAgrupados[id]) {
                resultadosAgrupados[id] = {
                  id,
                  conteudo,
                  validacoes: [],
                };
              }
        
              // Adicione o pedido ao array de pedidos do usuário
              resultadosAgrupados[id].validacoes.push({
                observacao,
                codigo,
                descricao,
              });
              return resultadosAgrupados;
            }   
          });
          
          
          let payload = gerarPayloadTreinamento(result1);
          enviarParaTreinamento(payload);
          

        } finally {
          client.release();
        }
      } catch (err) {
        console.error('Erro ao obter dados do banco de dados', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
}


function gerarPayloadTreinamento(dados) {
    const payload = [];
    
    for (const umDado of dados) {
        if (!umDado) continue;
        
        const { conteudo, validacoes } = umDado;
        const row = {messages: [],}

        row.messages.push(
            {
                role: "system",
                content: `Herbie é um robô que analisa conversas do mundo corporativo. Seu objetivo é identificar e classificar respostas inapropriadas para os clientes da empresa. Em sua resposta ele informa quais categorias foram infringidas, além de uma observação para cada infração. Mostrando a onde na mensagem esta a infração e dicas para melhorar. As classificações de respostas inapropriadas são: ${JSON.stringify(validacoes)}`,
            },
            {
                role: "user",
                content: `Herbie analise esse conteudo: ${JSON.stringify(conteudo)}`,
            },
            {
                role: "assistant",
                content: `${JSON.stringify(validacoes)}`,
            } 
        );

        payload.push(row);   
    };

    return payload;
}

async function enviarParaTreinamento(payload) {
    let arquivo = gerarArquivo(payload);
    console.log(fs.createReadStream(arquivo))
    const file = await openai.files.create({
        file: fs.createReadStream(arquivo),
        purpose: "fine-tune",
      });
    
      console.log(file);
}


function gerarArquivo(payload) {
    const caminhoArquivo = 'exemplo.jsonl';

    const escreverStream = fs.createWriteStream(caminhoArquivo, { encoding: 'utf8' });

    // Escrever cada objeto no stream como uma linha JSONL
    payload.forEach(objeto => {
        const linhaJSONL = JSON.stringify(objeto);
        escreverStream.write(linhaJSONL + '\n');
    });

    // Fechar o stream após todos os objetos terem sido escritos
    escreverStream.end();
    return caminhoArquivo;
  }