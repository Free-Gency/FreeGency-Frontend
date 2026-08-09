import { Injectable, signal } from '@angular/core';

export type ToastVariant = 'success' | 'error';

export interface ToastMessage {
  id: number;
  text: string;
  variant: ToastVariant;
}

const TOAST_DURATION_MS = 4000;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 0;
  private readonly toastsSignal = signal<ToastMessage[]>([]);

  readonly toasts = this.toastsSignal.asReadonly();

  success(text: string): void {
    this.show(text, 'success');
  }

  error(text: string): void {
    this.show(text, 'error');
  }

  dismiss(id: number): void {
    this.toastsSignal.update((list) => list.filter((toast) => toast.id !== id));
  }

  private show(text: string, variant: ToastVariant): void {
    const id = ++this.nextId;
    this.toastsSignal.update((list) => [...list, { id, text, variant }]);
    setTimeout(() => this.dismiss(id), TOAST_DURATION_MS);
  }
}
