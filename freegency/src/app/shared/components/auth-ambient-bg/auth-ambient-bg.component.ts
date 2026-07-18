import { Component } from '@angular/core';

@Component({
  selector: 'app-auth-ambient-bg',
  templateUrl: './auth-ambient-bg.component.html',
  host: {
    class: 'auth-ambient',
    'aria-hidden': 'true',
  },
})
export class AuthAmbientBgComponent {}
