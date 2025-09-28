import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FormsModule } from '@angular/forms';
import { Groups } from './groups.component';
import { GroupService } from '../services/group.service';
import { AuthenticationService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { of } from 'rxjs';
import { SessionStorageUser } from '../models/user.model';
import { Router } from '@angular/router';

describe('GroupsComponent', () => {
  let component: Groups;
  let fixture: ComponentFixture<Groups>;
  let groupService: jasmine.SpyObj<GroupService>;
  let authService: jasmine.SpyObj<AuthenticationService>;
  let router: Router;

  const mockUser: SessionStorageUser = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    profilePicture: null,
    roles: ['User'],
    groups: [{ id: 1, name: 'My Group', users: [], channels: [] }],
    adminGroups: [],
    requests: [],
    allowedChannels: [],
    reports: []
  };

  beforeEach(async () => {
    const groupServiceSpy = jasmine.createSpyObj('GroupService', ['getAllGroups', 'createNewGroup', 'setCurrentGroup']);
    const authServiceSpy = jasmine.createSpyObj('AuthenticationService', ['getUserInfo']);

    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        HttpClientTestingModule,
        RouterTestingModule.withRoutes([]),
        Groups
      ],
      providers: [
        { provide: GroupService, useValue: groupServiceSpy },
        { provide: AuthenticationService, useValue: authServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Groups);
    component = fixture.componentInstance;
    groupService = TestBed.inject(GroupService) as jasmine.SpyObj<GroupService>;
    authService = TestBed.inject(AuthenticationService) as jasmine.SpyObj<AuthenticationService>;
    router = TestBed.inject(Router);

    localStorage.setItem('Credentials', JSON.stringify(mockUser));
    authService.getUserInfo.and.resolveTo(mockUser);
    groupService.getAllGroups.and.resolveTo([
        { id: 1, name: 'My Group', users: [], channels: [] },
        { id: 2, name: 'Another Group', users: [], channels: [] }
    ]);
    
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

  it('should load user groups on init', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    
    expect(component.groups.length).toBe(1);
    expect(component.filteredGroups.length).toBe(1);
    expect(component.filteredGroups[0].group.name).toBe('My Group');
  }));

  it('should navigate to channels when entering a group', async () => {
    const navigateSpy = spyOn(router, 'navigateByUrl');
    groupService.setCurrentGroup.and.resolveTo(true);

    await component.enterGroup(1);

    expect(groupService.setCurrentGroup).toHaveBeenCalledWith(1);
    expect(navigateSpy).toHaveBeenCalledWith('/channels');
  });

  it('should call groupService.createNewGroup on createGroup', fakeAsync(() => {
    spyOn(component, 'reloadComponent');
    component.newGroupName = 'New Test Group';
    groupService.createNewGroup.and.resolveTo(true);

    fixture.detectChanges();
    tick();
    component.createGroup();
    tick();

    expect(groupService.createNewGroup).toHaveBeenCalledWith('New Test Group', 'testuser', 'User');
    expect(component.reloadComponent).toHaveBeenCalled();
  }));
});