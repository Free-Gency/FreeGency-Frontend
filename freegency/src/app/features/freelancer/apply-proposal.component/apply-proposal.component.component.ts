import { Component, OnInit, computed, inject, signal, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProposalsService } from '../services/proposal.service';
import { ProjectDetail, ApplicantType, TeamOption } from '../model/proposal.model';

@Component({
  selector: 'app-apply-project-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './apply-proposal.component.component.html',
})
export class ApplyProposalModalComponent implements OnInit {
  @Input() projectId?: string;
  @Output() proposalSubmitted = new EventEmitter<void>();

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly proposalsService = inject(ProposalsService);

  readonly ApplicantType = ApplicantType;
  readonly maxAttachments = 10;

  projectIdSignal = signal<string>('');
  project = signal<ProjectDetail | null>(null);
  isLoadingProject = signal<boolean>(true);

  applicantType = signal<ApplicantType | null>(null);
  teams = signal<TeamOption[]>([]);
  selectedTeamId = signal<string>('');

  coverLetter = signal<string>('');
  approach = signal<string>('');
  proposedTimeline = signal<string>('');
  similarLinksUrl = signal<string>('');
  proposedBudget = signal<number | null>(null);

  attachments = signal<File[]>([]);

  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string>('');
  isSubmitted = signal<boolean>(false);

  isValid = computed(() => {
    const hasType = this.applicantType() !== null;
    const hasTeamIfNeeded = this.applicantType() !== this.ApplicantType.Team || !!this.selectedTeamId();
    const hasBudget = !!this.proposedBudget() && this.proposedBudget()! > 0;

    return (
      hasType &&
      hasTeamIfNeeded &&
      hasBudget &&
      this.coverLetter().trim().length > 0 &&
      this.approach().trim().length > 0
    );
  });

  ngOnInit(): void {
    const id = this.projectId ?? this.route.snapshot.paramMap.get('id') ?? '';
    this.projectIdSignal.set(id);

    this.isLoadingProject.set(true);
    this.proposalsService.getProjectById(id).subscribe((project) => {
      this.project.set(project);
      this.isLoadingProject.set(false);
    });

    this.proposalsService.getTeamsIOwn().subscribe({
      next: (teams) => this.teams.set(teams || []),
      error: () => this.teams.set([]),
    });
  }

  selectApplicantType(type: ApplicantType): void {
    this.applicantType.set(type);
    if (type === ApplicantType.User) {
      this.selectedTeamId.set('');
    }
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const newFiles = Array.from(input.files);
    const combined = [...this.attachments(), ...newFiles].slice(0, this.maxAttachments);
    this.attachments.set(combined);
    input.value = '';
  }

  removeAttachment(index: number): void {
    this.attachments.update((files) => files.filter((_, i) => i !== index));
  }

  onCancel(): void {
    if (this.projectId) {
      this.proposalSubmitted.emit();
    } else {
      this.router.navigate(['/developer/home']);
    }
  }

  onSubmit(): void {
    if (!this.isValid() || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    // ensure we have a valid project id as a GUID string
    const projectId = this.projectIdSignal();
    if (!projectId) {
      this.isSubmitting.set(false);
      this.errorMessage.set('Project ID is missing. Cannot submit proposal.');
      return;
    }

    const dto = {
      projectId: projectId,
      applicantType: this.applicantType()!,
      teamId: this.applicantType() === ApplicantType.Team ? this.selectedTeamId() : undefined,
      coverLetter: this.coverLetter().trim(),
      approach: this.approach().trim(),
      proposedTimeline: this.proposedTimeline().trim() || undefined,
      similarLinksUrl: this.similarLinksUrl().trim() || undefined,
      proposedBudget: this.proposedBudget()!,
    };

    this.proposalsService.submitProposal(dto, this.attachments()).subscribe({
      next: (proposalId) => {
        this.isSubmitting.set(false);
        this.isSubmitted.set(true);
        if (this.projectId) {
          this.proposalSubmitted.emit();
        }
      },
      error: (error) => {
        this.isSubmitting.set(false);
        // Log full error to console for debugging, but show a generic message in the UI
        console.error('Submit proposal error:', error);
        this.errorMessage.set('Something went wrong while sending your proposal. Please try again.');
      },
    });
  }
}