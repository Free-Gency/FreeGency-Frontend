import { Component, EventEmitter, Input, Output, signal, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApplyProposalModalComponent } from '../../../features/freelancer/apply-proposal.component/apply-proposal.component.component';
import { DeveloperManageWorkService } from '../../../features/developer/data-access/developer-manage-work.service';

@Component({
  selector: 'app-apply-project-button',
  standalone: true,
  imports: [ApplyProposalModalComponent],
  templateUrl: './apply-project-button.component.html',
})
export class ApplyProjectButtonComponent implements OnInit {
  @Input({ required: true }) projectId!: string;

  @Output() proposalSubmitted = new EventEmitter<void>();

  private readonly router = inject(Router);
  private readonly devService = inject(DeveloperManageWorkService);

  isModalOpen = signal(false);
  hasApplied = signal(false);

  ngOnInit(): void {
    // Check if the current user already applied to this project (as user or as team)
    this.devService.getMyProposals({ pageSize: 100 }).subscribe({
      next: (res) => {
        const found = (res.items || []).some((p) => p.projectId === this.projectId);
        this.hasApplied.set(found);
      },
      error: () => this.hasApplied.set(false),
    });
  }

  async openModal(): Promise<void> {
    if (this.hasApplied()) return;
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  onSubmitted(): void {
    this.closeModal();
    this.hasApplied.set(true);
    this.proposalSubmitted.emit();
  }
}
