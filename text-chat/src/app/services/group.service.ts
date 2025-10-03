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
    // Currently selected group, channel and messages 
    private currentGroup: Group | null = null;
    private currentChannel: Channel | null = null;
    private serverUrl = 'https://localhost:3000';

    constructor(private http: HttpClient, private notificationService: NotificationService, private auth: AuthenticationService) { }

    // Creates a state object in local storage of the user's currently selected group and channel
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

    // Returns the currently selected group
    public getCurrentGroup(): Group | null {
        return this.currentGroup;
    }

    // Changes the currently selected group for the user by getting the latest information of the selected group and 
    // updating the local storage with this group info
    public async setCurrentGroup(id: number): Promise<boolean> {
        const storedState: string | null = localStorage.getItem('State');
        // Updates the stored state with the new selected group
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
        else{ // Creates a new stored state with the new selected group if it didn't exist
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

    // Returns the current selected channel of the user
    public getCurrentChannel(): Channel | null {
        return this.currentChannel;
    }

    // Changes the currently selected channel with the latest information of the channel and updates the local
    // storage with this new info
    public async setCurrentChannel(channel: Channel): Promise<boolean> {
        const storedState: string | null = localStorage.getItem('State');
        // Updates the local storage state with the new selected channel
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
                    const currentUpdatedChannel: Channel | undefined = result.group.channels.find(c => c.id == channel.id);
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
        else{ // Creates a new stored state in local storage if there was none with the new selected channel and the respective group
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
    }

    // Deletes the request made from the user from the database and updates the local storage with the deleted request
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

    // Deletes the request made from a user from the database, adds the user to requested group and updates the local storage
    // with the removed request and the user now in the group
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

    // Creates a request from the user to a given group and adds it to the database
    // The request is added to all 'SuperAdmin' users and 'GroupAdmin' users who administer the requested group
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

    // Deletes the group from the database and updates the stored state in local storage if the currently selected group
    // is the deleted group and the user's groups and admin groups arrays 
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

    // Returns all the groups found within the database and updates the local storage of the user if they are a 
    // 'SuperAdmin' as they administer all groups
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

    // Adds a new group to the database and adds the new group to the user's local storage with the new group
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

    // Returns the latest information about a group from the database given the group's id
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

    // Creates a new report for a given user in the database and adds the report to all 'SuperAdmin' users reports array
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

    // Deletes a user from a group, it removes the group from the user's groups array and removes the user from the group
    // in the database
    // Updates the local storage of the user if they were the one who is removed from the group
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

    // Removes the user from a channel by deleting the channel from the user's allowed channels array in the database
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

    // Adds the given user to the channel's users array in the respective group in the database
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

    // Adds the new role to the user's roles array in the database if it is not already in the roles array
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

    // Adds a new channel in the given group within its channels array and updates the local storage of the updated group
    // with the newly added channel
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

    // Deletes the channel from the channels array of the given group and all allowed channels arrays within user's information
    // Updates the group and channel (if it is the deleted channel) in local storage with the removed channel
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
                    if (storedState.currentChannel){
                        if (storedState.currentChannel.id == channelId){
                            storedState.currentChannel = null;
                        }
                    }
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

    // Adds a new user to the given group by adding the user to the group's users array in the database and adding the group
    // to the user's groups array
    // Updates the local storage of the user of the updated group
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

    // Creates a new message in the messages array within a channel that is within a given group, it propogates this changed group
    // to all groups arrays for all users
    // Updates the local storage with the updated group
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