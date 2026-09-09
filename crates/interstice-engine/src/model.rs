use serde::{Deserialize, Serialize};
use ts_rs::TS;

pub const BOARD_SIZE: usize = 11;
pub const RACK_SIZE: usize = 7;
pub const DRAFT_COLUMNS: [usize; 3] = [2, 5, 8];
pub const DRAFT_SEQUENCE: [char; 14] = [
    'V', 'C', 'C', 'V', 'C', 'C', 'V', 'C', 'C', 'V', 'C', 'C', 'V', '*',
];
pub type Board = Vec<Vec<BoardCellState>>;
pub type Rack = Vec<Option<TileData>>;
pub type Stickers = Vec<Vec<Option<Sticker>>>;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct TileData {
    pub id: String,
    pub value: String,
    pub score: f64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub original_value: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub display_value: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct BoardCellState {
    pub tile: Option<TileData>,
    pub can_place: bool,
    pub can_take: bool,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize, TS)]
pub struct Position {
    pub row: usize,
    pub col: usize,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct PlacementHistoryEntry {
    pub tile_id: String,
    pub position: Position,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub was_blank: Option<bool>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "lowercase")]
pub enum StickerType {
    Multi,
    Points,
    Start,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, TS)]
pub struct Sticker {
    #[serde(rename = "type")]
    pub kind: StickerType,
    pub value: f64,
    pub consumed: bool,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "lowercase")]
pub enum Mode {
    Game,
    Draft,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "lowercase")]
pub enum EncounterStatus {
    Draft,
    Playing,
    Won,
    Lost,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct EncounterConfig {
    pub plays: f64,
    pub redraws: f64,
    pub target_score: f64,
}

impl Default for EncounterConfig {
    fn default() -> Self {
        Self {
            plays: 4.0,
            redraws: 3.0,
            target_score: 100.0,
        }
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct EncounterState {
    pub status: EncounterStatus,
    pub config: EncounterConfig,
    pub plays_remaining: f64,
    pub redraws_remaining: f64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct DraftState {
    pub board: Board,
    pub pick_index: usize,
    pub complete: bool,
    pub seeded: bool,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct GameState {
    #[ts(type = "1")]
    pub version: u32,
    pub seed: u32,
    pub rng: u32,
    pub rack_rng: u32,
    #[ts(type = "number")]
    pub next_tile_id: u64,
    pub mode: Mode,
    pub encounter: Option<EncounterState>,
    pub board: Board,
    pub rack: Rack,
    pub bag: Vec<TileData>,
    pub discard: Vec<TileData>,
    pub stickers: Stickers,
    pub total_score: f64,
    pub placement_history: Vec<PlacementHistoryEntry>,
    pub draft: DraftState,
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize, TS)]
pub struct InputPosition {
    pub row: f64,
    pub col: f64,
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "zone", rename_all = "lowercase")]
pub enum TileTarget {
    Board { row: f64, col: f64 },
    Rack { index: f64 },
    Draft { row: f64, col: f64 },
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "lowercase")]
pub enum ResetTarget {
    Game,
    Board,
    Rack,
    Bag,
    Score,
    Stickers,
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize, TS)]
#[serde(untagged)]
pub enum DrawCount {
    Number(f64),
    All(AllTiles),
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "lowercase")]
pub enum AllTiles {
    All,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, TS)]
#[serde(
    tag = "type",
    rename_all = "kebab-case",
    rename_all_fields = "camelCase"
)]
pub enum GameAction {
    SetMode {
        mode: Mode,
    },
    Move {
        tile_id: String,
        to: TileTarget,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        #[ts(optional)]
        letter: Option<String>,
    },
    Recall,
    Discard {
        tile_id: String,
    },
    Draw {
        count: DrawCount,
    },
    Redraw,
    ShuffleRack,
    ShuffleBag,
    Reset {
        target: ResetTarget,
    },
    DraftPick {
        column: f64,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        #[ts(optional)]
        to: Option<InputPosition>,
    },
    DraftReroll,
    ResetDraft,
    NewEncounter {
        #[serde(default, skip_serializing_if = "Option::is_none")]
        #[ts(optional)]
        config: Option<EncounterConfig>,
    },
    StartEncounter,
    RetryEncounter,
    ConcedeEncounter,
    EnterSandbox,
    RedrawSelected {
        #[ts(type = "ReadonlyArray<string>")]
        tile_ids: Vec<String>,
    },
    Play,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "lowercase")]
pub enum WordDirection {
    Horizontal,
    Vertical,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct WordInfo {
    pub word: String,
    pub position: Position,
    pub direction: WordDirection,
    pub is_locked: bool,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct ScoreBreakdown {
    pub base_tile_points: f64,
    pub sticker_points: f64,
    pub base_tile_multi: f64,
    pub sticker_multi: f64,
    pub points: f64,
    pub multi: f64,
    pub total: f64,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct PlayScore {
    pub total_score: f64,
    pub breakdown: ScoreBreakdown,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct PlayEvaluation {
    pub can_play: bool,
    pub reason: Option<String>,
    pub words: Vec<WordInfo>,
    pub score: PlayScore,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct EffectPosition {
    #[serde(flatten)]
    pub position: Position,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub zone: Option<String>,
}

impl From<Position> for EffectPosition {
    fn from(position: Position) -> Self {
        Self {
            position,
            zone: None,
        }
    }
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct ActionEffect {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub position: Option<EffectPosition>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tile: Option<TileData>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, TS)]
pub struct TileDefinition {
    pub id: u8,
    pub letter: String,
    pub score: f64,
}
