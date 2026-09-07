import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';

import { Profile } from '../../../core/models/profile.model';
import { ProfileService } from '../../../core/services/profile';
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

function selectFile(fixture: ComponentFixture<ProfileModal>, file: File | null): void {
  const input = { files: file ? [file] : [], value: 'C:\\fakepath\\avatar.png' };
  fixture.componentInstance.onPictureSelected({ target: input } as unknown as Event);
}

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

  it('renders nothing when closed', () => {
    const fixture = TestBed.createComponent(ProfileModal);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.profile-modal')).toBeNull();
  });

  it('shows the profile stats when open', () => {
    const fixture = openModal();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('scott');
    expect(text).toContain('3');
    expect(text).toContain('4.5');
  });

  it('shows a friendly message when no games are rated', () => {
    profileSignal.set({ ...PROFILE, average_review_score: null });
    const fixture = openModal();

    expect(fixture.nativeElement.textContent).toContain('No games rated yet');
  });

  it('emits closed when the close button is clicked', () => {
    const fixture = openModal();
    let closed = false;
    fixture.componentInstance.closed.subscribe(() => (closed = true));

    fixture.nativeElement.querySelector('.profile-modal__close').click();

    expect(closed).toBe(true);
  });

  it('opens the cropper instead of uploading straight away', () => {
    const fixture = openModal();
    const file = new File(['data'], 'avatar.png', { type: 'image/png' });

    selectFile(fixture, file);
    fixture.detectChanges();

    expect(fixture.componentInstance['pendingFile']()).toBe(file);
    expect(uploadCalls.length).toBe(0);
    expect(fixture.nativeElement.querySelector('.cropper')).not.toBeNull();
  });

  it('ignores an empty file selection', () => {
    const fixture = openModal();

    selectFile(fixture, null);

    expect(fixture.componentInstance['pendingFile']()).toBeNull();
  });

  it('uploads the cropped image once the crop is confirmed', () => {
    const fixture = openModal();
    selectFile(fixture, new File(['data'], 'avatar.png', { type: 'image/png' }));

    fixture.componentInstance.onCropped(new Blob(['cropped'], { type: 'image/png' }));

    expect(uploadCalls.length).toBe(1);
    expect(uploadCalls[0].type).toBe('image/png');
    expect(fixture.componentInstance['pendingFile']()).toBeNull();
    expect(fixture.componentInstance['uploading']()).toBe(false);
  });

  it('uploads nothing when the crop is cancelled', () => {
    const fixture = openModal();
    selectFile(fixture, new File(['data'], 'avatar.png', { type: 'image/png' }));

    fixture.componentInstance.onCropCancelled();
    fixture.detectChanges();

    expect(uploadCalls.length).toBe(0);
    expect(fixture.componentInstance['pendingFile']()).toBeNull();
    expect(fixture.nativeElement.querySelector('.cropper')).toBeNull();
  });

  it('surfaces the backend reason when the upload fails', () => {
    uploadResult = throwError(() => ({ error: { detail: 'Image exceeds the 5 MB size limit' } }));
    const fixture = openModal();

    fixture.componentInstance.onCropped(new Blob(['cropped'], { type: 'image/png' }));

    expect(fixture.componentInstance['uploading']()).toBe(false);
    expect(fixture.componentInstance['errorMessage']()).toBe('Image exceeds the 5 MB size limit');
  });

  it('clears the file input so the same picture can be picked again', () => {
    const fixture = openModal();
    const input = { files: [new File(['data'], 'avatar.png')], value: 'C:\\fakepath\\avatar.png' };

    fixture.componentInstance.onPictureSelected({ target: input } as unknown as Event);

    expect(input.value).toBe('');
  });
});
