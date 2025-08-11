const connectDB = require('../../database');

module.exports = async function(req, res) {
    try {
        const db = await connectDB();
        const dataDocument = await db.collection('db').findOne({});
        const groups = dataDocument ? dataDocument.groups : [];
        if (groups.length > 0){
            return res.status(200).json({"groups": groups, "valid": true, "error": ""});
        }
        else{
            res.status(200).json({"groups": null, "valid": false, "error": "No groups found"})
        }
    }
    catch (err) {
        res.status(500).json({"groups": null, "valid": false, "error": "Error connecting to mongo database"});
    }
}