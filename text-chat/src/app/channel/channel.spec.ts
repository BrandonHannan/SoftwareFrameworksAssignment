import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FormsModule } from '@angular/forms';
import { ChannelComponent } from './channel.component';
import { GroupService } from '../services/group.service';
import { AuthenticationService } from '../services/auth.service';
import { Router } from '@angular/router';
import { Group } from '../models/group.model';
import { SessionStorageUser } from '../models/user.model';

describe('ChannelComponent', () => {
  let component: ChannelComponent;
  let fixture: ComponentFixture<ChannelComponent>;
  let groupService: jasmine.SpyObj<GroupService>;
  let authService: jasmine.SpyObj<AuthenticationService>;
  let router: Router;

  const mockGroup: Group = {
    id: 1,
    name: 'Test Group',
    users: [{ username: 'testuser', profilePicture: null, role: 'User' }],
    channels: [{ groupId: 1, id: 101, name: 'General', messages: [], allowedUsers: [] }]
  };

  const mockUser: SessionStorageUser = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    profilePicture: null,
    roles: ['User'],
    groups: [mockGroup],
    adminGroups: [],
    requests: [],
    allowedChannels: [],
    reports: []
  };

  beforeEach(async () => {
    const groupServiceSpy = jasmine.createSpyObj('GroupService', ['getGroup', 'setCurrentChannel', 'createChannel']);
    const authServiceSpy = jasmine.createSpyObj('AuthenticationService', ['getUserInfo', 'getAllUsers']);

    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        HttpClientTestingModule,
        RouterTestingModule.withRoutes([]),
        ChannelComponent
      ],
      providers: [
        { provide: GroupService, useValue: groupServiceSpy },
        { provide: AuthenticationService, useValue: authServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ChannelComponent);
    component = fixture.componentInstance;
    groupService = TestBed.inject(GroupService) as jasmine.SpyObj<GroupService>;
    authService = TestBed.inject(AuthenticationService) as jasmine.SpyObj<AuthenticationService>;
    router = TestBed.inject(Router);

    localStorage.setItem('Credentials', JSON.stringify(mockUser));
    localStorage.setItem('State', JSON.stringify({ currentGroup: mockGroup, currentChannel: null }));
    
    authService.getUserInfo.and.resolveTo(mockUser);
    groupService.getGroup.and.resolveTo(mockGroup);
    authService.getAllUsers.and.resolveTo([]);
  });
  
  afterEach(() => {
    localStorage.clear();
  });


  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load channels for the current group on init', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    expect(component.group?.name).toBe('Test Group');
    expect(component.channels.length).toBe(1);
    expect(component.channels[0].name).toBe('General');
  }));

  it('should navigate to messages on enterChannel', async () => {
    const navigateSpy = spyOn(router, 'navigateByUrl');
    groupService.setCurrentChannel.and.resolveTo(true);
    
    await component.enterChannel(mockGroup.channels[0]);
    
    expect(groupService.setCurrentChannel).toHaveBeenCalledWith(mockGroup.channels[0]);
    expect(navigateSpy).toHaveBeenCalledWith('/messages');
  });

});