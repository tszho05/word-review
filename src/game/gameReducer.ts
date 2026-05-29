import { validABBWords } from '../data/abbWords';
import { getSelectionStatus } from './abbValidator';
import { generateBoard, refillBoardAfterCorrect } from './boardGenerator';
import {
  ATTACK_ANIMATION_MS,
  DAMAGE_PER_CORRECT,
  DEFAULT_DIFFICULTY_ID,
  GAME_DURATION_SECONDS,
  getDifficultyConfig,
  INITIAL_HP,
} from './constants';
import type {
  AttackEffect,
  DifficultyId,
  GameState,
  TeamSide,
  TeamState,
  Winner,
} from './types';

export type GameAction =
  | { type: 'startGame'; difficulty?: DifficultyId }
  | { type: 'selectTile'; team: TeamSide; tileId: string }
  | { type: 'releaseWrongLock'; team: TeamSide }
  | { type: 'finishCorrectRefill'; team: TeamSide }
  | { type: 'clearAnimations' }
  | { type: 'tick' };

const teams: TeamSide[] = ['left', 'right'];
const attackEffects: AttackEffect[] = [
  'ink-wave',
  'ink-brush-slash',
  'ink-dragon',
  'ink-splash-burst',
];

export const opponentOf = (team: TeamSide): TeamSide => (team === 'left' ? 'right' : 'left');

const boardSignature = (team: TeamState) => team.board.map((tile) => tile.char).join('');

const createTeam = (tileCount: number): TeamState => ({
  board: generateBoard(validABBWords, tileCount),
  hp: INITIAL_HP,
  selectedTileIds: [],
  wrongTileIds: [],
  pendingCorrect: null,
  locked: false,
  pose: 'idle',
});

const pickEffect = (): AttackEffect =>
  attackEffects[Math.floor(Math.random() * attackEffects.length)] ?? 'ink-wave';

const getWinnerByHp = (leftHp: number, rightHp: number): Winner => {
  if (leftHp === rightHp) {
    return 'draw';
  }

  return leftHp > rightHp ? 'left' : 'right';
};

export const createInitialGameState = (
  phase: GameState['phase'] = 'start',
  difficultyId: DifficultyId = DEFAULT_DIFFICULTY_ID,
): GameState => {
  const difficulty = getDifficultyConfig(difficultyId);
  const left = createTeam(difficulty.tileCount);
  let right = createTeam(difficulty.tileCount);
  let attempts = 0;

  while (boardSignature(left) === boardSignature(right) && attempts < 20) {
    right = createTeam(difficulty.tileCount);
    attempts += 1;
  }

  return {
    phase,
    difficulty,
    teams: { left, right },
    timeLeft: GAME_DURATION_SECONDS,
    winner: null,
    lastCorrectWord: null,
    activeEffect: null,
    effectFrom: null,
  };
};

const getSelectedChars = (teamState: TeamState, selectedTileIds: string[]) =>
  selectedTileIds.map((tileId) => teamState.board.find((tile) => tile.id === tileId)?.char ?? '');

const updateTeam = (
  state: GameState,
  team: TeamSide,
  updater: (teamState: TeamState) => TeamState,
): GameState => ({
  ...state,
  teams: {
    ...state.teams,
    [team]: updater(state.teams[team]),
  },
});

export const gameReducer = (
  state: GameState,
  action: GameAction,
): GameState => {
  switch (action.type) {
    case 'startGame':
      return createInitialGameState('playing', action.difficulty ?? state.difficulty.id);

    case 'selectTile': {
      if (state.phase !== 'playing') {
        return state;
      }

      const teamState = state.teams[action.team];

      if (teamState.locked || teamState.pendingCorrect) {
        return state;
      }

      const tile = teamState.board.find((boardTile) => boardTile.id === action.tileId);

      if (!tile) {
        return state;
      }

      if (teamState.selectedTileIds.includes(action.tileId)) {
        return updateTeam(state, action.team, (currentTeam) => ({
          ...currentTeam,
          selectedTileIds: currentTeam.selectedTileIds.filter((tileId) => tileId !== action.tileId),
        }));
      }

      const selectedTileIds = [...teamState.selectedTileIds, action.tileId];
      const selectedChars = getSelectedChars(teamState, selectedTileIds);
      const selectedWord = selectedChars.join('');
      const selectionStatus = getSelectionStatus(selectedChars, validABBWords);

      if (selectionStatus === 'pending') {
        return updateTeam(state, action.team, (currentTeam) => ({
          ...currentTeam,
          selectedTileIds,
          wrongTileIds: [],
        }));
      }

      if (selectionStatus === 'wrong') {
        return updateTeam(state, action.team, (currentTeam) => ({
          ...currentTeam,
          selectedTileIds: [],
          wrongTileIds: selectedTileIds,
          locked: true,
        }));
      }

      const opponent = opponentOf(action.team);
      const opponentHp = Math.max(0, state.teams[opponent].hp - DAMAGE_PER_CORRECT);
      const winner = opponentHp <= 0 ? action.team : null;

      return {
        ...state,
        phase: winner ? 'gameOver' : state.phase,
        winner,
        lastCorrectWord: selectedWord,
        activeEffect: pickEffect(),
        effectFrom: action.team,
        teams: {
          ...state.teams,
          [action.team]: {
            ...teamState,
            selectedTileIds: [],
            wrongTileIds: [],
            pendingCorrect: { tileIds: selectedTileIds, word: selectedWord },
            pose: 'attack',
          },
          [opponent]: {
            ...state.teams[opponent],
            hp: opponentHp,
            pose: 'hurt',
          },
        },
      };
    }

    case 'releaseWrongLock':
      return updateTeam(state, action.team, (teamState) => ({
        ...teamState,
        locked: false,
        wrongTileIds: [],
      }));

    case 'finishCorrectRefill':
      return updateTeam(state, action.team, (teamState) => {
        if (!teamState.pendingCorrect) {
          return teamState;
        }

        return {
          ...teamState,
          board: refillBoardAfterCorrect(
            teamState.board,
            teamState.pendingCorrect.tileIds,
            validABBWords,
          ),
          pendingCorrect: null,
        };
      });

    case 'clearAnimations':
      return {
        ...state,
        lastCorrectWord: null,
        activeEffect: null,
        effectFrom: null,
        teams: teams.reduce<Record<TeamSide, TeamState>>(
          (nextTeams, team) => ({
            ...nextTeams,
            [team]: {
              ...state.teams[team],
              pose: 'idle',
            },
          }),
          state.teams,
        ),
      };

    case 'tick': {
      if (state.phase !== 'playing') {
        return state;
      }

      const timeLeft = Math.max(0, state.timeLeft - 1);

      if (timeLeft > 0) {
        return { ...state, timeLeft };
      }

      return {
        ...state,
        phase: 'gameOver',
        timeLeft,
        winner: getWinnerByHp(state.teams.left.hp, state.teams.right.hp),
      };
    }

    default:
      return state;
  }
};

export const correctRefillDelayMs = Math.min(360, ATTACK_ANIMATION_MS);
