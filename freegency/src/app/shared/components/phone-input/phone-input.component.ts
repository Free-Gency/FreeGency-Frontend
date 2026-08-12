import { Component, computed, input, model, output, viewChild } from '@angular/core';
import IntlTelInput from '@intl-tel-input/angular';
import type { Iso2 } from 'intl-tel-input';

@Component({
  selector: 'app-phone-input',
  imports: [IntlTelInput],
  templateUrl: './phone-input.component.html',
  host: { class: 'block w-full' },
})
export class PhoneInputComponent {
  /** E.164 phone value, e.g. +201012345678 */
  readonly value = model('');
  readonly inputId = input('phone');
  readonly initialCountry = input<Iso2>('eg');
  readonly validityChange = output<boolean>();
  readonly countryIsoChange = output<string>();

  private readonly iti = viewChild(IntlTelInput);

  protected readonly loadUtils = () => import('intl-tel-input/utils');
  /** Keep country dropdown outside the input box */
  protected readonly dropdownParent = document.body;

  protected readonly inputAttributes = computed(() => ({
    id: this.inputId(),
    name: this.inputId(),
    autocomplete: 'tel',
  }));

  protected onNumberChange(num: string): void {
    this.value.set(num ?? '');
  }

  protected onValidityChange(valid: boolean): void {
    this.validityChange.emit(valid);
  }

  protected onCountryChange(iso2: string): void {
    this.countryIsoChange.emit((iso2 ?? '').toUpperCase());
  }

  /** Read live widget state so submit is not blocked by a stale binding. */
  syncFromWidget(): { number: string; valid: boolean; countryIso: string } {
    const instance = this.iti()?.getInstance();
    let number = this.value();
    let valid = false;
    let countryIso = '';

    try {
      number = instance?.getNumber() || number || '';
      valid = instance?.isValidNumber() ?? false;
      countryIso = (instance?.getSelectedCountry()?.iso2 ?? '').toUpperCase();
    } catch {
      // utils may still be loading; fall back to bound value
    }

    if (number !== this.value()) {
      this.value.set(number);
    }
    this.validityChange.emit(valid);

    return { number, valid, countryIso };
  }
}
