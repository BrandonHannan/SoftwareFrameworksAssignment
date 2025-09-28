import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FormsModule } from '@angular/forms';
import { Account } from './account.component';
import { AuthenticationService } from '../services/auth.service';
import { GroupService } from '../services/group.service';
import { NotificationService } from '../services/notification.service';
import { of } from 'rxjs';
import { SessionStorageUser } from '../models/user.model';
import { Router } from '@angular/router';

describe('AccountComponent', () => {
  let component: Account;
  let fixture: ComponentFixture<Account>;
  let authService: jasmine.SpyObj<AuthenticationService>;
  let groupService: jasmine.SpyObj<GroupService>;
  let notificationService: jasmine.SpyObj<NotificationService>;
  let router: Router;

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

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthenticationService', ['getUserInfo', 'logout', 'updateUsername', 'deleteAccount']);
    const groupServiceSpy = jasmine.createSpyObj('GroupService', ['getAllGroups']);
    const notificationServiceSpy = jasmine.createSpyObj('NotificationService', ['show']);

    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        HttpClientTestingModule,
        RouterTestingModule.withRoutes([]),
        Account 
      ],
      providers: [
        { provide: AuthenticationService, useValue: authServiceSpy },
        { provide: GroupService, useValue: groupServiceSpy },
        { provide: NotificationService, useValue: notificationServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Account);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthenticationService) as jasmine.SpyObj<AuthenticationService>;
    groupService = TestBed.inject(GroupService) as jasmine.SpyObj<GroupService>;
    notificationService = TestBed.inject(NotificationService) as jasmine.SpyObj<NotificationService>;
    router = TestBed.inject(Router);

    localStorage.setItem('Credentials', JSON.stringify(mockUser));
    authService.getUserInfo.and.resolveTo(mockUser);
    groupService.getAllGroups.and.resolveTo([]);
    
    (window as any).bootstrap = {
        Modal: {
          getInstance: () => ({
            hide: () => {}
          })
        }
      };
  });
  
  afterEach(() => {
    localStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with user data on ngOnInit', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    expect(authService.getUserInfo).toHaveBeenCalledWith('testuser');
    expect(component.username).toBe('testuser');
  }));

  it('should call authService.logout and navigate on logout', () => {
    const navigateSpy = spyOn(router, 'navigateByUrl');
    component.logout();
    expect(authService.logout).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith('/login');
  });

  it('should call authService.updateUsername on updateUsername', async () => {
    component.newUsername = 'newuser';
    authService.updateUsername.and.resolveTo({ valid: true, error: '' });
    
    await component.updateUsername();

    expect(authService.updateUsername).toHaveBeenCalledWith({
      currentUsername: 'testuser',
      username: 'newuser'
    });
  });

  it('should call authService.deleteAccount and navigate on confirmDelete', async () => {
    const navigateSpy = spyOn(router, 'navigateByUrl');
    authService.deleteAccount.and.resolveTo({ valid: true, error: '' });

    await component.confirmDelete();

    expect(authService.deleteAccount).toHaveBeenCalledWith(mockUser);
    expect(navigateSpy).toHaveBeenCalledWith('/login');
  });
});