import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NEVER, Observable, of, throwError } from 'rxjs';

import { Profile } from '../../../core/models/profile.model';
import { ProfileService } from '../../../core/services/profile';
import { selectFiles } from '../../../testing/dom';
import { ProfilePictureCropper } from '../profile-picture-cropper/profile-picture-cropper';
import { ProfileModal } from './profile-modal';

const PROFILE: Profile = {
  username: 'scott',
  email: 'scott@example.com',
  created_at: '2026-09-01T00:00:00Z',
  profile_picture_url: null,
  games_owned: 3,
  systems_owned: 2,
  average_review_score: 4.5,
};

describe('ProfileModal', () => {
  let profileSignal: ReturnType<typeof signal<Profile | null>>;
  let uploadCalls: File[];
  let uploadResult: Observable<Profile>;

  beforeEach(async () => {
    profileSignal = signal<Profile | null>(PROFILE);
    uploadCalls = [];
    uploadResult = of(PROFILE);
    const profileStub = {
      profile: profileSignal,
      uploadPicture: (file: File) => (uploadCalls.push(file), uploadResult),
    };
    URL.createObjectURL = (() => 'blob:fake-url') as never;
    URL.revokeObjectURL = (() => undefined) as never;

    await TestBed.configureTestingModule({
      imports: [ProfileModal],
      providers: [{ provide: ProfileService, useValue: profileStub }],
    }).compileComponents();
  });

  function openModal(): ComponentFixture<ProfileModal> {
    const fixture = TestBed.createComponent(ProfileModal);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    return fixture;
  }

  function closedCount(fixture: ComponentFixture<ProfileModal>): () => number {
    let count = 0;
    fixture.componentInstance.closed.subscribe(() => count++);
    return () => count;
  }

  function pickPicture(fixture: ComponentFixture<ProfileModal>, files: File[]): void {
    selectFiles(fixture.nativeElement.querySelector('#profile-picture-input'), files);
    fixture.detectChanges();
  }

  function cropper(fixture: ComponentFixture<ProfileModal>): ProfilePictureCropper {
    return fixture.debugElement.query(By.directive(ProfilePictureCropper)).componentInstance;
  }

  function emitFromCropper(
    fixture: ComponentFixture<ProfileModal>,
    eventName: string,
    value?: unknown,
  ): void {
    fixture.debugElement
      .query(By.css('app-profile-picture-cropper'))
      .triggerEventHandler(eventName, value);
    fixture.detectChanges();
  }

  const AVATAR = new File(['data'], 'avatar.png', { type: 'image/png' });
  const CROPPED = new Blob(['cropped'], { type: 'image/png' });

  it('renders nothing when closed', () => {
    const fixture = TestBed.createComponent(ProfileModal);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.profile-modal')).toBeNull();
  });

  it('shows the profile stats when open', () => {
    const text = openModal().nativeElement.textContent;

    expect(text).toContain('scott');
    expect(text).toContain('3');
    expect(text).toContain('4.5');
  });

  it('shows a loading message until the profile arrives', () => {
    profileSignal.set(null);

    expect(openModal().nativeElement.textContent).toContain('Loading…');
  });

  it('shows a friendly message when no games are rated', () => {
    profileSignal.set({ ...PROFILE, average_review_score: null });

    expect(openModal().nativeElement.textContent).toContain('No games rated yet');
  });

  it('emits closed when the close button is clicked', () => {
    const fixture = openModal();
    const closed = closedCount(fixture);

    fixture.nativeElement.querySelector('.profile-modal__close').click();

    expect(closed()).toBe(1);
  });

  it('emits closed from the backdrop or the Escape key, but not from clicks inside the dialog', () => {
    const fixture = openModal();
    const closed = closedCount(fixture);
    const backdrop = fixture.nativeElement.querySelector('.modal-backdrop');

    fixture.nativeElement.querySelector('.profile-modal').click();
    expect(closed()).toBe(0);

    backdrop.click();
    backdrop.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(closed()).toBe(2);
  });

  it('opens the cropper instead of uploading straight away', () => {
    const fixture = openModal();

    pickPicture(fixture, [AVATAR]);

    expect(cropper(fixture).file()).toBe(AVATAR);
    expect(uploadCalls.length).toBe(0);
    expect(fixture.nativeElement.querySelector('.cropper')).not.toBeNull();
  });

  it('ignores an empty file selection', () => {
    const fixture = openModal();

    pickPicture(fixture, []);

    expect(cropper(fixture).file()).toBeNull();
  });

  it('clears the file input so the same picture can be picked again', () => {
    const fixture = openModal();
    const input = { files: [AVATAR], value: 'C:\\fakepath\\avatar.png' };

    fixture.componentInstance.onPictureSelected({ target: input } as unknown as Event);

    expect(input.value).toBe('');
  });

  it('uploads the cropped image once the crop is confirmed', () => {
    const fixture = openModal();
    pickPicture(fixture, [AVATAR]);

    emitFromCropper(fixture, 'cropped', CROPPED);

    expect(uploadCalls.length).toBe(1);
    expect(uploadCalls[0].type).toBe('image/png');
    expect(cropper(fixture).file()).toBeNull();
    expect(
      fixture.nativeElement.querySelector('label[for="profile-picture-input"]').textContent.trim(),
    ).toBe('Upload picture');
  });

  it('shows upload progress and blocks picking another picture meanwhile', () => {
    uploadResult = NEVER;
    const fixture = openModal();

    emitFromCropper(fixture, 'cropped', CROPPED);

    expect(
      fixture.nativeElement.querySelector('label[for="profile-picture-input"]').textContent.trim(),
    ).toBe('Uploading…');
    expect(fixture.nativeElement.querySelector('#profile-picture-input').disabled).toBe(true);
  });

  it('uploads nothing when the crop is cancelled', () => {
    const fixture = openModal();
    pickPicture(fixture, [AVATAR]);

    emitFromCropper(fixture, 'cancelled');

    expect(uploadCalls.length).toBe(0);
    expect(fixture.nativeElement.querySelector('.cropper')).toBeNull();
  });

  it('surfaces the backend reason when the upload fails', () => {
    uploadResult = throwError(() => ({ error: { detail: 'Image exceeds the 5 MB size limit' } }));
    const fixture = openModal();

    emitFromCropper(fixture, 'cropped', CROPPED);

    expect(fixture.nativeElement.textContent).toContain('Image exceeds the 5 MB size limit');
    expect(fixture.nativeElement.querySelector('#profile-picture-input').disabled).toBe(false);
  });

  it('falls back to a generic message when the upload fails without a reason', () => {
    uploadResult = throwError(() => new Error('failed'));
    const fixture = openModal();

    emitFromCropper(fixture, 'cropped', CROPPED);

    expect(fixture.nativeElement.textContent).toContain(
      'Could not upload that picture. Please try again.',
    );
  });
});
