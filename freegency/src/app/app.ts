import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoadingOverlayComponent } from './shared/components/loading-overlay/loading-overlay.component';
import { ToastOutletComponent } from './shared/components/toast/toast.component';
import { SignalrService } from './core/Signalr/signalr-service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LoadingOverlayComponent, ToastOutletComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('freegency');
  private signalr = inject(SignalrService);

  ngOnInit() {

     const session = sessionStorage.getItem("freegency.auth.session");

  if (session) {
    this.signalr.CreateHubConnection();
  }

  }
}
