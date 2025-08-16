import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GroupService } from '../services/group.service';
import { SessionStorageUser } from '../models/user.model';
import { State } from '../models/state.model';
import { AuthenticationService } from '../services/auth.service';
import { Group } from '../models/group.model';
import { Message } from '../models/message.model';

@Component({
  selector: 'app-messages',
  imports: [CommonModule, FormsModule],
  templateUrl: './messages.html',
  styleUrl: './messages.css'
})
export class Messages implements OnInit, OnDestroy {
  public username: string = '';
  public profilePicture: string | null = '';
  public role: string | null = null;
  public adminGroups: Group[] = [];

  public messages: Message[] = [];
  public filteredMessages: any[] = [];

  constructor(private router: Router, private groupService: GroupService, private auth: AuthenticationService) { }

  async ngOnInit(): Promise<void> {
    const storedUserString: string | null = localStorage.getItem('Credentials');
    const storedStateString: string | null = localStorage.getItem('State');
    if (storedUserString && storedStateString) {
      var storedUser: SessionStorageUser = JSON.parse(storedUserString);
      var storedState: State = JSON.parse(storedStateString);
      const currentUserInfo: SessionStorageUser | null = await this.auth.getUserInfo(storedUser.username);
      if (storedState.currentGroup && storedState.currentChannel && currentUserInfo) {
        storedUser = currentUserInfo;
        this.adminGroups = storedUser.adminGroups;
        const foundHighestRole = storedUser.roles.find(role => role == "SuperAdmin");
        if (foundHighestRole) {
          this.role = "SuperAdmin";
        }
        else {
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
        const group: Group = await this.groupService.getGroup(storedState.currentGroup.id);
        storedState.currentGroup = group;
        const allowed = storedUser.allowedChannels.find(channel => channel.id == storedState.currentChannel!.id);
        if (!allowed && this.role == "User") {
          this.router.navigateByUrl('/groups');
          return;
        }
        const currentUpdatedChannel = group.channels.find(channel => channel.id == storedState.currentChannel!.id);
        if (currentUpdatedChannel) {
          storedState.currentChannel = currentUpdatedChannel;
          this.messages = currentUpdatedChannel.messages;
        }
        else {
          this.router.navigateByUrl('/channels');
          return;
        }
        this.username = storedUser.username;
        this.profilePicture = storedUser.profilePicture;
        localStorage.setItem('Credentials', JSON.stringify(storedUser));
        localStorage.setItem('State', JSON.stringify(storedState));
        this.loadMessages();
      }
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

  ngOnDestroy(): void {
    // Will use this assignment 2 to see if there are any more chat users left in the chat who are still talking
    // if they are the last one then the messages will be saved in the database
  }

  newMessage = {
    text: '',
    image: undefined as string | undefined
  };

  onImageSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      this.newMessage.image = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  sendMessage() {
    if (!this.newMessage.text && !this.newMessage.image) return;

    this.filteredMessages.push({
      username: this.username,
      profilePic: this.profilePicture,
      text: this.newMessage.text,
      image: this.newMessage.image,
      isOwnMessage: true
    });

    this.newMessage.text = '';
    this.newMessage.image = undefined;
  }

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
