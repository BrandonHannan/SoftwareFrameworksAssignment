import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { io } from "socket.io-client";
import { NotificationService } from "./notification.service";

const SERVER = "https://localhost:3000";

@Injectable({
    providedIn: 'root'
})
export class SocketService {
    private socket: any;
    public clientId: string = '';

    constructor(private notificationService: NotificationService) {
        this.socket = io(SERVER, {
            reconnectionDelayMax: 10000,
            secure: true, // Enforces the client to use HTTPS
            rejectUnauthorized: false // Will now accept self-signed SSL certificates
        });

        this.socket.on('connect', () => {
            this.clientId = this.socket.id;
        });

        this.socket.on('connect_error', (err: any) => {
            console.error(`Socket connection error: ${err.message}`);
        });
        this.listenForUserActivityNotifications();
    }

    sendMessage(m: any){
        this.socket.emit('message', {
            ...m,
            senderId: this.clientId
        });
    }

    getMessage(){
        return new Observable(observer => {
            this.socket.on('message', (data: any) => {
                observer.next(data);
            });
        });
    }

    joinVideoChat(data: { channelId: string; peerId: string | null; username: string }): void {
        this.socket.emit('join-video-chat', data);
    }

    leaveVideoChat(data: { channelId: string; }): void {
        this.socket.emit('leave-video-chat', data);
    }

    onVideoChatUsersUpdate(): Observable<any[]> {
        return new Observable(observer => {
            this.socket.on('video-chat-users-update', (users: any[]) => {
                observer.next(users);
            });
        });
    }

    private listenForUserActivityNotifications(): void {
        this.socket.on('user-joined-messages', (data: { username: string }) => {
            if (data.username) {
                this.notificationService.show(`${data.username} has joined the channel`, 'success');
            }
        });

        this.socket.on('user-left-messages', (data: { username: string }) => {
            if (data.username) {
                this.notificationService.show(`${data.username} has left the channel`, 'error');
            }
        });
    }

    public joinMessages(data: { groupId: number; channelId: number; username: string }): void {
        this.socket.emit('join-messages', data);
    }

    public leaveMessages(data: { groupId: number; channelId: number; username: string }): void {
        this.socket.emit('leave-messages', data);
    }
}