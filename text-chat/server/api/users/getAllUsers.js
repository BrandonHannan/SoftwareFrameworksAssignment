const connectDB = require('../../database');

module.exports = async function (req, res) {
    try {
        const db = await connectDB();
        const dataDocument = await db.collection('db').findOne({});

        if (!dataDocument || !dataDocument.users) {
            return res.status(200).json([]);
        }

        // Omit password field
        const usersToReturn = dataDocument.users.map(({ password, ...user }) => user);

        res.status(200).json(usersToReturn);

    } catch (err) {
        console.error("Error getting all users:", err);
        res.status(500).json([]);
    }
};