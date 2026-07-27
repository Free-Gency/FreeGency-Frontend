import { Component, input, output, computed } from '@angular/core';

@Component({
  selector: 'app-toggle-switch',
  standalone: true,
  templateUrl: './toggle-switch.component.html',
  styleUrls: ['./toggle-switch.component.css']
})
export class ToggleSwitchComponent {
  readonly checked = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly ariaLabel = input<string>('Toggle');
  
  readonly toggled = output<boolean>();
  
  readonly toggleState = computed<string>(() => 
    this.checked() ? 'checked' : 'unchecked'
  );

  onToggle(): void {
    if (!this.disabled()) {
      this.toggled.emit(!this.checked());
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.onToggle();
    }
  }
}