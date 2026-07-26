import { Component, inject } from '@angular/core';
import { LoadingService } from '../../../core/loading/loading.service';
import { LoadingComponent } from '../loading/loading.component';

@Component({
  selector: 'app-loading-overlay',
  imports: [LoadingComponent],
  templateUrl: './loading-overlay.component.html',
  styleUrl: './loading-overlay.component.css',
})
export class LoadingOverlayComponent {
  protected readonly loading = inject(LoadingService);
}
