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

  /** Only read while the template shows the meter, which it does only for a non-empty password. */
  protected readonly score = computed(() => zxcvbn(this.password()).score);
  protected readonly label = computed(() => LABELS[this.score()]);
  protected readonly color = computed(() => COLORS[this.score()]);
}
