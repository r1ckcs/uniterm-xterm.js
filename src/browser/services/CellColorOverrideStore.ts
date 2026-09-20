/**
 * Copyright (c) 2025 The xterm.js authors. All rights reserved.
 * @license MIT
 */

import { IColor } from 'common/Types';
import { css } from 'common/Color';

/**
 * A single contiguous cell range on one buffer line that should render its
 * text in a specific color.
 */
export interface ICellColorSpan {
  /** Zero-based column of the first cell. */
  col: number;
  /** Number of cells covered (wide chars count as 2). */
  width: number;
  /** CSS color string (#rrggbb / rgb(...) etc.), parsed on acceptance. */
  color: string;
}

interface StoredSpan {
  col: number;
  width: number;
  color: IColor;
}

/**
 * Sparse per-line cell color overrides consumed by the DOM renderer's row
 * factory. Keyed by absolute buffer line index of the active buffer; the
 * owner is responsible for invalidating keys when the buffer shifts
 * (scrollback trim, resize reflow, alternate buffer switch).
 */
export class CellColorOverrideStore {
  private _overrides = new Map<number, StoredSpan[]>();

  /** Replace the overrides of one buffer line. Returns true when the stored
   * state changed and the line needs a re-render. Invalid color strings and
   * zero-width spans are dropped. */
  public set(lineY: number, spans: ICellColorSpan[] | null): boolean {
    if (!spans || spans.length === 0) {
      return this._overrides.delete(lineY);
    }
    const stored: StoredSpan[] = [];
    for (const span of spans) {
      if (span.width <= 0) {
        continue;
      }
      try {
        stored.push({ col: span.col, width: span.width, color: css.toColor(span.color) });
      } catch {
        // Unsupported color format — skip the span rather than fail the batch.
      }
    }
    if (stored.length === 0) {
      return this._overrides.delete(lineY);
    }
    const existing = this._overrides.get(lineY);
    if (
      existing &&
      existing.length === stored.length &&
      existing.every((e, i) =>
        e.col === stored[i].col &&
        e.width === stored[i].width &&
        e.color.css === stored[i].color.css
      )
    ) {
      return false;
    }
    this._overrides.set(lineY, stored);
    return true;
  }

  public get(lineY: number): StoredSpan[] | undefined {
    return this._overrides.get(lineY);
  }

  public clear(): void {
    this._overrides.clear();
  }
}
