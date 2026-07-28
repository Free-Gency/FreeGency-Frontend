import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export class PasswordValidators {
  static minLength(minLength: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }
      return control.value.length >= minLength 
        ? null 
        : { minLength: { requiredLength: minLength, actualLength: control.value.length } };
    };
  }

  static requiresUppercase(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }
      return /[A-Z]/.test(control.value) 
        ? null 
        : { requiresUppercase: true };
    };
  }

  static requiresLowercase(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }
      return /[a-z]/.test(control.value) 
        ? null 
        : { requiresLowercase: true };
    };
  }

  static requiresNumber(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }
      return /\d/.test(control.value) 
        ? null 
        : { requiresNumber: true };
    };
  }

  static requiresSpecialChar(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }
      return /[!@#$%^&*(),.?":{}|<>]/.test(control.value) 
        ? null 
        : { requiresSpecialChar: true };
    };
  }

  static passwordStrength(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }
      
      const value = control.value;
      let strength = 0;
      
      if (value.length >= 8) strength++;
      if (value.length >= 12) strength++;
      if (/[A-Z]/.test(value)) strength++;
      if (/[a-z]/.test(value)) strength++;
      if (/\d/.test(value)) strength++;
      if (/[!@#$%^&*(),.?":{}|<>]/.test(value)) strength++;
      
      const strengthLevel = strength <= 2 ? 'weak' : strength <= 4 ? 'medium' : 'strong';
      
      return strengthLevel === 'weak' 
        ? { passwordStrength: { level: strengthLevel } } 
        : null;
    };
  }

  static matchPassword(passwordControlName: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.parent) {
        return null;
      }
      
      const password = control.parent.get(passwordControlName);
      if (!password) {
        return null;
      }
      
      return password.value === control.value 
        ? null 
        : { passwordMismatch: true };
    };
  }

  static getPasswordStrength(value: string): 'weak' | 'medium' | 'strong' {
    if (!value) return 'weak';
    
    let strength = 0;
    if (value.length >= 8) strength++;
    if (value.length >= 12) strength++;
    if (/[A-Z]/.test(value)) strength++;
    if (/[a-z]/.test(value)) strength++;
    if (/\d/.test(value)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(value)) strength++;
    
    return strength <= 2 ? 'weak' : strength <= 4 ? 'medium' : 'strong';
  }
}