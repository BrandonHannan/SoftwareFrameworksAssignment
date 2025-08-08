import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

export interface Notification {
  message: string;
  type: 'success' | 'error';
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationSubject = new Subject<Notification | null>();
  public notification$: Observable<Notification | null> = this.notificationSubject.asObservable();

  constructor() { }

  show(message: string, type: 'success' | 'error' = 'success') {
    // Show the notification
    this.notificationSubject.next({ message, type });

    // Hide it after 3 seconds
    setTimeout(() => {
      this.hide();
    }, 3000);
  }

  hide() {
    this.notificationSubject.next(null);
  }
}