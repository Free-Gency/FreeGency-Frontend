import { Component, input, output, signal, computed, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

export type ConfirmationType = 'deactivate' | 'delete';

@Component({
  selector: 'app-confirmation-modal',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './confirmation-modal.component.html',
  styleUrls: ['./confirmation-modal.component.css']
})
export class ConfirmationModalComponent {
  private readonly fb = inject(FormBuilder);
  
  readonly isOpen = input<boolean>(false);
  readonly type = input<ConfirmationType>('deactivate');
  readonly isLoading = input<boolean>(false);
  readonly error = input<string | null>(null);
  
  readonly closeModal = output<void>();
  readonly confirmed = output<any>();
  
  confirmationForm!: FormGroup;
  showPassword = signal<boolean>(false);
  
  readonly title = computed(() => 
    this.type() === 'deactivate' ? 'Deactivate Account' : 'Delete Account'
  );
  
  readonly description = computed(() => 
    this.type() === 'deactivate' 
      ? 'Your profile will be hidden and you won\'t receive new invites. You can reactivate at any time.'
      : 'This will permanently delete your account, profile, portfolio, and all associated data. This action cannot be undone.'
  );
  
  readonly confirmButtonText = computed(() => 
    this.type() === 'deactivate' ? 'Deactivate Account' : 'Delete Account'
  );
  
  readonly confirmButtonClass = computed(() => 
    this.type() === 'deactivate' ? 'btn-danger' : 'btn-destructive'
  );

  ngOnInit(): void {
    this.initForm();
  }

  private initForm(): void {
    if (this.type() === 'delete') {
      this.confirmationForm = this.fb.group({
        password: ['', [Validators.required]],
        reason: [''],
        confirmation: [false, [Validators.requiredTrue]]
      });
    } else {
      this.confirmationForm = this.fb.group({
        reason: [''],
        confirmation: [false, [Validators.requiredTrue]]
      });
    }
  }

  onSubmit(): void {
    if (this.confirmationForm.valid) {
      this.confirmed.emit(this.confirmationForm.value);
    } else {
      Object.keys(this.confirmationForm.controls).forEach(key => {
        const control = this.confirmationForm.get(key);
        control?.markAsTouched();
      });
    }
  }

  close(): void {
    this.closeModal.emit();
    this.confirmationForm?.reset();
  }

  closeOnBackdrop(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.close();
    }
  }

  handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.close();
    }
  }

  getFieldError(fieldName: string): string | null {
    const control = this.confirmationForm.get(fieldName);
    
    if (control?.touched && control?.errors) {
      if (control.errors['required']) return 'This field is required';
      if (control.errors['requiredTrue']) return 'You must confirm this action';
    }
    
    return null;
  }
}