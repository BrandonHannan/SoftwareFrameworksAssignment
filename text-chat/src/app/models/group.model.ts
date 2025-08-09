import { Channel } from "./channel.model";
import { GroupUser } from "./user.model";


export interface Group {
    id: number;
    name: string;
    users: GroupUser[];
    channels: Channel[];
}

export interface GroupResult {
    group: Group | null;
    valid: boolean;
    error: string;
}

export interface GroupsResult {
    groups: Group[] | null;
    valid: boolean;
    error: string;
}