import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { ConfirmationModalComponent, ConfirmationType } from '../../../shared/modals/confirmation-modal/confirmation-modal.component';
import { DangerZoneService } from '../Data-Access/danger-zone-service';
import { DeactivationRequest, DeletionRequest } from '../../../shared/utils/danger-zone.interface';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-danger-zone',
  standalone: true,
  imports: [ConfirmationModalComponent],
  templateUrl: './dangerzone.html',
  styleUrls: ['./dangerzone.css']
})
export class DangerZone implements OnInit, OnDestroy {
  private readonly dangerZoneService = inject(DangerZoneService);
  private subscription = new Subscription();
  
  readonly isLoading = this.dangerZoneService.isLoading;
  readonly accountStatus = this.dangerZoneService.accountStatus;
  readonly blockingConditions = this.dangerZoneService.blockingConditions;
  
  readonly showDeactivateModal = signal<boolean>(false);
  readonly showDeleteModal = signal<boolean>(false);
  readonly modalError = signal<string | null>(null);
  
  readonly canDelete = computed(() => 
    this.blockingConditions().every(condition => condition.resolved)
  );
  
  readonly activeBlockers = computed(() => 
    this.blockingConditions().filter(condition => !condition.resolved)
  );
  
  readonly blockerSummary = computed(() => {
    const blockers = this.activeBlockers();
    if (blockers.length === 0) return '';
    
    const parts = blockers.map(b => {
      if (b.count) return `${b.count} ${b.label.toLowerCase()}`;
      if (b.amount) return `$${b.amount.toFixed(2)} ${b.label.toLowerCase().replace(' wallet balance', '')}`;
      return b.label.toLowerCase();
    });
    
    return parts.join(' and ') + ' are blocking this action';
  });

  ngOnInit(): void {
    this.loadAccountBlocks();
  }
  
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
  
  private loadAccountBlocks(): void {
    this.subscription.add(
      this.dangerZoneService.fetchAccountBlocks().subscribe()
    );
  }
  
  onDeactivateClick(): void {
    this.modalError.set(null);
    this.showDeactivateModal.set(true);
  }
  
  onDeleteClick(): void {
    this.modalError.set(null);
    this.showDeleteModal.set(true);
  }
  
  onDeactivateConfirm(formData: DeactivationRequest): void {
    this.subscription.add(
      this.dangerZoneService.deactivateAccount(formData).subscribe({
        next: (response) => {
          this.showDeactivateModal.set(false);
          // TODO: Show success toast/message
          // TODO: Redirect to home page or show reactivation option
        },
        error: (error) => {
          this.modalError.set(error.message);
        }
      })
    );
  }
  
  onDeleteConfirm(formData: DeletionRequest): void {
    this.subscription.add(
      this.dangerZoneService.deleteAccount(formData).subscribe({
        next: (response) => {
          this.showDeleteModal.set(false);
          // TODO: Show deletion scheduled message
          // TODO: Redirect to goodbye page or logout
        },
        error: (error) => {
          this.modalError.set(error.message);
        }
      })
    );
  }
  
  onCloseDeactivateModal(): void {
    this.showDeactivateModal.set(false);
    this.modalError.set(null);
  }
  
  onCloseDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.modalError.set(null);
  }
  
  resolveBlocker(condition: any): void {
    // TODO: Navigate to the appropriate page to resolve the blocker
    console.log('Navigate to:', condition.actionRoute);
  }
}