import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthenticationService } from './auth.service';
import { NotificationService } from './notification.service';
import { LoginAttempt, RegisterAttempt, SessionStorageUser, AuthResult } from '../models/user.model';
import { Report } from '../models/report.model';

describe('AuthenticationService', () => {
  let service: AuthenticationService;
  let httpMock: HttpTestingController;
  let notificationService: NotificationService;

  const mockUser: SessionStorageUser = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    profilePicture: null,
    roles: ['User'],
    groups: [],
    adminGroups: [],
    requests: [],
    allowedChannels: [],
    reports: []
  };

  const mockReport: Report = {
    groupId: 0,
    adminReport: 'reporter',
    usernameReported: 'reportedUser',
    userProfilePicture: null,
    adminProfilePicture: null
  };

  beforeEach(() => {
    const notificationServiceSpy = jasmine.createSpyObj('NotificationService', ['show']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthenticationService,
        { provide: NotificationService, useValue: notificationServiceSpy }
      ]
    });

    service = TestBed.inject(AuthenticationService);
    httpMock = TestBed.inject(HttpTestingController);
    notificationService = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('login', () => {
    it('should handle successful login', async () => {
      const loginAttempt: LoginAttempt = { username: 'testuser', password: 'password' };
      const mockResponse: any = { user: mockUser, valid: true, error: '' };

      const loginPromise = service.login(loginAttempt);

      const req = httpMock.expectOne('https://localhost:3000/api/login');
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);

      const result = await loginPromise;

      expect(result.valid).toBe(true);
      expect(localStorage.getItem('Credentials')).toEqual(JSON.stringify(mockUser));
      expect(notificationService.show).toHaveBeenCalledWith('Login successful!', 'success');
    });

    it('should handle failed login', async () => {
      const loginAttempt: LoginAttempt = { username: 'testuser', password: 'wrongpassword' };
      const mockResponse: AuthResult = { valid: false, error: 'Invalid credentials' };

      const loginPromise = service.login(loginAttempt);

      const req = httpMock.expectOne('https://localhost:3000/api/login');
      req.flush(mockResponse, { status: 200, statusText: 'OK' });

      const result = await loginPromise;

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid credentials');
      expect(localStorage.getItem('Credentials')).toBeNull();
    });
  });

  describe('register', () => {
    it('should handle successful registration', async () => {
      const registerAttempt: RegisterAttempt = { email: 'new@example.com', username: 'newuser', password: 'password' };
      const mockResponse: any = { user: { ...mockUser, username: 'newuser' }, valid: true, error: '' };

      const registerPromise = service.register(registerAttempt);

      const req = httpMock.expectOne('https://localhost:3000/api/register');
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);

      const result = await registerPromise;

      expect(result.valid).toBe(true);
      expect(notificationService.show).toHaveBeenCalledWith('Account created successfully!', 'success');
    });

    it('should handle an invalid registration', async () => {
      const registerAttempt: RegisterAttempt = { email: '', username: '', password: '' };
      const mockResponse: any = { valid: false, error: 'Invalid Credentials' };

      const registerPromise = service.register(registerAttempt);

      const req = httpMock.expectOne('https://localhost:3000/api/register');
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);

      const result = await registerPromise;

      expect(result.valid).toBe(false);
      expect(result.error).toEqual('Invalid Credentials');
    });
  });

  describe('logout', () => {
    it('should clear local and session storage', () => {
      localStorage.setItem('Credentials', 'test');
      sessionStorage.setItem('State', 'test');

      service.logout();

      expect(localStorage.getItem('Credentials')).toBeNull();
      expect(sessionStorage.getItem('State')).toBeNull();
    });
  });

  describe('deleteAccount', () => {
    it('should send a delete request and clear storage on success', async () => {
        const mockResponse: AuthResult = { valid: true, error: '' };
        localStorage.setItem('Credentials', JSON.stringify(mockUser));

        const deletePromise = service.deleteAccount(mockUser);

        const req = httpMock.expectOne(`https://localhost:3000/api/deleteAccount?id=${mockUser.id}`);
        expect(req.request.method).toBe('DELETE');
        req.flush(mockResponse);

        await deletePromise;
        
        expect(notificationService.show).toHaveBeenCalledWith('Account successfully deleted', 'error');
        expect(localStorage.getItem('Credentials')).toBeNull();
    });
  });

  describe('getUserInfo', () => {
    it('should retrieve user information successfully', async () => {
        const mockResponse: any = { user: mockUser, valid: true, error: '' };

        const promise = service.getUserInfo('testuser');

        const req = httpMock.expectOne('https://localhost:3000/api/get/userInfo?username=testuser');
        expect(req.request.method).toBe('GET');
        req.flush(mockResponse);

        const result = await promise;
        expect(result).toEqual(mockUser);
    });
  });

  describe('getAllUsers', () => {
    it('should return an array of users on successful API call', async () => {
      const mockUsers: SessionStorageUser[] = [mockUser, { ...mockUser, id: 2, username: 'testuser2' }];
      
      const promise = service.getAllUsers();
      
      const req = httpMock.expectOne('https://localhost:3000/api/getAllUsers');
      expect(req.request.method).toBe('GET');
      req.flush(mockUsers);
      
      const result = await promise;
      
      expect(result).toEqual(mockUsers);
      expect(result?.length).toBe(2);
      expect(notificationService.show).not.toHaveBeenCalled();
    });

    it('should return null and show notification if API returns null', async () => {
      const promise = service.getAllUsers();
      
      const req = httpMock.expectOne('https://localhost:3000/api/getAllUsers');
      req.flush(null); // Simulate API returning null
      
      const result = await promise;
      
      expect(result).toBeNull();
      expect(notificationService.show).toHaveBeenCalledWith('Unable to get all users', 'error');
    });

    it('should return null and show notification on HTTP error', async () => {
      const promise = service.getAllUsers();
      
      const req = httpMock.expectOne('https://localhost:3000/api/getAllUsers');
      // Simulate a server error
      req.flush('Internal Server Error', { status: 500, statusText: 'Server Error' }); 
      
      const result = await promise;
      
      expect(result).toBeNull();
      expect(notificationService.show).toHaveBeenCalledWith('Unable to get all users', 'error');
    });
  });

  describe('acceptReport', () => {
    it('should return true and show success notification when API call is valid', async () => {
      const mockApiResponse: AuthResult = { valid: true, error: '' };
      
      const promise = service.acceptReport(mockReport);
      
      const req = httpMock.expectOne('https://localhost:3000/api/acceptReport');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockReport);
      req.flush(mockApiResponse);
      
      const result = await promise;
      
      expect(result).toBe(true);
      expect(notificationService.show).toHaveBeenCalledWith(`User ${mockReport.usernameReported} has been banned from the group`, 'success');
    });

    it('should refresh user credentials in local storage on success', fakeAsync(() => {
        localStorage.setItem('Credentials', JSON.stringify(mockUser));
        
        const updatedUser: SessionStorageUser = { ...mockUser, reports: [] };
        const mockApiResponse: AuthResult = { valid: true, error: '' };
        const mockUserInfoResponse: any = { user: updatedUser, valid: true, error: '' };

        service.acceptReport(mockReport);

        const acceptReq = httpMock.expectOne('https://localhost:3000/api/acceptReport');
        acceptReq.flush(mockApiResponse);

        tick();

        const refreshReq = httpMock.expectOne(`https://localhost:3000/api/get/userInfo?username=${mockUser.username}`);
        refreshReq.flush(mockUserInfoResponse);

        tick();

        expect(localStorage.getItem('Credentials')).toEqual(JSON.stringify(updatedUser));
    }));

    it('should return false and show notification when API call is invalid', async () => {
      const mockApiResponse: AuthResult = { valid: false, error: 'Permission denied' };
      
      const promise = service.acceptReport(mockReport);
      
      const req = httpMock.expectOne('https://localhost:3000/api/acceptReport');
      req.flush(mockApiResponse);
      
      const result = await promise;
      
      expect(result).toBe(false);
      expect(notificationService.show).toHaveBeenCalledWith(`Unable to ban user ${mockReport.usernameReported} from the group`, 'error');
    });

    it('should return false and show notification on HTTP error', async () => {
      const promise = service.acceptReport(mockReport);
      
      const req = httpMock.expectOne('https://localhost:3000/api/acceptReport');
      req.flush('Error', { status: 500, statusText: 'Internal Server Error' });
      
      const result = await promise;
      
      expect(result).toBe(false);
      expect(notificationService.show).toHaveBeenCalledWith(`Unable to ban user ${mockReport.usernameReported} from the group`, 'error');
    });
  });

  describe('updateUsername', () => {
    it('should update username in localStorage on successful API call', async () => {
      const updatePayload: any = { id: 1, username: 'newUser' };
      const mockApiResponse: AuthResult = { valid: true, error: '' };
      localStorage.setItem('Credentials', JSON.stringify(mockUser));

      const promise = service.updateUsername(updatePayload);

      const req = httpMock.expectOne('https://localhost:3000/api/updateUser/username');
      expect(req.request.method).toBe('PATCH');
      req.flush(mockApiResponse);

      const result = await promise;
      const updatedUser = JSON.parse(localStorage.getItem('Credentials') || '{}');

      expect(result.valid).toBe(true);
      expect(notificationService.show).toHaveBeenCalledWith('Username successfully updated', 'success');
      expect(updatedUser.username).toBe('newUser');
    });

    it('should show an error and not update localStorage on a failed API call', async () => {
      const updatePayload: any = { id: 1, username: 'newUser' };
      const mockApiResponse: AuthResult = { valid: false, error: 'Username taken' };
      localStorage.setItem('Credentials', JSON.stringify(mockUser));

      const promise = service.updateUsername(updatePayload);

      const req = httpMock.expectOne('https://localhost:3000/api/updateUser/username');
      req.flush(mockApiResponse);

      const result = await promise;

      expect(result.valid).toBe(false);
      expect(notificationService.show).toHaveBeenCalledWith('Username taken', 'error');
      expect(localStorage.getItem('Credentials')).toEqual(JSON.stringify(mockUser));
    });
  });

  describe('updatePassword', () => {
    it('should show success notification on successful password update', async () => {
      const updatePayload: any = { id: 1, password: 'newPassword' };
      const mockApiResponse: AuthResult = { valid: true, error: '' };

      const promise = service.updatePassword(updatePayload);

      const req = httpMock.expectOne('https://localhost:3000/api/updateUser/password');
      expect(req.request.method).toBe('PATCH');
      req.flush(mockApiResponse);

      const result = await promise;

      expect(result.valid).toBe(true);
      expect(notificationService.show).toHaveBeenCalledWith('Password successfully updated', 'success');
    });

    it('should show an error on a failed password update', async () => {
        const updatePayload: any = { id: 1, password: 'newPassword' };
        const mockApiResponse: AuthResult = { valid: false, error: 'Password too weak' };

        const promise = service.updatePassword(updatePayload);

        const req = httpMock.expectOne('https://localhost:3000/api/updateUser/password');
        req.flush(mockApiResponse);

        const result = await promise;

        expect(result.valid).toBe(false);
        expect(notificationService.show).toHaveBeenCalledWith('Password too weak', 'error');
    });
  });

  describe('updateEmail', () => {
    it('should update email in localStorage on successful API call', async () => {
      const updatePayload: any = { id: 1, email: 'new@email.com' };
      const mockApiResponse: AuthResult = { valid: true, error: '' };
      localStorage.setItem('Credentials', JSON.stringify(mockUser));

      const promise = service.updateEmail(updatePayload);

      const req = httpMock.expectOne('https://localhost:3000/api/updateUser/email');
      expect(req.request.method).toBe('PATCH');
      req.flush(mockApiResponse);

      const result = await promise;
      const updatedUser = JSON.parse(localStorage.getItem('Credentials') || '{}');

      expect(result.valid).toBe(true);
      expect(notificationService.show).toHaveBeenCalledWith('Email successfully updated', 'success');
      expect(updatedUser.email).toBe('new@email.com');
    });
  });

  describe('updateGroups', () => {
    it('should update groups in localStorage on successful API call', async () => {
      const newGroups = ['group1', 'group2'];
      const updatePayload: any = { id: 1, groups: newGroups };
      const mockApiResponse: AuthResult = { valid: true, error: '' };
      localStorage.setItem('Credentials', JSON.stringify(mockUser));

      const promise = service.updateGroups(updatePayload);

      const req = httpMock.expectOne('https://localhost:3000/api/updateUser/groups');
      req.flush(mockApiResponse);
      
      const result = await promise;
      const updatedUser = JSON.parse(localStorage.getItem('Credentials') || '{}');

      expect(result.valid).toBe(true);
      expect(notificationService.show).toHaveBeenCalledWith('Groups successfully updated', 'success');
      expect(updatedUser.groups).toEqual(newGroups);
    });
  });

  describe('updateAdminGroups', () => {
    it('should update admin groups in localStorage on successful API call', async () => {
      const newAdminGroups = ['adminGroup1'];
      const updatePayload: any = { id: 1, adminGroups: newAdminGroups };
      const mockApiResponse: AuthResult = { valid: true, error: '' };
      localStorage.setItem('Credentials', JSON.stringify(mockUser));

      const promise = service.updateAdminGroups(updatePayload);

      const req = httpMock.expectOne('https://localhost:3000/api/updateUser/adminGroups');
      req.flush(mockApiResponse);

      const result = await promise;
      const updatedUser = JSON.parse(localStorage.getItem('Credentials') || '{}');
      
      expect(result.valid).toBe(true);
      expect(notificationService.show).toHaveBeenCalledWith('User successfully added as a group admin', 'success');
      expect(updatedUser.adminGroups).toEqual(newAdminGroups);
    });
  });

  describe('updateProfilePicture', () => {
    it('should update profile picture in localStorage on successful API call', async () => {
      const newPic = 'data:image/png;base64,newpicdata';
      const updatePayload: any = { id: 1, profilePicture: newPic };
      const mockApiResponse: AuthResult = { valid: true, error: '' };
      localStorage.setItem('Credentials', JSON.stringify(mockUser));

      const promise = service.updateProfilePicture(updatePayload);
      
      const req = httpMock.expectOne('https://localhost:3000/api/updateUser/profilePicture');
      req.flush(mockApiResponse);

      const result = await promise;
      const updatedUser = JSON.parse(localStorage.getItem('Credentials') || '{}');

      expect(result.valid).toBe(true);
      expect(notificationService.show).toHaveBeenCalledWith('Profile picture successfully updated', 'success');
      expect(updatedUser.profilePicture).toBe(newPic);
    });

    it('should show error and not update storage on http error', async () => {
        const newPic = 'data:image/png;base64,newpicdata';
        const updatePayload: any = { id: 1, profilePicture: newPic };
        localStorage.setItem('Credentials', JSON.stringify(mockUser));
        const errorEvent = new ProgressEvent('error');


        const promise = service.updateProfilePicture(updatePayload);

        const req = httpMock.expectOne('https://localhost:3000/api/updateUser/profilePicture');
        req.error(errorEvent);

        const result = await promise;

        expect(result.valid).toBe(false);
        expect(localStorage.getItem('Credentials')).toEqual(JSON.stringify(mockUser));
    });
  });
});