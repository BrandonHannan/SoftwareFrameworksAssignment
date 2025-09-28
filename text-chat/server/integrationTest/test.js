const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../server'); 
const connectDB = require('../database');
const expect = chai.expect;

chai.use(chaiHttp);

describe('Auth API', () => {
    let db;

    beforeEach(async () => {
        db = await connectDB();
        await db.collection('db').deleteMany({});
        const seedData = require('../data/baseData.json');
        await db.collection('db').insertOne(seedData);
    });

    after(async () => {
        db = await connectDB();
        await db.collection('db').deleteMany({});
        const seedData = require('../data/baseData.json');
        await db.collection('db').insertOne(seedData);
    })

    describe('POST /api/login', () => {
        it('it should login a user with correct credentials', (done) => {
            chai.request(server)
                .post('/api/login')
                .send({ username: 'super', password: '123' })
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body.valid).to.be.true;
                    expect(res.body.user).to.have.property('username', 'super');
                    done();
                });
        });

        it('it should not login with incorrect credentials', (done) => {
            chai.request(server)
                .post('/api/login')
                .send({ username: 'super', password: 'wrongpassword' })
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body.valid).to.be.false;
                    expect(res.body.error).to.equal('Invalid login credentials');
                    done();
                });
        });
    });

    describe('POST /api/register', () => {
        it('it should register a new user', (done) => {
            chai.request(server)
                .post('/api/register')
                .send({ username: 'newuser', email: 'new@test.com', password: 'password' })
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body.valid).to.be.true;
                    expect(res.body.user.username).to.equal('newuser');
                    done();
                });
        });

        it('it should not register a user with an existing username', (done) => {
            chai.request(server)
                .post('/api/register')
                .send({ username: 'super', email: 'another@test.com', password: 'password' })
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body.valid).to.be.false;
                    expect(res.body.error).to.equal('Username already exists');
                    done();
                });
        });
    });

    describe('DELETE /api/deleteAccount', () => {
        it('it should delete an account', (done) => {
            // ID of dummy user from seed
            const userIdToDelete = 1; 
            chai.request(server)
                .delete(`/api/deleteAccount?id=${userIdToDelete}`)
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body.valid).to.be.true;
                    done();
                });
        });
    });
});

describe('Users API', () => {
    let db;

    beforeEach(async () => {
        db = await connectDB();
        await db.collection('db').deleteMany({});
        const seedData = require('../data/baseData.json');
        await db.collection('db').insertOne(seedData);
    });

    after(async () => {
        db = await connectDB();
        await db.collection('db').deleteMany({});
        const seedData = require('../data/baseData.json');
        await db.collection('db').insertOne(seedData);
    })

    describe('GET /api/getAllUsers', () => {
        it('it should get all users', (done) => {
            chai.request(server)
                .get('/api/getAllUsers')
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.be.an('array');
                    expect(res.body.length).to.be.above(0);
                    done();
                });
        });
    });

    describe('GET /api/get/userInfo', () => {
        it('it should get a single user\'s info', (done) => {
            chai.request(server)
                .get('/api/get/userInfo?username=super')
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body.valid).to.be.true;
                    expect(res.body.user).to.have.property('username', 'super');
                    done();
                });
        });
    });

    describe('PATCH /api/updateUser/adminGroups', () => {
        it('it should update a user\'s admin groups', (done) => {
            const update = {
                currentUsername: 'super',
                adminGroups: [{
                    "id": 0,
                    "name": "Initial Group",
                    "users": [
                        {
                            "username": "super",
                            "profilePicture": null,
                            "role": "SuperAdmin"
                        }
                    ],
                    "channels": []
                }]
            };
            chai.request(server)
                .patch('/api/updateUser/adminGroups')
                .send(update)
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body.valid).to.be.true;
                    done();
                });
        });
    });

    describe('PATCH /api/updateUser/email', () => {
        it('it should update a user\'s email', (done) => {
            chai.request(server)
                .patch('/api/updateUser/email')
                .send({ currentUsername: 'super', email: 'newemail@test.com' })
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body.valid).to.be.true;
                    done();
                });
        });
    });

    describe('PATCH /api/updateUser/groups', () => {
        it('it should update a user\'s groups', (done) => {
            const update = {
                currentUsername: 'dummy',
                groups: [{
                    "id": 0,
                    "name": "Initial Group",
                    "users": [
                        {
                            "username": "super",
                            "profilePicture": null,
                            "role": "SuperAdmin"
                        }
                    ],
                    "channels": []
                }]
            };
            chai.request(server)
                .patch('/api/updateUser/groups')
                .send(update)
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body.valid).to.be.true;
                    done();
                });
        });
    });

    describe('PATCH /api/updateUser/password', () => {
        it('it should update a user\'s password', (done) => {
            chai.request(server)
                .patch('/api/updateUser/password')
                .send({ currentUsername: 'super', password: 'newpassword' })
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body.valid).to.be.true;
                    done();
                });
        });
    });

    describe('PATCH /api/updateUser/profilePicture', () => {
        it('it should update a user\'s profile picture', (done) => {
            chai.request(server)
                .patch('/api/updateUser/profilePicture')
                .send({ currentUsername: 'super', profilePicture: 'new-pic-url' })
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body.valid).to.be.true;
                    done();
                });
        });
    });

    describe('POST /api/promoteUser', () => {
        it('it should update a user\'s role', (done) => {
            const userToAdd = {
                "id": 1,
                "username": "dummy",
                "email": "dummy@email.com",
                "profilePicture": null,
                "roles": [
                    "User"
                ],
                "password": "123",
                "groups": [],
                "adminGroups": [],
                "requests": [],
                "allowedChannels": [],
                "reports": []
            };
            chai.request(server)
                .post('/api/addNewUser')
                .send({ groupId: 0, user: userToAdd })
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body.valid).to.be.true;

                    chai.request(server)
                        .post('/api/promoteUser')
                        .send({ username: 'dummy', groupId: 0, role: 'GroupAdmin' })
                        .end((err, res) => {
                            expect(res).to.have.status(200);
                            expect(res.body.valid).to.be.true;
                            done();
                        });
                });
        });
    });

    describe('PATCH /api/updateUser/username', () => {
        it('it should update a user\'s username', (done) => {
            chai.request(server)
                .patch('/api/updateUser/username')
                .send({ currentUsername: 'super', username: 'newsuper' })
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body.valid).to.be.true;
                    done();
                });
        });
    });
});

describe('Groups API', () => {
    let db;

    beforeEach(async () => {
        db = await connectDB();
        await db.collection('db').deleteMany({});
        const seedData = require('../data/baseData.json');
        await db.collection('db').insertOne(seedData);
    });

    after(async () => {
        db = await connectDB();
        await db.collection('db').deleteMany({});
        const seedData = require('../data/baseData.json');
        await db.collection('db').insertOne(seedData);
    })

    describe('GET /api/get/allGroups', () => {
        it('it should get all groups', (done) => {
            chai.request(server)
                .get('/api/get/allGroups')
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body.valid).to.be.true;
                    expect(res.body.groups).to.be.an('array');
                    expect(res.body.groups.length).to.be.above(0);
                    done();
                });
        });
    });

    describe('POST /api/createGroup', () => {
        it('it should create a new group', (done) => {
            const newGroup = {
                name: 'Test Group',
                username: 'super',
                role: 'SuperAdmin'
            };
            chai.request(server)
                .post('/api/createGroup')
                .send(newGroup)
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body.valid).to.be.true;
                    expect(res.body.group.name).to.equal('Test Group');
                    done();
                });
        });
    });

    describe('POST /api/addNewUserToGroup', () => {
        it('it should add a user to a group', (done) => {
            const userToAdd = {
                "id": 1,
                "username": "dummy",
                "email": "dummy@email.com",
                "profilePicture": null,
                "roles": [
                    "User"
                ],
                "password": "123",
                "groups": [],
                "adminGroups": [],
                "requests": [],
                "allowedChannels": [],
                "reports": []
            }
            chai.request(server)
                .post('/api/addNewUser')
                .send({ groupId: 0, user: userToAdd })
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body.valid).to.be.true;
                    done();
                });
        });
    });

    describe('GET /api/get/group', () => {
        it('it should get a single group by id', (done) => {
            chai.request(server)
                .get('/api/get/group?id=0')
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body.valid).to.be.true;
                    expect(res.body.group).to.have.property('id', 0);
                    expect(res.body.group.name).to.equal('Initial Group');
                    done();
                });
        });
    });

    describe('DELETE /api/rejectRequest', () => {
        it('it should reject a request to join a group', (done) => {
            const requestToReject = {
                username: 'dummy',
                groupId: 0,
                group: 'Initial Group'
            };
            chai.request(server)
                .delete('/api/rejectRequest')
                .query({ request: JSON.stringify(requestToReject) })
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body.valid).to.be.true;
                    done();
                });
        });
    });

    describe('DELETE /api/removeGroup', () => {
        it('it should remove a group', (done) => {
            chai.request(server)
                .delete('/api/removeGroup?id=1')
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body.valid).to.be.true;
                    done();
                });
        });
    });

    describe('DELETE /api/removeUserFromGroup', () => {
        it('it should remove a user from a group', (done) => {
            const userToRemove = {
                username: 'super'
            };
            chai.request(server)
                .delete('/api/removeUserFromGroup')
                .query({ user: JSON.stringify(userToRemove), groupId: 0 })
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body.valid).to.be.true;
                    done();
                });
        });
    });
    

    describe('Integration: User Authentication and Group Management', () => {
        it('A new user can register, login, request to join a group, and be accepted', (done) => {
            // Register
            chai.request(server)
                .post('/api/register')
                .send({ username: 'e2eUser', email: 'e2e@test.com', password: 'password' })
                .end((err, res) => {
                    expect(res.body.valid).to.be.true;
                    
                    // Login
                    chai.request(server)
                        .post('/api/login')
                        .send({ username: 'e2eUser', password: 'password' })
                        .end((err, res) => {
                            expect(res.body.valid).to.be.true;
                            const user = res.body.user;

                            // Request to join group 'Initial Group'
                            chai.request(server)
                                .post('/api/requestGroup')
                                .send({ username: user.username, profilePicture: user.profilePicture, groupId: 0, group: 'Initial Group' })
                                .end((err, res) => {
                                    expect(res.body.valid).to.be.true;

                                    // Admin accepts request to the join the group
                                    chai.request(server)
                                        .post('/api/acceptRequest')
                                        .send({ username: user.username, profilePicture: user.profilePicture, groupId: 0, group: 'Initial Group' })
                                        .end((err, res) => {
                                            expect(res.body.valid).to.be.true;
                                            done();
                                        });
                                });
                        });
                });
        });
    });
});


describe('Channels API', () => {
    let db;

    beforeEach(async () => {
        db = await connectDB();
        await db.collection('db').deleteMany({});
        const seedData = require('../data/baseData.json');
        await db.collection('db').insertOne(seedData);
    });

    after(async () => {
        db = await connectDB();
        await db.collection('db').deleteMany({});
        const seedData = require('../data/baseData.json');
        await db.collection('db').insertOne(seedData);
    })

    describe('POST /api/createChannel', () => {
        it('it should create a new channel in a group', (done) => {
            const newChannel = {
                channelName: 'New Test Channel',
                groupId: 0
            };
            chai.request(server)
                .post('/api/createChannel')
                .send(newChannel)
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body.valid).to.be.true;
                    done();
                });
        });
    });

    describe('POST /api/addUserToChannel', () => {
        it('it should add a user to a channel', (done) => {
            const channelInfo = {
                groupId: 0,
                channelId: 0,
                name: 'Initial Channel',
                username: 'dummy',
                channelObject: {
                    groupId: 0,
                    id: 0,
                    name: "Initial Channel",
                    messages: [],
                    allowedUsers: []
                }
            };
            chai.request(server)
                .post('/api/addUserToChannel')
                .send(channelInfo)
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body.valid).to.be.true;
                    done();
                });
        });
    });

    describe('POST /api/banUserFromChannel', () => {
        it('it should ban a user from a channel', (done) => {
            const addUserInfo = {
                groupId: 0,
                channelId: 0,
                name: 'Initial Channel',
                username: 'super',
                channelObject: {
                    groupId: 0,
                    id: 0,
                    name: "Initial Channel",
                    messages: [],
                    allowedUsers: []
                }
            };
            chai.request(server)
                .post('/api/addUserToChannel')
                .send(addUserInfo)
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body.valid).to.be.true;

                    const banUserInfo = {
                        groupId: 0,
                        id: 0,
                        name: 'Initial Channel',
                        username: 'super'
                    };
                    chai.request(server)
                        .post('/api/banUserFromChannel')
                        .send(banUserInfo)
                        .end((err, res) => {
                            expect(res).to.have.status(200);
                            expect(res.body.valid).to.be.true;
                            done();
                        });
                });
        });
    });

    describe('DELETE /api/removeChannel', () => {
        it('it should remove a channel from a group', (done) => {
            const request = {
                groupId: 0,
                channelId: 0
            };
            chai.request(server)
                .delete('/api/removeChannel')
                .query({ request: JSON.stringify(request) })
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body.valid).to.be.true;
                    done();
                });
        });
    });
});