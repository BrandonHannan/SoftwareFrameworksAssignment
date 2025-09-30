const { MongoClient } = require('mongodb');
require('dotenv').config();

// Connects to the local mongosh client
const uri = "mongodb://localhost:27017";

const client = new MongoClient(uri);

const seedDatabase = require('./seed');

let db;

async function connectDB() {
    if (db) return db;
    try {
        // Connects to the 'db' collection
        await client.connect();
        db = client.db("db");

        // Seeds the collection if it is empty
        await seedDatabase(db);
        
        return db;
    } catch (e) {
        console.error(e);
        throw e;
    }
}

module.exports = connectDB;