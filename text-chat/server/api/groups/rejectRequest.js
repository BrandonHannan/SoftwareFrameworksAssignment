const connectDB = require('../../database');

module.exports = async function(req, res) {
    if (!req.query){
        return res.status(400).json({"valid": false, "error": "Invalid request"});
    }

    const request = JSON.parse(req.query.request);

    try {
        const db = await connectDB();
        const result = await db.collection('db').updateOne(
            { },
            { 
                $pull: { 
                    "users.$[].requests": { 
                        username: request.username,
                        groupId: request.groupId 
                    } 
                } 
            }
        );
        if (result.modifiedCount === 1) {
            res.status(200).json({"valid": true, "error": "Request deleted successfully"});
        } else {
            res.status(404).json({"valid": false, "error": "Request not found"});
        }
    }
    catch (err) {
        res.status(500).json({"valid": false, "error": err.message});
    }
};