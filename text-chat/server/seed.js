const fs = require('fs');
const path = require('path');

const seedDatabase = async (db) => {
    try {
        const collection = db.collection('db');
        const documentCount = await collection.countDocuments();

        // Only insert into the collection if the database is empty
        if (documentCount === 0) {
            console.log('Collection is empty. Seeding database from seed.json...');
            
            // Read the base data.json file
            const seedDataPath = path.join(__dirname, './data/baseData.json');
            const seedData = JSON.parse(fs.readFileSync(seedDataPath, 'utf-8'));

            await collection.insertOne(seedData);
            
            console.log('Database seeded');
        } else {
            console.log('Database already contains data. Skipping seed.');
        }
    } catch (error) {
        console.error('Error during database seeding:', error);
    }
};

module.exports = seedDatabase;