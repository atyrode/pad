use crate::Dictionary;
use crate::model::*;

// Catalogue order is part of the seeded draft sampling contract.
const TILE_CATALOGUE: [(&str, f64); 26] = [
    ("A", 1.0),
    ("E", 1.0),
    ("I", 1.0),
    ("N", 1.0),
    ("O", 1.0),
    ("R", 1.0),
    ("S", 1.0),
    ("T", 1.0),
    ("U", 1.0),
    ("L", 1.0),
    ("D", 2.0),
    ("M", 2.0),
    ("G", 2.0),
    ("B", 3.0),
    ("C", 3.0),
    ("P", 3.0),
    ("F", 4.0),
    ("H", 4.0),
    ("V", 4.0),
    ("W", 10.0),
    ("Y", 10.0),
    ("K", 10.0),
    ("J", 8.0),
    ("X", 10.0),
    ("Q", 10.0),
    ("Z", 10.0),
];

pub fn tile_definitions() -> Vec<TileDefinition> {
    TILE_CATALOGUE
        .iter()
        .enumerate()
        .map(|(index, &(letter, score))| TileDefinition {
            id: (index + 1) as u8,
            letter: letter.to_owned(),
            score,
        })
        .collect()
}

pub fn tile_definition(letter: &str) -> Option<TileDefinition> {
    if letter == "*" {
        return Some(TileDefinition {
            id: 0,
            letter: "*".to_owned(),
            score: 0.0,
        });
    }
    TILE_CATALOGUE
        .iter()
        .enumerate()
        .find(|(_, (candidate, _))| *candidate == letter)
        .map(|(index, &(letter, score))| TileDefinition {
            id: (index + 1) as u8,
            letter: letter.to_owned(),
            score,
        })
}

pub fn create_initial_board() -> Board {
    vec![
        vec![
            BoardCellState {
                tile: None,
                can_place: true,
                can_take: true
            };
            BOARD_SIZE
        ];
        BOARD_SIZE
    ]
}

pub fn create_initial_draft_board() -> Board {
    let mut board = create_initial_board();
    for (row, cells) in board.iter_mut().enumerate() {
        for (col, cell) in cells.iter_mut().enumerate() {
            cell.can_place = (row == 7 || row == 8) && (2..=8).contains(&col);
        }
    }
    for (index, letter) in ["D", "R", "A", "F", "T"].into_iter().enumerate() {
        let col = index + 3;
        let definition = tile_definition(letter).expect("draft title is in the tile catalogue");
        board[1][col] = BoardCellState {
            tile: Some(TileData {
                id: format!("draft-{letter}-1-{col}"),
                value: definition.letter,
                score: definition.score,
                original_value: None,
                display_value: None,
            }),
            can_place: false,
            can_take: false,
        };
    }
    // Suggestion cells retain can_take=true and can_place=false from initialization.
    board
}

pub fn create_initial_stickers() -> Stickers {
    let mut stickers = vec![vec![None; BOARD_SIZE]; BOARD_SIZE];
    for (row, col) in [(1, 1), (1, 9), (9, 1), (9, 9)] {
        stickers[row][col] = Some(Sticker {
            kind: StickerType::Multi,
            value: 2.0,
            consumed: false,
        });
    }
    for (row, col) in [(3, 3), (3, 7), (7, 3), (7, 7)] {
        stickers[row][col] = Some(Sticker {
            kind: StickerType::Points,
            value: 10.0,
            consumed: false,
        });
    }
    stickers[5][5] = Some(Sticker {
        kind: StickerType::Start,
        value: 0.0,
        consumed: false,
    });
    stickers
}

pub fn find_tile_position(board: &Board, tile_id: &str) -> Option<Position> {
    for (row, cells) in board.iter().take(BOARD_SIZE).enumerate() {
        for (col, cell) in cells.iter().take(BOARD_SIZE).enumerate() {
            if cell.tile.as_ref().is_some_and(|tile| tile.id == tile_id) {
                return Some(Position { row, col });
            }
        }
    }
    None
}

// Valid game letters are ASCII; retain the existing string-length behavior when
// inspecting an unplayable tile value as well.
fn word_length(word: &str) -> usize {
    if word.is_ascii() {
        word.len()
    } else {
        word.encode_utf16().count()
    }
}

pub fn find_all_words(board: &Board) -> Vec<WordInfo> {
    let mut words = Vec::new();
    for direction in [WordDirection::Horizontal, WordDirection::Vertical] {
        let (dr, dc) = match direction {
            WordDirection::Horizontal => (0, 1),
            WordDirection::Vertical => (1, 0),
        };
        // Both directions are row-major, not column-major for vertical words.
        for row in 0..BOARD_SIZE {
            for col in 0..BOARD_SIZE {
                if board[row][col].tile.is_none() {
                    continue;
                }
                let is_start = match direction {
                    WordDirection::Horizontal => col == 0 || board[row][col - 1].tile.is_none(),
                    WordDirection::Vertical => row == 0 || board[row - 1][col].tile.is_none(),
                };
                if !is_start {
                    continue;
                }
                let mut word = String::new();
                let mut is_locked = true;
                let (mut current_row, mut current_col) = (row, col);
                while current_row < BOARD_SIZE && current_col < BOARD_SIZE {
                    let cell = &board[current_row][current_col];
                    let Some(tile) = &cell.tile else { break };
                    word.push_str(&tile.value);
                    is_locked &= !cell.can_take;
                    current_row += dr;
                    current_col += dc;
                }
                if word_length(&word) >= 2 {
                    words.push(WordInfo {
                        word,
                        position: Position { row, col },
                        direction,
                        is_locked,
                    });
                }
            }
        }
    }
    words
}

pub fn are_unlocked_tiles_in_single_line(board: &Board) -> bool {
    let mut min_row = BOARD_SIZE;
    let mut min_col = BOARD_SIZE;
    let mut max_row = 0;
    let mut max_col = 0;
    for (row, cells) in board.iter().take(BOARD_SIZE).enumerate() {
        for (col, cell) in cells.iter().take(BOARD_SIZE).enumerate() {
            if cell.tile.is_some() && cell.can_take {
                min_row = min_row.min(row);
                max_row = max_row.max(row);
                min_col = min_col.min(col);
                max_col = max_col.max(col);
            }
        }
    }
    if min_row == BOARD_SIZE {
        return true;
    }
    if min_row == max_row {
        return (min_col..=max_col).all(|col| board[min_row][col].tile.is_some());
    }
    if min_col == max_col {
        return (min_row..=max_row).all(|row| board[row][min_col].tile.is_some());
    }
    false
}

pub fn does_current_play_touch_locked(board: &Board) -> bool {
    for row in 0..BOARD_SIZE {
        for col in 0..BOARD_SIZE {
            let cell = &board[row][col];
            if cell.tile.is_none() || !cell.can_take {
                continue;
            }
            for (dr, dc) in [(-1, 0), (1, 0), (0, -1), (0, 1)] {
                let neighbor_row = row as isize + dr;
                let neighbor_col = col as isize + dc;
                if !(0..BOARD_SIZE as isize).contains(&neighbor_row)
                    || !(0..BOARD_SIZE as isize).contains(&neighbor_col)
                {
                    continue;
                }
                let neighbor = &board[neighbor_row as usize][neighbor_col as usize];
                if neighbor.tile.is_some() && !neighbor.can_take {
                    return true;
                }
            }
        }
    }
    false
}

pub fn is_start_sticker_consumed(stickers: &Stickers) -> bool {
    stickers[5][5]
        .as_ref()
        .is_none_or(|sticker| sticker.consumed)
}

pub fn does_word_cover_start_sticker(word: &WordInfo) -> bool {
    let length = word_length(&word.word);
    match word.direction {
        WordDirection::Horizontal => {
            word.position.row == 5 && word.position.col <= 5 && 5 - word.position.col < length
        }
        WordDirection::Vertical => {
            word.position.col == 5 && word.position.row <= 5 && 5 - word.position.row < length
        }
    }
}

fn score_from_words(board: &Board, stickers: Option<&Stickers>, words: &[WordInfo]) -> PlayScore {
    let mut breakdown = ScoreBreakdown::default();
    let mut bingo_achieved = false;
    for word in words.iter().filter(|word| !word.is_locked) {
        let mut placed_count = 0;
        for offset in 0..word_length(&word.word) {
            let Position { row, col } = word.position;
            let (row, col) = match word.direction {
                WordDirection::Horizontal => (row, col + offset),
                WordDirection::Vertical => (row + offset, col),
            };
            let cell = &board[row][col];
            let Some(tile) = &cell.tile else { continue };
            // Crossings contribute once per current word, including their stickers.
            breakdown.base_tile_points += tile.score;
            breakdown.base_tile_multi += 1.0;
            if cell.can_take {
                placed_count += 1;
            }
            if let Some(sticker) = stickers.and_then(|stickers| stickers[row][col].as_ref())
                && !sticker.consumed
            {
                match sticker.kind {
                    StickerType::Multi => breakdown.sticker_multi += sticker.value,
                    StickerType::Points => breakdown.sticker_points += sticker.value,
                    StickerType::Start => {}
                }
            }
        }
        bingo_achieved |= placed_count == 7;
    }
    if bingo_achieved {
        breakdown.sticker_points += 50.0;
    }
    breakdown.points = breakdown.base_tile_points + breakdown.sticker_points;
    breakdown.multi = breakdown.base_tile_multi + breakdown.sticker_multi;
    breakdown.total = breakdown.points * breakdown.multi;
    PlayScore {
        total_score: breakdown.total,
        breakdown,
    }
}

pub fn calculate_current_play_score(board: &Board, stickers: Option<&Stickers>) -> PlayScore {
    score_from_words(board, stickers, &find_all_words(board))
}

pub fn evaluate_play(state: &GameState, dictionary: Option<&Dictionary>) -> PlayEvaluation {
    let words = find_all_words(&state.board);
    let score = score_from_words(&state.board, Some(&state.stickers), &words);
    let reason = (|| {
        if state.encounter.as_ref().is_some_and(|encounter| {
            encounter.status != EncounterStatus::Playing || encounter.plays_remaining <= 0.0
        }) {
            return Some("There is no active encounter play.");
        }
        if state.mode != Mode::Game {
            return Some("Exit Draft to play.");
        }
        let Some(dictionary) = dictionary else {
            return Some("Dictionary is not ready.");
        };
        if !words.iter().any(|word| !word.is_locked) {
            return Some("Place a word of at least two letters.");
        }
        if !are_unlocked_tiles_in_single_line(&state.board) {
            return Some("New tiles must form one continuous row or column.");
        }
        if state.board.iter().flatten().any(|cell| {
            cell.tile.as_ref().is_some_and(|tile| {
                tile.value.len() != 1 || !tile.value.as_bytes()[0].is_ascii_uppercase()
            })
        }) {
            return Some("Choose a letter for every blank.");
        }
        // Every value has now been checked as one uppercase ASCII letter, so no
        // uppercase allocation is needed for the dictionary lookup.
        if words
            .iter()
            .any(|word| !word.is_locked && !dictionary.contains(&word.word))
        {
            return Some("Every current word must be in the dictionary.");
        }
        if !is_start_sticker_consumed(&state.stickers) {
            if words
                .iter()
                .any(|word| !word.is_locked && !does_word_cover_start_sticker(word))
            {
                return Some("Every current word must cover the center.");
            }
        } else if state
            .board
            .iter()
            .flatten()
            .any(|cell| cell.tile.is_some() && !cell.can_take)
            && !does_current_play_touch_locked(&state.board)
        {
            return Some("New tiles must touch a locked tile.");
        }
        None
    })();
    PlayEvaluation {
        can_play: reason.is_none(),
        reason: reason.map(str::to_owned),
        words,
        score,
    }
}

pub fn is_draft_placement(position: InputPosition) -> bool {
    (position.row == 7.0 || position.row == 8.0)
        && position.col.is_finite()
        && position.col.fract() == 0.0
        && (2.0..=8.0).contains(&position.col)
}
