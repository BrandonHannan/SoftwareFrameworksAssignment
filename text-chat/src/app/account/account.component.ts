import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthenticationService } from '../services/auth.service';
import { AuthResult, RegisterAttempt, SessionStorageUser } from '../models/user.model';
import { NotificationService } from '../services/notification.service';
import { Group } from '../models/group.model';
import { GroupService } from '../services/group.service';

declare var bootstrap: any;

@Component({
  selector: 'app-account',
  imports: [CommonModule, FormsModule],
  templateUrl: './account.html',
  styleUrl: './account.css'
})
export class Account implements OnInit{
  // Stores all the groups within the database
  private allGroups: Group[] = []; 
  public groups: Group[] = [];

  // Stores the user information and form fields
  public username: string = '';
  public newUsername: string | null = null;
  public email: string = '';
  public newEmail: string | null = null;
  public profilePicture: string | null = null;
  public filteredGroups: any[] = []; // Holds additional information about each group the user belongs to
  private adminGroups: string[] = [];
  public newPassword: string = '';
  public role: string = 'User';
  public newUserUsername: string = '';
  public newUserEmail: string = '';
  public newUserPassword: string = '';

  // Stores information about the pagination of groups 
  public myGroupsCurrentPage: number = 1;
  public itemsPerPage: number = 10;
  public paginatedMyGroups: any[] = [];

  // Stores information about the selected group
  public selectedGroup: any = null;

  constructor(private router: Router, private auth: AuthenticationService, private notification: NotificationService, private groupService: GroupService) {}

  async ngOnInit(): Promise<void> {
    const storedUserString = localStorage.getItem('Credentials');
    if (storedUserString) {
      // Gets the latest information of all the groups in the database
      this.allGroups = await this.groupService.getAllGroups();
      const storedUser: SessionStorageUser = JSON.parse(storedUserString);
      const result: SessionStorageUser | null = await this.auth.getUserInfo(storedUser.username);
      // Loads the users information
      if (result){
        this.username = result.username;
        this.email = result.email;
        this.profilePicture = result.profilePicture;
        this.groups = result.groups; 
        this.adminGroups = result.adminGroups.map(group => `${group.name}`);
        const foundHighestRole = result.roles.find(role => role == "SuperAdmin");
        if (foundHighestRole){
          this.role = "Super Admin";
        }
        const foundSecondHighestRole = result.roles.find(role => role == "GroupAdmin");
        if (foundSecondHighestRole){
          this.role = "Group Admin | User";
        }
        // Adds additional information to the user's groups and displays a select amount of groups
        this.filterGroups();
        this.updateAllPaginatedLists(); 
      }
    }
    else{
      // If not logged in
      this.router.navigateByUrl("/login");
    }
  }

  // Updates the user's username in the local storage and the database
  public async updateUsername(): Promise<void> {
    if (this.newUsername && this.newUsername.trim().length > 0) {
      this.username = this.newUsername.trim();
      const storedUserString = localStorage.getItem('Credentials');
      if (storedUserString){
        var storedUser: SessionStorageUser = JSON.parse(storedUserString);
        const result: AuthResult = await this.auth.updateUsername(
          {"currentUsername": storedUser.username, "username": this.username});
      }
      // Closes popup
      const modalElement = document.getElementById('updateUsernameModal');
      if (modalElement) {
        const modal = bootstrap.Modal.getInstance(modalElement);
        modal.hide();
      }
    }
    else{
      this.notification.show("Please enter a valid username", "error");
    }
  }

  // Updates the user's email in the local storage and the database
  public async updateEmail(): Promise<void> {
    if (this.newEmail && this.newEmail.trim().length > 0 && this.newEmail.indexOf('@') != -1){
      this.email = this.newEmail.trim();
      const storedUserString = localStorage.getItem('Credentials');
      if (storedUserString){
        var storedUser: SessionStorageUser = JSON.parse(storedUserString);
        const result: AuthResult = await this.auth.updateEmail(
          {"currentUsername": storedUser.username, "email": this.email});
      }
      // Closes the popup
      const modalElement = document.getElementById('updateEmailModal');
      if (modalElement) {
        const modal = bootstrap.Modal.getInstance(modalElement);
        modal.hide();
      }
    }
    else{
      this.notification.show("Please enter a valid email", "error");
    }
  }

  // Updates the user's password in the local storage and the database
  public async updatePassword(): Promise<void> {
    if (this.newPassword && this.newPassword.trim().length > 0){
      const result: AuthResult = await this.auth.updatePassword(
          {"currentUsername": this.username, "password": this.newPassword});
      // Closes popup
      const modalElement = document.getElementById('updatePasswordModal');
      if (modalElement) {
        const modal = bootstrap.Modal.getInstance(modalElement);
        modal.hide();
      }
    }
    else{
      this.notification.show("Please enter a valid password", "error");
    }
  }

  // // Updates the user's profile in the local storage and the database
  public async onProfilePictureSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = async () => {
        this.profilePicture = reader.result as string;
        const storedUserString = localStorage.getItem('Credentials');
        if (storedUserString){
          var storedUser: SessionStorageUser = JSON.parse(storedUserString);
          const result: AuthResult = await this.auth.updateProfilePicture(
            {"currentUsername": storedUser.username, "profilePicture": this.profilePicture});
        }
      };
      reader.readAsDataURL(file);
    }
  }

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }

  // Performs an account deletion
  async confirmDelete(): Promise<void> {
    const storedUserString: string | null = localStorage.getItem('Credentials');
    if (storedUserString){
      const storedUser: SessionStorageUser = JSON.parse(storedUserString);
      const result: AuthResult = await this.auth.deleteAccount(storedUser);
      if (result.valid){
        const modalElement = document.getElementById('deleteAccountModal');
        // Closes popup
        if (modalElement) {
          const modal = bootstrap.Modal.getInstance(modalElement);
          modal.hide();
        }
        this.router.navigateByUrl('/login');
      }
      else{
        const modalElement = document.getElementById('deleteAccountModal');
        if (modalElement) {
          const modal = bootstrap.Modal.getInstance(modalElement);
          modal.hide();
        }
      }
    }
  }

  // Used for 'SuperAdmin' users
  public createNewUser(): void {
    this.router.navigateByUrl('/register');
  }

  // Adds the user's role for each of the groups they are apart in to be visually apparent on the page
  private filterGroups(): void {
    var permission: string = "Group Admin";
    if (this.role == "Super Admin"){
      permission = "Super Admin";
    }
    for (var i: number = 0; i<this.groups.length; i++){
      const currentGroup = this.groups[i];
      const fullGroupDetails = this.allGroups.find(g => g.id === currentGroup.id);
      
      if (fullGroupDetails) {
        const isAdmin = this.adminGroups.includes(fullGroupDetails.name);
        if (isAdmin) {
          this.filteredGroups.push({ "group": fullGroupDetails, "permission": permission });
        } else {
          const userPermission = (permission === "Super Admin") ? "Super Admin" : "User";
          this.filteredGroups.push({ "group": fullGroupDetails, "permission": userPermission });
        }
      }
    }
  }

  updateAllPaginatedLists(): void {
    this.updatePaginatedMyGroups();
  }

  // Determines the page of groups to display
  updatePaginatedMyGroups(): void {
    const startIndex = (this.myGroupsCurrentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedMyGroups = this.filteredGroups.slice(startIndex, endIndex);
  }

  // Changes the page of groups to display
  changeMyGroupsPage(pageChange: number): void {
    this.myGroupsCurrentPage += pageChange;
    this.updatePaginatedMyGroups();
  }

  // Gets the highest page number of groups
  getTotalMyGroupsPages(): number {
    return Math.ceil(this.filteredGroups.length / this.itemsPerPage);
  }

  // Opens the popup
  public openGroupDetailsModal(group: any): void {
    this.selectedGroup = group;
  }
}
