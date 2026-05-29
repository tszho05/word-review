import { describe, expect, it } from 'vitest';
import { validABBWords } from '../data/abbWords';
import { TILE_COUNT_PER_TEAM } from './constants';
import { hasValidABB } from './abbValidator';
import { generateBoard, refillBoardAfterCorrect } from './boardGenerator';

const findWordTileIds = (board: ReturnType<typeof generateBoard>, words: readonly string[]) => {
  for (const word of words) {
    const used = new Set<string>();
    const tileIds: string[] = [];

    for (const char of word) {
      const tile = board.find((candidate) => candidate.char === char && !used.has(candidate.id));

      if (!tile) {
        break;
      }

      used.add(tile.id);
      tileIds.push(tile.id);
    }

    if (tileIds.length === [...word].length) {
      return tileIds;
    }
  }

  return [];
};

describe('board generation', () => {
  it('generates 18 tiles with at least one valid ABB word', () => {
    const board = generateBoard(validABBWords);

    expect(board).toHaveLength(TILE_COUNT_PER_TEAM);
    expect(hasValidABB(board, validABBWords)).toBe(true);
  });

  it('keeps the board solvable after a correct refill', () => {
    for (let run = 0; run < 25; run += 1) {
      const board = generateBoard(validABBWords);
      const selectedTileIds = findWordTileIds(board, validABBWords);
      const refilledBoard = refillBoardAfterCorrect(board, selectedTileIds, validABBWords);

      expect(refilledBoard).toHaveLength(TILE_COUNT_PER_TEAM);
      expect(hasValidABB(refilledBoard, validABBWords)).toBe(true);
    }
  });
});
