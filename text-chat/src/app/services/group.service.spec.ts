import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { GroupService } from './group.service';
import { NotificationService } from './notification.service';
import { AuthenticationService } from './auth.service';
import { Group, GroupResult } from '../models/group.model';
import { AuthResult, SessionStorageUser } from '../models/user.model';
import { State } from '../models/state.model';
import { Channel } from '../models/channel.model';
import { Request } from '../models/request.model';

describe('GroupService', () => {
    let service: GroupService;
    let httpMock: HttpTestingController;
    let notificationServiceSpy: jasmine.SpyObj<NotificationService>;
    let authServiceSpy: jasmine.SpyObj<AuthenticationService>;

    const mockGroupUser: any = { username: 'testuser', profilePicture: null, roles: ['User'] };
    const mockChannel: Channel = { id: 101, name: 'General', groupId: 1, allowedUsers: [], messages: [] };
    const mockGroup: Group = { id: 1, name: 'Test Group', users: [], channels: [mockChannel] };
    const mockUser: SessionStorageUser = { id: 1, username: 'testuser', email: 'test@test.com', profilePicture: null, roles: ['User'], groups: [mockGroup], adminGroups: [], requests: [], allowedChannels: [], reports: [] };
    const mockState: State = { currentGroup: mockGroup, currentChannel: mockChannel };
    const mockRequest: Request = { username: 'requester', profilePicture: null, groupId: 1, group: 'Test Group' };
    const mockMessage: any = { id: 'msg1', username: 'testuser', profilePicture: null, message: 'Hello', groupId: 1, channelId: 101 };

    beforeEach(() => {
        const notificationSpy = jasmine.createSpyObj('NotificationService', ['show']);
        const authSpy = jasmine.createSpyObj('AuthenticationService', ['getUserInfo']);

        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [
                GroupService,
                { provide: NotificationService, useValue: notificationSpy },
                { provide: AuthenticationService, useValue: authSpy }
            ]
        });

        service = TestBed.inject(GroupService);
        httpMock = TestBed.inject(HttpTestingController);
        notificationServiceSpy = TestBed.inject(NotificationService) as jasmine.SpyObj<NotificationService>;
        authServiceSpy = TestBed.inject(AuthenticationService) as jasmine.SpyObj<AuthenticationService>;
    });

    afterEach(() => {
        // Ensures no outstanding requests
        httpMock.verify();
        localStorage.clear();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('ngOnInit', () => {
        it('should initialize state from localStorage if it exists', () => {
            localStorage.setItem('State', JSON.stringify(mockState));
            service.ngOnInit();
            expect(service.getCurrentGroup()).toEqual(mockGroup);
            expect(service.getCurrentChannel()).toEqual(mockChannel);
        });

        it('should not initialize state if localStorage is empty', () => {
            service.ngOnInit();
            expect(service.getCurrentGroup()).toBeNull();
            expect(service.getCurrentChannel()).toBeNull();
        });
    });

    describe('setCurrentGroup', () => {
        it('should set current group and update state in localStorage', async () => {
            localStorage.setItem('State', JSON.stringify({ currentGroup: null, currentChannel: null }));
            const mockApiResponse: GroupResult = { valid: true, group: mockGroup, error: '' };

            const promise = service.setCurrentGroup(1);
            
            const req = httpMock.expectOne(`${service['serverUrl']}/api/get/group?id=1`);
            req.flush(mockApiResponse);

            const result = await promise;
            expect(result).toBe(true);
            expect(service.getCurrentGroup()).toEqual(mockGroup);
            const storedState = JSON.parse(localStorage.getItem('State')!);
            expect(storedState.currentGroup).toEqual(mockGroup);
        });

        it('should create new state in localStorage if none exists', async () => {
            const mockApiResponse: GroupResult = { valid: true, group: mockGroup, error: '' };
            
            const promise = service.setCurrentGroup(1);

            const req = httpMock.expectOne(`${service['serverUrl']}/api/get/group?id=1`);
            req.flush(mockApiResponse);

            const result = await promise;
            expect(result).toBe(true);
            expect(localStorage.getItem('State')).toBeDefined();
            const storedState = JSON.parse(localStorage.getItem('State')!);
            expect(storedState.currentGroup).toEqual(mockGroup);
        });

        it('should return false and show notification on API error', async () => {
            const mockApiResponse: GroupResult = { valid: false, group: null, error: 'Group not found' };
            const promise = service.setCurrentGroup(1);
            const req = httpMock.expectOne(`${service['serverUrl']}/api/get/group?id=1`);
            req.flush(mockApiResponse);

            const result = await promise;
            expect(result).toBe(false);
            expect(notificationServiceSpy.show).toHaveBeenCalledWith('Group not found', 'error');
        });
    });

    describe('setCurrentChannel', () => {
        it('should set current channel and group if channel is found', async () => {
            localStorage.setItem('State', JSON.stringify(mockState));
            const mockApiResponse: GroupResult = { valid: true, group: mockGroup, error: '' };

            const promise = service.setCurrentChannel(mockChannel);
            const req = httpMock.expectOne(`${service['serverUrl']}/api/get/group?id=${mockChannel.groupId}`);
            req.flush(mockApiResponse);

            const result = await promise;
            expect(result).toBe(true);
            expect(service.getCurrentChannel()).toEqual(mockChannel);
            expect(service.getCurrentGroup()).toEqual(mockGroup);
            const storedState = JSON.parse(localStorage.getItem('State')!);
            expect(storedState.currentChannel).toEqual(mockChannel);
        });

        it('should show notification and return false if channel is not found in group', async () => {
            localStorage.setItem('State', JSON.stringify(mockState));
            const groupWithoutChannel = { ...mockGroup, channels: [] };
            const mockApiResponse: GroupResult = { valid: true, group: groupWithoutChannel, error: '' };

            const promise = service.setCurrentChannel(mockChannel);
            const req = httpMock.expectOne(`${service['serverUrl']}/api/get/group?id=${mockChannel.groupId}`);
            req.flush(mockApiResponse);

            const result = await promise;
            expect(result).toBe(false);
            expect(notificationServiceSpy.show).toHaveBeenCalledWith(`Unable to find channel: ${mockChannel.name} in group: ${groupWithoutChannel.name}`, 'error');
        });

        it('should create and set a new state if none exists in localStorage', async () => {
            const mockApiResponse: GroupResult = { valid: true, group: mockGroup, error: '' };
            
            expect(localStorage.getItem('State')).toBeNull();

            const promise = service.setCurrentChannel(mockChannel);
            
            const req = httpMock.expectOne(`${service['serverUrl']}/api/get/group?id=${mockChannel.groupId}`);
            req.flush(mockApiResponse);

            const result = await promise;
            expect(result).toBe(true);
            
            const storedState = JSON.parse(localStorage.getItem('State')!);
            expect(storedState).toBeDefined();
            expect(storedState.currentGroup).toEqual(mockGroup);
            expect(storedState.currentChannel).toEqual(mockChannel);
        });
    });

    describe('rejectRequest', () => {
        it('should reject request and update credentials on success', async () => {
            const userWithRequest = { ...mockUser, requests: [mockRequest] };
            localStorage.setItem('Credentials', JSON.stringify(userWithRequest));
            const mockApiResponse: AuthResult = { valid: true, error: '' };

            const promise = service.rejectRequest(mockRequest);
            
            const req = httpMock.expectOne(req => req.method === 'DELETE' && req.url.includes('/api/rejectRequest'));
            req.flush(mockApiResponse);

            const result = await promise;
            expect(result).toBe(true);
            const updatedUser = JSON.parse(localStorage.getItem('Credentials')!);
            expect(updatedUser.requests.length).toBe(0);
            expect(notificationServiceSpy.show).toHaveBeenCalledWith(`${mockRequest.username} rejected from ${mockRequest.group}`, 'error');
        });
    });

    describe('acceptRequest', () => {
        it('should accept request and update credentials on success', async () => {
            const userWithRequest = { ...mockUser, requests: [mockRequest] };
            localStorage.setItem('Credentials', JSON.stringify(userWithRequest));
            const mockApiResponse: AuthResult = { valid: true, error: '' };
            
            const promise = service.acceptRequest(mockRequest);
            const req = httpMock.expectOne(`${service['serverUrl']}/api/acceptRequest`);
            req.flush(mockApiResponse);
            
            const result = await promise;
            expect(result).toBe(true);
            const updatedUser = JSON.parse(localStorage.getItem('Credentials')!);
            expect(updatedUser.requests.length).toBe(0);
            expect(notificationServiceSpy.show).toHaveBeenCalledWith(`${mockRequest.username} added to ${mockRequest.group}`, 'success');
        });
    });
    
    describe('requestGroup', () => {
        it('should send a group request and return true on success', async () => {
            const mockApiResponse: AuthResult = { valid: true, error: '' };
            const promise = service.requestGroup(mockRequest);
            const req = httpMock.expectOne(`${service['serverUrl']}/api/requestGroup`);
            req.flush(mockApiResponse);
            
            const result = await promise;
            expect(result).toBe(true);
            expect(notificationServiceSpy.show).toHaveBeenCalledWith(`Group: ${mockRequest.group} has been requested`, 'success');
        });
    });

    describe('removeGroup', () => {
        it('should remove group, clear state, and refresh user on success', fakeAsync(() => {
            localStorage.setItem('Credentials', JSON.stringify(mockUser));
            localStorage.setItem('State', JSON.stringify(mockState));
            service['currentGroup'] = mockGroup;
            
            const mockApiResponse: AuthResult = { valid: true, error: '' };
            const refreshedUser = { ...mockUser, groups: [] };
            authServiceSpy.getUserInfo.and.returnValue(Promise.resolve(refreshedUser));

            service.removeGroup(mockGroup.id);
            
            const req = httpMock.expectOne(`${service['serverUrl']}/api/removeGroup?id=${mockGroup.id}`);
            req.flush(mockApiResponse);
            
            tick();
            
            expect(authServiceSpy.getUserInfo).toHaveBeenCalledWith(mockUser.username);
            expect(service.getCurrentGroup()).toBeNull();
            const storedState = JSON.parse(localStorage.getItem('State')!);
            expect(storedState.currentGroup).toBeNull();
            expect(localStorage.getItem('Credentials')).toEqual(JSON.stringify(refreshedUser));
            expect(notificationServiceSpy.show).toHaveBeenCalledWith('Group deleted', 'error');
        }));
    });
    
    describe('getAllGroups', () => {
        it('should return groups and update credentials for SuperAdmin', async () => {
            const superAdminUser = { ...mockUser, roles: ['SuperAdmin'] };
            localStorage.setItem('Credentials', JSON.stringify(superAdminUser));
            const allGroups = [mockGroup, { ...mockGroup, id: 2 }];
            const mockApiResponse: any = { valid: true, groups: allGroups };
            
            const promise = service.getAllGroups();
            const req = httpMock.expectOne(`${service['serverUrl']}/api/get/allGroups`);
            req.flush(mockApiResponse);
            
            const result = await promise;
            expect(result).toEqual(allGroups);
            const updatedUser = JSON.parse(localStorage.getItem('Credentials')!);
            expect(updatedUser.groups).toEqual(allGroups);
        });

        it('should return an empty array on API failure', async () => {
            const mockApiResponse: any = { valid: false, groups: null };
            const promise = service.getAllGroups();
            const req = httpMock.expectOne(`${service['serverUrl']}/api/get/allGroups`);
            req.flush(mockApiResponse);
            const result = await promise;
            expect(result).toEqual([]);
        });
    });
    
    describe('createNewGroup', () => {
        it('should create group and update credentials on success', async () => {
            localStorage.setItem('Credentials', JSON.stringify(mockUser));
            const mockApiResponse: GroupResult = { valid: true, group: mockGroup, error: '' };
            
            const promise = service.createNewGroup('Test Group', 'testuser', 'Admin');
            const req = httpMock.expectOne(`${service['serverUrl']}/api/createGroup`);
            req.flush(mockApiResponse);
            
            const result = await promise;
            expect(result).toBe(true);
            const updatedUser = JSON.parse(localStorage.getItem('Credentials')!);
            expect(updatedUser.groups.length).toBe(2);
            expect(updatedUser.adminGroups.length).toBe(1);
            expect(notificationServiceSpy.show).toHaveBeenCalledWith('Group successfully created!', 'success');
        });
    });

    describe('getGroup', () => {
        it('should return a group on successful API call', async () => {
            const mockApiResponse: GroupResult = { valid: true, group: mockGroup, error: '' };
            const promise = service.getGroup(1);
            const req = httpMock.expectOne(`${service['serverUrl']}/api/get/group?id=1`);
            req.flush(mockApiResponse);
            
            const result = await promise;
            expect(result).toEqual(mockGroup);
        });

        it('should return a default empty group on API failure', async () => {
            const mockApiResponse: GroupResult = { valid: false, group: null, error: 'Not found' };
            const promise = service.getGroup(1);
            const req = httpMock.expectOne(`${service['serverUrl']}/api/get/group?id=1`);
            req.flush(mockApiResponse);
            
            const result = await promise;
            expect(result.id).toBe(-1);
            expect(notificationServiceSpy.show).toHaveBeenCalledWith('Error retrieving group id: 1', 'error');
        });

        it('should return a default empty group on HTTP error', async () => {
            const promise = service.getGroup(1);
            const req = httpMock.expectOne(`${service['serverUrl']}/api/get/group?id=1`);
            req.flush('Error', { status: 500, statusText: 'Server Error' });

            const result = await promise;
            expect(result.id).toBe(-1);
            expect(notificationServiceSpy.show).toHaveBeenCalledWith('Error retrieving group id: 1', 'error');
        });
    });

    describe('reportUser', () => {
        it('should return true and show success notification on success', async () => {
            const mockApiResponse: AuthResult = { valid: true, error: '' };
            const promise = service.reportUser(mockGroupUser, 'admin', null, 1);
            const req = httpMock.expectOne(`${service['serverUrl']}/api/reportUser`);
            req.flush(mockApiResponse);
            
            const result = await promise;
            expect(result).toBe(true);
            expect(notificationServiceSpy.show).toHaveBeenCalledWith(`${mockGroupUser.username} has been reported to the Super Admins`, 'success');
        });
    });

    describe('removeUserFromGroup', () => {
        it('should return true and refresh credentials if removed user is current user', fakeAsync(() => {
            localStorage.setItem('Credentials', JSON.stringify(mockUser));
            const mockApiResponse: AuthResult = { valid: true, error: '' };
            const refreshedUser = { ...mockUser, groups: [] };
            authServiceSpy.getUserInfo.and.returnValue(Promise.resolve(refreshedUser));

            service.removeUserFromGroup(mockGroupUser, 1);
            
            const req = httpMock.expectOne(req => req.url.includes('/api/removeUserFromGroup'));
            req.flush(mockApiResponse);
            tick();

            expect(authServiceSpy.getUserInfo).toHaveBeenCalledWith(mockUser.username);
            expect(localStorage.getItem('Credentials')).toEqual(JSON.stringify(refreshedUser));
            expect(notificationServiceSpy.show).toHaveBeenCalledWith(`${mockGroupUser.username} has been removed from the group`, 'success');
        }));
    });

    describe('banUserFromChannel', () => {
        it('should return true on successful API call', async () => {
            const mockApiResponse: AuthResult = { valid: true, error: '' };
            const promise = service.banUserFromChannel(mockChannel, mockGroupUser);
            const req = httpMock.expectOne(`${service['serverUrl']}/api/banUserFromChannel`);
            req.flush(mockApiResponse);

            const result = await promise;
            expect(result).toBe(true);
            expect(notificationServiceSpy.show).toHaveBeenCalledWith(`User has been banned from ${mockChannel.name}`, 'success');
        });
    });

    describe('addUserToChannel', () => {
        it('should return true on successful API call', async () => {
            const mockApiResponse: AuthResult = { valid: true, error: '' };
            const promise = service.addUserToChannel(mockChannel, mockGroupUser);
            const req = httpMock.expectOne(`${service['serverUrl']}/api/addUserToChannel`);
            req.flush(mockApiResponse);

            const result = await promise;
            expect(result).toBe(true);
            expect(notificationServiceSpy.show).toHaveBeenCalledWith(`User has been added to ${mockChannel.name}`, 'success');
        });
    });

    describe('promoteUser', () => {
        it('should return true on successful API call', async () => {
            const mockApiResponse: AuthResult = { valid: true, error: '' };
            const promise = service.promoteUser(mockGroupUser, 'Admin', 1);
            const req = httpMock.expectOne(`${service['serverUrl']}/api/promoteUser`);
            req.flush(mockApiResponse);

            const result = await promise;
            expect(result).toBe(true);
            expect(notificationServiceSpy.show).toHaveBeenCalledWith('User has been promoted to Admin', 'success');
        });
    });

    describe('createChannel', () => {
        it('should return true and refresh group state on success', fakeAsync(() => {
            localStorage.setItem('State', JSON.stringify(mockState));
            const mockPostResponse: AuthResult = { valid: true, error: '' };
            const refreshedGroup = { ...mockGroup, channels: [...mockGroup.channels, { id: 102, name: 'New Channel' }] };
            const mockGetResponse: any = { valid: true, group: refreshedGroup, error: '' };

            service.createChannel('New Channel', mockGroup);
            
            const postReq = httpMock.expectOne(`${service['serverUrl']}/api/createChannel`);
            postReq.flush(mockPostResponse);
            tick();

            const getReq = httpMock.expectOne(`${service['serverUrl']}/api/get/group?id=${mockGroup.id}`);
            getReq.flush(mockGetResponse);
            tick();
            
            const updatedState = JSON.parse(localStorage.getItem('State')!);
            expect(updatedState.currentGroup).toEqual(refreshedGroup);
            expect(notificationServiceSpy.show).toHaveBeenCalledWith('Channel has been created', 'success');
        }));
    });

    describe('removeChannel', () => {
        it('should refresh state and credentials on success', fakeAsync(() => {
            localStorage.setItem('State', JSON.stringify(mockState));
            localStorage.setItem('Credentials', JSON.stringify(mockUser));
            const mockDeleteResponse: AuthResult = { valid: true, error: '' };
            const refreshedGroup = { ...mockGroup, channels: [] };
            const mockGetResponse: any = { valid: true, group: refreshedGroup, error: '' };
            authServiceSpy.getUserInfo.and.returnValue(Promise.resolve(mockUser));

            service.removeChannel(mockGroup.id, mockChannel.id);
            
            const delReq = httpMock.expectOne(req => req.url.includes('/api/removeChannel'));
            delReq.flush(mockDeleteResponse);
            tick();

            const getReq = httpMock.expectOne(`${service['serverUrl']}/api/get/group?id=${mockGroup.id}`);
            getReq.flush(mockGetResponse);
            tick();

            expect(authServiceSpy.getUserInfo).toHaveBeenCalledWith(mockUser.username);
            const updatedState = JSON.parse(localStorage.getItem('State')!);
            expect(updatedState.currentGroup).toEqual(refreshedGroup);
        }));
    });
    
    describe('addNewUser', () => {
        it('should refresh state and credentials on success', fakeAsync(() => {
            localStorage.setItem('State', JSON.stringify(mockState));
            localStorage.setItem('Credentials', JSON.stringify(mockUser));
            const mockPostResponse: AuthResult = { valid: true, error: '' };

            const refreshedGroup = JSON.parse(JSON.stringify(mockGroup));
            refreshedGroup.users.push({ username: 'newUser', profilePicture: null, roles: ['User'] });
            
            const mockGetResponse: GroupResult = { valid: true, group: refreshedGroup, error: '' };
            authServiceSpy.getUserInfo.and.returnValue(Promise.resolve(mockUser));

            service.addNewUser(mockGroup.id, mockUser);
            
            const postReq = httpMock.expectOne(`${service['serverUrl']}/api/addNewUser`);
            postReq.flush(mockPostResponse);
            tick();

            const getReq = httpMock.expectOne(`${service['serverUrl']}/api/get/group?id=${mockGroup.id}`);
            getReq.flush(mockGetResponse);
            tick();

            expect(authServiceSpy.getUserInfo).toHaveBeenCalled();
            const updatedState = JSON.parse(localStorage.getItem('State')!);

            expect(updatedState.currentGroup.users.length).toBe(1);
        }));
    });

    describe('sendMessage', () => {
        it('should return true and refresh state/credentials on success', fakeAsync(() => {
            localStorage.setItem('State', JSON.stringify(mockState));
            localStorage.setItem('Credentials', JSON.stringify(mockUser));
            const mockPostResponse: AuthResult = { valid: true, error: '' };
            const mockGetResponse: any = { valid: true, group: mockGroup, error: '' };
            authServiceSpy.getUserInfo.and.returnValue(Promise.resolve(mockUser));

            const promise = service.sendMessage(mockMessage);
            
            const postReq = httpMock.expectOne(`${service['serverUrl']}/api/sendMessage`);
            postReq.flush(mockPostResponse);
            tick();

            const getReq = httpMock.expectOne(`${service['serverUrl']}/api/get/group?id=${mockMessage.groupId}`);
            getReq.flush(mockGetResponse);
            tick();
            
            promise.then(result => {
                expect(result).toBe(true);
            });
            tick();

            expect(authServiceSpy.getUserInfo).toHaveBeenCalled();
            expect(notificationServiceSpy.show).not.toHaveBeenCalledWith('Unable to send message', 'error');
        }));

        it('should return false on API failure', async () => {
            const mockPostResponse: AuthResult = { valid: false, error: 'Failed' };
            const promise = service.sendMessage(mockMessage);
            const postReq = httpMock.expectOne(`${service['serverUrl']}/api/sendMessage`);
            postReq.flush(mockPostResponse);

            const result = await promise;
            expect(result).toBe(false);
            expect(notificationServiceSpy.show).toHaveBeenCalledWith('Unable to send message', 'error');
        });
    });
});