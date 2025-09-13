import { Injectable, OnDestroy, signal } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SocketService } from './socket.service';
import { NotificationService } from './notification.service';

declare var Peer: any;

@Injectable({
    providedIn: 'root'
})
export class VideoChatService implements OnDestroy{
    private peer: any; // Represents the given client
    private currentCall: any; // The active call

    private localStreamSubscriber = new BehaviorSubject<MediaStream | null>(null); // Tracks the user's camera and microphone
    private remoteStreamSubscriber = new BehaviorSubject<MediaStream | null>(null); // Tracks the connected user's camera and microphone
    private videoChatUsersSubscriber = new BehaviorSubject<any[]>([]); // Tracks the list of users in the given video chat room

    // Public signals for component consumption
    public myPeerId = signal<string | null>(null);
    public isConnected = signal<boolean>(false); // Checks whether PeerJS is connected to the server
    public isCallActive = signal<boolean>(false); // Checks whether a user is currently within a call

    // Public observables for streams and events so the messages component can react and update
    public localStream$ = this.localStreamSubscriber.asObservable(); 
    public remoteStream$ = this.remoteStreamSubscriber.asObservable();
    public videoChatUsers$: Observable<any[]> = this.videoChatUsersSubscriber.asObservable();

    constructor(private socketService: SocketService, private notificationService: NotificationService) {
        this.initializePeer();
        this.getMedia();

        // Listen for user list updates from the server
        this.socketService.onVideoChatUsersUpdate().subscribe(users => {
            this.videoChatUsersSubscriber.next(users);
        });
    }

    ngOnDestroy(): void {
        // Stops PeerJS
        if (this.peer) {
            this.peer.destroy();
        }
        this.stopLocalStream();
    }

    public stopLocalStream(): void {
        const stream = this.localStreamSubscriber.value;
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            this.localStreamSubscriber.next(null);
        }
    }

    public joinVideoChat(channelId: string, username: string): void {
        if (!this.isConnected() || !this.myPeerId()) {
            // If peer is not ready then retry shortly.
            setTimeout(() => this.joinVideoChat(channelId, username), 500);
            return;
        }
        // Then notifies the socket service so everyone knows that this user has joined
        this.socketService.joinVideoChat({ channelId, peerId: this.myPeerId(), username });
    }

    public leaveVideoChat(channelId: string): void {
        this.hangUp();
        // Notifies the socket service so everyone knows that this user has left
        this.socketService.leaveVideoChat({ channelId });
        // Clear user list on the given user's side
        this.videoChatUsersSubscriber.next([]);
    }
    
    public call(remotePeerId: string): void {
        const localStream = this.localStreamSubscriber.value;
        if (!remotePeerId || !localStream){
            return;
        }
        // Gets the call using PeerJS
        const call = this.peer.call(remotePeerId, localStream);
        this.handleCall(call);
    }

    public hangUp(): void {
        // Closes the current PeerJS call
        if (this.currentCall) {
            this.currentCall.close();
        }
        this.isCallActive.set(false);
        this.remoteStreamSubscriber.next(null);
        this.currentCall = null;
    }

    // Gets the local video and microphone information about the user
    private async getMedia(): Promise<void> {
        this.stopLocalStream();
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            this.localStreamSubscriber.next(stream);
        } 
        catch (err) {
            console.error("Failed to get media:", err);
        }
    }

    private initializePeer(): void {
        this.peer = new Peer({
            host: 'localhost',
            port: 3000,
            path: '/peerjs/video-chat', // Path from server.js
            secure: true,
        });

        // Server assigns a Peer ID and signal that the user is connected
        this.peer.on('open', (id: string) => {
            this.myPeerId.set(id);
            this.isConnected.set(true);
        });

        this.peer.on('call', (call: any) => {
            // Automatically answer incoming calls if there is an existing media stream
            const localStream = this.localStreamSubscriber.value;
            if (localStream) {
                // Accepts the incoming call
                call.answer(localStream);
                this.handleCall(call);
            }
            else {
                this.notificationService.show("Received call but local stream is not available.", 'error');
            }
        });
        
        // If the user is disconnected then PeerJS will attempt to reconnect in 3 seconds
        this.peer.on('disconnected', () => {
            this.isConnected.set(false);
            setTimeout(() => this.peer.reconnect(), 3000);
        });

        // If PeerJS is not connected or an error has occurred then a notification error is displayed
        this.peer.on('error', (err: any) => {
            this.notificationService.show(`PeerJS error: ${err}`, 'error');
            this.isConnected.set(false);
        });
    }
    
    // Ensures only one active call at a time
    private handleCall(call: any): void {
        // Closes the current call 
        if (this.currentCall){
            this.currentCall.close();
        }

        // Sets the new call
        this.currentCall = call;
        this.isCallActive.set(true);

        // Gets the emmitted stream event from PeerJS and subscribes the remote stream to see it
        call.on('stream', (remoteStream: MediaStream) => this.remoteStreamSubscriber.next(remoteStream));
        call.on('close', () => this.hangUp());
        call.on('error', () => this.hangUp());
    }
}