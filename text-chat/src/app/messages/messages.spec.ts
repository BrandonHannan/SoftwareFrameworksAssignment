import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Messages } from './messages.component';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { GroupService } from '../services/group.service';
import { AuthenticationService } from '../services/auth.service';
import { SocketService } from '../services/socket.service';
import { VideoChatService } from '../services/videoChat.service';

describe('Messages', () => {
  let component: Messages;
  let fixture: ComponentFixture<Messages>;

  beforeEach(async () => {
    const groupServiceSpy = jasmine.createSpyObj('GroupService', ['getGroup', 'sendMessage']);
    const authServiceSpy = jasmine.createSpyObj('AuthenticationService', ['getUserInfo']);
    const socketServiceSpy = jasmine.createSpyObj('SocketService', ['joinMessages', 'leaveMessages', 'getMessage', 'sendMessage']);
    const videoChatServiceSpy = {
      videoChatUsers$: of([]),
      isCallActive: signal(false),
      localStream$: of(null),
      remoteStream$: of(null),
      joinVideoChat: jasmine.createSpy('joinVideoChat'),
      leaveVideoChat: jasmine.createSpy('leaveVideoChat'),
      stopLocalStream: jasmine.createSpy('stopLocalStream'),
      call: jasmine.createSpy('call'),
      myPeerId: jasmine.createSpy('myPeerId')
    };

    await TestBed.configureTestingModule({
      imports: [Messages, HttpClientTestingModule, RouterTestingModule],
      providers: [
        { provide: GroupService, useValue: groupServiceSpy },
        { provide: AuthenticationService, useValue: authServiceSpy },
        { provide: SocketService, useValue: socketServiceSpy },
        { provide: VideoChatService, useValue: videoChatServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Messages);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
