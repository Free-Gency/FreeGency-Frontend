import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { DeveloperViewNavbarComponent } from '../../../../shared/components/developer-view-navbar/developer-view-navbar.component';

@Component({
  selector: 'app-developer-placeholder',
  standalone: true,
  imports: [DeveloperViewNavbarComponent],
  template: `
    <div class="min-h-dvh bg-background">
      <app-developer-view-navbar />

      <main
        class="mx-auto flex w-full max-w-[1512px] flex-col gap-6 px-4 py-8 sm:px-6 md:px-10 lg:px-12 xl:px-20"
      >
        <div class="w-full">
          <p
            class="font-display text-[11px] font-bold uppercase tracking-[0.08em] text-[#494bd6]"
          >
            Developer
          </p>
          <h1
            class="mt-1 font-display text-[26px] font-semibold tracking-[-0.32px] text-[#151c27] sm:text-[32px]"
          >
            {{ title() }}
          </h1>
          <p class="mt-2 max-w-[36rem] font-body text-sm leading-relaxed text-[#464556]">
            {{ description() }}
          </p>
        </div>

        <section
          class="flex min-h-[280px] w-full flex-col items-center justify-center rounded-[28px] border border-dashed border-[#e7eefe] bg-white px-6 py-10 text-center shadow-[0_1px_2px_rgba(21,28,39,0.04)]"
        >
          <p class="font-display text-base font-semibold text-[#151c27]">Coming soon</p>
          <p class="mt-2 max-w-[28rem] font-body text-sm leading-relaxed text-[#464556]">
            This section is wired into navigation and will be filled in next.
          </p>
        </section>
      </main>
    </div>
  `,
})
export class DeveloperPlaceholderComponent {
  private readonly route = inject(ActivatedRoute);

  protected readonly title = toSignal(
    this.route.data.pipe(map((data) => (data['title'] as string) ?? 'Page')),
    { initialValue: 'Page' },
  );

  protected readonly description = toSignal(
    this.route.data.pipe(
      map(
        (data) =>
          (data['description'] as string) ??
          'This developer section is under construction.',
      ),
    ),
    { initialValue: 'This developer section is under construction.' },
  );
}
