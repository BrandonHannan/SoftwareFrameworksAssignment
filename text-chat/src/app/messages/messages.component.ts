import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewChild, ElementRef, effect, WritableSignal, signal, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GroupService } from '../services/group.service';
import { SessionStorageUser } from '../models/user.model';
import { State } from '../models/state.model';
import { AuthenticationService } from '../services/auth.service';
import { Group } from '../models/group.model';
import { Message } from '../models/message.model';
import { SocketService } from '../services/socket.service';
import { Channel } from '../models/channel.model';
import { VideoChatService } from '../services/videoChat.service';
import { Observable, Subscription } from 'rxjs';

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './messages.html',
  styleUrl: './messages.css'
})
export class Messages implements OnInit, OnDestroy, AfterViewInit {
  // Stores the state
  public currentGroup: Group | null = null;
  public currentChannel: Channel | null = null;

  // Stores the user's information
  public username: string = '';
  public profilePicture: string | null = '';
  public role: string | null = null;
  public adminGroups: Group[] = [];

  // Holds the messages
  public messages: Message[] = [];
  public filteredMessages: any[] = [];

  newMessage = {
    text: '',
    image: undefined as string | undefined
  };
  ioConnection: any;

  // References the DOM <video> elements
  @ViewChild('localVideo', { static: false }) localVideoEl!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo', { static: false }) remoteVideoEl!: ElementRef<HTMLVideoElement>;
  
  // Checks if the video chat is open
  public isVideoChatModalOpen = signal(false);
  // Holds the users who have the video chat open
  public videoChatUsers$: Observable<any[]>;
  // Checks if the user is currently in a call with someone
  public isCallActive: WritableSignal<boolean>;
  // Provides a container for all subscriptions
  private subscriptions = new Subscription();

  constructor(private router: Router, 
              private groupService: GroupService, 
              private auth: AuthenticationService, 
              private socket: SocketService,
              public videoChatService: VideoChatService) {
    // Exposes the video chat users and if the call is active from the video chat service           
    this.videoChatUsers$ = this.videoChatService.videoChatUsers$;
    this.isCallActive = this.videoChatService.isCallActive;
  }

  async ngOnInit(): Promise<void> {
    // Checks if the user logged in
    const storedUserString: string | null = localStorage.getItem('Credentials');
    const storedStateString: string | null = localStorage.getItem('State');
    if (storedUserString && storedStateString) {
      var storedUser: SessionStorageUser = JSON.parse(storedUserString);
      var storedState: State = JSON.parse(storedStateString);
      const currentUserInfo: SessionStorageUser | null = await this.auth.getUserInfo(storedUser.username);
      // Checks if a user has selected a group and a channel 
      if (storedState.currentGroup && storedState.currentChannel && currentUserInfo) {
        storedUser = currentUserInfo;
        this.adminGroups = storedUser.adminGroups;
        // Determines the highest role the user contains
        const foundHighestRole = storedUser.roles.find(role => role == "SuperAdmin");
        if (foundHighestRole) {
          this.role = "SuperAdmin";
        }
        else {
          // Checks if they are a "GroupAdmin" of the current group
          const foundSecondHighestRole = storedUser.roles.find(role => role == "GroupAdmin");
          if (foundSecondHighestRole) {
            for (var i: number = 0; i < this.adminGroups.length; i++) {
              if (this.adminGroups[i].id == storedState.currentGroup.id) {
                this.role = "GroupAdmin";
                break;
              }
            }
            if (this.role != "GroupAdmin") { this.role = "User"; }
          }
          else {
            this.role = "User";
          }
        }
        // Gets the current group
        const group: Group = await this.groupService.getGroup(storedState.currentGroup.id);
        this.currentGroup = group;
        storedState.currentGroup = group;
        // Checks if the user is allowed within the given channel they have selected
        const allowed = storedUser.allowedChannels.find(channel => channel.id == storedState.currentChannel!.id);
        if (!allowed && this.role == "User") {
          this.router.navigateByUrl('/groups');
          return;
        }
        const currentUpdatedChannel = group.channels.find(channel => channel.id == storedState.currentChannel!.id);
        if (currentUpdatedChannel) {
          // Initialises the channel and messages
          storedState.currentChannel = currentUpdatedChannel;
          this.currentChannel = currentUpdatedChannel;
          this.messages = currentUpdatedChannel.messages;
        }
        else {
          this.router.navigateByUrl('/channels');
          return;
        }
        this.username = storedUser.username;
        this.profilePicture = storedUser.profilePicture;
        // Updates the local storage with the updated group and channel
        localStorage.setItem('Credentials', JSON.stringify(storedUser));
        localStorage.setItem('State', JSON.stringify(storedState));
        // Joins the messages room for the given group and channel 
        if (this.currentGroup && this.currentChannel && this.username) {
            const eventData = {
                groupId: this.currentGroup.id,
                channelId: this.currentChannel.id,
                username: this.username
            };
            this.socket.joinMessages(eventData);
        }
        else {
          console.error("FAILED to emit 'join-messages': Missing group, channel, or username info");
        }
        this.loadMessages();
        // Sets up a subscriber relationship where it assigns the isOwnMessage attribute and adds it to the shown messages
        this.ioConnection = this.socket.getMessage().subscribe((message: any) => {
          if (message.senderId == this.socket.clientId){
            message.isOwnMessage = true;
          }
          else{
            message.isOwnMessage = false;
          }
          this.filteredMessages.push(message);
        });
      } // Redirects back to appropriate links if the stored state or user information is incomplete
      else {
        this.router.navigateByUrl('/groups');
      }
    }
    else if (!storedUserString) {
      this.router.navigateByUrl('/login');
    }
    else if (!storedStateString) {
      this.router.navigateByUrl('/groups');
    }
  }

  ngAfterViewInit(): void {
    this.setupStreamSubscriptions();
  }

  private setupStreamSubscriptions(): void {
    // Checks if the video chat has been selected
    if (this.isVideoChatModalOpen()) {
      // Subscribes to the local and remote streams and updates the <video> DOM elements
      const localStreamSub = this.videoChatService.localStream$.subscribe(stream => {
          if (this.localVideoEl && stream) {
              this.localVideoEl.nativeElement.srcObject = stream;
          }
      });

      const remoteStreamSub = this.videoChatService.remoteStream$.subscribe(stream => {
          if (this.remoteVideoEl && stream) {
              this.remoteVideoEl.nativeElement.srcObject = stream;
          } else if (this.remoteVideoEl) {
              this.remoteVideoEl.nativeElement.srcObject = null;
          }
      });
      // Adds the subscriptions to the subscription container
      this.subscriptions.add(localStreamSub);
      this.subscriptions.add(remoteStreamSub);
    }
  }

  ngOnDestroy(): void {
    // Leaves the message room which signals all other users who are still connected to receive a message that this user 
    // has left
    if (this.currentGroup && this.currentChannel && this.username) {
        this.socket.leaveMessages({
            groupId: this.currentGroup.id,
            channelId: this.currentChannel.id,
            username: this.username
        });
    }

    if (this.isVideoChatModalOpen()) {
      if (this.currentChannel) {
        this.videoChatService.leaveVideoChat(String(this.currentChannel.id));
      }
    }
    // Unsubscribes from all subscriptions
    this.subscriptions.unsubscribe();
    if (this.ioConnection){
      this.ioConnection.unsubscribe();
    }
    // Stops the local stream
    this.videoChatService.stopLocalStream();
  }

  openVideoChat(): void {
    if (!this.currentChannel){
      return;
    }
    // Opens the video chat modal
    this.isVideoChatModalOpen.set(true);

    setTimeout(() => {
      this.setupStreamSubscriptions();
    }, 0);
    // Joins the video chat
    this.videoChatService.joinVideoChat(String(this.currentChannel.id), this.username);
  }

  closeVideoChat(): void {
    if (!this.currentChannel){ 
      return;
    }
    // Closes the video chat modal
    this.isVideoChatModalOpen.set(false);
    this.videoChatService.leaveVideoChat(String(this.currentChannel.id));

    // Closes subscriptions
    this.subscriptions.unsubscribe();
    this.subscriptions = new Subscription();
  }

  callUser(peerId: string): void {
    if (peerId === this.videoChatService.myPeerId()){
      return;
    }
    // Starts WebRTC call with a specific peer
    this.videoChatService.call(peerId);
  }

  onImageSelected(event: any) {
    const file = event.target.files[0];
    if (!file){
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      // Reads image as base64 string
      this.newMessage.image = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  async sendMessage() {
    if (!this.newMessage.text && !this.newMessage.image){
      return;
    }
    // Establishes a proper structure to update the database
    const finalMessage: Message = {
      username: this.username,
      profilePicture: this.profilePicture,
      message: this.newMessage.text,
      image: this.newMessage.image ? this.newMessage.image : "",
      groupId: this.currentGroup!.id,
      channelId: this.currentChannel!.id
    }

    const result: boolean = await this.groupService.sendMessage(finalMessage);
    if (result){
      // Sends the message to the message room that the user is connected
      const filteredMessage: any = {
        username: this.username,
        profilePic: this.profilePicture,
        text: this.newMessage.text,
        image: this.newMessage.image
      }

      this.socket.sendMessage(filteredMessage);
    }

    // Resets the message
    this.newMessage.text = '';
    this.newMessage.image = undefined;
  }

  // Simplifies the messages found in the channel and adds the isOwnMessage attribute to determine if they have sent the message
  private loadMessages(): void {
    for (var i: number = 0; i < this.messages.length; i++) {
      if (this.messages[i].username == this.username) {
        this.filteredMessages.push({
          username: this.username,
          profilePic: this.profilePicture,
          text: this.messages[i].message,
          image: this.messages[i].image,
          isOwnMessage: true
        });
      }
      else{
        this.filteredMessages.push({
          username: this.messages[i].username,
          profilePic: this.messages[i].profilePicture,
          text: this.messages[i].message,
          image: this.messages[i].image,
          isOwnMessage: false
        });
      }
    }
  }
}
