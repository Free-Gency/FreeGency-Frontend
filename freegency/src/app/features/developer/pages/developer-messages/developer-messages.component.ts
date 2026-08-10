import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { DeveloperViewNavbarComponent } from '../../../../shared/components/developer-view-navbar/developer-view-navbar.component';
import { MessagesPanelComponent } from '../../../chat/messages-panel/messages-panel.component';

@Component({
  selector: 'app-developer-messages',
  standalone: true,
  imports: [DeveloperViewNavbarComponent, MessagesPanelComponent],
  template: `
    <div class="min-h-dvh bg-[#f8f8fa]">
      <app-developer-view-navbar />
      <main class="mx-auto w-full max-w-[1400px] px-0 sm:px-4 sm:py-4 lg:px-6">
        <app-messages-panel
          mode="personal"
          [initialRoomId]="roomId()"
          [initialProjectId]="projectId()"
          [embedded]="false"
        />
      </main>
    </div>
  `,
})
export class DeveloperMessagesComponent {
  private readonly route = inject(ActivatedRoute);

  protected readonly roomId = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('room'))),
    { initialValue: null as string | null },
  );

  protected readonly projectId = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('project'))),
    { initialValue: null as string | null },
  );
}
