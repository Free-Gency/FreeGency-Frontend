import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthAmbientBgComponent } from '../../components/auth-ambient-bg/auth-ambient-bg.component';
import { HeaderComponent } from '../../../../core/theme/header/header.component';

@Component({
  selector: 'app-reset-confirmed',
  imports: [RouterLink, AuthAmbientBgComponent, HeaderComponent],
  templateUrl: './reset-confirmed.component.html',
})
export class ResetConfirmedComponent {}
