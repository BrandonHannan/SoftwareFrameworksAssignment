const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri);

let db;

async function connectDB() {
    if (db) return db;
    try {
        await client.connect();
        db = client.db("db");
        return db;
    } catch (e) {
        console.error(e);
        throw e;
    }
}

module.exports = connectDB;