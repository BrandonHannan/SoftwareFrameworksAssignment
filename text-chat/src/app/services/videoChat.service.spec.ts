import { TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { VideoChatService } from './videoChat.service';
import { SocketService } from './socket.service';
import { NotificationService } from './notification.service';


class MockPeer {
  private listeners: { [key: string]: Function } = {};
  on(event: string, callback: Function) {
    this.listeners[event] = callback;
  }
  trigger(event: string, ...args: any[]) {
    if (this.listeners[event]) {
      this.listeners[event](...args);
    }
  }
  call = jasmine.createSpy('call').and.returnValue(new MockCall());
  destroy = jasmine.createSpy('destroy');
  reconnect = jasmine.createSpy('reconnect');
}

class MockCall {
  private listeners: { [key: string]: Function } = {};
  on(event: string, callback: Function) {
    this.listeners[event] = callback;
  }
  trigger(event: string, ...args: any[]) {
    if (this.listeners[event]) {
      this.listeners[event](...args);
    }
  }
  answer = jasmine.createSpy('answer');
  close = jasmine.createSpy('close');
}

const mockMediaStream = {
  getTracks: () => [{ stop: jasmine.createSpy('stop') }, { stop: jasmine.createSpy('stop') }]
} as unknown as MediaStream;


describe('VideoChatService', () => {
  let service: VideoChatService;
  let socketServiceSpy: jasmine.SpyObj<SocketService>;
  let notificationServiceSpy: jasmine.SpyObj<NotificationService>;
  let mockPeer: MockPeer;
  let originalPeer: any;

  const videoChatUsersSubject = new BehaviorSubject<any[]>([]);

  beforeEach(() => {
    const socketSpy = jasmine.createSpyObj('SocketService', ['onVideoChatUsersUpdate', 'joinVideoChat', 'leaveVideoChat']);
    const notificationSpy = jasmine.createSpyObj('NotificationService', ['show']);
    
    socketSpy.onVideoChatUsersUpdate.and.returnValue(videoChatUsersSubject.asObservable());

    TestBed.configureTestingModule({
      providers: [
        VideoChatService,
        { provide: SocketService, useValue: socketSpy },
        { provide: NotificationService, useValue: notificationSpy },
      ]
    });

    mockPeer = new MockPeer();

    // Save the original Peer constructor to restore it later
    originalPeer = (window as any).Peer;
    (window as any).Peer = jasmine.createSpy('Peer').and.returnValue(mockPeer);

    spyOn(navigator.mediaDevices, 'getUserMedia').and.resolveTo(mockMediaStream);

    service = TestBed.inject(VideoChatService);
    socketServiceSpy = TestBed.inject(SocketService) as jasmine.SpyObj<SocketService>;
    notificationServiceSpy = TestBed.inject(NotificationService) as jasmine.SpyObj<NotificationService>;
  });

  afterEach(() => {
    // Restore the original Peer constructor to avoid polluting other tests
    (window as any).Peer = originalPeer;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should initialize PeerJS and get media on construction', () => {
      expect((window as any).Peer).toHaveBeenCalled();
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ video: true, audio: true });
    });

    it('should set peerId and isConnected when peer opens', () => {
      const testId = 'test-peer-id';
      mockPeer.trigger('open', testId);
      expect(service.myPeerId()).toBe(testId);
      expect(service.isConnected()).toBe(true);
    });

    it('should show notification on peer error', () => {
        const error = { type: 'network', message: 'Connection failed' };
        mockPeer.trigger('error', error);
        expect(notificationServiceSpy.show).toHaveBeenCalledWith(`PeerJS error: ${error}`, 'error');
        expect(service.isConnected()).toBe(false);
    });

    it('should handle peer disconnection and attempt to reconnect', fakeAsync(() => {
        mockPeer.trigger('disconnected');
        expect(service.isConnected()).toBe(false);
        tick(3000);
        expect(mockPeer.reconnect).toHaveBeenCalled();
    }));
  });

  describe('ngOnDestroy', () => {
    it('should destroy peer and stop local stream', () => {
        const stopSpy = spyOn(service, 'stopLocalStream');
        service.ngOnDestroy();
        expect(mockPeer.destroy).toHaveBeenCalled();
        expect(stopSpy).toHaveBeenCalled();
    });
  });

  describe('Video Chat Room Management', () => {
    it('should join a video chat room', () => {
        mockPeer.trigger('open', 'peer123');
        service.joinVideoChat('channel-1', 'test-user');
        expect(socketServiceSpy.joinVideoChat).toHaveBeenCalledWith({ channelId: 'channel-1', peerId: 'peer123', username: 'test-user' });
    });

    it('should retry joining if peer is not ready', fakeAsync(() => {
        service.joinVideoChat('channel-1', 'test-user');
        expect(socketServiceSpy.joinVideoChat).not.toHaveBeenCalled();
        
        mockPeer.trigger('open', 'peer123');
        tick(500);
        
        expect(socketServiceSpy.joinVideoChat).toHaveBeenCalledWith({ channelId: 'channel-1', peerId: 'peer123', username: 'test-user' });
    }));

    it('should leave a video chat room', () => {
        const hangUpSpy = spyOn(service, 'hangUp');
        service.leaveVideoChat('channel-1');
        
        expect(hangUpSpy).toHaveBeenCalled();
        expect(socketServiceSpy.leaveVideoChat).toHaveBeenCalledWith({ channelId: 'channel-1' });
        
        service.videoChatUsers$.subscribe((users: any) => {
            expect(users).toEqual([]);
        });
    });
  });

  describe('Call Handling', () => {
    beforeEach(fakeAsync(() => {
        tick();
    }));

    it('should not call if remotePeerId is missing', () => {
        service.call('');
        expect(mockPeer.call).not.toHaveBeenCalled();
    });

    it('should show notification if call is received but local stream is unavailable', () => {
        service.stopLocalStream();
        const mockIncomingCall = new MockCall();
        mockPeer.trigger('call', mockIncomingCall);
        expect(notificationServiceSpy.show).toHaveBeenCalledWith("Received call but local stream is not available.", 'error');
    });
  });

  describe('handleCall (private method)', () => {
    let mockCall: MockCall;

    beforeEach(fakeAsync(() => {
        tick();
        mockCall = new MockCall();
        (service as any).handleCall(mockCall);
    }));

    it('should set the current call and activate the call state', () => {
        expect((service as any).currentCall).toBe(mockCall);
        expect(service.isCallActive()).toBe(true);
    });

    it('should close an existing call before handling a new one', () => {
        const oldCall = mockCall;
        const newCall = new MockCall();
        
        (service as any).handleCall(newCall);

        expect(oldCall.close).toHaveBeenCalled();
        expect((service as any).currentCall).toBe(newCall);
    });

    it('should update remote stream when the call emits a stream', (done) => {
        const remoteStream = { id: 'remote-stream' } as MediaStream;
        
        service.remoteStream$.subscribe((stream: any) => {
            if (stream && stream.id === 'remote-stream') {
                expect(stream).toBe(remoteStream);
                done();
            }
        });

        mockCall.trigger('stream', remoteStream);
    });

    it('should hang up when the call closes', () => {
        const hangUpSpy = spyOn(service, 'hangUp').and.callThrough();
        mockCall.trigger('close');
        expect(hangUpSpy).toHaveBeenCalled();
    });

    it('should hang up when the call has an error', () => {
        const hangUpSpy = spyOn(service, 'hangUp').and.callThrough();
        mockCall.trigger('error');
        expect(hangUpSpy).toHaveBeenCalled();
    });
  });
});