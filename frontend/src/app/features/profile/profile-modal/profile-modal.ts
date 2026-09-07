import { DatePipe } from '@angular/common';
import { Component, inject, input, output, signal } from '@angular/core';

import { ProfileService } from '../../../core/services/profile';
import { FieldError } from '../../../shared/components/field-error/field-error';
import { UserAvatar } from '../../../shared/components/user-avatar/user-avatar';
import { ProfilePictureCropper } from '../profile-picture-cropper/profile-picture-cropper';

const CROPPED_PICTURE_NAME = 'profile-picture.png';

@Component({
  selector: 'app-profile-modal',
  imports: [DatePipe, UserAvatar, FieldError, ProfilePictureCropper],
  templateUrl: './profile-modal.html',
  styleUrl: './profile-modal.scss',
})
export class ProfileModal {
  private readonly profileService = inject(ProfileService);

  readonly open = input(false);
  readonly closed = output<void>();

  protected readonly profile = this.profileService.profile;
  protected readonly uploading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly pendingFile = signal<File | null>(null);

  onPictureSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    this.errorMessage.set(null);
    this.pendingFile.set(file);
  }

  onCropped(blob: Blob): void {
    this.pendingFile.set(null);
    this.uploading.set(true);
    this.errorMessage.set(null);
    this.profileService.uploadPicture(new File([blob], CROPPED_PICTURE_NAME, { type: blob.type })).subscribe({
      next: () => this.uploading.set(false),
      error: (error: { error?: { detail?: string } }) => this.handleUploadError(error),
    });
  }

  onCropCancelled(): void {
    this.pendingFile.set(null);
  }

  private handleUploadError(error: { error?: { detail?: string } }): void {
    this.uploading.set(false);
    this.errorMessage.set(error.error?.detail ?? 'Could not upload that picture. Please try again.');
  }
}
