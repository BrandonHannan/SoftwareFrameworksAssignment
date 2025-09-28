const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = "mongodb://localhost:27017";

const client = new MongoClient(uri);

const seedDatabase = require('./seed');

let db;

async function connectDB() {
    if (db) return db;
    try {
        await client.connect();
        db = client.db("db");

        await seedDatabase(db);
        
        return db;
    } catch (e) {
        console.error(e);
        throw e;
    }
}

module.exports = connectDB;