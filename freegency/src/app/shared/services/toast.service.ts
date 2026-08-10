import { Injectable, signal } from '@angular/core';

export type ToastVariant = 'success' | 'error' | 'warning';

export interface ToastMessage {
  id: number;
  title?: string;
  text: string;
  variant: ToastVariant;
}

const TOAST_DURATION_MS: Record<ToastVariant, number> = {
  success: 4000,
  error: 5500,
  warning: 8000,
};

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 0;
  private readonly toastsSignal = signal<ToastMessage[]>([]);

  readonly toasts = this.toastsSignal.asReadonly();

  success(text: string, title?: string): void {
    this.show(text, 'success', title);
  }

  error(text: string, title?: string): void {
    this.show(text, 'error', title);
  }

  /** Policy / moderation warnings — larger, longer-lived. */
  warning(text: string, title = 'Community guidelines'): void {
    this.show(text, 'warning', title);
  }

  dismiss(id: number): void {
    this.toastsSignal.update((list) => list.filter((toast) => toast.id !== id));
  }

  private show(text: string, variant: ToastVariant, title?: string): void {
    const id = ++this.nextId;
    this.toastsSignal.update((list) => [
      ...list,
      { id, text, title: title?.trim() || undefined, variant },
    ]);
    setTimeout(() => this.dismiss(id), TOAST_DURATION_MS[variant]);
  }
}
