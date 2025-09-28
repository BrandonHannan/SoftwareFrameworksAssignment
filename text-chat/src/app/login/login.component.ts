import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthenticationService } from '../services/auth.service';
import { LoginAttempt, AuthResult } from '../models/user.model';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login implements OnInit{
  // Holds the user input values 
  public username: string = '';
  public password: string = '';
  // The error message that occurs if the input is incorrect
  public errorMessage: string = '';
  constructor(private router: Router, private auth: AuthenticationService) {}
  ngOnInit(): void {
    // Checks if the user is already logged in
    const storedUserString = localStorage.getItem('Credentials');
    if (storedUserString) {
      this.router.navigateByUrl("/account");
    }
  }

  public async checkLogin(): Promise<void> {
    // If no user input is inputted
    if (!this.username || !this.password){
      this.errorMessage = 'Invalid email or password';
      return;
    }

    const userpwd: LoginAttempt = {
      username: this.username, 
      password: this.password
    };

    // Makes a user login attempt
    const result: AuthResult = await this.auth.login(userpwd);
    if (result.valid){
      this.router.navigateByUrl("/account");
    }
    else{
      this.errorMessage = result.error;
    }
  }
}
