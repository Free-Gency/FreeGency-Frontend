import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { ClientViewNavbarComponent } from '../../shared/components/client-view-navbar/client-view-navbar.component';
import { DeveloperViewNavbarComponent } from '../../shared/components/developer-view-navbar/developer-view-navbar.component';
import { MessagesPanelComponent } from './messages-panel/messages-panel.component';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [ClientViewNavbarComponent, DeveloperViewNavbarComponent, MessagesPanelComponent],
  template: `
    <div class="min-h-dvh bg-[#f8f8fa]">
      @if (isDeveloper()) {
        <app-developer-view-navbar />
      } @else {
        <app-client-view-navbar />
      }
      <main class="mx-auto w-full max-w-[1400px] px-0 sm:px-4 sm:py-4 lg:px-6">
        <app-messages-panel
          mode="personal"
          [initialRoomId]="roomId()"
          [embedded]="false"
        />
      </main>
    </div>
  `,
  styleUrl: './chat.component.css',
})
export class ChatComponent {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  protected readonly isDeveloper = () =>
    this.auth.session()?.activeProfileMode === 'Developer';

  protected readonly roomId = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('room'))),
    { initialValue: null as string | null },
  );
}
