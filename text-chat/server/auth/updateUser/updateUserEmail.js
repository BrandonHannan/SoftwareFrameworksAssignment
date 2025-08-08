const connectDB = require('../../database');

module.exports = async function (req, res) {
    if (!req.body) {
        return res.status(400).json({ "valid": false, "error": "Invalid update details" });
    }

    const userInfo = {
        currentUsername: req.body.currentUsername,
        email: req.body.email
    };

    try {
        const db = await connectDB();
        const result = await db.collection('db').updateOne(
            { "users.username": userInfo.currentUsername },
            { $set: { "users.$.email": userInfo.email } }
        );
        if (result.matchedCount === 0) {
            return res.status(404).json({ "valid": false, "error": "User not found" });
        }
        res.status(200).json({ "valid": true, "error": "" });
    }
    catch (err){
        res.status(500).json({ "valid": false, "error": err.message });
    }

}