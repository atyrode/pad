import type { ActionResult, GameAction, GameState, PlayEvaluation } from '../game/game';
import { DRAFT_COLUMNS } from '../game/game';
import { countStickers } from '../utils/stickerUtils';

interface DebugMenuProps {
  state: GameState;
  dispatch: (action: GameAction) => ActionResult;
  evaluation: PlayEvaluation;
  dictionary: ReadonlySet<string> | null;
  dictionaryError: string | null;
  onRetryDictionary: () => void;
  tileOpacity: number;
  setTileOpacity: (value: number) => void;
  showCoordinates: boolean;
  setShowCoordinates: (value: boolean) => void;
}

export default function DebugMenu({ state, dispatch, evaluation, dictionary, dictionaryError, onRetryDictionary, tileOpacity, setTileOpacity, showCoordinates, setShowCoordinates }: DebugMenuProps) {
  const { bag, rack, board, discard, stickers, totalScore } = state;
  const isDraftMode = state.mode === 'draft';
  const isRackEmpty = rack.every(tile => tile === null);
  const isDrawDisabled = (bag.length === 0 && discard.length === 0) || !rack.includes(null);
  const isDrawAllDisabled = isDrawDisabled;
  const isRedrawDisabled = isRackEmpty;
  const isBoardResetDisabled = state.placementHistory.length === 0 &&
    board.every(row => row.every(cell => cell.tile === null));
  const isRackResetDisabled = isRackEmpty;
  const isScoreResetDisabled = totalScore === 0;
  const currentWords = evaluation.words.filter(word => !word.isLocked);
  const playedWords = evaluation.words.filter(word => word.isLocked);
  const currentPlayScore = evaluation.score;
  const stickerCounts = countStickers(stickers);

  const getValidationIcon = (word: string) => {
    if (!dictionary) {
      return <span className="text-zinc-500 text-xs" aria-label="Dictionary unavailable">?</span>;
    }
    return dictionary.has(word.toUpperCase())
      ? <span className="text-green-500 text-xs" aria-label="Valid word">✓</span>
      : <span className="text-red-500 text-xs" aria-label="Invalid word">✗</span>;
  };

  return (
    <div id="debug-menu" className="h-full bg-zinc-600 p-4 overflow-y-auto">
      <h2 className="sticky top-0 z-20 bg-zinc-600 text-white text-xl font-bold h-10 flex items-center pl-14 mb-4">Debug Menu</h2>

      {/* Mode */}
      <div className="bg-zinc-700 rounded-lg p-4 mb-4">
        <h3 className="text-white text-lg font-semibold mb-3">Mode</h3>
        <div className="flex flex-row gap-2 justify-center">
          <button
            onClick={() => dispatch({ type: 'set-mode', mode: isDraftMode ? 'game' : 'draft' })}
            className={`py-2 px-3 rounded-lg text-white font-semibold text-sm transition-opacity grow ${
              isDraftMode
                ? 'bg-blue-600 hover:opacity-80 hover:bg-blue-500'
                : 'bg-zinc-600 hover:opacity-80 hover:bg-zinc-500'
            }`}
          >
            {isDraftMode ? 'Exit Draft' : 'Enter Draft'}
          </button>
        </div>
      </div>

      {/* Game Mode Sections - Only show when NOT in draft mode */}
      {!isDraftMode && (
        <>
          {/* Reset */}
          <div className="bg-zinc-700 rounded-lg p-4 mb-4">
            <h3 className="text-white text-lg font-semibold mb-3">Reset</h3>
            <p className="text-zinc-400 text-xs mb-3">Debug controls: partial resets may remove tiles.</p>
            {/* Full reset stays available: it also owns discard, history and stickers. */}
            <div className="flex flex-row gap-2 justify-center mb-2">
              <button
                onClick={() => dispatch({ type: 'reset', target: 'game' })}
                className="py-2 px-3 rounded-lg text-white font-semibold text-sm transition-opacity grow bg-red-600 hover:opacity-80 hover:bg-red-500"
              >
                Game
              </button>
            </div>
            <div className="flex flex-row gap-2 justify-center">
              <button
                onClick={() => dispatch({ type: 'reset', target: 'board' })}
                disabled={isBoardResetDisabled}
                className={`py-2 px-3 rounded-lg text-white font-semibold text-sm transition-opacity grow ${isBoardResetDisabled
                  ? 'bg-zinc-800 opacity-50 cursor-not-allowed'
                  : 'bg-orange-600 hover:opacity-80 hover:bg-orange-500'
                  }`}
              >
                Board
              </button>
              <button
                onClick={() => dispatch({ type: 'reset', target: 'rack' })}
                disabled={isRackResetDisabled}
                className={`py-2 px-3 rounded-lg text-white font-semibold text-sm transition-opacity grow ${isRackResetDisabled
                  ? 'bg-zinc-800 opacity-50 cursor-not-allowed'
                  : 'bg-yellow-600 hover:opacity-80 hover:bg-yellow-500'
                  }`}
              >
                Rack
              </button>
              <button
                onClick={() => dispatch({ type: 'reset', target: 'bag' })}
                className="py-2 px-3 rounded-lg text-white font-semibold text-sm transition-opacity grow bg-green-600 hover:opacity-80 hover:bg-green-500"
              >
                Bag
              </button>
              <button
                onClick={() => dispatch({ type: 'reset', target: 'score' })}
                disabled={isScoreResetDisabled}
                className={`py-2 px-3 rounded-lg text-white font-semibold text-sm transition-opacity grow ${isScoreResetDisabled
                  ? 'bg-zinc-800 opacity-50 cursor-not-allowed'
                  : 'bg-purple-600 hover:opacity-80 hover:bg-purple-500'
                  }`}
              >
                Score
              </button>
              <button
                onClick={() => dispatch({ type: 'reset', target: 'stickers' })}
                className="py-2 px-3 rounded-lg text-white font-semibold text-sm transition-opacity grow bg-indigo-600 hover:opacity-80 hover:bg-indigo-500"
              >
                Stickers
              </button>
            </div>
          </div>

          {/* Draw */}
          <div className="bg-zinc-700 rounded-lg p-4 mt-4">
            <h3 className="text-white text-lg font-semibold mb-3">Draw</h3>
            <div className="flex flex-row gap-2 justify-center">
              <button
                onClick={() => dispatch({ type: 'draw', count: 1 })}
                disabled={isDrawDisabled}
                className={`py-2 px-3 rounded-lg text-white font-semibold text-sm transition-opacity grow ${isDrawDisabled
                  ? 'bg-zinc-800 opacity-50 cursor-not-allowed'
                  : 'bg-zinc-600 hover:opacity-80 hover:bg-zinc-500'
                  }`}
              >
                Draw
              </button>
              <button
                onClick={() => dispatch({ type: 'draw', count: 'all' })}
                disabled={isDrawAllDisabled}
                className={`py-2 px-3 rounded-lg text-white font-semibold text-sm transition-opacity grow ${isDrawAllDisabled
                  ? 'bg-zinc-800 opacity-50 cursor-not-allowed'
                  : 'bg-zinc-600 hover:opacity-80 hover:bg-zinc-500'
                  }`}
              >
                Draw All
              </button>
              <button
                onClick={() => dispatch({ type: 'redraw' })}
                disabled={isRedrawDisabled}
                className={`py-2 px-3 rounded-lg text-white font-semibold text-sm transition-opacity grow ${isRedrawDisabled
                  ? 'bg-zinc-800 opacity-50 cursor-not-allowed'
                  : 'bg-zinc-600 hover:opacity-80 hover:bg-zinc-500'
                  }`}
              >
                Redraw
              </button>
            </div>
            {(isDrawDisabled || isDrawAllDisabled || isRedrawDisabled) && (
              <p className="text-zinc-400 text-xs mt-2 text-center">
                {bag.length === 0 && discard.length === 0 ? 'Bag and discard are empty' :
                  isRackEmpty ? 'Rack is empty' : 'Rack is full'}
              </p>
            )}
          </div>

          {/* Score */}
          <div className="bg-zinc-700 rounded-lg p-4 mt-4">
            <h3 className="text-white text-lg font-semibold mb-3">Score</h3>

            {/* Total Score */}
            <div className="mb-3">
              <div className="text-white text-sm font-medium mb-1">Total Score</div>
              <div className="text-green-400 text-2xl font-bold">
                {totalScore}
              </div>
            </div>

            {/* Current Play Score */}
            <div className="mb-3">
              <div className="text-white text-sm font-medium mb-2">Current Play</div>
              <div className="bg-zinc-800 rounded px-3 py-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-zinc-300 text-xs">Points:</span>
                  <span className="text-white text-sm font-mono">
                    {currentPlayScore.breakdown.baseTilePoints}
                    {currentPlayScore.breakdown.stickerPoints > 0 && (
                      <span className="text-green-400"> (+{currentPlayScore.breakdown.stickerPoints})</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-zinc-300 text-xs">Multi:</span>
                  <span className="text-white text-sm font-mono">
                    {currentPlayScore.breakdown.baseTileMulti}
                    {currentPlayScore.breakdown.stickerMulti > 0 && (
                      <span className="text-green-400"> (+{currentPlayScore.breakdown.stickerMulti})</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-zinc-600 pt-1">
                  <span className="text-zinc-300 text-xs font-medium">Total:</span>
                  <span className="text-green-400 text-sm font-bold font-mono">{currentPlayScore.breakdown.total}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Board */}
          <div className="bg-zinc-700 rounded-lg p-4 mt-4">
            <h3 className="text-white text-lg font-semibold mb-3">Board</h3>
            <div className="text-zinc-400 text-xs mb-3" role="status">
              {dictionaryError ? (
                <>
                  <p>Dictionary unavailable: {dictionaryError}</p>
                  <button
                    onClick={onRetryDictionary}
                    className="mt-2 py-1 px-3 rounded-lg text-white text-xs bg-zinc-600 hover:bg-zinc-500"
                  >
                    Retry
                  </button>
                </>
              ) : !dictionary ? (
                <p>Loading dictionary. Play is unavailable.</p>
              ) : (
                <p>{evaluation.canPlay ? 'Ready to play' : evaluation.reason}</p>
              )}
            </div>

            {/* Current Words Section */}
            <div className="mb-4">
              <h4 className="text-white text-sm font-medium mb-2">Current</h4>
              {currentWords.length === 0 ? (
                <p className="text-zinc-400 text-xs text-center">No current words</p>
              ) : (
                <div className="space-y-1">
                  {currentWords.map((wordInfo, index) => (
                    <div
                      key={`current-${index}`}
                      className="text-white text-sm font-mono bg-zinc-800 rounded px-2 py-1 flex justify-between items-center"
                    >
                      <span>
                        {wordInfo.word.toUpperCase()} at ({wordInfo.position.row},{wordInfo.position.col}) {wordInfo.direction}
                      </span>
                      {getValidationIcon(wordInfo.word)}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Played Words Section */}
            <div>
              <h4 className="text-white text-sm font-medium mb-2">Played</h4>
              {playedWords.length === 0 ? (
                <p className="text-zinc-400 text-xs text-center">No played words</p>
              ) : (
                <div className="space-y-1">
                  {playedWords.map((wordInfo, index) => (
                    <div
                      key={`played-${index}`}
                      className="text-white text-sm font-mono bg-zinc-800 rounded px-2 py-1 flex justify-between items-center"
                    >
                      <span>
                        {wordInfo.word.toUpperCase()} at ({wordInfo.position.row},{wordInfo.position.col}) {wordInfo.direction}
                      </span>
                      {getValidationIcon(wordInfo.word)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tile Bag */}
          <div className="bg-zinc-700 rounded-lg p-4 mt-4">
            <h3 className="text-white text-lg font-semibold mb-3">
              Tile Bag ({bag.length} tiles)
            </h3>

            <div className="grid grid-cols-8 gap-1 overflow-y-auto mb-3">
              {bag.map((tile, index) => (
                <div
                  key={index}
                  className="w-6 h-6 bg-zinc-800 rounded flex items-center justify-center text-xs font-mono text-white border border-zinc-600"
                  title={`${tile.value} (${tile.score} points)`}
                >
                  {tile.value === '*' ? '*' : tile.value}
                </div>
              ))}
            </div>
            <button
              onClick={() => dispatch({ type: 'shuffle-bag' })}
              disabled={bag.length === 0}
              className={`w-full py-2 px-3 rounded-lg text-white font-semibold text-sm transition-opacity ${bag.length === 0
                ? 'bg-zinc-800 opacity-50 cursor-not-allowed'
                : 'bg-zinc-600 hover:opacity-80 hover:bg-zinc-500'
                }`}
            >
              Shuffle
            </button>
          </div>

          {/* Stickers */}
          <div className="bg-zinc-700 rounded-lg p-4 mt-4">
            <h3 className="text-white text-lg font-semibold mb-3">Stickers</h3>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-zinc-800 rounded px-3 py-2">
                <div className="text-purple-300 text-xs font-medium mb-1">Multi (x2)</div>
                <div className="text-white text-sm">
                  <span className="text-green-400">{stickerCounts.multiActive}</span>
                  <span className="text-zinc-400"> / </span>
                  <span className="text-zinc-500">{stickerCounts.multiConsumed}</span>
                </div>
              </div>
              <div className="bg-zinc-800 rounded px-3 py-2">
                <div className="text-blue-300 text-xs font-medium mb-1">Points (+10)</div>
                <div className="text-white text-sm">
                  <span className="text-green-400">{stickerCounts.pointsActive}</span>
                  <span className="text-zinc-400"> / </span>
                  <span className="text-zinc-500">{stickerCounts.pointsConsumed}</span>
                </div>
              </div>
              <div className="bg-zinc-800 rounded px-3 py-2">
                <div className="text-yellow-300 text-xs font-medium mb-1">Start (★)</div>
                <div className="text-white text-sm">
                  <span className="text-green-400">{stickerCounts.startActive}</span>
                  <span className="text-zinc-400"> / </span>
                  <span className="text-zinc-500">{stickerCounts.startConsumed}</span>
                </div>
              </div>
            </div>

            <div className="text-xs text-zinc-400 text-center">
              Active / Consumed
            </div>
          </div>
        </>
      )}

      {/* Draft Mode Sections - Only show when in draft mode */}
      {isDraftMode && (
        <>
          <div className="bg-zinc-700 rounded-lg p-4 mb-4">
            <h3 className="text-white text-lg font-semibold mb-3">Draft Mode</h3>
            <p className="text-zinc-400 text-sm text-center mb-3">
              {state.draft.complete ? 'Draft complete. Exit Draft, then Draw All to begin.' : 'Choose suggested tiles with 1 / 2 / 3 on the board, or use the buttons below.'}
            </p>
            {!state.draft.complete && (
              <div className="flex flex-row gap-2 justify-center mb-3">
                {DRAFT_COLUMNS.map((column, index) => {
                  const tile = state.draft.board[4][column].tile;
                  return (
                    <button
                      key={column}
                      onClick={() => dispatch({ type: 'draft-pick', column })}
                      disabled={!tile}
                      className="py-2 px-3 rounded-lg text-white font-semibold text-sm bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {index + 1}: {tile?.value ?? '—'}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="flex flex-row gap-2 justify-center">
              <button
                onClick={() => dispatch({ type: 'draft-reroll' })}
                disabled={state.draft.complete}
                className="py-2 px-3 rounded-lg text-white font-semibold text-sm transition-opacity bg-blue-600 hover:opacity-80 hover:bg-blue-500 disabled:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                New Suggestions
              </button>
              <button
                onClick={() => dispatch({ type: 'reset-draft' })}
                className="py-2 px-3 rounded-lg text-white font-semibold text-sm transition-opacity bg-orange-600 hover:opacity-80 hover:bg-orange-500"
              >
                Reset Draft
              </button>
            </div>
          </div>
        </>
      )}

      {/* Visual Settings */}
      <div className="bg-zinc-700 rounded-lg p-4 mt-4">
        <h3 className="text-white text-lg font-semibold mb-3">Visual Settings</h3>

        {/* Tile Opacity Slider */}
        <div className="mb-4">
          <label htmlFor="tile-opacity" className="block text-white text-sm font-medium mb-2">Tile Opacity</label>
          <div className="flex items-center gap-3">
            <input
              id="tile-opacity"
              type="range"
              min="0"
              max="100"
              value={tileOpacity}
              onChange={(e) => setTileOpacity(Number(e.target.value))}
              aria-valuetext={`${tileOpacity}%`}
              className="flex-1 h-2 bg-zinc-600 rounded-lg appearance-none cursor-pointer slider"
            />
            <span className="text-white text-sm font-mono w-12 text-right">
              {tileOpacity}%
            </span>
          </div>
        </div>

        {/* Coordinates Toggle */}
        <div>
          <div className="text-white text-sm font-medium mb-2">Show Coordinates</div>
          <button
            onClick={() => setShowCoordinates(!showCoordinates)}
            aria-pressed={showCoordinates}
            className={`w-full py-2 px-3 rounded-lg text-white font-semibold text-sm transition-opacity ${
              showCoordinates
                ? 'bg-green-600 hover:opacity-80 hover:bg-green-500'
                : 'bg-zinc-600 hover:opacity-80 hover:bg-zinc-500'
            }`}
          >
            {showCoordinates ? 'Hide' : 'Show'} Coordinates
          </button>
        </div>
      </div>

    </div>
  );
}