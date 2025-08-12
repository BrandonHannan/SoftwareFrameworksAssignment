const connectDB = require('../../database');

module.exports = async function(req, res) {
    if (!req.body){
        return res.status(400).json({"valid": false, "error": "Invalid new group"});
    }
    newReport = {
        "usernameReported": req.body.usernameReported,
        "userProfilePicture": req.body.userProfilePicture,
        "adminReport": req.body.adminReport,
        "adminProfilePicture": req.body.adminProfilePicture,
        "groupId": req.body.groupId
    }

    try {
        const db = await connectDB();
        const dataDocument = await db.collection('db').findOne({});

        if (!dataDocument) {
            return res.status(404).json({ "valid": false, "error": "Database document not found" });
        }

        // Update the document by pushing the new report to all SuperAdmins
        const result = await db.collection('db').updateOne(
            { _id: dataDocument._id },
            { $push: { "users.$[elem].reports": newReport } },
            { arrayFilters: [ { "elem.roles": "SuperAdmin" } ] }
        );

        if (result.modifiedCount === 1){
            res.status(200).json({"valid": true, "error": ""});
        }
        else {
            res.status(400).json({"valid": false, "error": "Error creating new group"});
        }
    }
    catch (err){
        res.status(500).json({"valid": false, "error": "Error connecting to mongo database"});
    }
}