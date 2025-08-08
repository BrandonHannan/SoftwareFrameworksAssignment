import { Routes, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { Home } from './home/home.component';
import { Account } from './account/account.component';
import { Groups } from './groups/groups.component';
import { Register } from './register/register.component';
import { Login } from './login/login.component';
import { ChannelComponent } from './channel/channel.component';
import { TextChat } from './text-chat/text-chat.component';
import { Messages } from './messages/messages.component';

export const routes: Routes = [
    {path: 'login', component: Login},
    {path: 'register', component: Register},
    {path: 'groups', component: Groups},
    {path: 'channels', component: ChannelComponent},
    {path: 'messages', component: Messages},
    {path: '', component: TextChat},
    {path: 'account', component: Account},
    {path: '', component: Home}
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule { }