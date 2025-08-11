const connectDB = require('../../database');

module.exports = async function(req, res) {
    if (!req.query){
        return res.status(400).json({"group": null, "valid": false, "error": "Invalid group request"});
    }
    groupRequest = {
        "id": parseInt(req.query.id, 10)
    }

    try {
        const db = await connectDB();
        const dataDocument = await db.collection('db').findOne({});
        const groups = dataDocument ? dataDocument.groups : [];
        const foundGroup = groups.find(group => group.id === groupRequest.id);
        if (foundGroup) {
            const groupToReturn = {
                "id": foundGroup.id,
                "name": foundGroup.name,
                "users": foundGroup.users,
                "channels": foundGroup.channels
            }
            res.status(200).json({"group": groupToReturn, "valid": true, "error": ""});
        }
        else{
            res.status(200).json({"group": null, "valid": false, "error": "Invalid group"})
        }
    }
    catch (err) {
        res.status(500).json({"group": null, "valid": false, "error": "Error connecting to mongo database"});
    }
}