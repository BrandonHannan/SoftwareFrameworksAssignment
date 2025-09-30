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
  // Stores the user's information
  public newUser: string = '';
  public newChannelName: string = '';
  public channels: Channel[] = [];
  public filteredChannels: any[] = [];
  public role: string | null = null;
  public adminGroups: Group[] = [];
  public newRole: string = '';
  public group: Group | null = null;
  public allowedChannels: any[] = [];
  public username: string = '';
  public profilePicture: string | null = null;

  // Holds all the users in the given group in the database
  public users: GroupUser[] = [];
  public filteredUsers: any[] = [];

  // Holds all the users in the database
  public allUsers: SessionStorageUser[] = [];
  public filteredAllUsers: any[] = [];

  // Holds the selected user to update their information
  public userUpdate: GroupUser | null = null;
  public selectedRole: string = '';

  // Holds the selected user to add to the group
  public newAddUser: SessionStorageUser | null = null;

  // Holds the paginated information of channels
  public selectedChannel: any = null;
  public channelsCurrentPage: number = 1;
  public itemsPerPage: number = 10;
  public paginatedChannels: any[] = [];

  constructor(private router: Router, private auth: AuthenticationService, private groupService: GroupService) { }

  async ngOnInit(): Promise<void> {
    const storedUserString: string | null = localStorage.getItem('Credentials');
    const storedStateString: string | null = localStorage.getItem('State');
    if (storedUserString && storedStateString) {
      var storedUser: SessionStorageUser = JSON.parse(storedUserString);
      const storedState: State = JSON.parse(storedStateString);
      const currentUserInfo: SessionStorageUser | null = await this.auth.getUserInfo(storedUser.username);
      if (storedState.currentGroup && currentUserInfo) {
        // Determines the users information
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
        // Gets the group's data
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
        // Adds additional information to the displayed channels and users
        this.filterChannels();
        this.filterUsers();
        // Determines the page of channels displayed
        this.updatePaginatedChannels(); 
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

  // Adds a new user to the given group
  public async addNewUser(): Promise<void> {
    if (this.newAddUser && this.group){
      const result: boolean = await this.groupService.addNewUser(this.group.id, this.newAddUser);
      const modalElement = document.getElementById('addNewUserModal');
      // Closes the popup
      if (modalElement) {
        const modal = bootstrap.Modal.getInstance(modalElement);
        modal.hide();
      }
      this.reloadComponent();
    }
  }

  // Adds a new channels to the group
  public async createChannel(): Promise<void> {
    if (this.group) {
      const result: boolean = await this.groupService.createChannel(this.newChannelName, this.group);
      const modalElement = document.getElementById('createChannelModal');
      // Closes the popup
      if (modalElement) {
        const modal = bootstrap.Modal.getInstance(modalElement);
        modal.hide();
      }
      this.reloadComponent();
    }
    return;
  }

  // Deletes the selected channel from the group
  public async removeChannel(id: number): Promise<void> {
    if (this.group){
      const result: boolean = await this.groupService.removeChannel(this.group.id, id);
      this.reloadComponent();
    }
    return;
  }

  // Reports a user from the group
  public async reportUser(): Promise<void> {
    if (this.userUpdate && this.group) {
      const result: boolean = await this.groupService.reportUser(this.userUpdate, this.username, this.profilePicture, this.group.id);
      if (result) {
        // Closes the popup
        const modalElement = document.getElementById('modifyUserModal');
        if (modalElement) {
          const modal = bootstrap.Modal.getInstance(modalElement);
          modal.hide();
        }
      }
    }
    return;
  }

  // Removes the user from the group
  public async removeUserFromGroup(): Promise<void> {
    if (this.userUpdate && this.group) {
      const result: boolean = await this.groupService.removeUserFromGroup(this.userUpdate, this.group.id);
      if (result) {
        // Closes the popup
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

  // Removes a specified user access from a channel 
  public async banUserFromChannel(channel: Channel): Promise<void> {
    if (this.userUpdate) {
      const result: boolean = await this.groupService.banUserFromChannel(channel, this.userUpdate);
      if (result) {
        // Closes the popup
        const modalElement = document.getElementById('modifyUserModal');
        if (modalElement) {
          const modal = bootstrap.Modal.getInstance(modalElement);
          modal.hide();
        }
      }
    }
    return;
  }

  // Adds a specified user to a channel within the group
  public async addUserToChannel(channel: Channel): Promise<void> {
    if (this.userUpdate) {
      const result: boolean = await this.groupService.addUserToChannel(channel, this.userUpdate);
      if (result) {
        // Closes the popup
        const modalElement = document.getElementById('modifyUserModal');
        if (modalElement) {
          const modal = bootstrap.Modal.getInstance(modalElement);
          modal.hide();
        }
      }
    }
    return;
  }

  // Changes a specified user's role to either 'GroupAdmin' or 'SuperAdmin'
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

  // Deletes a specified user's account
  public async deleteUser(): Promise<void> {
    if (this.userUpdate) {
      const result1: SessionStorageUser | null = await this.auth.getUserInfo(this.userUpdate.username);
      if (result1) {
        const result2: AuthResult = await this.auth.deleteAccount(result1);
        if (result2.valid) {
          // Closes the popup
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

  // Removes the user from the group, no longer giving them access to the group
  public async leaveGroup(): Promise<void> {
    if (this.role && this.group) {
      const currentGroupUser: GroupUser = {
        username: this.username,
        profilePicture: this.profilePicture,
        role: this.role
      }
      const result: boolean = await this.groupService.removeUserFromGroup(currentGroupUser, this.group.id);
      // Updates the user's information with the removed group
      const currentUserInfo: SessionStorageUser | null = await this.auth.getUserInfo(this.username);
      if (currentUserInfo) {
        localStorage.setItem('Credentials', JSON.stringify(currentUserInfo));
      }
      this.router.navigateByUrl('/groups');
    }
  }

  // Restructures the users array so they are displayed easily
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

  // Checks if the user has access to the channels within the group
  // If they do they are visible to the user
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
    this.updatePaginatedChannels();
  }

  // Stores the selected user
  public updateUser(user: GroupUser): void {
    this.userUpdate = user;
  }

  // Stores teh selected channel
  public openChannelDetailsModal(channel: any): void {
    this.selectedChannel = channel;
  }

  // Updates the displayed channels based on the selected page
  updatePaginatedChannels(): void {
    const startIndex = (this.channelsCurrentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedChannels = this.filteredChannels.slice(startIndex, endIndex);
  }

  // Determines the channel page selected by the user
  changeChannelsPage(pageChange: number): void {
    this.channelsCurrentPage += pageChange;
    this.updatePaginatedChannels();
  }

  // Gets the maximum pages of all the channels
  getTotalChannelsPages(): number {
    return Math.ceil(this.filteredChannels.length / this.itemsPerPage);
  }
}
