import { Component, input, signal, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-portfolio-about',
  standalone: true,
  imports: [FormsModule], // Required for [(ngModel)]
  templateUrl: './portfolio-about.component.html',
  styleUrl: './portfolio-about.component.css',
})
export class PortfolioAboutComponent {
  bio = input<string>('');
  canEdit = input(true);

  bioUpdated = output<string>();

  isEditing = signal(false);
  tempBio = signal('');

  startEditing() {
    if (!this.canEdit()) return;
    this.tempBio.set(this.bio());
    this.isEditing.set(true);
  }

  cancelEditing() {
    this.isEditing.set(false);
  }

  saveBio() {
    this.bioUpdated.emit(this.tempBio());
    this.isEditing.set(false);
  }
}