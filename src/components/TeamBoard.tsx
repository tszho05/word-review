import { maxWordLength } from '../data/abbWords';
import type { TeamSide, TeamState } from '../game/types';
import TileGrid from './TileGrid';

interface TeamBoardProps {
  side: TeamSide;
  team: TeamState;
  gridColumns: number;
  onTilePointerDown: (team: TeamSide, tileId: string) => void;
}

export default function TeamBoard({ side, team, gridColumns, onTilePointerDown }: TeamBoardProps) {
  const label = side === 'left' ? '左隊題板' : '右隊題板';
  const disabled = team.locked || Boolean(team.pendingCorrect);

  return (
    <section
      className={`team-board ${side} ${team.locked ? 'locked' : ''}`}
      aria-label={label}
      data-testid={`${side}-board`}
    >
      <div className="board-title-row">
        <h2>{label}</h2>
        <div className="selection-count">{team.selectedTileIds.length}/{maxWordLength}</div>
      </div>
      <TileGrid
        board={team.board}
        correctTileIds={team.pendingCorrect?.tileIds ?? []}
        disabled={disabled}
        gridColumns={gridColumns}
        selectedTileIds={team.selectedTileIds}
        side={side}
        wrongTileIds={team.wrongTileIds}
        onTilePointerDown={(tileId) => onTilePointerDown(side, tileId)}
      />
      {team.locked && (
        <div className="lock-chip" role="status">
          再試一次
        </div>
      )}
    </section>
  );
}
