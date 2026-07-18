import { Component, ElementRef, input, output, viewChildren } from '@angular/core';

@Component({
  selector: 'app-otp-input',
  templateUrl: './otp-input.component.html',
})
export class OtpInputComponent {
  readonly length = input(6);
  readonly valueChange = output<string>();

  private readonly inputs = viewChildren<ElementRef<HTMLInputElement>>('otpBox');
  protected readonly digits: string[] = [];

  constructor() {
    for (let i = 0; i < 6; i++) {
      this.digits.push('');
    }
  }

  protected onInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '').slice(-1);
    this.digits[index] = value;
    input.value = value;

    if (value && index < this.length() - 1) {
      this.inputs()[index + 1]?.nativeElement.focus();
    }

    this.emitValue();
  }

  protected onKeyDown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace' && !this.digits[index] && index > 0) {
      this.inputs()[index - 1]?.nativeElement.focus();
    }
  }

  protected onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pasted = event.clipboardData?.getData('text').replace(/\D/g, '').slice(0, this.length()) ?? '';

    for (let i = 0; i < this.length(); i++) {
      this.digits[i] = pasted[i] ?? '';
      const el = this.inputs()[i]?.nativeElement;
      if (el) {
        el.value = this.digits[i];
      }
    }

    const focusIndex = Math.min(pasted.length, this.length() - 1);
    this.inputs()[focusIndex]?.nativeElement.focus();
    this.emitValue();
  }

  private emitValue(): void {
    this.valueChange.emit(this.digits.join(''));
  }
}
