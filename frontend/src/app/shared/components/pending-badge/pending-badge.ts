import { Component } from '@angular/core';

@Component({
  selector: 'app-pending-badge',
  template: `<span class="pending-badge" title="Other players can't see this game until an admin approves it">
    Pending Admin Approval
  </span>`,
  styleUrl: './pending-badge.scss',
})
export class PendingBadge {}
