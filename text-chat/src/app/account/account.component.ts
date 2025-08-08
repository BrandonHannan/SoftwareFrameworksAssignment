import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthenticationService } from '../services/auth.service';
import { AuthResult, RegisterAttempt, SessionStorageUser } from '../models/user.model';
import { NotificationService } from '../services/notification.service';

declare var bootstrap: any;

@Component({
  selector: 'app-account',
  imports: [CommonModule, FormsModule],
  templateUrl: './account.html',
  styleUrl: './account.css'
})
export class Account implements OnInit{
  public username: string = '';
  public newUsername: string | null = null;
  public email: string = '';
  public newEmail: string | null = null;
  public profilePicture: string | null = null;
  public groups: string[] = [];
  public filteredGroups: any[] = [];
  private adminGroups: string[] = [];
  public newPassword: string = '';
  public role: string = 'User';

  public newUserUsername: string = '';
  public newUserEmail: string = '';
  public newUserPassword: string = '';

  constructor(private router: Router, private auth: AuthenticationService, private notification: NotificationService) {}

  async ngOnInit(): Promise<void> {
    const storedUserString = localStorage.getItem('Credentials');
    if (storedUserString) {
      const storedUser: SessionStorageUser = JSON.parse(storedUserString);
      const result: SessionStorageUser | null = await this.auth.getUserInfo(storedUser.username);
      if (result){
        this.username = result.username;
        this.email = result.email;
        this.profilePicture = result.profilePicture;
        this.groups = result.groups.map(group => `${group.name}`);
        this.adminGroups = result.adminGroups.map(group => `${group.name}`);
        const foundHighestRole = result.roles.find(role => role == "SuperAdmin");
        if (foundHighestRole){
          this.role = "Super Admin";
        }
        const foundSecondHighestRole = result.roles.find(role => role == "GroupAdmin");
        if (foundSecondHighestRole){
          this.role = "Group Admin | User";
        }
        this.filterGroups();
      }
    }
    else{
      this.router.navigateByUrl("/login");
    }
  }

  public async updateUsername(): Promise<void> {
    if (this.newUsername && this.newUsername.trim().length > 0) {
      this.username = this.newUsername.trim();
      const storedUserString = localStorage.getItem('Credentials');
      if (storedUserString){
        var storedUser: SessionStorageUser = JSON.parse(storedUserString);
        const result: AuthResult = await this.auth.updateUsername(
          {"currentUsername": storedUser.username, "username": this.username});
      }
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

  public async updateEmail(): Promise<void> {
    if (this.newEmail && this.newEmail.trim().length > 0 && this.newEmail.indexOf('@') != -1){
      this.email = this.newEmail.trim();
      const storedUserString = localStorage.getItem('Credentials');
      if (storedUserString){
        var storedUser: SessionStorageUser = JSON.parse(storedUserString);
        const result: AuthResult = await this.auth.updateEmail(
          {"currentUsername": storedUser.username, "email": this.email});
      }
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

  public async updatePassword(): Promise<void> {
    if (this.newPassword && this.newPassword.trim().length > 0){
      const result: AuthResult = await this.auth.updatePassword(
          {"currentUsername": this.username, "password": this.newPassword});
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

  async confirmDelete(): Promise<void> {
    const storedUserString: string | null = localStorage.getItem('Credentials');
    if (storedUserString){
      const storedUser: SessionStorageUser = JSON.parse(storedUserString);
      const result: AuthResult = await this.auth.deleteAccount(storedUser);
      if (result.valid){
        const modalElement = document.getElementById('deleteAccountModal');
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

  public createNewUser(): void {
    this.router.navigateByUrl('/register');
  }

  private filterGroups(): void {
    var permission: string = "Group Admin";
    if (this.role == "Super Admin"){
      permission = "Super Admin";
    }
    for (var i: number = 0; i<this.groups.length; i++){
      const foundGroup = this.adminGroups.find(group => group == this.groups[i]);
      if (foundGroup){
        this.filteredGroups.push({"group": this.groups[i], "permission": permission});
      }
      else{
        if (permission == "Super Admin"){
          this.filteredGroups.push({"group": this.groups[i], "permission": permission});
        }
        else {
          this.filteredGroups.push({"group": this.groups[i], "permission": "User"});
        }
      }
    }
  }
}
