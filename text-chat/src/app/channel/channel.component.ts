import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GroupService } from '../services/group.service';
import { AuthResult, GroupUser, SessionStorageUser } from '../models/user.model';
import { Group, GroupResult } from '../models/group.model';
import { State } from '../models/state.model';
import { Channel } from '../models/channel.model';
import { AuthenticationService } from '../services/auth.service';

declare var bootstrap: any;

@Component({
  selector: 'app-channel',
  imports: [CommonModule, FormsModule],
  templateUrl: './channel.html',
  styleUrl: './channel.css'
})
export class ChannelComponent implements OnInit {
  public newUser: string = '';
  public newChannelName: string = '';
  public channels: Channel[] = [];
  public filteredChannels: any[] = [];
  public role: string | null = null;
  public adminGroups: Group[] = [];
  public newRole: string = '';
  public group: Group | null = null;

  public users: GroupUser[] = [];
  public filteredUsers: any[] = [];

  public allUsers: SessionStorageUser[] = [];
  public filteredAllUsers: any[] = [];

  public allowedChannels: any[] = [];
  public username: string = '';
  public profilePicture: string | null = null;

  public userUpdate: GroupUser | null = null;
  public selectedRole: string = '';

  public newAddUser: SessionStorageUser | null = null;

  constructor(private router: Router, private auth: AuthenticationService, private groupService: GroupService) { }

  async ngOnInit(): Promise<void> {
    const storedUserString: string | null = localStorage.getItem('Credentials');
    const storedStateString: string | null = localStorage.getItem('State');
    if (storedUserString && storedStateString) {
      var storedUser: SessionStorageUser = JSON.parse(storedUserString);
      const storedState: State = JSON.parse(storedStateString);
      const currentUserInfo: SessionStorageUser | null = await this.auth.getUserInfo(storedUser.username);
      if (storedState.currentGroup && currentUserInfo) {
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
        this.group = group;
        this.channels = group.channels;
        localStorage.setItem('State', JSON.stringify(storedState));
        this.allowedChannels = storedUser.allowedChannels.map(channel => ({
          groupId: channel.groupId,
          id: channel.id
        }));
        if (!this.adminGroups.find(ids => ids.id == group.id) && this.role == "GroupAdmin") {
          this.role = "User";
        }
        this.users = group.users;
        this.username = storedUser.username;
        this.profilePicture = storedUser.profilePicture;
        const allUsers: SessionStorageUser[] | null = await this.auth.getAllUsers();
        if (allUsers){
          this.allUsers = allUsers;
        }
        this.filterChannels();
        this.filterUsers();
        localStorage.setItem('Credentials', JSON.stringify(storedUser));
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

  reloadComponent() {
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigateByUrl('/channels');
    });
  }

  public async enterChannel(channel: Channel): Promise<void> {

    const result: boolean = await this.groupService.setCurrentChannel(channel);
    if (result) {
      this.router.navigateByUrl('/messages');
      return;
    }
  }

  public async addNewUser(): Promise<void> {
    if (this.newAddUser && this.group){
      const result: boolean = await this.groupService.addNewUser(this.group.id, this.newAddUser);
      const modalElement = document.getElementById('addNewUserModal');
      if (modalElement) {
        const modal = bootstrap.Modal.getInstance(modalElement);
        modal.hide();
      }
      this.reloadComponent();
    }
  }

  public async createChannel(): Promise<void> {
    if (this.group) {
      const result: boolean = await this.groupService.createChannel(this.newChannelName, this.group);
      const modalElement = document.getElementById('createChannelModal');
      if (modalElement) {
        const modal = bootstrap.Modal.getInstance(modalElement);
        modal.hide();
      }
      this.reloadComponent();
    }
    return;
  }

  public async removeChannel(id: number): Promise<void> {
    if (this.group){
      const result: boolean = await this.groupService.removeChannel(this.group.id, id);
      this.reloadComponent();
    }
    return;
  }

  public async reportUser(): Promise<void> {
    if (this.userUpdate && this.group) {
      const result: boolean = await this.groupService.reportUser(this.userUpdate, this.username, this.profilePicture, this.group.id);
      if (result) {
        const modalElement = document.getElementById('modifyUserModal');
        if (modalElement) {
          const modal = bootstrap.Modal.getInstance(modalElement);
          modal.hide();
        }
      }
    }
    return;
  }

  public async removeUserFromGroup(): Promise<void> {
    if (this.userUpdate && this.group) {
      const result: boolean = await this.groupService.removeUserFromGroup(this.userUpdate, this.group.id);
      if (result) {
        const modalElement = document.getElementById('modifyUserModal');
        if (modalElement) {
          const modal = bootstrap.Modal.getInstance(modalElement);
          modal.hide();
        }
        this.reloadComponent();
      }
    }
    return;
  }

  public async banUserFromChannel(channel: Channel): Promise<void> {
    if (this.userUpdate) {
      const result: boolean = await this.groupService.banUserFromChannel(channel, this.userUpdate);
      if (result) {
        const modalElement = document.getElementById('modifyUserModal');
        if (modalElement) {
          const modal = bootstrap.Modal.getInstance(modalElement);
          modal.hide();
        }
      }
    }
    return;
  }

  public async addUserToChannel(channel: Channel): Promise<void> {
    if (this.userUpdate) {
      const result: boolean = await this.groupService.addUserToChannel(channel, this.userUpdate);
      if (result) {
        const modalElement = document.getElementById('modifyUserModal');
        if (modalElement) {
          const modal = bootstrap.Modal.getInstance(modalElement);
          modal.hide();
        }
      }
    }
    return;
  }

  public async promoteUser(selectedRole: string): Promise<void> {
    if (this.userUpdate && this.group) {
      const result: boolean = await this.groupService.promoteUser(this.userUpdate, selectedRole, this.group.id);
      if (result) {
        const modalElement = document.getElementById('modifyUserModal');
        if (modalElement) {
          const modal = bootstrap.Modal.getInstance(modalElement);
          modal.hide();
        }
        this.reloadComponent();
      }
    }
    return;
  }

  public async deleteUser(): Promise<void> {
    if (this.userUpdate) {
      const result1: SessionStorageUser | null = await this.auth.getUserInfo(this.userUpdate.username);
      if (result1) {
        const result2: AuthResult = await this.auth.deleteAccount(result1);
        if (result2.valid) {
          const modalElement = document.getElementById('modifyUserModal');
          if (modalElement) {
            const modal = bootstrap.Modal.getInstance(modalElement);
            modal.hide();
          }
          this.reloadComponent();
        }
      }
    }
    return;
  }

  public async leaveGroup(): Promise<void> {
    if (this.role && this.group) {
      const currentGroupUser: GroupUser = {
        username: this.username,
        profilePicture: this.profilePicture,
        role: this.role
      }
      const result: boolean = await this.groupService.removeUserFromGroup(currentGroupUser, this.group.id);
      const currentUserInfo: SessionStorageUser | null = await this.auth.getUserInfo(this.username);
      if (currentUserInfo) {
        localStorage.setItem('Credentials', JSON.stringify(currentUserInfo));
      }
      this.router.navigateByUrl('/groups');
    }
  }

  private filterUsers(): void {
    for (var i: number = 0; i < this.users.length; i++) {
      this.filteredUsers.push({
        "user": this.users[i]
      });
    }

    for (var i: number = 0; i < this.allUsers.length; i++){
      const foundUser = this.users.find(user => user.username == this.allUsers[i].username);
      if (!foundUser){
        this.filteredAllUsers.push({
          "user": this.allUsers[i]
        });
      }
    }
  }

  private filterChannels(): void {
    if (!this.group) return;
    var currentRole: string = "User"
    for (let i = 0; i < this.channels.length; i++) {
      const ifAllowed = this.allowedChannels.find(ids => ids.groupId == this.channels[i].groupId &&
        ids.id == this.channels[i].id);
      const ifAdminGroup = this.adminGroups.find(group => group.id == this.group!.id);
      if (ifAdminGroup) {
        currentRole = "GroupAdmin";
      }
      if (this.role == "SuperAdmin") {
        currentRole = "SuperAdmin";
      }
      if (ifAllowed) {
        this.filteredChannels.push({
          channel: this.channels[i],
          permission: true,
          role: currentRole
        });
      }
      else if (!ifAllowed && (currentRole == "SuperAdmin" || currentRole == "GroupAdmin")) {
        this.filteredChannels.push({
          channel: this.channels[i],
          permission: true,
          role: currentRole
        })
      }
    }
  }

  public updateUser(user: GroupUser): void {
    this.userUpdate = user;
  }
}
