import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HeaderComponent } from '../../../../shared/header/header.component';

@Component({
  selector: 'app-reset-confirmed',
  imports: [RouterLink, HeaderComponent],
  templateUrl: './reset-confirmed.component.html',
})
export class ResetConfirmedComponent {}
