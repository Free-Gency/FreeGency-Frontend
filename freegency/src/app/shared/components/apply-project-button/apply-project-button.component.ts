import { Component, EventEmitter, Input, Output, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ApplyProposalModalComponent } from '../../../features/freelancer/apply-proposal.component/apply-proposal.component.component';

@Component({
  selector: 'app-apply-project-button',
  standalone: true,
  imports: [ApplyProposalModalComponent],
  templateUrl: './apply-project-button.component.html',
})
export class ApplyProjectButtonComponent {
  @Input({ required: true }) projectId!: string;

  @Output() proposalSubmitted = new EventEmitter<void>();

  private readonly router = inject(Router);
  isModalOpen = signal(false);

  async openModal(): Promise<void> {
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  onSubmitted(): void {
    this.closeModal();
    this.proposalSubmitted.emit();
  }
}
