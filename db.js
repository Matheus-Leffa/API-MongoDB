import { MongoClient } from 'mongodb';

const URI = process.env.MONGO_URI || 'mongodb+srv://pesquisa01:senhapesquisa01@cluster3.63nsmzo.mongodb.net/?appName=Cluster3';
const DB_NAME = process.env.MONGO_DB || 'pesquisa';

let clientPromise;

export function getClient() {
if (!clientPromise) {
const client = new MongoClient(URI, {
serverSelectionTimeoutMS: 8000,
});
clientPromise = client.connect();
}
return clientPromise;
}

export async function getDb() {
const client = await getClient();
return client.db(DB_NAME);
}

async function closeDb() {
if (clientPromise) {
const client = await clientPromise;
await client.close();
clientPromise = null;
}
}

export default { getDb, closeDb, DB_NAME };