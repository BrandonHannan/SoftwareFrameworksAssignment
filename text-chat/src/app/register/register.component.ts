import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthenticationService } from '../services/auth.service';
import { AuthResult, RegisterAttempt, SessionStorageUser } from '../models/user.model';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-register',
  imports: [CommonModule, FormsModule],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register implements OnInit{
  public email: string = '';
  public username: string = '';
  public password: string = '';
  public errorMessage: string = '';

  constructor(private router: Router, private auth: AuthenticationService, private notificationService: NotificationService) {}
  ngOnInit(): void {
    const storedUserString = localStorage.getItem('Credentials');
    if (storedUserString) {
      const storedUser: SessionStorageUser = JSON.parse(storedUserString);
      const foundHighestRole = storedUser.roles.find(role => role == "SuperAdmin");
      if (!foundHighestRole){
        this.notificationService.show('You do not have permission to create a new user', 'error');
        this.router.navigateByUrl("/account");
      }
    }
  }

  public async checkSignUp(): Promise<void> {
    if (!this.username || !this.password || !this.email){
      this.errorMessage = 'Please enter details for all fields';
      return;
    }

    const newUser: RegisterAttempt = {
      email: this.email,
      username: this.username, 
      password: this.password
    };

    const result: AuthResult = await this.auth.register(newUser);
    if (result.valid){
      this.router.navigateByUrl("/account");
    }
    else{
      this.errorMessage = result.error;
    }
  }
}
