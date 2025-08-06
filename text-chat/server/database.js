const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://db:db@db.uew5fsq.mongodb.net/?retryWrites=true&w=majority&appName=db";

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