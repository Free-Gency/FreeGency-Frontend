import { Component, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import IntlTelInput from '@intl-tel-input/angular';
import type { Iso2 } from 'intl-tel-input';

@Component({
  selector: 'app-phone-input',
  imports: [IntlTelInput, FormsModule],
  templateUrl: './phone-input.component.html',
  host: { class: 'block w-full' },
})
export class PhoneInputComponent {
  /** E.164 phone value, e.g. +201012345678 */
  readonly value = model('');
  readonly inputId = input('phone');
  readonly initialCountry = input<Iso2>('eg');
  readonly validityChange = output<boolean>();

  protected readonly loadUtils = () => import('intl-tel-input/utils');
  /** Keep country dropdown outside the input box */
  protected readonly dropdownParent = document.body;
}
