import { Channel } from "./channel.model";
import { Group } from "./group.model";
import { Report } from "./report.model";
import { Request } from "./request.model";

export interface User {
    id: number;
    username: string;
    email: string;
    profilePicture: string | null;
    roles: string[];
    password: string;
    groups: Group[];
    adminGroups: Group[];
    requests: Request[];
    allowedChannels: Channel[];
    reports: Report[];
}

export interface UserResult {
    user: User | null;
    valid: boolean;
    error: string;
}

export interface AuthResult {
    valid: boolean;
    error: string;
}

export interface SessionStorageUser {
    id: number;
    username: string;
    email: string;
    profilePicture: string | null;
    roles: string[];
    groups: Group[];
    adminGroups: Group[];
    requests: Request[];
    allowedChannels: Channel[];
    reports: Report[];
}

export interface LoginAttempt {
    username: string; // Also represents emails
    password: string;
}

export interface RegisterAttempt {
    email: string;
    username: string;
    password: string;
}

export interface GroupUser {
    username: string;
    profilePicture: string | null;
    role: string;
}

export interface UpdateUsername {
    currentUsername: string;
    username: string;
}

export interface UpdatePassword {
    currentUsername: string;
    password: string;
}

export interface UpdateEmail {
    currentUsername: string;
    email: string;
}

export interface UpdateGroups {
    currentUsername: string;
    groups: Group[];
}

export interface UpdateAdminGroups {
    currentUsername: string;
    adminGroups: Group[];
}

export interface UpdateProfilePicture {
    currentUsername: string;
    profilePicture: string;
}

export interface UpdateRequest {
    currentUsername: string;
    request: Request;
}