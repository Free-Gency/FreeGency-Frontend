import { Component, input, output, signal, computed, inject } from '@angular/core';
import { IdentityVerificationService } from '../../../features/setting/Data-Access/identity-verification-service';
import { DocumentType } from '../../utils/identity-verification.interface';

@Component({
  selector: 'app-document-upload',
  standalone: true,
  templateUrl: './document-upload.component.html',
  styleUrls: ['./document-upload.component.css']
})
export class DocumentUploadComponent {
  private readonly verificationService = inject(IdentityVerificationService);
  
  readonly stepId = input.required<string>();
  readonly documentType = input<DocumentType>('government_id');
  readonly acceptedFormats = input<string>('.jpg,.jpeg,.png,.pdf');
  readonly maxFileSize = input<number>(10); // MB
  
  readonly uploadStarted = output<File>();
  readonly uploadComplete = output<any>();
  readonly uploadError = output<string>();
  
  readonly isDragging = signal<boolean>(false);
  readonly selectedFile = signal<File | null>(null);
  readonly previewUrl = signal<string | null>(null);
  readonly uploadProgress = this.verificationService.uploadProgress;
  readonly isLoading = this.verificationService.isLoading;
  
  readonly fileSizeLimit = computed(() => this.maxFileSize() * 1024 * 1024);
  
  readonly acceptedFormatsList = computed(() => {
    const formats = this.acceptedFormats().split(',').map(f => f.replace('.', '').toUpperCase());
    return formats.join(', ');
  });

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
    
    const files = event.dataTransfer?.files;
    if (files?.length) {
      this.handleFile(files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.handleFile(input.files[0]);
    }
  }

  private handleFile(file: File): void {
    // Validate file type
    const allowedTypes = this.acceptedFormats()
      .split(',')
      .map(f => f.trim().replace('.', ''));
    
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !allowedTypes.includes(fileExtension)) {
      this.uploadError.emit(`Invalid file format. Accepted formats: ${this.acceptedFormatsList()}`);
      return;
    }
    
    // Validate file size
    if (file.size > this.fileSizeLimit()) {
      this.uploadError.emit(`File is too large. Maximum size is ${this.maxFileSize()}MB`);
      return;
    }
    
    this.selectedFile.set(file);
    this.createPreview(file);
    this.uploadStarted.emit(file);
  }

  private createPreview(file: File): void {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.previewUrl.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      this.previewUrl.set(null);
    }
  }

  removeFile(): void {
    this.selectedFile.set(null);
    this.previewUrl.set(null);
  }

  formatFileSize(bytes: number): string {
  if (bytes === 0) {
    return '0 Bytes';
  }

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
}