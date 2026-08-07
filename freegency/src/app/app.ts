import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoadingOverlayComponent } from './shared/components/loading-overlay/loading-overlay.component';
import { ToastOutletComponent } from './shared/components/toast/toast.component';
import { AuthService } from './core/auth/auth.service';
import { SignalrService } from './core/Signalr/signalr-service';
import { ChatSignalrService } from './core/Signalr/chat-signalr-service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LoadingOverlayComponent, ToastOutletComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  protected readonly title = signal('freegency');
  private signalr = inject(SignalrService);
  private chatSignalr=inject(ChatSignalrService);

  ngOnInit() {

     const session = localStorage.getItem("freegency.auth.session");
      const sessions = sessionStorage.getItem("freegency.auth.session");


  if (session||sessions) {
    this.signalr.CreateHubConnection();
    this.chatSignalr.CreateHubConnection();
  }

  }
}
