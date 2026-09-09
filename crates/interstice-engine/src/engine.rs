use std::collections::HashSet;

use crate::{Dictionary, model::*, rules};

fn random(rng: &mut u32) -> f64 {
    *rng = rng.wrapping_add(0x6d2b79f5);
    let next = *rng;
    let mut value = (next ^ (next >> 15)).wrapping_mul(next | 1);
    value ^= value.wrapping_add((value ^ (value >> 7)).wrapping_mul(value | 61));
    (value ^ (value >> 14)) as f64 / 4294967296.0
}

fn shuffle<T>(items: &mut [T], rng: &mut u32) {
    for index in (1..items.len()).rev() {
        let other = (random(rng) * (index + 1) as f64).floor() as usize;
        items.swap(index, other);
    }
}

fn next_id(state: &mut GameState) -> String {
    let id = format!("tile-{}-{}", state.seed, state.next_tile_id);
    state.next_tile_id += 1;
    id
}

fn is_blank(tile: &TileData) -> bool {
    tile.value == "*" || tile.original_value.as_deref() == Some("*")
}

fn normalize_inventory(tile: &mut TileData) {
    if is_blank(tile) {
        tile.value.clear();
        tile.value.push('*');
        tile.score = 0.0;
        let original = tile.original_value.get_or_insert_with(String::new);
        original.clear();
        original.push('*');
        tile.display_value = None;
    }
}

fn inventory_tile(mut tile: TileData) -> TileData {
    normalize_inventory(&mut tile);
    tile
}

fn is_letter(letter: &str) -> bool {
    letter.len() == 1 && letter.as_bytes()[0].is_ascii_uppercase()
}

fn board_tile(tile: &TileData, from_board: bool, letter: Option<&str>) -> Option<TileData> {
    if !is_blank(tile) || (from_board && is_letter(&tile.value)) {
        return Some(tile.clone());
    }
    let letter = letter.filter(|letter| is_letter(letter))?;
    Some(TileData {
        id: tile.id.clone(),
        value: letter.into(),
        score: 0.0,
        original_value: Some("*".into()),
        display_value: Some(letter.into()),
    })
}

fn board_position(row: f64, col: f64) -> Option<Position> {
    if row.is_finite()
        && col.is_finite()
        && row.fract() == 0.0
        && col.fract() == 0.0
        && row >= 0.0
        && col >= 0.0
        && row < BOARD_SIZE as f64
        && col < BOARD_SIZE as f64
    {
        Some(Position {
            row: row as usize,
            col: col as usize,
        })
    } else {
        None
    }
}

fn draft_position(position: InputPosition) -> Option<Position> {
    if rules::is_draft_placement(position) {
        board_position(position.row, position.col)
    } else {
        None
    }
}

fn fresh_draft() -> DraftState {
    DraftState {
        board: rules::create_initial_draft_board(),
        pick_index: 0,
        complete: false,
        seeded: false,
    }
}

pub fn get_drafted_tiles(state: &GameState) -> Vec<TileData> {
    let mut tiles = Vec::with_capacity(DRAFT_SEQUENCE.len());
    for row in [7, 8] {
        for col in 2..=8 {
            if let Some(tile) = &state.draft.board[row][col].tile {
                tiles.push(tile.clone());
            }
        }
    }
    tiles
}

fn offer_draft(state: &mut GameState) {
    for col in DRAFT_COLUMNS {
        state.draft.board[4][col].tile = None;
    }
    if state.draft.complete {
        return;
    }
    let kind = DRAFT_SEQUENCE.get(state.draft.pick_index).copied();
    if kind == Some('*') {
        state.draft.board[4][5].tile = Some(TileData {
            id: next_id(state),
            value: "*".into(),
            score: 0.0,
            original_value: Some("*".into()),
            display_value: None,
        });
        return;
    }
    let vowel = kind == Some('V');
    let mut pool = rules::tile_definitions();
    pool.retain(|definition| {
        matches!(
            definition.letter.as_str(),
            "A" | "E" | "I" | "O" | "U" | "Y"
        ) == vowel
    });
    let columns: &[usize] = if vowel { &[2, 8] } else { &DRAFT_COLUMNS };
    for &col in columns {
        let index = (random(&mut state.rng) * pool.len() as f64).floor() as usize;
        let definition = pool.remove(index);
        state.draft.board[4][col].tile = Some(TileData {
            id: next_id(state),
            value: definition.letter,
            score: definition.score,
            original_value: None,
            display_value: None,
        });
    }
}

fn seed_bag(state: &mut GameState) {
    let mut tiles = get_drafted_tiles(state);
    for tile in &mut tiles {
        normalize_inventory(tile);
        tile.id = next_id(state);
    }
    shuffle(&mut tiles, &mut state.rng);
    state.bag = tiles;
}

pub fn create_game(seed: u32) -> GameState {
    let mut state = GameState {
        version: 1,
        seed,
        rng: seed,
        rack_rng: seed ^ 0x9e3779b9,
        next_tile_id: 0,
        mode: Mode::Game,
        encounter: None,
        board: rules::create_initial_board(),
        rack: vec![None; RACK_SIZE],
        bag: Vec::new(),
        discard: Vec::new(),
        stickers: rules::create_initial_stickers(),
        total_score: 0.0,
        placement_history: Vec::new(),
        draft: fresh_draft(),
    };
    offer_draft(&mut state);
    state
}

fn empty_slots(rack: &Rack) -> Vec<usize> {
    rack.iter()
        .enumerate()
        .filter_map(|(index, tile)| tile.is_none().then_some(index))
        .collect()
}

fn fill_rack(state: &mut GameState, slots: &[usize]) {
    let mut cursor = 0;
    while cursor < slots.len() {
        if state.rack[slots[cursor]].is_some() {
            cursor += 1;
            continue;
        }
        if state.bag.is_empty() && !state.discard.is_empty() {
            state.bag = std::mem::take(&mut state.discard);
            for tile in &mut state.bag {
                normalize_inventory(tile);
            }
            shuffle(&mut state.bag, &mut state.rng);
        }
        if state.bag.is_empty() {
            break;
        }
        let count = slots[cursor..]
            .iter()
            .filter(|&&slot| state.rack[slot].is_none())
            .count()
            .min(state.bag.len());
        for tile in state.bag.drain(..count) {
            while state.rack[slots[cursor]].is_some() {
                cursor += 1;
            }
            state.rack[slots[cursor]] = Some(inventory_tile(tile));
            cursor += 1;
        }
    }
}

fn redraw_rack(state: &mut GameState, slots: &[usize]) {
    let start = state.discard.len();
    for &index in slots {
        state.discard.push(inventory_tile(
            state.rack[index].take().expect("occupied redraw slot"),
        ));
    }
    // Return order is independent of selection order and the cosmetic rack RNG.
    state.discard[start..].sort_by(|left, right| left.id.cmp(&right.id));
    fill_rack(state, slots);
}

fn clear_gameplay(state: &mut GameState) {
    state.board = rules::create_initial_board();
    state.rack = vec![None; RACK_SIZE];
    state.bag.clear();
    state.discard.clear();
    state.stickers = rules::create_initial_stickers();
    state.total_score = 0.0;
    state.placement_history.clear();
}

fn start_encounter(state: &mut GameState) {
    state.mode = Mode::Game;
    state
        .encounter
        .as_mut()
        .expect("validated encounter")
        .status = EncounterStatus::Playing;
    fill_rack(state, &empty_slots(&state.rack));
}

fn remember(state: &mut GameState, tile: &TileData, position: Position) {
    state
        .placement_history
        .retain(|entry| entry.tile_id != tile.id);
    state.placement_history.push(PlacementHistoryEntry {
        tile_id: tile.id.clone(),
        position,
        was_blank: Some(is_blank(tile)),
    });
}

fn first_draft_slot(state: &GameState, excluding: Option<Position>) -> Option<Position> {
    for row in [7, 8] {
        for col in 2..=8 {
            let position = Position { row, col };
            if Some(position) != excluding && state.draft.board[row][col].tile.is_none() {
                return Some(position);
            }
        }
    }
    None
}

fn commit_draft_pick(state: &mut GameState, column: usize, position: Position) -> TileData {
    let tile = state.draft.board[4][column]
        .tile
        .take()
        .expect("validated draft offer");
    state.draft.board[position.row][position.col].tile = Some(tile.clone());
    state.draft.pick_index += 1;
    state.draft.complete = state.draft.pick_index == DRAFT_SEQUENCE.len();
    offer_draft(state);
    if state.draft.complete && !state.draft.seeded {
        seed_bag(state);
        state.draft.seeded = true;
    }
    tile
}

fn pick_draft(
    state: &mut GameState,
    column: f64,
    to: Option<InputPosition>,
    zone: bool,
) -> Result<ActionEffect, String> {
    if state.mode != Mode::Draft {
        return Err("Enter Draft to pick tiles.".into());
    }
    if state.draft.complete {
        return Err("The draft is complete.".into());
    }
    if !DRAFT_COLUMNS
        .iter()
        .any(|&candidate| candidate as f64 == column)
    {
        return Err("Invalid draft offer.".into());
    }
    let column = column as usize;
    if state.draft.board[4][column].tile.is_none() {
        return Err("That draft offer is empty.".into());
    }
    let position = match to {
        Some(position) => draft_position(position),
        None => first_draft_slot(state, None),
    }
    .filter(|position| state.draft.board[position.row][position.col].tile.is_none())
    .ok_or("Choose an empty draft placement slot.")?;
    // Validate both decisions before committing: the automatic final blank must
    // not leave a partially applied thirteenth encounter pick on rejection.
    let automatic = if state
        .encounter
        .as_ref()
        .is_some_and(|encounter| encounter.status == EncounterStatus::Draft)
        && state.draft.pick_index == DRAFT_SEQUENCE.len() - 2
    {
        Some(
            first_draft_slot(state, Some(position))
                .ok_or("Choose an empty draft placement slot.")?,
        )
    } else {
        None
    };
    let tile = commit_draft_pick(state, column, position);
    if let Some(position) = automatic {
        commit_draft_pick(state, 5, position);
    }
    Ok(ActionEffect {
        position: Some(EffectPosition {
            position,
            zone: zone.then(|| "draft".into()),
        }),
        tile: Some(tile),
    })
}

fn move_tile(
    state: &mut GameState,
    tile_id: &str,
    to: TileTarget,
    letter: Option<&str>,
) -> Result<ActionEffect, String> {
    if state.mode == Mode::Draft {
        let position = match to {
            TileTarget::Draft { row, col } => draft_position(InputPosition { row, col }),
            _ => None,
        }
        .ok_or("Choose a draft placement slot.")?;
        let from = rules::find_tile_position(&state.draft.board, tile_id)
            .ok_or("The draft tile is no longer available.")?;
        if from.row == 4 && DRAFT_COLUMNS.contains(&from.col) {
            return pick_draft(
                state,
                from.col as f64,
                Some(InputPosition {
                    row: position.row as f64,
                    col: position.col as f64,
                }),
                true,
            );
        }
        if !rules::is_draft_placement(InputPosition {
            row: from.row as f64,
            col: from.col as f64,
        }) {
            return Err("Decorative tiles cannot move.".into());
        }
        let tile = state.draft.board[from.row][from.col].tile.take();
        let displaced = state.draft.board[position.row][position.col].tile.take();
        state.draft.board[from.row][from.col].tile = displaced;
        state.draft.board[position.row][position.col].tile = tile;
        return Ok(ActionEffect {
            position: Some(position.into()),
            tile: state.draft.board[position.row][position.col].tile.clone(),
        });
    }
    let (board_to, rack_to) = match to {
        TileTarget::Draft { .. } => return Err("Enter Draft to arrange draft tiles.".into()),
        TileTarget::Board { row, col } => (
            Some(board_position(row, col).ok_or("Invalid tile destination.")?),
            None,
        ),
        TileTarget::Rack { index } => {
            if !index.is_finite()
                || index.fract() != 0.0
                || index < 0.0
                || index >= RACK_SIZE as f64
            {
                return Err("Invalid tile destination.".into());
            }
            (None, Some(index as usize))
        }
    };
    let board_from = rules::find_tile_position(&state.board, tile_id);
    let rack_from = state
        .rack
        .iter()
        .position(|tile| tile.as_ref().is_some_and(|tile| tile.id == tile_id));
    if board_from.is_none() && rack_from.is_none() {
        return Err("The tile is no longer available.".into());
    }
    if board_from.is_some_and(|position| !state.board[position.row][position.col].can_take) {
        return Err("Locked tiles cannot move.".into());
    }
    let source = match board_from {
        Some(position) => state.board[position.row][position.col]
            .tile
            .as_ref()
            .unwrap(),
        None => state.rack[rack_from.unwrap()].as_ref().unwrap(),
    };
    let displaced = if let Some(position) = board_to {
        let cell = &state.board[position.row][position.col];
        if !cell.can_place || (cell.tile.is_some() && !cell.can_take) {
            return Err("That board cell is locked.".into());
        }
        cell.tile.as_ref()
    } else {
        state.rack[rack_to.unwrap()].as_ref()
    };
    let incoming = if board_to.is_some() {
        board_tile(source, board_from.is_some(), letter)
            .ok_or("Choose an A–Z letter for the blank.")?
    } else {
        inventory_tile(source.clone())
    };
    let replacement = if let Some(displaced) = displaced {
        if displaced.id != source.id {
            if let Some(position) = board_from {
                if !state.board[position.row][position.col].can_place {
                    return Err("The source cell cannot accept a swap.".into());
                }
                Some(
                    board_tile(displaced, board_to.is_some(), letter)
                        .ok_or("Choose an A–Z letter for the incoming blank.")?,
                )
            } else {
                Some(inventory_tile(displaced.clone()))
            }
        } else {
            return Ok(ActionEffect {
                position: board_from.map(Into::into),
                tile: Some(source.clone()),
            });
        }
    } else {
        None
    };
    state.placement_history.retain(|entry| {
        entry.tile_id != source.id && displaced.is_none_or(|tile| entry.tile_id != tile.id)
    });
    if let Some(position) = board_from {
        if let Some(tile) = &replacement {
            remember(state, tile, position);
        }
        state.board[position.row][position.col].tile = replacement;
    } else {
        state.rack[rack_from.unwrap()] = replacement;
    }
    if let Some(position) = board_to {
        remember(state, &incoming, position);
        state.board[position.row][position.col].tile = Some(incoming.clone());
    } else {
        state.rack[rack_to.unwrap()] = Some(incoming.clone());
    }
    Ok(ActionEffect {
        position: board_to.or(board_from).map(Into::into),
        tile: Some(incoming),
    })
}

fn valid_budget(value: f64, positive: bool) -> bool {
    value.is_finite()
        && value.fract() == 0.0
        && value <= 9007199254740991.0
        && if positive { value > 0.0 } else { value >= 0.0 }
}

pub fn apply_action(
    state: &mut GameState,
    action: &GameAction,
    dictionary: Option<&Dictionary>,
) -> Result<ActionEffect, String> {
    match action {
        GameAction::NewEncounter { config } => {
            let config = config.clone().unwrap_or_default();
            if !valid_budget(config.plays, true)
                || !valid_budget(config.redraws, false)
                || !valid_budget(config.target_score, true)
            {
                return Err("Encounter budgets and target must be valid whole numbers.".into());
            }
            clear_gameplay(state);
            state.mode = Mode::Draft;
            state.encounter = Some(EncounterState {
                status: EncounterStatus::Draft,
                plays_remaining: config.plays,
                redraws_remaining: config.redraws,
                config,
            });
            state.draft = fresh_draft();
            offer_draft(state);
            return Ok(ActionEffect::default());
        }
        GameAction::EnterSandbox => {
            state.encounter = None;
            return Ok(ActionEffect::default());
        }
        GameAction::StartEncounter => {
            if !state
                .encounter
                .as_ref()
                .is_some_and(|encounter| encounter.status == EncounterStatus::Draft)
                || !state.draft.complete
                || !state.draft.seeded
            {
                return Err("Finish the encounter draft first.".into());
            }
            if dictionary.is_none() {
                return Err("Dictionary is not ready.".into());
            }
            start_encounter(state);
            return Ok(ActionEffect::default());
        }
        GameAction::RetryEncounter => {
            let encounter = state
                .encounter
                .as_ref()
                .filter(|encounter| {
                    matches!(
                        encounter.status,
                        EncounterStatus::Won | EncounterStatus::Lost
                    )
                })
                .ok_or("Finish the encounter before retrying.")?;
            if dictionary.is_none() {
                return Err("Dictionary is not ready.".into());
            }
            let config = encounter.config.clone();
            clear_gameplay(state);
            state.mode = Mode::Game;
            state.encounter = Some(EncounterState {
                status: EncounterStatus::Playing,
                plays_remaining: config.plays,
                redraws_remaining: config.redraws,
                config,
            });
            seed_bag(state);
            fill_rack(state, &empty_slots(&state.rack));
            return Ok(ActionEffect::default());
        }
        GameAction::ConcedeEncounter => {
            let encounter = state
                .encounter
                .as_mut()
                .filter(|encounter| encounter.status == EncounterStatus::Playing)
                .ok_or("There is no active encounter to end.")?;
            encounter.status = EncounterStatus::Lost;
            return Ok(ActionEffect::default());
        }
        _ => {}
    }
    if let Some(encounter) = &state.encounter {
        match encounter.status {
            EncounterStatus::Won | EncounterStatus::Lost => {
                return Err("This encounter has ended.".into());
            }
            EncounterStatus::Draft => {
                if !matches!(
                    action,
                    GameAction::DraftPick { .. }
                        | GameAction::Move {
                            to: TileTarget::Draft { .. },
                            ..
                        }
                ) {
                    return Err("Finish the encounter draft first.".into());
                }
            }
            EncounterStatus::Playing => {
                if !matches!(
                    action,
                    GameAction::Move {
                        to: TileTarget::Board { .. } | TileTarget::Rack { .. },
                        ..
                    } | GameAction::Recall
                        | GameAction::ShuffleRack
                        | GameAction::Play
                        | GameAction::RedrawSelected { .. }
                ) {
                    return Err("That sandbox action is unavailable during an encounter.".into());
                }
            }
        }
    }
    match action {
        GameAction::RedrawSelected { tile_ids } => {
            if !state.encounter.as_ref().is_some_and(|encounter| {
                encounter.status == EncounterStatus::Playing
                    && encounter
                        .redraws_remaining
                        .partial_cmp(&0.0)
                        .is_none_or(|order| order.is_gt())
            }) {
                return Err("No encounter redraw is available.".into());
            }
            let selected: HashSet<&str> = tile_ids.iter().map(String::as_str).collect();
            if selected.is_empty() || selected.len() != tile_ids.len() {
                return Err("Select distinct rack tiles to redraw.".into());
            }
            let slots: Vec<usize> = state
                .rack
                .iter()
                .enumerate()
                .filter_map(|(index, tile)| {
                    tile.as_ref()
                        .filter(|tile| selected.contains(tile.id.as_str()))
                        .map(|_| index)
                })
                .collect();
            if slots.len() != selected.len() {
                return Err("Every selected tile must still be on the rack.".into());
            }
            state.encounter.as_mut().unwrap().redraws_remaining -= 1.0;
            redraw_rack(state, &slots);
            return Ok(ActionEffect::default());
        }
        GameAction::SetMode { mode } => {
            state.mode = *mode;
            return Ok(ActionEffect::default());
        }
        GameAction::Move { .. } | GameAction::DraftPick { .. } => {
            let was_encounter_draft = state
                .encounter
                .as_ref()
                .is_some_and(|encounter| encounter.status == EncounterStatus::Draft);
            let pick_index = state.draft.pick_index;
            let effect = match action {
                GameAction::Move {
                    tile_id,
                    to,
                    letter,
                } => move_tile(state, tile_id, *to, letter.as_deref())?,
                GameAction::DraftPick { column, to } => pick_draft(state, *column, *to, false)?,
                _ => unreachable!(),
            };
            if was_encounter_draft
                && state.draft.pick_index != pick_index
                && state.draft.complete
                && dictionary.is_some()
            {
                start_encounter(state);
            }
            return Ok(effect);
        }
        GameAction::ResetDraft => {
            if state.mode != Mode::Draft {
                return Err("Enter Draft to reset the draft.".into());
            }
            state.draft = fresh_draft();
            offer_draft(state);
            return Ok(ActionEffect::default());
        }
        GameAction::DraftReroll => {
            if state.mode != Mode::Draft || state.draft.complete {
                return Err("There is no active draft offer.".into());
            }
            offer_draft(state);
            return Ok(ActionEffect::default());
        }
        _ => {}
    }
    if state.mode != Mode::Game {
        return Err("Exit Draft to change the game.".into());
    }
    match action {
        GameAction::Recall => {
            let slot = state
                .rack
                .iter()
                .position(Option::is_none)
                .ok_or("The rack is full.")?;
            let tile_id = state
                .placement_history
                .iter()
                .rev()
                .find_map(|entry| {
                    rules::find_tile_position(&state.board, &entry.tile_id)
                        .filter(|position| state.board[position.row][position.col].can_take)
                        .map(|_| entry.tile_id.clone())
                })
                .ok_or("There is no pending tile to recall.")?;
            return move_tile(
                state,
                &tile_id,
                TileTarget::Rack { index: slot as f64 },
                None,
            );
        }
        GameAction::Discard { tile_id } => {
            let position = rules::find_tile_position(&state.board, tile_id);
            let index = state
                .rack
                .iter()
                .position(|tile| tile.as_ref().is_some_and(|tile| tile.id == *tile_id));
            if position.is_none() && index.is_none() {
                return Err("The tile is no longer available.".into());
            }
            if position.is_some_and(|position| !state.board[position.row][position.col].can_take) {
                return Err("Locked tiles cannot be discarded.".into());
            }
            let tile = inventory_tile(if let Some(position) = position {
                state.board[position.row][position.col].tile.take().unwrap()
            } else {
                state.rack[index.unwrap()].take().unwrap()
            });
            state
                .placement_history
                .retain(|entry| entry.tile_id != tile.id);
            state.discard.push(tile.clone());
            let vacancy = index.or_else(|| state.rack.iter().position(Option::is_none));
            if let Some(vacancy) = vacancy {
                fill_rack(state, &[vacancy]);
            }
            return Ok(ActionEffect {
                position: position.map(Into::into),
                tile: Some(tile),
            });
        }
        GameAction::Draw { count } => {
            let mut slots = empty_slots(&state.rack);
            if slots.is_empty() {
                return Err("The rack is full.".into());
            }
            if state.bag.is_empty() && state.discard.is_empty() {
                return Err("No tiles are available.".into());
            }
            if matches!(count, DrawCount::Number(value) if *value == 1.0) {
                slots.truncate(1);
            }
            fill_rack(state, &slots);
        }
        GameAction::Redraw => {
            let slots: Vec<usize> = state
                .rack
                .iter()
                .enumerate()
                .filter_map(|(index, tile)| tile.is_some().then_some(index))
                .collect();
            if slots.is_empty() {
                return Err("The rack is empty.".into());
            }
            redraw_rack(state, &slots);
        }
        GameAction::ShuffleRack => {
            let mut occupied = 0;
            for index in 0..state.rack.len() {
                if state.rack[index].is_some() {
                    state.rack.swap(occupied, index);
                    occupied += 1;
                }
            }
            shuffle(&mut state.rack[..occupied], &mut state.rack_rng);
        }
        GameAction::ShuffleBag => shuffle(&mut state.bag, &mut state.rng),
        GameAction::Play => {
            let evaluation = rules::evaluate_play(state, dictionary);
            if !evaluation.can_play {
                return Err(evaluation.reason.expect("rejected play reason"));
            }
            for row in 0..BOARD_SIZE {
                for col in 0..BOARD_SIZE {
                    let cell = &mut state.board[row][col];
                    if cell.tile.is_none() || !cell.can_take {
                        continue;
                    }
                    cell.can_take = false;
                    cell.can_place = false;
                    if let Some(sticker) = &mut state.stickers[row][col] {
                        sticker.consumed = true;
                    }
                }
            }
            state.total_score += evaluation.score.total_score;
            state.placement_history.clear();
            fill_rack(state, &empty_slots(&state.rack));
            if let Some(encounter) = &mut state.encounter {
                encounter.plays_remaining -= 1.0;
                encounter.status = if state.total_score >= encounter.config.target_score {
                    EncounterStatus::Won
                } else if encounter.plays_remaining == 0.0 {
                    EncounterStatus::Lost
                } else {
                    EncounterStatus::Playing
                };
            }
        }
        GameAction::Reset { target } => {
            if matches!(target, ResetTarget::Game | ResetTarget::Board) {
                state.board = rules::create_initial_board();
                state.placement_history.clear();
            }
            if matches!(target, ResetTarget::Game | ResetTarget::Rack) {
                state.rack = vec![None; RACK_SIZE];
            }
            if matches!(target, ResetTarget::Game | ResetTarget::Score) {
                state.total_score = 0.0;
            }
            if matches!(target, ResetTarget::Game | ResetTarget::Bag) {
                seed_bag(state);
            }
            if *target == ResetTarget::Game {
                state.discard.clear();
            }
            if matches!(target, ResetTarget::Game | ResetTarget::Stickers) {
                state.stickers = rules::create_initial_stickers();
                for row in 0..BOARD_SIZE {
                    for col in 0..BOARD_SIZE {
                        let cell = &state.board[row][col];
                        if cell.tile.is_some()
                            && !cell.can_take
                            && let Some(sticker) = &mut state.stickers[row][col]
                        {
                            sticker.consumed = true;
                        }
                    }
                }
            }
        }
        GameAction::NewEncounter { .. }
        | GameAction::EnterSandbox
        | GameAction::StartEncounter
        | GameAction::RetryEncounter
        | GameAction::ConcedeEncounter
        | GameAction::RedrawSelected { .. }
        | GameAction::SetMode { .. }
        | GameAction::Move { .. }
        | GameAction::DraftPick { .. }
        | GameAction::ResetDraft
        | GameAction::DraftReroll => unreachable!("action handled before gameplay dispatch"),
    }
    Ok(ActionEffect::default())
}
