import { Message } from "./message.model";

export interface Channel {
    groupId: number;
    id: number;
    name: string;
    messages: Message[];
    allowedUsers: string[];
}