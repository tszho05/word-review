import { describe, expect, it } from 'vitest';
import { validABBWords } from '../data/abbWords';
import { getSelectionStatus, hasValidABB, validateSelection } from './abbValidator';
import type { Tile } from './types';

describe('word validation', () => {
  it('validates selections by exact dictionary word', () => {
    expect(validateSelection(['跨', '步'], validABBWords)).toBe(true);
    expect(validateSelection(['急', '性', '子'], validABBWords)).toBe(true);
    expect(validateSelection(['映', '入', '眼', '簾'], validABBWords)).toBe(true);
    expect(validateSelection(['跨', '跨'], validABBWords)).toBe(false);
  });

  it('keeps partial words pending until they become exact words', () => {
    expect(getSelectionStatus(['映'], validABBWords)).toBe('pending');
    expect(getSelectionStatus(['映', '入'], validABBWords)).toBe('pending');
    expect(getSelectionStatus(['映', '入', '眼'], validABBWords)).toBe('pending');
    expect(getSelectionStatus(['映', '入', '眼', '簾'], validABBWords)).toBe('correct');
    expect(getSelectionStatus(['眼'], validABBWords)).toBe('wrong');
  });

  it('requires repeated characters to use enough different tiles', () => {
    const solvableBoard: Tile[] = [
      { id: 'a', char: '洋' },
      { id: 'b', char: '洋' },
      { id: 'c', char: '自' },
      { id: 'd', char: '得' },
    ];
    const unsolvableBoard: Tile[] = [
      { id: 'a', char: '洋' },
      { id: 'b', char: '自' },
      { id: 'c', char: '得' },
    ];

    expect(hasValidABB(solvableBoard, ['洋洋自得'])).toBe(true);
    expect(hasValidABB(unsolvableBoard, ['洋洋自得'])).toBe(false);
  });
});
