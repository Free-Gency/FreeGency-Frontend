import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { getEmailInboxLabel, getEmailInboxUrl } from '../../../../core/auth/email-inbox';
import { AuthAmbientBgComponent } from '../../../../shared/components/auth-ambient-bg/auth-ambient-bg.component';
import { HeaderComponent } from '../../../../shared/header/header.component';

@Component({
  selector: 'app-check-email',
  imports: [RouterLink, AuthAmbientBgComponent, HeaderComponent],
  templateUrl: './check-email.component.html',
})
export class CheckEmailComponent {
  private readonly route = inject(ActivatedRoute);

  protected readonly email = this.route.snapshot.queryParamMap.get('email') ?? '';
  protected readonly inboxLabel = getEmailInboxLabel(this.email);

  protected openEmailInbox(): void {
    if (!this.email) return;
    window.open(getEmailInboxUrl(this.email), '_blank', 'noopener,noreferrer');
  }
}
