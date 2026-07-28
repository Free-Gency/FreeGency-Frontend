import { Component, input, output, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { SecurityService, PasswordChangeRequest, ApiError } from '../../Data-Access/security-service';
import { Subscription } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { PasswordStrengthIndicatorComponent } from '../../../../shared/components/password-strength-indicator/password-strength-indicator.component';
import { PasswordValidators } from '../../../../shared/utils/password-validator';

@Component({
  selector: 'app-change-password-modal',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    PasswordStrengthIndicatorComponent
  ],
  templateUrl: './change-password-modal.component.html',
  styleUrls: ['./change-password-modal.component.css']
})
export class ChangePasswordModalComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly securityService = inject(SecurityService);
  
  readonly isOpen = input<boolean>(false);
  readonly closeModal = output<void>();
  readonly passwordChanged = output<void>();
  
  passwordForm!: FormGroup;
  serverError = signal<string | null>(null);
  fieldErrors = signal<Record<string, string[]>>({});
  showCurrentPassword = signal<boolean>(false);
  showNewPassword = signal<boolean>(false);
  showConfirmPassword = signal<boolean>(false);
  
  private subscription = new Subscription();
  
  readonly isLoading = computed(() => this.securityService.isLoading());
  
  readonly newPasswordValue = computed(() => 
    this.passwordForm?.get('newPassword')?.value || ''
  );
  
  ngOnInit(): void {
    this.initForm();
    this.setupFocusTrap();
  }
  
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    document.body.style.overflow = '';
  }
  
  private initForm(): void {
    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [
        Validators.required,
        Validators.minLength(8),
        PasswordValidators.requiresUppercase(),
        PasswordValidators.requiresLowercase(),
        PasswordValidators.requiresNumber(),
        PasswordValidators.requiresSpecialChar(),
        PasswordValidators.passwordStrength()
      ]],
      confirmPassword: ['', [
        Validators.required,
        PasswordValidators.matchPassword('newPassword')
      ]]
    });
    
    this.subscription.add(
      this.passwordForm.get('newPassword')?.valueChanges.subscribe(() => {
        this.passwordForm.get('confirmPassword')?.updateValueAndValidity();
        this.clearFieldError('newPassword');
      })
    );
    
    this.subscription.add(
      this.passwordForm.get('currentPassword')?.valueChanges.subscribe(() => {
        this.clearFieldError('currentPassword');
      })
    );
  }
  
  private setupFocusTrap(): void {
    if (this.isOpen()) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => {
        const firstInput = document.querySelector('#currentPassword') as HTMLElement;
        firstInput?.focus();
      }, 100);
    }
  }
  
  onSubmit(): void {
    if (this.passwordForm.invalid) {
      this.markFormGroupTouched(this.passwordForm);
      return;
    }
    
    this.serverError.set(null);
    this.fieldErrors.set({});
    
    const passwordData: PasswordChangeRequest = {
      currentPassword: this.passwordForm.get('currentPassword')?.value,
      newPassword: this.passwordForm.get('newPassword')?.value,
      confirmPassword: this.passwordForm.get('confirmPassword')?.value
    };
    
    this.securityService.changePassword(passwordData).subscribe({
      next: (response) => {
        this.passwordChanged.emit();
        this.close();
        this.resetForm();
      },
      error: (error: ApiError) => {
        this.handleApiError(error);
      }
    });
  }
  
  private handleApiError(error: ApiError): void {
    this.serverError.set(error.message);
    
    if (error.errors) {
      const errors: Record<string, string[]> = {};
      Object.keys(error.errors).forEach(key => {
        const formKey = this.mapApiFieldToFormField(key);
        if (formKey && this.passwordForm.get(formKey)) {
          errors[formKey] = error.errors![key];
        }
      });
      this.fieldErrors.set(errors);
    }
  }
  
  private mapApiFieldToFormField(apiField: string): string {
    const fieldMap: Record<string, string> = {
      'current_password': 'currentPassword',
      'currentPassword': 'currentPassword',
      'new_password': 'newPassword',
      'newPassword': 'newPassword',
      'confirm_password': 'confirmPassword',
      'confirmPassword': 'confirmPassword'
    };
    return fieldMap[apiField] || '';
  }
  
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
  
  getFieldError(fieldName: string): string | null {
    const control = this.passwordForm.get(fieldName);
    const fieldError = this.fieldErrors()?.[fieldName]?.[0];
    
    if (fieldError) {
      return fieldError;
    }
    
    if (control?.touched && control?.errors) {
      if (control.errors['required']) return 'This field is required';
      if (control.errors['minlength']) {
        return `Minimum ${control.errors['minlength'].requiredLength} characters required`;
      }
      if (control.errors['requiresUppercase']) return 'Must contain an uppercase letter';
      if (control.errors['requiresLowercase']) return 'Must contain a lowercase letter';
      if (control.errors['requiresNumber']) return 'Must contain a number';
      if (control.errors['requiresSpecialChar']) return 'Must contain a special character';
      if (control.errors['passwordStrength']) return 'Password is too weak';
      if (control.errors['passwordMismatch']) return 'Passwords do not match';
    }
    
    return null;
  }
  
  clearFieldError(fieldName: string): void {
    const current = { ...this.fieldErrors() };
    delete current[fieldName];
    this.fieldErrors.set(current);
  }
  
  togglePasswordVisibility(field: 'current' | 'new' | 'confirm'): void {
    const signals = {
      current: this.showCurrentPassword,
      new: this.showNewPassword,
      confirm: this.showConfirmPassword
    };
    signals[field].update(value => !value);
  }
  
  close(): void {
    document.body.style.overflow = '';
    this.closeModal.emit();
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
  
  private resetForm(): void {
    this.passwordForm.reset();
    this.serverError.set(null);
    this.fieldErrors.set({});
    this.showCurrentPassword.set(false);
    this.showNewPassword.set(false);
    this.showConfirmPassword.set(false);
  }
}