import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { OwnershipType } from '../../core/models/library-entry.model';
import { WishlistEntry } from '../../core/models/wishlist-entry.model';
import { WishlistService } from '../../core/services/wishlist';
import { FieldError } from '../../shared/components/field-error/field-error';
import { Notice } from '../../shared/components/notice/notice';
import { PendingBadge } from '../../shared/components/pending-badge/pending-badge';

type HttpError = { error?: { detail?: string } };

@Component({
  selector: 'app-wishlist',
  imports: [CurrencyPipe, RouterLink, FieldError, Notice, PendingBadge],
  templateUrl: './wishlist.html',
  styleUrl: './wishlist.scss',
})
export class Wishlist {
  private readonly wishlistService = inject(WishlistService);

  protected readonly entries = signal<WishlistEntry[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly purchasingId = signal<number | null>(null);
  protected readonly purchaseOwnership = signal<OwnershipType>('digital');
  protected readonly purchasePrice = signal('');
  protected readonly editingPriceId = signal<number | null>(null);
  protected readonly editedTargetPrice = signal('');

  constructor() {
    this.load();
  }

  startPurchase(entry: WishlistEntry): void {
    this.editingPriceId.set(null);
    this.actionError.set(null);
    this.purchasingId.set(entry.id);
    this.purchaseOwnership.set('digital');
    this.purchasePrice.set(entry.target_price ?? '');
  }

  confirmPurchase(entry: WishlistEntry): void {
    const payload = { ownership_type: this.purchaseOwnership(), price_paid: this.purchasePrice() || null };
    this.wishlistService.markPurchased(entry.id, payload).subscribe({
      next: () => this.dropEntry(entry, `${entry.game.title} moved to My Games.`),
      error: (error: HttpError) => this.showActionError(error, 'Could not move this game to My Games.'),
    });
  }

  startEditingPrice(entry: WishlistEntry): void {
    this.purchasingId.set(null);
    this.actionError.set(null);
    this.editingPriceId.set(entry.id);
    this.editedTargetPrice.set(entry.target_price ?? '');
  }

  saveTargetPrice(entry: WishlistEntry): void {
    this.wishlistService.updateTargetPrice(entry.id, this.editedTargetPrice() || null).subscribe({
      next: (updated) => {
        this.entries.update((entries) => entries.map((existing) => (existing.id === updated.id ? updated : existing)));
        this.editingPriceId.set(null);
      },
      error: (error: HttpError) => this.showActionError(error, 'Could not update the target price.'),
    });
  }

  remove(entry: WishlistEntry): void {
    this.wishlistService.remove(entry.id).subscribe({
      next: () => this.dropEntry(entry, `${entry.game.title} removed from your wishlist.`),
      error: (error: HttpError) => this.showActionError(error, 'Could not remove this game.'),
    });
  }

  private dropEntry(entry: WishlistEntry, message: string): void {
    this.entries.update((entries) => entries.filter((existing) => existing.id !== entry.id));
    this.purchasingId.set(null);
    this.actionError.set(null);
    this.notice.set(message);
  }

  private showActionError(error: HttpError, fallback: string): void {
    this.actionError.set(error.error?.detail ?? fallback);
  }

  private load(): void {
    this.wishlistService.list().subscribe({
      next: (entries) => {
        this.entries.set(entries);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set('Could not load your wishlist. Please try again.');
      },
    });
  }
}
