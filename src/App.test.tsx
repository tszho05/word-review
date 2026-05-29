import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { validABBWords } from './data/abbWords';
import { getSelectionStatus, hasValidABB } from './game/abbValidator';
import { CORRECT_WORD_BURST_MS, WRONG_LOCK_DURATION_MS } from './game/constants';
import { correctRefillDelayMs } from './game/gameReducer';

const startGame = (difficulty = '困難') => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: difficulty }));
};

const getTileButtons = (side: 'left' | 'right') =>
  screen.getAllByTestId(`${side}-tile`) as HTMLButtonElement[];

const getTileChars = (tiles: HTMLButtonElement[]) =>
  tiles.map((tile) => tile.dataset.char ?? '');

const findValidWordTiles = (side: 'left' | 'right') => {
  const tiles = getTileButtons(side);

  for (const word of validABBWords) {
    const used = new Set<HTMLButtonElement>();
    const wordTiles: HTMLButtonElement[] = [];

    for (const char of word) {
      const tile = tiles.find(
        (candidate) => candidate.dataset.char === char && !used.has(candidate),
      );

      if (!tile) {
        break;
      }

      used.add(tile);
      wordTiles.push(tile);
    }

    if (wordTiles.length === [...word].length) {
      return wordTiles;
    }
  }

  throw new Error(`No valid ABB tiles found for ${side}`);
};

const findPendingTile = (side: 'left' | 'right') => {
  const tile = getTileButtons(side).find(
    (candidate) => getSelectionStatus([candidate.dataset.char ?? ''], validABBWords) === 'pending',
  );

  if (!tile) {
    throw new Error(`No pending tile found for ${side}`);
  }

  return tile;
};

const findInvalidTiles = (side: 'left' | 'right') => {
  const tiles = getTileButtons(side);
  const maxLength = Math.max(...validABBWords.map((word) => [...word].length));

  const search = (
    selectedTiles: HTMLButtonElement[],
    usedTiles: Set<HTMLButtonElement>,
  ): HTMLButtonElement[] | null => {
    if (selectedTiles.length > 0) {
      const selectedChars = selectedTiles.map((tile) => tile.dataset.char ?? '');
      const status = getSelectionStatus(selectedChars, validABBWords);

      if (status === 'wrong') {
        return selectedTiles;
      }

      if (status === 'correct') {
        return null;
      }
    }

    if (selectedTiles.length >= maxLength) {
      return null;
    }

    for (const tile of tiles) {
      if (usedTiles.has(tile)) {
        continue;
      }

      const nextUsedTiles = new Set(usedTiles);
      nextUsedTiles.add(tile);
      const result = search([...selectedTiles, tile], nextUsedTiles);

      if (result) {
        return result;
      }
    }

    return null;
  }

  const invalidTiles = search([], new Set());

  if (invalidTiles) {
    return invalidTiles;
  }

  throw new Error(`No invalid tile sequence found for ${side}`);
};

const pointerDownTiles = (tiles: HTMLButtonElement[]) => {
  tiles.forEach((tile, pointerId) => {
    fireEvent.pointerDown(tile, { pointerId: pointerId + 1, pointerType: 'touch' });
  });
};

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('詞語溫習', () => {
  it('shows the start screen before entering the game', () => {
    render(<App />);

    expect(screen.getByTestId('start-screen')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '詞語溫習' })).toBeInTheDocument();
    expect(screen.queryByTestId('game-screen')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '開始' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '簡單' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '普通' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '困難' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '困難' }));

    expect(screen.getByTestId('game-screen')).toBeInTheDocument();
  });

  it.each([
    ['簡單', 9],
    ['普通', 12],
    ['困難', 15],
  ])('starts %s mode with different solvable %i-tile boards', (difficulty, tileCount) => {
    startGame(difficulty);

    const leftTiles = getTileButtons('left');
    const rightTiles = getTileButtons('right');
    const leftChars = getTileChars(leftTiles);
    const rightChars = getTileChars(rightTiles);

    expect(leftTiles).toHaveLength(tileCount);
    expect(rightTiles).toHaveLength(tileCount);
    expect(leftChars.join('')).not.toBe(rightChars.join(''));
    expect(hasValidABB(leftChars, validABBWords)).toBe(true);
    expect(hasValidABB(rightChars, validABBWords)).toBe(true);
  });

  it('mirrors the right HP label and keeps restart inside the battle arena', () => {
    startGame();

    expect(screen.getByTestId('left-health-bar')).toHaveTextContent(/^左隊100$/);
    expect(screen.getByTestId('right-health-bar')).toHaveTextContent(/^100右隊$/);
    expect(
      within(screen.getByTestId('battle-arena')).getByRole('button', { name: '重新開始' }),
    ).toBeInTheDocument();
  });

  it('renders generated character sprites for both teams', () => {
    startGame();

    expect(screen.getByTestId('left-character-image')).toHaveAttribute(
      'src',
      '/assets/generated/characters/left-hero/idle/animation.gif',
    );
    expect(screen.getByTestId('left-character-image')).toHaveAttribute('data-pose', 'idle');
    expect(screen.getByTestId('left-character-image')).toHaveClass('active');
    expect(screen.getByTestId('left-attack-character-image')).toHaveAttribute(
      'src',
      '/assets/generated/characters/left-hero/attack/animation.gif',
    );
    expect(screen.getByTestId('left-hurt-character-image')).toHaveAttribute(
      'src',
      '/assets/generated/characters/left-hero/hurt/animation.gif',
    );
    expect(screen.getByTestId('right-character-image')).toHaveAttribute(
      'src',
      '/assets/generated/characters/right-hero/idle/animation.gif',
    );
    expect(screen.getByTestId('right-character-image')).toHaveAttribute('data-pose', 'idle');
    expect(screen.getByTestId('right-character-image')).toHaveClass('active');
    expect(screen.getByTestId('right-attack-character-image')).toHaveAttribute(
      'src',
      '/assets/generated/characters/right-hero/attack/animation.gif',
    );
    expect(screen.getByTestId('right-hurt-character-image')).toHaveAttribute(
      'src',
      '/assets/generated/characters/right-hero/hurt/animation.gif',
    );
    expect(screen.queryByTestId('attack-effect')).not.toBeInTheDocument();
    expect(screen.getByTestId('left-fighter-slot')).toContainElement(
      screen.getByTestId('left-character'),
    );
    expect(screen.getByTestId('right-fighter-slot')).toContainElement(
      screen.getByTestId('right-character'),
    );
  });

  it('still restarts the game from the battle arena control', () => {
    startGame();
    pointerDownTiles(findValidWordTiles('left'));
    expect(screen.getByLabelText('右隊 HP 90')).toBeInTheDocument();

    fireEvent.click(
      within(screen.getByTestId('battle-arena')).getByRole('button', { name: '重新開始' }),
    );

    expect(screen.getByLabelText('右隊 HP 100')).toBeInTheDocument();
  });

  it('cancels selection when the same selected tile is touched again', () => {
    startGame();
    const tile = findPendingTile('left');

    fireEvent.pointerDown(tile, { pointerId: 1, pointerType: 'touch' });
    expect(tile).toHaveClass('selected');

    fireEvent.pointerDown(tile, { pointerId: 1, pointerType: 'touch' });
    expect(tile).not.toHaveClass('selected');
  });

  it('deducts opponent HP after a correct ABB word', () => {
    startGame();
    pointerDownTiles(findValidWordTiles('left'));

    expect(screen.getByLabelText('右隊 HP 90')).toBeInTheDocument();
  });

  it('switches character poses and activates a generated attack effect after a correct ABB word', () => {
    startGame();
    const wordTiles = findValidWordTiles('left');
    const word = wordTiles.map((tile) => tile.dataset.char).join('');
    pointerDownTiles(wordTiles);

    expect(screen.getByTestId('left-character')).toHaveClass('attack');
    expect(screen.getByTestId('right-character')).toHaveClass('hurt');
    expect(screen.getByTestId('left-character-image')).toHaveAttribute('data-pose', 'attack');
    expect(screen.getByTestId('left-character-image')).toHaveClass('active');
    expect(screen.getByTestId('right-character-image')).toHaveAttribute('data-pose', 'hurt');
    expect(screen.getByTestId('right-character-image')).toHaveClass('active');
    const attackEffectClassName = screen.getByTestId('attack-effect').className;
    expect(attackEffectClassName).toMatch(
      /\b(ink-wave|ink-brush-slash|ink-dragon|ink-splash-burst)\b/,
    );
    expect(attackEffectClassName).not.toContain('rainbow-beam');
    expect(within(screen.getByTestId('left-character')).getByTestId('left-word-burst')).toHaveTextContent(
      `${word}！`,
    );
    expect(within(screen.getByTestId('left-character')).getByTestId('left-word-burst')).toHaveClass(
      'behind-character',
    );
    expect(screen.queryByTestId('right-word-burst')).not.toBeInTheDocument();
  });

  it('remounts the attack effect for quick consecutive correct answers', () => {
    vi.useFakeTimers();
    startGame();
    pointerDownTiles(findValidWordTiles('left'));
    const firstAttackEffect = screen.getByTestId('attack-effect');

    act(() => {
      vi.advanceTimersByTime(correctRefillDelayMs);
    });

    pointerDownTiles(findValidWordTiles('left'));

    expect(screen.getByTestId('attack-effect')).toBeInTheDocument();
    expect(screen.getByTestId('attack-effect')).not.toBe(firstAttackEffect);
  });

  it('keeps the correct word burst visible for 1.5 seconds', () => {
    vi.useFakeTimers();
    startGame();
    const wordTiles = findValidWordTiles('left');
    pointerDownTiles(wordTiles);

    expect(screen.getByTestId('left-word-burst')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(CORRECT_WORD_BURST_MS - 1);
    });

    expect(screen.getByTestId('left-word-burst')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(screen.queryByTestId('left-word-burst')).not.toBeInTheDocument();
    expect(screen.queryByTestId('attack-effect')).not.toBeInTheDocument();
    expect(screen.getByTestId('left-character')).toHaveClass('idle');
    expect(screen.getByTestId('right-character')).toHaveClass('idle');
    expect(screen.getByTestId('left-character-image')).toHaveAttribute('data-pose', 'idle');
    expect(screen.getByTestId('right-character-image')).toHaveAttribute('data-pose', 'idle');
  });

  it('shows the right team correct word behind the right character with upright text', () => {
    startGame();
    const wordTiles = findValidWordTiles('right');
    const word = wordTiles.map((tile) => tile.dataset.char).join('');
    pointerDownTiles(wordTiles);

    const rightWordBurst = within(screen.getByTestId('right-character')).getByTestId(
      'right-word-burst',
    );
    expect(rightWordBurst).toHaveTextContent(`${word}！`);
    expect(rightWordBurst).toHaveClass('behind-character');
    expect(screen.queryByTestId('left-word-burst')).not.toBeInTheDocument();
  });

  it('locks only the wrong team for 0.7 seconds', () => {
    vi.useFakeTimers();
    startGame();

    pointerDownTiles(findInvalidTiles('left'));

    const leftBoard = screen.getByTestId('left-board');
    expect(leftBoard).toHaveClass('locked');
    expect(getTileButtons('left').every((tile) => tile.disabled)).toBe(true);
    expect(getTileButtons('right').some((tile) => tile.disabled)).toBe(false);

    act(() => {
      vi.advanceTimersByTime(WRONG_LOCK_DURATION_MS);
    });

    expect(leftBoard).not.toHaveClass('locked');
    expect(getTileButtons('left').some((tile) => tile.disabled)).toBe(false);
  });

  it('lets the other team keep playing while one team is locked', () => {
    vi.useFakeTimers();
    startGame();

    pointerDownTiles(findInvalidTiles('left'));
    const rightTile = findPendingTile('right');

    fireEvent.pointerDown(rightTile, { pointerId: 8, pointerType: 'touch' });

    expect(screen.getByTestId('left-board')).toHaveClass('locked');
    expect(rightTile).toHaveClass('selected');
  });

  it('shows a draw when the timer ends with equal HP', () => {
    vi.useFakeTimers();
    startGame();

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    const modal = screen.getByTestId('game-over-modal');
    expect(within(modal).getByText('平手！')).toBeInTheDocument();
  });
});
