import { Component, computed, input } from '@angular/core';
import zxcvbn from 'zxcvbn';

const LABELS = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];
const COLORS = ['#dc2626', '#f97316', '#eab308', '#84cc16', '#16a34a'];

@Component({
  selector: 'app-password-strength-meter',
  imports: [],
  templateUrl: './password-strength-meter.html',
  styleUrl: './password-strength-meter.scss',
})
export class PasswordStrengthMeter {
  readonly password = input('');
  protected readonly levels = [0, 1, 2, 3, 4];

  protected readonly score = computed(() => (this.password() ? zxcvbn(this.password()).score : -1));
  protected readonly label = computed(() => (this.score() >= 0 ? LABELS[this.score()] : ''));
  protected readonly color = computed(() => COLORS[this.score()] ?? 'transparent');
}
