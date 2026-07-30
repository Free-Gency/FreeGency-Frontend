import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { ClientViewNavbarComponent } from '../../../../shared/components/client-view-navbar/client-view-navbar.component';

@Component({
  selector: 'app-client-messages',
  standalone: true,
  imports: [ClientViewNavbarComponent, RouterLink],
  template: `
    <div class="min-h-dvh bg-background">
      <app-client-view-navbar />

      <main
        class="mx-auto flex w-full max-w-[1512px] flex-col gap-6 px-4 py-8 sm:px-6 md:px-10 lg:px-12 xl:px-20"
      >
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p
              class="font-display text-[11px] font-bold uppercase tracking-[0.08em] text-[#494bd6]"
            >
              Inbox
            </p>
            <h1
              class="mt-1 font-display text-[26px] font-semibold tracking-[-0.32px] text-[#151c27] sm:text-[32px]"
            >
              Messages
            </h1>
            <p class="mt-2 max-w-xl font-body text-sm leading-relaxed text-[#464556]">
              Continue the conversation for proposals in discussion. Full realtime chat is
              coming next — this room is ready to open from your proposals.
            </p>
          </div>
          <a
            routerLink="/client/manage-work"
            class="inline-flex h-10 items-center rounded-full border border-[#e7eefe] bg-white px-4 font-display text-sm font-semibold text-[#4036e0] transition-colors hover:bg-[#e7eefe]"
          >
            Back to Manage Work
          </a>
        </div>

        <section
          class="rounded-[28px] border border-[#e7eefe] bg-white p-6 shadow-[0_1px_2px_rgba(21,28,39,0.04)] sm:p-8"
        >
          @if (roomId()) {
            <div
              class="flex flex-col gap-4 rounded-[20px] bg-[#fbfbfb] p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p
                  class="font-display text-[11px] font-bold uppercase tracking-[0.06em] text-[#464556]"
                >
                  Active discussion room
                </p>
                <p class="mt-1 break-all font-body text-sm text-[#151c27]">{{ roomId() }}</p>
                <p class="mt-2 font-body text-xs leading-relaxed text-[#464556]">
                  You opened this room from a proposal discussion. Message history will appear
                  here once chat messaging is connected.
                </p>
              </div>
              <span
                class="inline-flex shrink-0 rounded-full bg-[#ebe9ff] px-3 py-1.5 font-display text-xs font-bold text-[#4036e0]"
              >
                In Discussion
              </span>
            </div>

            <div
              class="mt-6 flex min-h-[280px] flex-col items-center justify-center rounded-[20px] border border-dashed border-[#e7eefe] bg-[#fbfbfb] px-6 text-center"
            >
              <p class="font-display text-base font-semibold text-[#151c27]">Chat coming soon</p>
              <p class="mt-2 max-w-md font-body text-sm leading-relaxed text-[#464556]">
                The discussion room is linked. You can keep negotiating milestones from Manage
                Work while messaging UI ships.
              </p>
            </div>
          } @else {
            <div class="flex min-h-[280px] flex-col items-center justify-center text-center">
              <p class="font-display text-base font-semibold text-[#151c27]">No room selected</p>
              <p class="mt-2 max-w-md font-body text-sm leading-relaxed text-[#464556]">
                Open a proposal that is In Discussion and tap
                <strong>Go to messages</strong> to land here with the correct chat room.
              </p>
            </div>
          }
        </section>
      </main>
    </div>
  `,
})
export class ClientMessagesComponent {
  private readonly route = inject(ActivatedRoute);

  protected readonly roomId = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('room'))),
    { initialValue: null as string | null },
  );
}
