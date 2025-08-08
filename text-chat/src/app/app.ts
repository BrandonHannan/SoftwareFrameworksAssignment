import { Component, signal } from '@angular/core';
import { Router, RouterLink, RouterModule, RouterOutlet } from '@angular/router';
import { NotificationComponent } from './notification/notification.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterModule, NotificationComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('text-chat');
  constructor(private router: Router) {}
}
