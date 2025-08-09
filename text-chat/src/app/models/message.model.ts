
export interface Message {
    username: string;
    profilePicture: string | null;
    message: string | null;
    image: string | null;
    groupId: number;
    channelId: number;
}