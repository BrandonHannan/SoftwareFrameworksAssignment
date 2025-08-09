
import { Channel } from "./channel.model";
import { Group } from "./group.model";

export interface State {
    currentGroup: Group | null;
    currentChannel: Channel | null;
}