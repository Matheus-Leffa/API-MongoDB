import OpenAI from "openai";
const client = new OpenAI();

import express from 'express';
import connection from './db.js';

const app = express();
const PORT = process.env.PORT || 3000;
const COLLECTION = 'pesquisa';

function chatgptResponse(pergunta, resposta){
    return client.responses.create({
         model:"gpt-5.5",
        input:`Pergunta: ${pergunta} - Resposta: ${resposta} - Prompt: Baseado nesses dados, avalie o sentimento do usuário na mensagem e gere metricas relacionadas ao conteúdo para relatórios, gerando um JSON conforme esse modelo: {
  "extracao_dados": {
    "limpeza": {
      "avaliacao": "",
      "detalhes": [
      ]
    },
    "insumos": {
    },
    "infraestrutura": {
      "cabines": {
      },
      "trancas": {
      }
    }
  },
  "analise_sentimento": {
    "sentimento_geral": "",
    "score": ,
    "justificativa": ""
  },
  "metricas": {
    "limpeza_score":,
    "insumos_score":,
    "infraestrutura_score":,
    "conforto_score": ,
    "satisfacao_geral": ,
    "principais_problemas": [
      
    ],
    "pontos_positivos": [
    ]
  }
} .`
    });
}

app.get('/pesquisa', async (req, res) => {

    const db = await connection.getDb();
    const docs = await db.collection(COLLECTION).find({}).toArray();
    await Promise.all(docs.map(async (doc) =>{
        doc.metricas = await chatgptResponse(doc.pergunta, doc.resposta);
        let responseChatgpt = JSON.parse(doc.metricas.output_text);

        await db.collection(COLLECTION).updateOne({_id: doc._id}, {$set: {metricas: responseChatgpt}});

    }));
    res.json({ total: docs.length, dados: docs });
});

app.get('/relatorio/negativo', async (req, res) => {

    const db = await connection.getDb();


    const docs = await db.collection(COLLECTION).aggregate([
    {
      $unwind: "$metricas.principais_problemas"
    },
    {
      $group: {
        _id: "$metricas.principais_problemas",
        ocorrencias: {
          $sum: 1
        }
      }
    },
    {
      $sort: {
        ocorrencias: -1
      }
    }
    ]).toArray();

    
    res.json(docs);
});

app.get('/relatorio/positivo', async (req, res) => {

    const db = await connection.getDb();


    const docs = await db.collection(COLLECTION).aggregate([
    {
      $unwind: "$metricas.pontos_positivos"
    },
    {
      $group: {
        _id: "$metricas.pontos_positivos",
        ocorrencias: {
          $sum: 1
        }
      }
    },
    {
      $sort: {
        ocorrencias: -1
      }
    }
    ]).toArray();

    
    res.json(docs);
});

app.listen(PORT, () => {
console.log(`Servidor rodando em http://localhost:${PORT}`);
});