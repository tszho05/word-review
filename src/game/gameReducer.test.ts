import { describe, expect, it } from 'vitest';
import {
  getDifficultyConfig,
  GAME_DURATION_SECONDS,
  INITIAL_HP,
  TILE_COUNT_PER_TEAM,
} from './constants';
import { createInitialGameState, gameReducer } from './gameReducer';
import type { GameState, TeamSide, TeamState, Tile } from './types';

const makeBoard = (prefix: string): Tile[] => {
  const chars = ['跨', '步', '急', '性', '子', '映', '入', '眼', '簾'];
  const board = chars.map((char, index) => ({ id: `${prefix}-${index}`, char }));

  while (board.length < TILE_COUNT_PER_TEAM) {
    board.push({ id: `${prefix}-${board.length}`, char: '山' });
  }

  return board;
};

const makeTeam = (side: TeamSide, hp = INITIAL_HP): TeamState => ({
  board: makeBoard(side),
  hp,
  selectedTileIds: [],
  wrongTileIds: [],
  pendingCorrect: null,
  locked: false,
  pose: 'idle',
});

const makePlayingState = (leftHp = INITIAL_HP, rightHp = INITIAL_HP): GameState => ({
  phase: 'playing',
  difficulty: getDifficultyConfig('hard'),
  teams: {
    left: makeTeam('left', leftHp),
    right: makeTeam('right', rightHp),
  },
  timeLeft: GAME_DURATION_SECONDS,
  winner: null,
  lastCorrectWord: null,
  activeEffect: null,
  effectFrom: null,
});

const selectWord = (state: GameState, team: TeamSide, tileIds: string[]) =>
  tileIds.reduce(
    (nextState, tileId) => gameReducer(nextState, { type: 'selectTile', team, tileId }),
    state,
  );

describe('game reducer', () => {
  it('accepts a two-character word and ends the game when HP reaches zero', () => {
    const state = makePlayingState(INITIAL_HP, 10);
    const nextState = selectWord(state, 'left', ['left-0', 'left-1']);

    expect(nextState.teams.right.hp).toBe(0);
    expect(nextState.phase).toBe('gameOver');
    expect(nextState.winner).toBe('left');
  });

  it('waits for all characters of a four-character word before attacking', () => {
    const state = makePlayingState();
    const partialState = selectWord(state, 'left', ['left-5', 'left-6', 'left-7']);

    expect(partialState.teams.left.selectedTileIds).toEqual(['left-5', 'left-6', 'left-7']);
    expect(partialState.teams.right.hp).toBe(INITIAL_HP);
    expect(partialState.lastCorrectWord).toBeNull();

    const nextState = gameReducer(partialState, {
      type: 'selectTile',
      team: 'left',
      tileId: 'left-8',
    });

    expect(nextState.teams.right.hp).toBe(90);
    expect(nextState.lastCorrectWord).toBe('映入眼簾');
  });

  it('locks a team when the selection cannot become a word', () => {
    const state = makePlayingState();
    const nextState = gameReducer(state, { type: 'selectTile', team: 'left', tileId: 'left-7' });

    expect(nextState.teams.left.locked).toBe(true);
    expect(nextState.teams.left.wrongTileIds).toEqual(['left-7']);
  });

  it('chooses the higher HP team when time ends', () => {
    const state: GameState = {
      ...makePlayingState(80, 90),
      timeLeft: 1,
    };
    const nextState = gameReducer(state, { type: 'tick' });

    expect(nextState.phase).toBe('gameOver');
    expect(nextState.timeLeft).toBe(0);
    expect(nextState.winner).toBe('right');
  });

  it('shows a draw when time ends with equal HP', () => {
    const state: GameState = {
      ...makePlayingState(80, 80),
      timeLeft: 1,
    };
    const nextState = gameReducer(state, { type: 'tick' });

    expect(nextState.phase).toBe('gameOver');
    expect(nextState.winner).toBe('draw');
  });

  it('starts on the start phase by default', () => {
    expect(createInitialGameState().phase).toBe('start');
  });
});
