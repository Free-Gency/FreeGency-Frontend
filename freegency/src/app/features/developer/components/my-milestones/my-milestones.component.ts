import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { rxResource } from '@angular/core/rxjs-interop';
import { DeveloperManageWorkService } from '../../data-access/developer-manage-work.service';
import { DeveloperMilestone } from '../../models/developer-milestone';

@Component({
  selector: 'app-my-milestones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-milestones.component.html',
})
export class MyMilestonesComponent {
  private readonly service = inject(DeveloperManageWorkService);

  readonly milestones = rxResource<DeveloperMilestone[], void>({
    stream: () => this.service.getMyMilestones(),
  });

  readonly list = computed(() => this.milestones.value() ?? []);

  readonly submittingId = signal<string | null>(null);
  readonly submitError = signal<string | null>(null);

  submit(id: string): void {
    this.submittingId.set(id);
    this.submitError.set(null);
    this.service.submitMilestone(id).subscribe({
      next: () => this.milestones.reload(),
      error: (err: unknown) =>
        this.submitError.set(
          err instanceof Error ? err.message : 'Submit failed.',
        ),
      complete: () => this.submittingId.set(null),
    });
  }
}
