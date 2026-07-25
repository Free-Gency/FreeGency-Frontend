import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastOutletComponent } from './shared/components/toast/toast.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastOutletComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('freegency');
}
