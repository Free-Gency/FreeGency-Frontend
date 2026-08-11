import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApplyProposalModalComponent } from '../../../features/freelancer/apply-proposal.component/apply-proposal.component.component';

@Component({
  selector: 'app-apply-project-button',
  standalone: true,
  imports: [CommonModule, ApplyProposalModalComponent],
  templateUrl: './apply-project-button.component.html',
})
export class ApplyProjectButtonComponent {
  @Input({ required: true }) projectId!: string;

  /** Emits after a proposal is successfully submitted — hook up a toast/refresh in the parent. */
  @Output() proposalSubmitted = new EventEmitter<void>();

  isModalOpen = signal(false);

  onSubmitted(): void {
    this.proposalSubmitted.emit();
  }
}
