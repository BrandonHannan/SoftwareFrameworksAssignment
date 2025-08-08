import { Component } from '@angular/core';
import { Notification, NotificationService } from '../services/notification.service';
import { Observable } from 'rxjs';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification.html',
  styleUrl: './notification.css'
})
export class NotificationComponent {
  notification$: Observable<Notification | null>;

  constructor(private notificationService: NotificationService) {
    this.notification$ = this.notificationService.notification$;
  }
}