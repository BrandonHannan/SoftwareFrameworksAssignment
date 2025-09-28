import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { AuthResult, LoginAttempt, RegisterAttempt, SessionStorageUser, UpdateAdminGroups, UpdateEmail, UpdateGroups, UpdatePassword, UpdateProfilePicture, UpdateUsername, UserResult } from '../models/user.model';
import { NotificationService } from './notification.service';
import { Report } from '../models/report.model';

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {
    private serverUrl = 'https://localhost:3000';
    constructor(private http: HttpClient, private notificationService: NotificationService) { }

    async login(user: LoginAttempt): Promise<AuthResult> {
        try {
            const result: UserResult = await lastValueFrom(this.http.post<UserResult>(this.serverUrl + '/api/login', user));

            if (result.valid && result.user) {
                const sessionUser: SessionStorageUser = {
                    id: result.user.id,
                    username: result.user.username,
                    email: result.user.email,
                    profilePicture: result.user.profilePicture,
                    roles: result.user.roles,
                    groups: result.user.groups,
                    adminGroups: result.user.adminGroups,
                    requests: result.user.requests,
                    allowedChannels: result.user.allowedChannels,
                    reports: result.user.reports
                };
                localStorage.setItem('Credentials', JSON.stringify(sessionUser));
                this.notificationService.show('Login successful!', 'success'); 
                return { valid: true, error: '' };
            } 
            else {
                localStorage.removeItem('Credentials');
                const errorMsg = result.error || 'Invalid credentials';
                return { valid: false, error: errorMsg };
            }
        } 
        catch (err: any) {
            localStorage.removeItem('Credentials');
            const errorMsg = err.error?.error || 'A server error occurred.';
            return { valid: false, error: errorMsg };
        }
    }

    logout(): void {
        sessionStorage.clear();
        localStorage.clear();
    }

    async register(user: RegisterAttempt): Promise<AuthResult> {
        try {
            const result: UserResult = await lastValueFrom(this.http.post<UserResult>(this.serverUrl + '/api/register', user));

            if (result.valid && result.user){
                this.notificationService.show('Account created successfully!', 'success'); 
                return { valid: true, error: '' };
            }
            else {
                return { valid: false, error: result.error || 'Invalid credentials' };
            }
        }
        catch (err: any) {
            const errorMsg = err.error?.error || 'A server error occurred.';
            return { valid: false, error: errorMsg };
        }
    }

    async deleteAccount(user: SessionStorageUser): Promise<AuthResult> {
        try {
            const result: AuthResult = await lastValueFrom(this.http.delete<AuthResult>(this.serverUrl + '/api/deleteAccount', {
                params: {id: user.id.toString()}
            }));
            if (result.valid){
                const storedUserString: string | null = localStorage.getItem('Credentials');
                if (storedUserString){
                    const storedUser: SessionStorageUser = JSON.parse(storedUserString);
                    if (storedUser.username == user.username){
                        localStorage.clear();
                    }
                }
                this.notificationService.show('Account successfully deleted', 'error');
            }
            else{
                this.notificationService.show(result.error, 'error');
            }
            return result;
        }
        catch (error: any){
            this.notificationService.show(error, 'error');
            return {"valid": false, "error": error};
        }
    }

    async updateUsername(user: UpdateUsername): Promise<AuthResult> {
        try {
            const result: AuthResult = await lastValueFrom(this.http.patch<AuthResult>(this.serverUrl + '/api/updateUser/username', user));
            if (result.valid){
                this.notificationService.show('Username successfully updated', 'success');
                const sessionUserInfo = localStorage.getItem('Credentials');
                if (sessionUserInfo){
                    const userInfo: SessionStorageUser = JSON.parse(sessionUserInfo);
                    userInfo.username = user.username;
                    localStorage.setItem('Credentials', JSON.stringify(userInfo));
                }
            }
            else{
                this.notificationService.show(result.error, 'error');
            }
            return result;
        }
        catch (error: any){
            this.notificationService.show(error, 'error');
            return {"valid": false, "error": error};
        }
    }

    async updatePassword(user: UpdatePassword): Promise<AuthResult> {
        try {
            const result: AuthResult = await lastValueFrom(this.http.patch<AuthResult>(this.serverUrl + '/api/updateUser/password', user));
            if (result.valid){
                this.notificationService.show('Password successfully updated', 'success');
            }
            else{
                this.notificationService.show(result.error, 'error');
            }
            return result;
        }
        catch (error: any){
            this.notificationService.show(error, 'error');
            return {"valid": false, "error": error};
        }
    }

    async updateEmail(user: UpdateEmail): Promise<AuthResult> {
        try {
            const result: AuthResult = await lastValueFrom(this.http.patch<AuthResult>(this.serverUrl + '/api/updateUser/email', user));
            if (result.valid){
                this.notificationService.show('Email successfully updated', 'success');
                const sessionUserInfo = localStorage.getItem('Credentials');
                if (sessionUserInfo){
                    const userInfo: SessionStorageUser = JSON.parse(sessionUserInfo);
                    userInfo.email = user.email;
                    localStorage.setItem('Credentials', JSON.stringify(userInfo));
                }
            }
            else{
                this.notificationService.show(result.error, 'error');
            }
            return result;
        }
        catch (error: any){
            this.notificationService.show(error, 'error');
            return {"valid": false, "error": error};
        }
    }

    async updateGroups(user: UpdateGroups): Promise<AuthResult> {
        try {
            const result: AuthResult = await lastValueFrom(this.http.patch<AuthResult>(this.serverUrl + '/api/updateUser/groups', user));
            if (result.valid){
                this.notificationService.show('Groups successfully updated', 'success');
                const sessionUserInfo = localStorage.getItem('Credentials');
                if (sessionUserInfo){
                    const userInfo: SessionStorageUser = JSON.parse(sessionUserInfo);
                    userInfo.groups = user.groups;
                    localStorage.setItem('Credentials', JSON.stringify(userInfo));
                }
            }
            else{
                this.notificationService.show(result.error, 'error');
            }
            return result;
        }
        catch (error: any){
            this.notificationService.show(error, 'error');
            return {"valid": false, "error": error};
        }
    }

    async updateAdminGroups(user: UpdateAdminGroups): Promise<AuthResult> {
        try {
            const result: AuthResult = await lastValueFrom(this.http.patch<AuthResult>(this.serverUrl + '/api/updateUser/adminGroups', user));
            if (result.valid){
                this.notificationService.show('User successfully added as a group admin', 'success');
                const sessionUserInfo = localStorage.getItem('Credentials');
                if (sessionUserInfo){
                    const userInfo: SessionStorageUser = JSON.parse(sessionUserInfo);
                    userInfo.adminGroups = user.adminGroups;
                    localStorage.setItem('Credentials', JSON.stringify(userInfo));
                }
            }
            else{
                this.notificationService.show(result.error, 'error');
            }
            return result;
        }
        catch (error: any){
            this.notificationService.show(error, 'error');
            return {"valid": false, "error": error};
        }
    }

    async updateProfilePicture(user: UpdateProfilePicture): Promise<AuthResult> {
        try {
            const result: AuthResult = await lastValueFrom(this.http.patch<AuthResult>(this.serverUrl + '/api/updateUser/profilePicture', user));
            if (result.valid){
                this.notificationService.show('Profile picture successfully updated', 'success');
                const sessionUserInfo = localStorage.getItem('Credentials');
                if (sessionUserInfo){
                    const userInfo: SessionStorageUser = JSON.parse(sessionUserInfo);
                    userInfo.profilePicture = user.profilePicture;
                    localStorage.setItem('Credentials', JSON.stringify(userInfo));
                }
            }
            else{
                this.notificationService.show(result.error, 'error');
            }
            return result;
        }
        catch (error: any){
            this.notificationService.show(error, 'error');
            return {"valid": false, "error": error};
        }
    }

    async getUserInfo(username: string): Promise<SessionStorageUser | null> {
        try {
            const result: UserResult = await lastValueFrom(this.http.get<UserResult>(this.serverUrl + '/api/get/userInfo', {
                params: { "username": username }
            }));
            if (result.valid && result.user){
                const sessionUser: SessionStorageUser = {
                    id: result.user.id,
                    username: result.user.username,
                    email: result.user.email,
                    profilePicture: result.user.profilePicture,
                    roles: result.user.roles,
                    groups: result.user.groups,
                    adminGroups: result.user.adminGroups,
                    requests: result.user.requests,
                    allowedChannels: result.user.allowedChannels,
                    reports: result.user.reports
                };
                return sessionUser;
            }
            this.notificationService.show('Unable to get user details', 'error'); 
            return null;
        }
        catch (error) {
            this.notificationService.show('Unable to get user details', 'error'); 
            return null;
        }
    }

    public async getAllUsers(): Promise<SessionStorageUser[] | null> {
        try {
            const result: SessionStorageUser[] | null = await lastValueFrom(this.http.get<SessionStorageUser[] | null>(
                this.serverUrl + '/api/getAllUsers'));
            
            if (result){
                return result;
            }
            this.notificationService.show('Unable to get all users', 'error'); 
            return null;
        }
        catch (error){
            this.notificationService.show('Unable to get all users', 'error'); 
            return null;
        }
    }

    public async acceptReport(report: Report): Promise<boolean> {
        try {
            const result: AuthResult = await lastValueFrom(this.http.post<AuthResult>(this.serverUrl + '/api/acceptReport',
                report
            ));
            if (result.valid){
                const storedUserString: string | null = localStorage.getItem('Credentials');
                if (storedUserString){
                    var storedUser: SessionStorageUser = JSON.parse(storedUserString);
                    const currentUserInfo: SessionStorageUser | null = await this.getUserInfo(storedUser.username);
                    if (currentUserInfo){
                        localStorage.setItem('Credentials', JSON.stringify(currentUserInfo));
                    }
                }
                this.notificationService.show(`User ${report.usernameReported} has been banned from the group`, 'success'); 
                return true;
            }
            this.notificationService.show(`Unable to ban user ${report.usernameReported} from the group`, 'error'); 
            return false;
        }
        catch (error) {
            this.notificationService.show(`Unable to ban user ${report.usernameReported} from the group`, 'error'); 
            return false;
        }
    }
}