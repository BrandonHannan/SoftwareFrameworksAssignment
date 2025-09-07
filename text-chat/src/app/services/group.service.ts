import { Injectable, OnInit } from '@angular/core';
import { NotificationService } from './notification.service';
import { HttpClient } from '@angular/common/http';
import { Message } from '../models/message.model';
import { State } from '../models/state.model';
import { Group, GroupResult, GroupsResult } from '../models/group.model';
import { lastValueFrom } from 'rxjs';
import { AuthResult, GroupUser, SessionStorageUser } from '../models/user.model';
import { Channel } from '../models/channel.model';
import { Request } from '../models/request.model';
import { Report } from '../models/report.model';
import { AuthenticationService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class GroupService implements OnInit{
    private currentGroup: Group | null = null;
    private currentChannel: Channel | null = null;
    private messages: Message[] | null = null;
    private serverUrl = 'http://localhost:3000';
    constructor(private http: HttpClient, private notificationService: NotificationService, 
        private auth: AuthenticationService) { }

    ngOnInit(): void {
        const storedState: string | null = localStorage.getItem('State');
        if (storedState){
            const state: State = JSON.parse(storedState);
            if (state.currentGroup && state.currentChannel){
                this.currentGroup = state.currentGroup
                this.currentChannel = state.currentChannel
            }
        }
    }

    public getCurrentGroup(): Group | null {
        return this.currentGroup;
    }

    public async setCurrentGroup(id: number): Promise<boolean> {
        const storedState: string | null = localStorage.getItem('State');
        if (storedState){
            try {
                const request = {"id": id};
                const result: GroupResult = await lastValueFrom(this.http.get<GroupResult>(this.serverUrl + '/api/get/group', {
                    params: request
                }))
                const state: State = JSON.parse(storedState);
                if (result.valid && result.group){
                    this.currentGroup = result.group;
                    state.currentGroup = result.group;
                    localStorage.setItem('State', JSON.stringify(state));
                }
                else{
                    this.notificationService.show(result.error, "error");
                    return false;
                }
                return true;
            }
            catch (error){
                this.notificationService.show("Unable to load group", "error");
                return false;
            }
        }
        else{
            try {
                const request = {"id": id};
                const result: GroupResult = await lastValueFrom(this.http.get<GroupResult>(this.serverUrl + '/api/get/group', {
                    params: request
                }))
                if (result.valid && result.group){
                    this.currentGroup = result.group;
                    const newState: State = {
                        currentChannel: null,
                        currentGroup: result.group
                    };
                    localStorage.setItem('State', JSON.stringify(newState));
                }
                else{
                    this.notificationService.show(result.error, "error");
                    return false;
                }
                return true;
            }
            catch (error){
                this.notificationService.show("Unable to load group", "error");
                return false;
            }
        }
    }

    public getCurrentChannel(): Channel | null {
        return this.currentChannel;
    }

    public async setCurrentChannel(channel: Channel): Promise<boolean> {
        const storedState: string | null = localStorage.getItem('State');
        if (storedState){
            try {
                const request = {"id": channel.groupId};
                const result: GroupResult = await lastValueFrom(this.http.get<GroupResult>(this.serverUrl + '/api/get/group', {
                    params: request
                }))
                const state: State = JSON.parse(storedState);
                if (result.valid && result.group){
                    this.currentGroup = result.group;
                    state.currentGroup = result.group;
                    const currentUpdatedChannel: Channel | undefined = result.group.channels.find(channel => channel.id == channel.id);
                    if (currentUpdatedChannel){
                        this.currentChannel = currentUpdatedChannel;
                        state.currentChannel = currentUpdatedChannel;
                    }
                    else {
                        this.notificationService.show(`Unable to find channel: ${channel.name} in group: ${result.group.name}`, "error");
                        return false;
                    }
                    localStorage.setItem('State', JSON.stringify(state));
                    return true;
                }
                else{
                    this.notificationService.show(result.error, "error");
                    return false;
                }
            }
            catch (error){
                this.notificationService.show("Unable to load group", "error");
                return false;
            }
        }
        else{
            try {
                const request = {"id": channel.groupId};
                const result: GroupResult = await lastValueFrom(this.http.get<GroupResult>(this.serverUrl + '/api/get/group', {
                    params: request
                }))
                if (result.valid && result.group){
                    this.currentGroup = result.group;
                    const currentUpdatedChannel: Channel | undefined = result.group.channels.find(channel => channel.id == channel.id);
                    if (currentUpdatedChannel){
                        this.currentChannel = currentUpdatedChannel;
                        const newState: State = {
                            currentChannel: currentUpdatedChannel,
                            currentGroup: result.group
                        };
                        localStorage.setItem('State', JSON.stringify(newState));
                        return true;
                    }
                    else{
                        this.notificationService.show(`Unable to find channel: ${channel.name} in group: ${result.group.name}`, "error");
                        return false;
                    }
                }
                else{
                    this.notificationService.show(result.error, "error");
                    return false;
                }
            }
            catch (error){
                this.notificationService.show("Unable to load group", "error");
                return false;
            }
        }
        // Update messages
    }

    public getMessages(): Message[] | null {
        return this.messages;
    }

    private async updateMessages(newMessage: Message): Promise<void> {
        return;
    }

    public async rejectRequest(request: Request): Promise<boolean> {
        const req: any = {
            "username": request.username,
            "groupId": request.groupId,
            "group": request.group,
        }
        try {
            const result: AuthResult = await lastValueFrom(this.http.delete<AuthResult>(this.serverUrl + '/api/rejectRequest', {
                params: {"request": JSON.stringify(req)}
            }));
            if (result.valid) {
                const storedUserString: string | null = localStorage.getItem('Credentials');
                if (storedUserString){
                    var storedUser: SessionStorageUser = JSON.parse(storedUserString);
                    for (var i: number = 0; i<storedUser.requests.length; i++){
                        if (storedUser.requests[i].username == request.username &&
                            storedUser.requests[i].groupId == request.groupId){
                            storedUser.requests.splice(i, 1);
                        }
                    }
                    localStorage.setItem('Credentials', JSON.stringify(storedUser));
                }
                this.notificationService.show(`${request.username} rejected from ${request.group}`, 'error');
                return true;
            }
            return false;
        }
        catch (error) {
            this.notificationService.show(`Unable to reject ${request.username} from ${request.group}`, 'error');
            return false;
        }
    }

    public async acceptRequest(request: Request): Promise<boolean> {
        const req: any = {
            "username": request.username,
            "profilePicture": request.profilePicture,
            "groupId": request.groupId,
            "group": request.group,
        }
        try {
            const result: AuthResult = await lastValueFrom(this.http.post<AuthResult>(this.serverUrl + '/api/acceptRequest', req));
            if (result.valid) {
                const storedUserString: string | null = localStorage.getItem('Credentials');
                if (storedUserString){
                    var storedUser: SessionStorageUser = JSON.parse(storedUserString);
                    for (var i: number = 0; i<storedUser.requests.length; i++){
                        if (storedUser.requests[i].username == request.username &&
                            storedUser.requests[i].groupId == request.groupId){
                            storedUser.requests.splice(i, 1);
                        }
                    }
                    localStorage.setItem('Credentials', JSON.stringify(storedUser));
                }
                this.notificationService.show(`${request.username} added to ${request.group}`, 'success');
                return true;
            }
            return false
        }
        catch (error) {
            this.notificationService.show(`Unable to accept ${request.username} to ${request.group}`, 'error');
            return false;
        }
    }

    public async requestGroup(request: Request): Promise<boolean> {
        try {
            const result: AuthResult = await lastValueFrom(this.http.post<AuthResult>(this.serverUrl + '/api/requestGroup', request));
            if (result.valid){
                this.notificationService.show(`Group: ${request.group} has been requested`, "success");
                return true;
            }
            else{
                this.notificationService.show(result.error, "error");
                return false;
            }
        }
        catch (error){
            this.notificationService.show("Unable to request group", "error");
            return false;
        }
    }

    public async removeGroup(id: number): Promise<boolean> {
        try{
            const result: AuthResult = await lastValueFrom(this.http.delete<AuthResult>(this.serverUrl + '/api/removeGroup', {
                params: {"id": id}
            }));
            if (result.valid){
                if (this.currentGroup){
                    if (this.currentGroup.id == id){
                        this.currentGroup = null;
                        this.currentChannel = null;
                        this.messages = null;
                        const storedStateString: string | null = localStorage.getItem('State');
                        if (storedStateString){
                            var storedState: State = JSON.parse(storedStateString);
                            storedState.currentGroup = null;
                            storedState.currentChannel = null;
                            localStorage.setItem('State', JSON.stringify(storedState));
                        }
                    }
                }
                const storedUserString: string | null = localStorage.getItem('Credentials');
                if (storedUserString){
                    const storedUser: SessionStorageUser = JSON.parse(storedUserString);
                    const currentUserInfo: SessionStorageUser | null = await this.auth.getUserInfo(storedUser.username);
                    if (currentUserInfo){
                        localStorage.setItem('Credentials', JSON.stringify(currentUserInfo));
                    }
                }
                this.notificationService.show("Group deleted", "error");
                return true;
            }
            this.notificationService.show(result.error, "error");
            return false;
        }
        catch (error){
            this.notificationService.show("Unable to delete group", "error");
            return false;
        }
    }

    public async getAllGroups(): Promise<Group[]> {
        try {
            const result: GroupsResult = await lastValueFrom(this.http.get<GroupsResult>(this.serverUrl + '/api/get/allGroups'));
            if (result.valid && result.groups){
                const storedUserString: string | null = localStorage.getItem('Credentials');
                if (storedUserString){
                    const storedUser: SessionStorageUser = JSON.parse(storedUserString);
                    if (storedUser.roles.indexOf('SuperAdmin') > -1){
                        storedUser.groups = result.groups;
                        localStorage.setItem('Credentials', JSON.stringify(storedUser));
                    }
                }
                return result.groups;
            }
            else{
                return [];
            }
        }
        catch (error){
            return [];
        }
    }

    public async createNewGroup(group: string, username: string, role: string): Promise<boolean> {
        try {
            const result: GroupResult = await lastValueFrom(this.http.post<GroupResult>(this.serverUrl + '/api/createGroup', {
                "name": group, "username": username, "role": role,
            }));
            if (result.valid && result.group){
                const storedUserString: string | null = localStorage.getItem('Credentials');
                if (storedUserString){
                    var storedUser: SessionStorageUser = JSON.parse(storedUserString);
                    storedUser.groups.push(result.group);
                    storedUser.adminGroups.push(result.group);
                    localStorage.setItem('Credentials', JSON.stringify(storedUser));
                }
                this.notificationService.show('Group successfully created!', "success");
                return true;
            }
            this.notificationService.show('Unable to create group', "error");
            return false;
        }
        catch (error){
            this.notificationService.show('Unable to create group', "error");
            return false;
        }
    }

    public async getGroup(id: number): Promise<Group> {
        try {
            const request = {"id": id};
            const result: GroupResult = await lastValueFrom(this.http.get<GroupResult>(this.serverUrl + '/api/get/group', {
                params: request
            }));
            if (result.valid && result.group){
                return result.group;
            }
            else{
                this.notificationService.show(`Error retrieving group id: ${id}`, "error");
                return {"id": -1, "name": "", "users": [], "channels": []};
            }
        }
        catch (error){
            this.notificationService.show(`Error retrieving group id: ${id}`, "error");
            return {"id": -1, "name": "", "users": [], "channels": []};
        }
    }

    public async reportUser(user: GroupUser, adminUsername: string, adminProfilePicture: string | null, groupId: number): Promise<boolean> {
        try {
            const request: Report = {
                usernameReported: user.username,
                userProfilePicture: user.profilePicture,
                adminReport: adminUsername,
                adminProfilePicture: adminProfilePicture,
                groupId: groupId
            }
            const result: AuthResult = await lastValueFrom(this.http.post<AuthResult>(this.serverUrl + '/api/reportUser', request));
            if (result.valid){
                this.notificationService.show(`${user.username} has been reported to the Super Admins`, 'success');
                return true;
            }
            this.notificationService.show(`${user.username} is unable to be reported to the Super Admins`, 'error');
            return false;
        }
        catch (error){
            this.notificationService.show(`${user.username} is unable to be reported to the Super Admins`, 'error');
            return false;
        }
    }

    public async removeUserFromGroup(user: GroupUser, groupId: number): Promise<boolean> {
        try {
            const {profilePicture, ...newUser} = user;
            const result: AuthResult = await lastValueFrom(this.http.delete<AuthResult>(this.serverUrl + '/api/removeUserFromGroup', {
                params: {"user": JSON.stringify(newUser), "groupId": groupId}
            }));
            if (result.valid){
                this.notificationService.show(`${user.username} has been removed from the group`, 'success');
                const storedUserString: string | null = localStorage.getItem('Credentials');
                if (storedUserString){
                    const storedUser: SessionStorageUser = JSON.parse(storedUserString);
                    if (storedUser.username == user.username){
                        const currentUserInfo: SessionStorageUser | null = await this.auth.getUserInfo(user.username);
                        if (currentUserInfo){
                            localStorage.setItem('Credentials', JSON.stringify(currentUserInfo));
                        }
                    }
                }
                return true;
            }
            this.notificationService.show(`${user.username} is unable to be removed from the group`, 'error');
            return false;
        }
        catch (error){
            this.notificationService.show(`${user.username} is unable to be removed from the group`, 'error');
            return false;
        }
    }

    public async banUserFromChannel(channel: Channel, user: GroupUser): Promise<boolean> {
        try {
            const request: any = {
                "groupId": channel.groupId,
                "id": channel.id,
                "name": channel.name,
                "username": user.username
            }
            const result: AuthResult = await lastValueFrom(this.http.post<AuthResult>(this.serverUrl + '/api/banUserFromChannel', request));
            if (result.valid){
                this.notificationService.show(`User has been banned from ${channel.name}`, 'success');
                return true;
            }
            this.notificationService.show(`Unable to ban user from ${channel.name}`, 'error');
            return false;
        }
        catch (error){
            this.notificationService.show(`Unable to ban user from ${channel.name}`, 'error');
            return false;
        }
    }

    public async addUserToChannel(channel: Channel, user: GroupUser): Promise<boolean> {
        try {
            const request: any = {
                "groupId": channel.groupId,
                "channelId": channel.id,
                "name": channel.name,
                "username": user.username,
                "channelObject": channel
            }
            const result: AuthResult = await lastValueFrom(this.http.post<AuthResult>(this.serverUrl + '/api/addUserToChannel', request));
            if (result.valid){
                this.notificationService.show(`User has been added to ${channel.name}`, 'success');
                return true;
            }
            this.notificationService.show(`Unable to add user to ${channel.name}`, 'error');
            return false;
        }
        catch (error){
            this.notificationService.show(`Unable to add user to ${channel.name}`, 'error');
            return false;
        }
    }

    public async promoteUser(user: GroupUser, role: string, groupId: number): Promise<boolean> {
        try {
            const request: any = {
                "username": user.username,
                "groupId": groupId,
                "role": role
            }
            const result: AuthResult = await lastValueFrom(this.http.post<AuthResult>(this.serverUrl + '/api/promoteUser', request));
            if (result.valid){
                this.notificationService.show(`User has been promoted to ${role}`, 'success');
                return true;
            }
            this.notificationService.show(`Unable to promote user to ${role}`, 'error');
            return false;
        }
        catch (error){
            this.notificationService.show(`Unable to promote user to ${role}`, 'error');
            return false;
        }
    }

    public async createChannel(channelName: string, group: Group): Promise<boolean> {
        try {
            const request: any = {
                "channelName": channelName,
                "groupId": group.id
            };
            const result: AuthResult = await lastValueFrom(this.http.post<AuthResult>(this.serverUrl + '/api/createChannel', request));
            if (result.valid){
                const currentGroupInfo: Group = await this.getGroup(group.id);
                const storedStateString: string | null = localStorage.getItem('State');
                if (storedStateString){
                    var storedState: State = JSON.parse(storedStateString);
                    storedState.currentGroup = currentGroupInfo;
                    localStorage.setItem('State', JSON.stringify(storedState));
                }
                this.notificationService.show(`Channel has been created`, 'success');
                return true;
            }
            this.notificationService.show(`Unable to create channel`, 'error');
            return false;
        }
        catch (error){
            this.notificationService.show(`Unable to create channel`, 'error');
            return false;
        }
    }

    public async removeChannel(groupId: number, channelId: number): Promise<boolean> {
        try{
            const request: any = {
                "groupId": groupId,
                "channelId": channelId
            }
            const result: AuthResult = await lastValueFrom(this.http.delete<AuthResult>(this.serverUrl + '/api/removeChannel', {
                params: {"request": JSON.stringify(request)}
            }));
            if (result.valid){
                const currentGroupInfo: Group = await this.getGroup(groupId);
                const storedUserString: string | null = localStorage.getItem('Credentials');
                const storedStateString: string | null = localStorage.getItem('State');
                if (storedStateString && storedUserString){
                    var storedUser: SessionStorageUser = JSON.parse(storedUserString);
                    var storedState: State = JSON.parse(storedStateString);
                    storedState.currentGroup = currentGroupInfo;
                    const currentUserInfo: SessionStorageUser | null = await this.auth.getUserInfo(storedUser.username);
                    if (currentUserInfo){
                        storedUser = currentUserInfo;
                    }
                    localStorage.setItem('Credentials', JSON.stringify(storedUser));
                    localStorage.setItem('State', JSON.stringify(storedState));
                }
                this.notificationService.show(`Channel has been removed`, 'error');
                return true;
            }
            this.notificationService.show(`Channel has not been removed`, 'error');
            return false;
        }
        catch (error){
            this.notificationService.show(`Channel has not been removed`, 'error');
            return false;
        }
    }

    public async addNewUser(groupId: number, user: SessionStorageUser): Promise<boolean> {
        try {
            const request: any = {
                "groupId": groupId,
                "user": user
            };
            const result: AuthResult = await lastValueFrom(this.http.post<AuthResult>(this.serverUrl + '/api/addNewUser', request));
            if (result.valid){
                const currentGroupInfo: Group = await this.getGroup(groupId);
                const storedUserString: string | null = localStorage.getItem('Credentials');
                const storedStateString: string | null = localStorage.getItem('State');
                if (storedStateString && storedUserString){
                    var storedUser: SessionStorageUser = JSON.parse(storedUserString);
                    var storedState: State = JSON.parse(storedStateString);
                    storedState.currentGroup = currentGroupInfo;
                    const currentUserInfo: SessionStorageUser | null = await this.auth.getUserInfo(storedUser.username);
                    if (currentUserInfo){
                        storedUser = currentUserInfo;
                    }
                    localStorage.setItem('Credentials', JSON.stringify(storedUser));
                    localStorage.setItem('State', JSON.stringify(storedState));
                }
                this.notificationService.show(`User: ${user.username} has been added to ${currentGroupInfo.name}`, 'success');
                return true;
            }
            this.notificationService.show(`User: ${user.username} is unable to be added to group`, 'error');
            return false;
        }
        catch (error){
            this.notificationService.show(`User: ${user.username} is unable to be added to group`, 'error');
            return false;
        }
    }

    public async sendMessage(message: Message): Promise<boolean> {
        try {
            const result: AuthResult = await lastValueFrom(this.http.post<AuthResult>(this.serverUrl + '/api/sendMessage', message));
            if (result.valid){
                const currentGroupInfo: Group = await this.getGroup(message.groupId);
                const storedUserString: string | null = localStorage.getItem('Credentials');
                const storedStateString: string | null = localStorage.getItem('State');
                if (storedStateString && storedUserString){
                    var storedUser: SessionStorageUser = JSON.parse(storedUserString);
                    var storedState: State = JSON.parse(storedStateString);
                    storedState.currentGroup = currentGroupInfo;
                    const currentUserInfo: SessionStorageUser | null = await this.auth.getUserInfo(storedUser.username);
                    if (currentUserInfo){
                        storedUser = currentUserInfo;
                    }
                    localStorage.setItem('Credentials', JSON.stringify(storedUser));
                    localStorage.setItem('State', JSON.stringify(storedState));
                }
                return true;
            }
            this.notificationService.show(`Unable to send message`, 'error');
            return false;
        }
        catch(error){
            this.notificationService.show(`Unable to send message`, 'error');
            return false;
        }
    }
}