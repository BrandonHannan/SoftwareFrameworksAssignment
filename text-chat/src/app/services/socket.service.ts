import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { io } from "socket.io-client";

const SERVER = "http://localhost:3000";

@Injectable({
    providedIn: 'root'
})
export class SocketService {
    private socket: any;
    public clientId: string = '';
    
    initialiseSocket(){
        this.socket = io(SERVER);
        this.clientId = this.socket.id;
        this.socket.on('connect', () => {
            this.clientId = this.socket.id;
        });
        return ()=>{this.socket.disconnect();}
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
}