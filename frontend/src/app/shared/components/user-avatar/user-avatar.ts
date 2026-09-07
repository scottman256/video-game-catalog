import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-user-avatar',
  imports: [],
  templateUrl: './user-avatar.html',
  styleUrl: './user-avatar.scss',
})
export class UserAvatar {
  readonly imageUrl = input<string | null>(null);
  readonly username = input('');
  readonly large = input(false);

  protected readonly initial = computed(() => this.username().charAt(0).toUpperCase() || '?');
}
