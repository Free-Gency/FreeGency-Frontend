import { Component, inject } from '@angular/core';
import { HugeiconsIconComponent, type IconSvgObject } from '@hugeicons/angular';
import { Alert02Icon, Cancel01Icon, CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
import { ToastService, type ToastVariant } from '../../services/toast.service';

@Component({
  selector: 'app-toast-outlet',
  imports: [HugeiconsIconComponent],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.css',
})
export class ToastOutletComponent {
  protected readonly toastService = inject(ToastService);
  protected readonly closeIcon = Cancel01Icon as IconSvgObject;

  protected variantIcon(variant: ToastVariant): IconSvgObject {
    if (variant === 'success') return CheckmarkCircle02Icon as IconSvgObject;
    return Alert02Icon as IconSvgObject;
  }
}
