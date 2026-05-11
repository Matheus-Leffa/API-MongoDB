const http = require('http');
const { ObjectId } = require('mongodb');
const { getDb, closeDb } = require('./db');

const PORT = 3000;
const COLLECTION = 'pesquisa';

function sendJson(res, status, payload) {
const body = JSON.stringify(payload);
res.writeHead(status, {
'Content-Type': 'application/json; charset=utf-8',
'Content-Length': Buffer.byteLength(body),
});
res.end(body);
}

function readBody(req) {
return new Promise((resolve, reject) => {
const chunks = [];
req.on('data', (chunk) => chunks.push(chunk));
req.on('end', () => {
if (chunks.length === 0) return resolve({});
try {
resolve(JSON.parse(Buffer.concat(chunks).toString('utf-8')));
} catch (err) {
reject(new Error('JSON inválido no corpo da requisição'));
}
});
req.on('error', reject);
});
}

async function handler(req, res) {
const { method, url } = req;
const [path, query] = url.split('?');

if (method === 'GET' && path === '/') {
return sendJson(res, 200, {
status: 'ok',
mensagem: 'API Node + MongoDB',
rotas: [
'GET /usuarios lista todos',
'GET /usuarios/:id busca por id',
'POST /usuarios cria novo',
'DELETE /usuarios/:id remove',
],
});
}

if (method === 'GET' && path === '/usuarios') {
const db = await getDb();
const docs = await db.collection(COLLECTION).find({}).toArray();
return sendJson(res, 200, { total: docs.length, dados: docs });
}

const matchById = path.match(/^\/usuarios\/([a-fA-F0-9]{24})$/);

if (method === 'GET' && matchById) {
const db = await getDb();
const doc = await db.collection(COLLECTION).findOne({ _id: new ObjectId(matchById[1]) });
if (!doc) return sendJson(res, 404, { erro: 'Usuário não encontrado' });
return sendJson(res, 200, doc);
}

if (method === 'POST' && path === '/usuarios') {
const body = await readBody(req);
if (!body.nome || !body.email) {
return sendJson(res, 400, { erro: 'Campos "nome" e "email" são obrigatórios' });
}
const db = await getDb();
const result = await db.collection(COLLECTION).insertOne(body);
return sendJson(res, 201, { _id: result.insertedId, ...body });
}

if (method === 'DELETE' && matchById) {
const db = await getDb();
const result = await db.collection(COLLECTION).deleteOne({ _id: new ObjectId(matchById[1]) });
if (result.deletedCount === 0) return sendJson(res, 404, { erro: 'Usuário não encontrado' });
return sendJson(res, 200, { removido: true });
}

sendJson(res, 404, { erro: 'Rota não encontrada', path, method });
}

const server = http.createServer(async (req, res) => {
try {
await handler(req, res);
} catch (err) {
console.error('Erro na requisição:', err);
sendJson(res, 500, { erro: 'Erro interno', detalhe: err.message });
}
});

server.listen(PORT, () => {
console.log(`Servidor rodando em http://localhost:${PORT}`);
});

async function shutdown(sinal) {
console.log(`\nRecebido ${sinal}, encerrando...`);
server.close(async () => {
await closeDb();
process.exit(0);
});
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));