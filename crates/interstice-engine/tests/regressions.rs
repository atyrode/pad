use std::collections::HashSet;

use interstice_engine::{
    Dictionary,
    engine::{apply_action, create_game, get_drafted_tiles},
    model::*,
    rules::{are_unlocked_tiles_in_single_line, evaluate_play, tile_definition},
};

fn tile(id: &str, value: &str) -> TileData {
    TileData {
        id: id.into(),
        value: value.into(),
        score: tile_definition(value).unwrap().score,
        original_value: (value == "*").then(|| "*".into()),
        display_value: None,
    }
}

fn act(action: GameAction, state: &mut GameState, dictionary: Option<&Dictionary>) -> ActionEffect {
    apply_action(state, &action, dictionary).unwrap_or_else(|reason| panic!("{action:?}: {reason}"))
}

fn reject(action: GameAction, state: &mut GameState, dictionary: Option<&Dictionary>) {
    let before = state.clone();
    assert!(
        apply_action(state, &action, dictionary).is_err(),
        "accepted {action:?}"
    );
    assert_eq!(*state, before, "rejection mutated state for {action:?}");
}

fn movement(id: &str, to: TileTarget, letter: Option<&str>) -> GameAction {
    GameAction::Move {
        tile_id: id.into(),
        to,
        letter: letter.map(str::to_owned),
    }
}

fn board(row: f64, col: f64) -> TileTarget {
    TileTarget::Board { row, col }
}
fn rack(index: f64) -> TileTarget {
    TileTarget::Rack { index }
}
fn draft(row: f64, col: f64) -> TileTarget {
    TileTarget::Draft { row, col }
}
fn draw_all() -> GameAction {
    GameAction::Draw {
        count: DrawCount::All(AllTiles::All),
    }
}
fn pick(column: usize) -> GameAction {
    GameAction::DraftPick {
        column: column as f64,
        to: None,
    }
}
fn dictionary(words: &[&str]) -> Dictionary {
    words.iter().map(|word| (*word).into()).collect()
}
fn config(plays: f64, redraws: f64, target_score: f64) -> EncounterConfig {
    EncounterConfig {
        plays,
        redraws,
        target_score,
    }
}

fn live_ids(state: &GameState) -> Vec<String> {
    let mut ids: Vec<_> = state
        .bag
        .iter()
        .chain(state.discard.iter())
        .chain(state.rack.iter().flatten())
        .chain(
            state
                .board
                .iter()
                .flatten()
                .filter_map(|cell| cell.tile.as_ref()),
        )
        .map(|tile| tile.id.clone())
        .collect();
    ids.sort();
    ids
}

fn conserved(before: &GameState, after: &GameState) {
    let ids = live_ids(after);
    assert_eq!(ids, live_ids(before));
    assert_eq!(ids.iter().collect::<HashSet<_>>().len(), ids.len());
}

fn values<'a>(tiles: impl IntoIterator<Item = &'a TileData>) -> Vec<String> {
    let mut result: Vec<_> = tiles.into_iter().map(|tile| tile.value.clone()).collect();
    result.sort();
    result
}

fn rack_ids(state: &GameState) -> Vec<String> {
    let mut result: Vec<_> = state
        .rack
        .iter()
        .flatten()
        .map(|tile| tile.id.clone())
        .collect();
    result.sort();
    result
}

fn offered_column(state: &GameState) -> usize {
    DRAFT_COLUMNS
        .into_iter()
        .find(|&col| state.draft.board[4][col].tile.is_some())
        .unwrap()
}

fn finish_draft(seed: u32) -> GameState {
    let mut state = create_game(seed);
    act(GameAction::SetMode { mode: Mode::Draft }, &mut state, None);
    for _ in DRAFT_SEQUENCE {
        act(pick(offered_column(&state)), &mut state, None);
    }
    state
}

fn finish_encounter_draft(config: EncounterConfig, seed: u32) -> GameState {
    let mut state = create_game(seed);
    act(
        GameAction::NewEncounter {
            config: Some(config),
        },
        &mut state,
        None,
    );
    for _ in 0..DRAFT_SEQUENCE.len() - 1 {
        act(pick(offered_column(&state)), &mut state, None);
    }
    state
}

fn playing(config: EncounterConfig) -> GameState {
    let mut state = finish_encounter_draft(config, 42);
    act(
        GameAction::StartEncounter,
        &mut state,
        Some(&Dictionary::new()),
    );
    state
}

fn place_opening_word(state: &mut GameState) -> Dictionary {
    let tiles: Vec<_> = state.rack.iter().flatten().take(2).cloned().collect();
    assert_eq!(tiles.len(), 2);
    let word: String = tiles
        .iter()
        .map(|tile| if tile.value == "*" { "A" } else { &tile.value })
        .collect();
    for (index, tile) in tiles.iter().enumerate() {
        act(
            movement(&tile.id, board(5.0, (5 + index) as f64), Some("A")),
            state,
            None,
        );
    }
    [word].into_iter().collect()
}

fn put(state: &mut GameState, row: usize, col: usize, value: &str, locked: bool) {
    state.board[row][col] = BoardCellState {
        tile: Some(tile(&format!("board-{row}-{col}"), value)),
        can_place: !locked,
        can_take: !locked,
    };
}

fn history(id: &str, row: usize, col: usize) -> PlacementHistoryEntry {
    PlacementHistoryEntry {
        tile_id: id.into(),
        position: Position { row, col },
        was_blank: None,
    }
}

fn encounter(state: &GameState) -> &EncounterState {
    state.encounter.as_ref().unwrap()
}

#[test]
fn moves_and_swaps_conserve_physical_tiles_across_game_zones() {
    let mut state = create_game(7);
    state.rack[0] = Some(tile("a", "A"));
    state.rack[1] = Some(tile("b", "B"));
    state.bag = vec![tile("c", "C")];
    let initial = state.clone();
    for action in [
        movement("a", board(5.0, 5.0), None),
        movement("b", board(5.0, 6.0), None),
        movement("a", board(5.0, 6.0), None),
        movement("a", rack(0.0), None),
        movement("b", rack(0.0), None),
        movement("b", rack(3.0), None),
        movement("b", board(5.0, 5.0), None),
        movement("a", rack(1.0), None),
        GameAction::Draw {
            count: DrawCount::Number(1.0),
        },
        movement("a", rack(0.0), None),
    ] {
        act(action, &mut state, None);
        conserved(&initial, &state);
    }
    assert_eq!(state.board[5][5].tile.as_ref().unwrap().id, "b");
    assert_eq!(state.rack[0].as_ref().unwrap().id, "a");
    assert_eq!(state.rack[1].as_ref().unwrap().id, "c");
}

#[test]
fn discard_refills_source_slot_and_redraw_preserves_rack_inventory() {
    let mut state = create_game(11);
    state.rack[2] = Some(tile("old", "A"));
    state.rack[5] = Some(tile("keep", "E"));
    state.bag = vec![tile("replacement", "R"), tile("bag", "B")];
    state.discard = vec![tile("discard", "D")];
    let initial = state.clone();
    act(
        GameAction::Discard {
            tile_id: "old".into(),
        },
        &mut state,
        None,
    );
    assert_eq!(state.rack[2].as_ref().unwrap().id, "replacement");
    assert_eq!(
        state
            .discard
            .iter()
            .map(|tile| tile.id.as_str())
            .collect::<Vec<_>>(),
        ["discard", "old"]
    );
    conserved(&initial, &state);
    act(GameAction::Redraw, &mut state, None);
    assert_eq!(state.rack[2].as_ref().unwrap().id, "bag");
    assert_eq!(state.rack.iter().flatten().count(), 2);
    conserved(&initial, &state);
    act(draw_all(), &mut state, None);
    assert_eq!(state.rack.iter().flatten().count(), 5);
    assert!(state.bag.is_empty());
    assert!(state.discard.is_empty());
    conserved(&initial, &state);
}

#[test]
fn draw_all_recycles_mid_draw_and_board_discard_uses_first_vacancy() {
    let mut state = create_game(12);
    state.bag = vec![tile("bag", "A")];
    state.discard = vec![tile("d1", "A"), tile("d2", "A")];
    put(&mut state, 5, 5, "A", false);
    let initial = state.clone();
    act(draw_all(), &mut state, None);
    assert_eq!(state.rack[0].as_ref().unwrap().id, "bag");
    assert_eq!(state.rack.iter().flatten().count(), 3);
    assert_eq!(state.board[5][5].tile.as_ref().unwrap().id, "board-5-5");
    act(
        GameAction::Discard {
            tile_id: "board-5-5".into(),
        },
        &mut state,
        None,
    );
    assert!(state.board[5][5].tile.is_none());
    assert_eq!(state.rack[3].as_ref().unwrap().id, "board-5-5");
    conserved(&initial, &state);
}

#[test]
fn locked_stale_invalid_and_full_rack_actions_reject_atomically() {
    let mut state = create_game(9);
    state.rack = (0..7)
        .map(|index| Some(tile(&format!("rack-{index}"), "A")))
        .collect();
    put(&mut state, 5, 5, "A", true);
    put(&mut state, 5, 6, "B", false);
    state.placement_history = vec![history("board-5-6", 5, 6)];
    for action in [
        movement("missing", board(5.0, 4.0), None),
        movement("board-5-5", rack(0.0), None),
        movement("rack-0", board(5.0, 5.0), None),
        movement("rack-0", rack(7.0), None),
        movement("rack-0", board(f64::NAN, 0.0), None),
        GameAction::Discard {
            tile_id: "board-5-5".into(),
        },
        GameAction::Discard {
            tile_id: "missing".into(),
        },
        GameAction::Recall,
        GameAction::ResetDraft,
        GameAction::Play,
    ] {
        reject(action, &mut state, None);
    }
    act(GameAction::SetMode { mode: Mode::Draft }, &mut state, None);
    reject(draw_all(), &mut state, None);
    reject(
        GameAction::Reset {
            target: ResetTarget::Game,
        },
        &mut state,
        None,
    );
    reject(movement("rack-0", draft(7.0, 2.0), None), &mut state, None);
}

#[test]
fn blanks_require_uppercase_assignment_and_normalize_on_return() {
    let mut state = create_game(4);
    state.rack[0] = Some(tile("blank", "*"));
    state.rack[1] = Some(tile("a", "A"));
    for letter in [
        None,
        Some(""),
        Some("*"),
        Some("a"),
        Some("AB"),
        Some("É"),
        Some("1"),
    ] {
        reject(movement("blank", board(5.0, 5.0), letter), &mut state, None);
    }
    act(
        movement("blank", board(5.0, 5.0), Some("Z")),
        &mut state,
        None,
    );
    let blank = state.board[5][5].tile.as_ref().unwrap();
    assert_eq!(blank.value, "Z");
    assert_eq!(blank.score, 0.0);
    assert_eq!(blank.display_value.as_deref(), Some("Z"));
    act(movement("blank", board(5.0, 6.0), None), &mut state, None);
    assert_eq!(state.board[5][6].tile.as_ref().unwrap().value, "Z");
    let recalled = act(GameAction::Recall, &mut state, None);
    assert_eq!(
        recalled.position.unwrap().position,
        Position { row: 5, col: 6 }
    );
    assert_eq!(state.rack[0], Some(tile("blank", "*")));
    act(movement("a", board(5.0, 5.0), None), &mut state, None);
    reject(movement("a", rack(0.0), None), &mut state, None);
    act(movement("a", rack(0.0), Some("E")), &mut state, None);
    let blank = state.board[5][5].tile.as_ref().unwrap();
    assert_eq!(
        (blank.id.as_str(), blank.value.as_str(), blank.score),
        ("blank", "E", 0.0)
    );
    act(movement("a", board(5.0, 5.0), None), &mut state, None);
    assert_eq!(state.rack[0], Some(tile("blank", "*")));
    act(
        movement("blank", board(5.0, 6.0), Some("Q")),
        &mut state,
        None,
    );
    act(
        GameAction::Discard {
            tile_id: "blank".into(),
        },
        &mut state,
        None,
    );
    assert_eq!(state.rack[0], Some(tile("blank", "*")));
}

#[test]
fn recall_uses_current_physical_position_after_swaps() {
    let mut state = create_game(13);
    state.rack[0] = Some(tile("a", "A"));
    state.rack[1] = Some(tile("b", "B"));
    act(movement("a", board(5.0, 5.0), None), &mut state, None);
    act(movement("b", board(5.0, 6.0), None), &mut state, None);
    act(movement("a", board(5.0, 6.0), None), &mut state, None);
    act(GameAction::Recall, &mut state, None);
    assert_eq!(state.rack[0].as_ref().unwrap().id, "a");
    assert_eq!(state.board[5][5].tile.as_ref().unwrap().id, "b");
    assert!(state.board[5][6].tile.is_none());
    act(GameAction::Recall, &mut state, None);
    assert_eq!(state.rack[1].as_ref().unwrap().id, "b");
}

#[test]
fn fourteen_manual_picks_preserve_offer_policy_and_seed_distinct_inventory_once() {
    let mut state = create_game(31);
    act(GameAction::SetMode { mode: Mode::Draft }, &mut state, None);
    for (index, kind) in DRAFT_SEQUENCE.into_iter().enumerate() {
        let offers: Vec<_> = DRAFT_COLUMNS
            .into_iter()
            .filter_map(|col| state.draft.board[4][col].tile.as_ref())
            .collect();
        assert_eq!(
            offers.len(),
            match kind {
                'V' => 2,
                'C' => 3,
                _ => 1,
            }
        );
        assert_eq!(
            offers
                .iter()
                .map(|tile| &tile.value)
                .collect::<HashSet<_>>()
                .len(),
            offers.len()
        );
        for offered in offers {
            if kind == '*' {
                assert_eq!(offered.value, "*");
            } else {
                assert_eq!(
                    ["A", "E", "I", "O", "U", "Y"].contains(&offered.value.as_str()),
                    kind == 'V'
                );
            }
        }
        if kind == 'V' {
            assert!(state.draft.board[4][5].tile.is_none());
        }
        act(pick(offered_column(&state)), &mut state, None);
        assert_eq!(get_drafted_tiles(&state).len(), index + 1);
        if index < 13 {
            assert!(state.bag.is_empty());
        }
        if index == 0 {
            let chosen = get_drafted_tiles(&state)[0].id.clone();
            let offers_before = state.draft.board[4].clone();
            let rng = state.rng;
            act(movement(&chosen, draft(8.0, 8.0), None), &mut state, None);
            assert_eq!(state.draft.board[4], offers_before);
            assert_eq!(state.rng, rng);
            assert_eq!(state.draft.pick_index, 1);
            reject(movement(&chosen, draft(0.0, 0.0), None), &mut state, None);
        }
    }
    assert_eq!(state.mode, Mode::Draft);
    assert!(state.draft.complete && state.draft.seeded);
    assert_eq!(state.rack.iter().flatten().count(), 0);
    assert_eq!(state.bag.len(), 14);
    let recipe = get_drafted_tiles(&state);
    assert_eq!(values(&state.bag), values(&recipe));
    let template_ids: HashSet<_> = recipe.iter().map(|tile| &tile.id).collect();
    assert!(
        state
            .bag
            .iter()
            .all(|tile| !template_ids.contains(&tile.id))
    );
    reject(pick(5), &mut state, None);
    reject(GameAction::DraftReroll, &mut state, None);
    let bag = state.bag.clone();
    act(GameAction::SetMode { mode: Mode::Game }, &mut state, None);
    act(GameAction::SetMode { mode: Mode::Draft }, &mut state, None);
    assert_eq!(state.bag, bag);
}

#[test]
fn reroll_preserves_pick_count_and_invalid_targets_preserve_rng() {
    let mut state = create_game(44);
    act(GameAction::SetMode { mode: Mode::Draft }, &mut state, None);
    reject(pick(5), &mut state, None);
    reject(
        GameAction::DraftPick {
            column: 2.0,
            to: Some(InputPosition { row: 4.0, col: 2.0 }),
        },
        &mut state,
        None,
    );
    let old_ids: Vec<_> = state.draft.board[4]
        .iter()
        .map(|cell| cell.tile.as_ref().map(|tile| tile.id.clone()))
        .collect();
    act(GameAction::DraftReroll, &mut state, None);
    assert_eq!(state.draft.pick_index, 0);
    assert!(get_drafted_tiles(&state).is_empty());
    let new_ids: Vec<_> = state.draft.board[4]
        .iter()
        .map(|cell| cell.tile.as_ref().map(|tile| tile.id.clone()))
        .collect();
    assert_ne!(new_ids, old_ids);
}

#[test]
fn seeded_replay_is_exact_and_rack_shuffling_cannot_change_mechanics() {
    let run = || {
        let mut state = finish_draft(902);
        for action in [
            GameAction::SetMode { mode: Mode::Game },
            draw_all(),
            GameAction::Redraw,
            GameAction::ShuffleBag,
        ] {
            act(action, &mut state, None);
        }
        state
    };
    assert_eq!(run(), run());
    let mut plain = finish_draft(902);
    act(GameAction::SetMode { mode: Mode::Game }, &mut plain, None);
    act(draw_all(), &mut plain, None);
    let mut shuffled = plain.clone();
    act(GameAction::ShuffleRack, &mut shuffled, None);
    act(GameAction::ShuffleRack, &mut shuffled, None);
    assert_eq!(shuffled.rng, plain.rng);
    for _ in 0..2 {
        act(GameAction::Redraw, &mut plain, None);
        act(GameAction::Redraw, &mut shuffled, None);
        assert_eq!(shuffled.bag, plain.bag);
        assert_eq!(shuffled.discard, plain.discard);
        assert_eq!(shuffled.rack, plain.rack);
    }
    for action in [
        GameAction::ShuffleBag,
        GameAction::SetMode { mode: Mode::Draft },
        GameAction::ResetDraft,
        GameAction::DraftReroll,
    ] {
        act(action.clone(), &mut plain, None);
        act(action, &mut shuffled, None);
    }
    assert_eq!(shuffled.bag, plain.bag);
    assert_eq!(shuffled.draft, plain.draft);
    assert_eq!(shuffled.rng, plain.rng);
}

#[test]
fn reset_bag_mints_fresh_ids_and_whole_reset_clears_gameplay() {
    let mut state = finish_draft(42);
    act(GameAction::SetMode { mode: Mode::Game }, &mut state, None);
    act(draw_all(), &mut state, None);
    act(
        movement(
            &state.rack[0].as_ref().unwrap().id,
            board(5.0, 5.0),
            Some("A"),
        ),
        &mut state,
        None,
    );
    act(
        GameAction::Discard {
            tile_id: state.rack[1].as_ref().unwrap().id.clone(),
        },
        &mut state,
        None,
    );
    let old_ids: HashSet<_> = live_ids(&state).into_iter().collect();
    act(
        GameAction::Reset {
            target: ResetTarget::Bag,
        },
        &mut state,
        None,
    );
    assert!(state.bag.iter().all(|tile| !old_ids.contains(&tile.id)));
    let ids = live_ids(&state);
    assert_eq!(ids.iter().collect::<HashSet<_>>().len(), ids.len());
    state.total_score = 100.0;
    act(
        GameAction::Reset {
            target: ResetTarget::Game,
        },
        &mut state,
        None,
    );
    assert!(state.discard.is_empty());
    assert!(state.placement_history.is_empty());
    assert_eq!(state.rack.iter().flatten().count(), 0);
    assert!(state.board.iter().flatten().all(|cell| cell.tile.is_none()));
    assert_eq!(state.total_score, 0.0);
    assert_eq!(state.bag.len(), 14);
    let mut empty = create_game(1);
    act(
        GameAction::Reset {
            target: ResetTarget::Game,
        },
        &mut empty,
        None,
    );
    assert!(empty.bag.is_empty());
}

#[test]
fn horizontal_and_vertical_gaps_require_a_complete_locked_bridge() {
    for positions in [
        [(5, 3), (5, 4), (5, 5), (5, 6)],
        [(3, 5), (4, 5), (5, 5), (6, 5)],
    ] {
        let mut state = create_game(1);
        for (index, locked) in [(0, false), (1, true), (3, false)] {
            put(
                &mut state,
                positions[index].0,
                positions[index].1,
                "A",
                locked,
            );
        }
        let dictionary = dictionary(&["AA", "AAAA"]);
        assert!(!are_unlocked_tiles_in_single_line(&state.board));
        assert!(!evaluate_play(&state, Some(&dictionary)).can_play);
        reject(GameAction::Play, &mut state, Some(&dictionary));
        put(&mut state, positions[2].0, positions[2].1, "A", true);
        assert!(are_unlocked_tiles_in_single_line(&state.board));
        assert!(evaluate_play(&state, Some(&dictionary)).can_play);
    }
}

#[test]
fn all_crossing_words_validate_and_score_per_occurrence_in_one_product() {
    let mut state = create_game(1);
    put(&mut state, 5, 5, "A", false);
    put(&mut state, 5, 4, "B", true);
    put(&mut state, 4, 5, "C", true);
    state.stickers[5][5] = Some(Sticker {
        kind: StickerType::Points,
        value: 10.0,
        consumed: false,
    });
    state.stickers[5][4] = Some(Sticker {
        kind: StickerType::Multi,
        value: 2.0,
        consumed: false,
    });
    state.stickers[4][5] = Some(Sticker {
        kind: StickerType::Points,
        value: 10.0,
        consumed: true,
    });
    assert!(!evaluate_play(&state, Some(&dictionary(&["BA"]))).can_play);
    let evaluation = evaluate_play(&state, Some(&dictionary(&["BA", "CA"])));
    assert!(evaluation.can_play);
    assert_eq!(
        evaluation.score.breakdown,
        ScoreBreakdown {
            base_tile_points: 8.0,
            sticker_points: 20.0,
            base_tile_multi: 4.0,
            sticker_multi: 2.0,
            points: 28.0,
            multi: 6.0,
            total: 168.0,
        }
    );
    assert_eq!(evaluation.score.total_score, 168.0);
}

#[test]
fn seven_new_tiles_add_one_bonus_before_multiplying_and_commit_locks_consumes_refills() {
    let mut state = create_game(5);
    for col in 2..=8 {
        put(&mut state, 5, col, "A", false);
    }
    put(&mut state, 4, 5, "B", true);
    state.stickers[5][2] = Some(Sticker {
        kind: StickerType::Multi,
        value: 2.0,
        consumed: false,
    });
    state.bag = vec![tile("refill", "A")];
    state.discard = vec![tile("recycle", "A")];
    state.total_score = 3.0;
    state.placement_history = vec![history("board-5-2", 5, 2)];
    let dictionary = dictionary(&["AAAAAAA", "BA"]);
    let evaluation = evaluate_play(&state, Some(&dictionary));
    assert!(evaluation.can_play);
    assert_eq!(evaluation.score.total_score, (11.0 + 50.0) * (9.0 + 2.0));
    let before = state.clone();
    act(GameAction::Play, &mut state, Some(&dictionary));
    assert_eq!(state.total_score, 674.0);
    assert!(!state.board[5][2].can_take && !state.board[5][2].can_place);
    assert!(state.stickers[5][2].as_ref().unwrap().consumed);
    assert!(state.stickers[5][5].as_ref().unwrap().consumed);
    assert!(state.placement_history.is_empty());
    assert_eq!(
        state
            .rack
            .iter()
            .flatten()
            .map(|tile| tile.id.as_str())
            .collect::<Vec<_>>(),
        ["refill", "recycle"]
    );
    conserved(&before, &state);
    assert_eq!(
        evaluate_play(&state, Some(&dictionary)).score.total_score,
        0.0
    );
    reject(GameAction::Play, &mut state, Some(&dictionary));
    reject(
        GameAction::Discard {
            tile_id: "board-5-2".into(),
        },
        &mut state,
        None,
    );
}

#[test]
fn start_orthogonal_contact_single_letters_and_dictionary_readiness_gate_play() {
    let mut state = create_game(1);
    put(&mut state, 1, 1, "A", false);
    put(&mut state, 1, 2, "A", false);
    let dictionary = dictionary(&["AA"]);
    assert!(!evaluate_play(&state, Some(&dictionary)).can_play);
    state.stickers[5][5].as_mut().unwrap().consumed = true;
    put(&mut state, 2, 3, "A", true);
    assert!(!evaluate_play(&state, Some(&dictionary)).can_play);
    put(&mut state, 2, 2, "A", true);
    assert!(evaluate_play(&state, Some(&dictionary)).can_play);
    assert!(!evaluate_play(&state, None).can_play);
    let mut single = create_game(1);
    put(&mut single, 5, 5, "A", false);
    assert!(!evaluate_play(&single, Some(&["A".into()].into_iter().collect())).can_play);
}

#[test]
fn invalid_encounter_configurations_and_premature_lifecycle_commands_reject_atomically() {
    let mut state = create_game(50);
    for field in 0..3 {
        let mut invalid = vec![-1.0, 0.5, f64::INFINITY, f64::NAN, 9_007_199_254_740_992.0];
        if field != 1 {
            invalid.push(0.0);
        }
        if field == 0 {
            invalid.push(1.5);
        }
        for value in invalid {
            let mut config = EncounterConfig::default();
            match field {
                0 => config.plays = value,
                1 => config.redraws = value,
                _ => config.target_score = value,
            }
            reject(
                GameAction::NewEncounter {
                    config: Some(config),
                },
                &mut state,
                None,
            );
        }
    }
    for action in [
        GameAction::StartEncounter,
        GameAction::RetryEncounter,
        GameAction::ConcedeEncounter,
    ] {
        reject(action, &mut state, None);
    }
    reject(
        GameAction::RedrawSelected {
            tile_ids: vec!["absent".into()],
        },
        &mut state,
        None,
    );
    act(GameAction::NewEncounter { config: None }, &mut state, None);
    let dictionary = Dictionary::new();
    reject(GameAction::StartEncounter, &mut state, Some(&dictionary));
    reject(GameAction::RetryEncounter, &mut state, Some(&dictionary));
    reject(GameAction::ConcedeEncounter, &mut state, None);
    let mut complete = finish_encounter_draft(EncounterConfig::default(), 42);
    reject(GameAction::StartEncounter, &mut complete, None);
    act(GameAction::StartEncounter, &mut complete, Some(&dictionary));
    reject(GameAction::StartEncounter, &mut complete, Some(&dictionary));
    reject(GameAction::RetryEncounter, &mut complete, Some(&dictionary));
}

#[test]
fn missing_dictionary_waits_after_auto_blank_without_reseeding_on_rearrangement() {
    let mut state = create_game(60);
    act(GameAction::NewEncounter { config: None }, &mut state, None);
    let offered_id = state.draft.board[4][2].tile.as_ref().unwrap().id.clone();
    act(
        movement(&offered_id, draft(8.0, 8.0), None),
        &mut state,
        None,
    );
    assert_eq!(state.draft.pick_index, 1);
    let offers = state.draft.board[4].clone();
    let rng = state.rng;
    act(
        movement(&offered_id, draft(7.0, 2.0), None),
        &mut state,
        None,
    );
    assert_eq!(state.draft.board[4], offers);
    assert_eq!(state.rng, rng);
    for _ in 1..13 {
        act(pick(offered_column(&state)), &mut state, None);
    }
    assert!(state.draft.complete);
    assert_eq!(encounter(&state).status, EncounterStatus::Draft);
    assert_eq!(state.mode, Mode::Draft);
    assert_eq!(state.rack.iter().flatten().count(), 0);
    assert_eq!(state.draft.pick_index, 14);
    let recipe = get_drafted_tiles(&state);
    assert_eq!(recipe.iter().filter(|tile| tile.value == "*").count(), 1);
    let inventory = live_ids(&state);
    let recipe_ids: HashSet<_> = recipe.iter().map(|tile| tile.id.clone()).collect();
    assert_eq!(inventory.len(), 14);
    assert!(inventory.iter().all(|id| !recipe_ids.contains(id)));
    reject(pick(5), &mut state, None);
    reject(GameAction::StartEncounter, &mut state, None);
    let dictionary = Dictionary::new();
    act(
        movement(&recipe[0].id, draft(8.0, 8.0), None),
        &mut state,
        Some(&dictionary),
    );
    assert_eq!(encounter(&state).status, EncounterStatus::Draft);
    assert_eq!(state.rack.iter().flatten().count(), 0);
    assert_eq!(live_ids(&state), inventory);
    assert_eq!(
        get_drafted_tiles(&state)
            .iter()
            .map(|tile| tile.id.clone())
            .collect::<HashSet<_>>(),
        recipe_ids
    );
    act(GameAction::StartEncounter, &mut state, Some(&dictionary));
    assert_eq!(encounter(&state).status, EncounterStatus::Playing);
    assert_eq!(state.mode, Mode::Game);
    assert_eq!(state.rack.iter().flatten().count(), 7);
    assert_eq!(state.bag.len(), 7);
    assert_eq!(live_ids(&state), inventory);
    reject(GameAction::StartEncounter, &mut state, Some(&dictionary));
    reject(pick(5), &mut state, Some(&dictionary));
}

#[test]
fn thirteenth_choice_auto_picks_blank_and_direct_pointer_and_delayed_start_agree() {
    let dictionary = Dictionary::new();
    let mut state = create_game(61);
    act(
        GameAction::NewEncounter { config: None },
        &mut state,
        Some(&dictionary),
    );
    for _ in 0..12 {
        act(pick(offered_column(&state)), &mut state, Some(&dictionary));
    }
    assert_eq!(get_drafted_tiles(&state).len(), 12);
    assert!(state.bag.is_empty());
    assert_eq!(state.rack.iter().flatten().count(), 0);
    let column = offered_column(&state);
    let offered = state.draft.board[4][column].tile.clone().unwrap();
    let direct = GameAction::DraftPick {
        column: column as f64,
        to: Some(InputPosition { row: 8.0, col: 8.0 }),
    };
    let pointer = movement(&offered.id, draft(8.0, 8.0), None);
    let mut direct_state = state.clone();
    let mut pointer_state = state.clone();
    act(direct.clone(), &mut direct_state, Some(&dictionary));
    act(pointer.clone(), &mut pointer_state, Some(&dictionary));
    assert_eq!(direct_state, pointer_state);
    for result in [&mut direct_state, &mut pointer_state] {
        assert_eq!(encounter(result).status, EncounterStatus::Playing);
        assert_eq!(encounter(result).plays_remaining, 4.0);
        assert_eq!(encounter(result).redraws_remaining, 3.0);
        assert_eq!(result.mode, Mode::Game);
        assert!(result.draft.complete && result.draft.seeded);
        assert_eq!(result.draft.pick_index, 14);
        assert_eq!(result.draft.board[8][8].tile, Some(offered.clone()));
        assert_eq!(result.draft.board[8][7].tile.as_ref().unwrap().value, "*");
        let recipe = get_drafted_tiles(result);
        assert_eq!(recipe.len(), 14);
        assert_eq!(recipe.iter().filter(|tile| tile.value == "*").count(), 1);
        assert!(
            DRAFT_COLUMNS
                .into_iter()
                .all(|col| result.draft.board[4][col].tile.is_none())
        );
        assert_eq!(result.rack.iter().flatten().count(), 7);
        assert_eq!(result.bag.len(), 7);
        let inventory: Vec<_> = result
            .bag
            .iter()
            .chain(result.rack.iter().flatten())
            .collect();
        assert_eq!(
            inventory
                .iter()
                .map(|tile| &tile.id)
                .collect::<HashSet<_>>()
                .len(),
            14
        );
        assert_eq!(values(inventory.iter().copied()), values(&recipe));
        let recipe_ids: HashSet<_> = recipe.iter().map(|tile| &tile.id).collect();
        assert!(inventory.iter().all(|tile| !recipe_ids.contains(&tile.id)));
        reject(GameAction::StartEncounter, result, Some(&dictionary));
        reject(direct.clone(), result, Some(&dictionary));
        reject(pointer.clone(), result, Some(&dictionary));
    }
    act(pointer, &mut state, None);
    act(GameAction::StartEncounter, &mut state, Some(&dictionary));
    assert_eq!(state, direct_state);
}

#[test]
fn encounter_phases_cannot_bypass_budgets_with_sandbox_commands() {
    let mut draft_state = finish_encounter_draft(EncounterConfig::default(), 42);
    let mut playing_state = draft_state.clone();
    let dictionary = Dictionary::new();
    act(
        GameAction::StartEncounter,
        &mut playing_state,
        Some(&dictionary),
    );
    let mut actions = vec![
        draw_all(),
        GameAction::Discard {
            tile_id: playing_state.rack[0].as_ref().unwrap().id.clone(),
        },
        GameAction::Redraw,
        GameAction::ShuffleBag,
        GameAction::SetMode { mode: Mode::Game },
        GameAction::SetMode { mode: Mode::Draft },
        GameAction::DraftReroll,
        GameAction::ResetDraft,
    ];
    actions.extend(
        [
            ResetTarget::Game,
            ResetTarget::Board,
            ResetTarget::Rack,
            ResetTarget::Bag,
            ResetTarget::Score,
            ResetTarget::Stickers,
        ]
        .map(|target| GameAction::Reset { target }),
    );
    for state in [&mut draft_state, &mut playing_state] {
        for action in &actions {
            reject(action.clone(), state, Some(&dictionary));
        }
    }
    let offer = get_drafted_tiles(&draft_state)[0].id.clone();
    reject(movement(&offer, rack(0.0), None), &mut draft_state, None);
    reject(GameAction::ShuffleRack, &mut draft_state, None);
    reject(
        GameAction::RedrawSelected { tile_ids: vec![] },
        &mut draft_state,
        None,
    );
    reject(pick(2), &mut playing_state, None);
    reject(
        movement(
            &playing_state.rack[0].as_ref().unwrap().id,
            draft(7.0, 2.0),
            None,
        ),
        &mut playing_state,
        None,
    );
}

#[test]
fn only_valid_plays_spend_budget_movement_recall_shuffle_and_rejection_are_free() {
    let mut state = playing(config(2.0, 0.0, 10_000.0));
    let opening = state.clone();
    act(
        movement(
            &state.rack[0].as_ref().unwrap().id,
            board(5.0, 5.0),
            Some("A"),
        ),
        &mut state,
        None,
    );
    act(GameAction::Recall, &mut state, None);
    act(GameAction::ShuffleRack, &mut state, None);
    assert_eq!(encounter(&state).plays_remaining, 2.0);
    reject(
        movement(&state.rack[0].as_ref().unwrap().id, board(-1.0, 5.0), None),
        &mut state,
        None,
    );
    let dictionary = place_opening_word(&mut state);
    reject(GameAction::Play, &mut state, None);
    reject(GameAction::Play, &mut state, Some(&Dictionary::new()));
    let mut gap = state.clone();
    act(
        movement(
            &gap.board[5][6].tile.as_ref().unwrap().id,
            board(5.0, 7.0),
            None,
        ),
        &mut gap,
        None,
    );
    reject(GameAction::Play, &mut gap, Some(&dictionary));
    let score = evaluate_play(&state, Some(&dictionary)).score.total_score;
    act(GameAction::Play, &mut state, Some(&dictionary));
    assert_eq!(state.total_score, score);
    assert_eq!(encounter(&state).plays_remaining, 1.0);
    assert_eq!(encounter(&state).redraws_remaining, 0.0);
    assert_eq!(encounter(&state).status, EncounterStatus::Playing);
    assert!(!state.board[5][5].can_take);
    assert!(state.stickers[5][5].as_ref().unwrap().consumed);
    assert_eq!(state.rack.iter().flatten().count(), 7);
    assert!(state.placement_history.is_empty());
    conserved(&opening, &state);
    reject(GameAction::Play, &mut state, Some(&dictionary));
}

#[test]
fn reaching_target_wins_even_on_last_play_and_below_target_exhaustion_loses() {
    let mut won = playing(config(1.0, 0.0, 1.0));
    let dictionary = place_opening_word(&mut won);
    act(GameAction::Play, &mut won, Some(&dictionary));
    assert_eq!(encounter(&won).status, EncounterStatus::Won);
    assert_eq!(encounter(&won).plays_remaining, 0.0);
    let mut exact = playing(config(2.0, 0.0, won.total_score));
    let exact_dictionary = place_opening_word(&mut exact);
    act(GameAction::Play, &mut exact, Some(&exact_dictionary));
    assert_eq!(encounter(&exact).status, EncounterStatus::Won);
    assert_eq!(encounter(&exact).plays_remaining, 1.0);
    let mut lost = playing(config(1.0, 3.0, 10_000.0));
    let loss_dictionary = place_opening_word(&mut lost);
    act(GameAction::Play, &mut lost, Some(&loss_dictionary));
    assert_eq!(encounter(&lost).status, EncounterStatus::Lost);
    assert_eq!(encounter(&lost).plays_remaining, 0.0);
    assert_eq!(encounter(&lost).redraws_remaining, 3.0);
    for state in [&mut won, &mut lost] {
        let id = state.rack[0].as_ref().unwrap().id.clone();
        for action in [
            movement(&id, board(5.0, 7.0), None),
            GameAction::Recall,
            GameAction::ShuffleRack,
            GameAction::Play,
            GameAction::RedrawSelected { tile_ids: vec![id] },
            GameAction::Reset {
                target: ResetTarget::Score,
            },
            GameAction::ConcedeEncounter,
            GameAction::StartEncounter,
        ] {
            reject(action, state, Some(&dictionary));
        }
        assert!(!evaluate_play(state, Some(&dictionary)).can_play);
        reject(GameAction::RetryEncounter, state, None);
        act(GameAction::RetryEncounter, state, Some(&Dictionary::new()));
        assert_eq!(encounter(state).status, EncounterStatus::Playing);
    }
}

#[test]
fn concession_blocks_pending_play_and_sandbox_exit_cannot_resume_attempt() {
    let mut state = playing(EncounterConfig::default());
    let dictionary = place_opening_word(&mut state);
    assert!(evaluate_play(&state, Some(&dictionary)).can_play);
    act(GameAction::ConcedeEncounter, &mut state, None);
    assert_eq!(encounter(&state).status, EncounterStatus::Lost);
    assert_eq!(encounter(&state).plays_remaining, 4.0);
    assert!(!evaluate_play(&state, Some(&dictionary)).can_play);
    reject(GameAction::Play, &mut state, Some(&dictionary));
    let ended = state.clone();
    act(GameAction::EnterSandbox, &mut state, None);
    assert!(state.encounter.is_none());
    conserved(&ended, &state);
    assert!(evaluate_play(&state, Some(&dictionary)).can_play);
    let mut committed = state.clone();
    act(GameAction::Play, &mut committed, Some(&dictionary));
    assert!(committed.total_score > 0.0);
    reject(GameAction::RetryEncounter, &mut state, Some(&dictionary));
    reject(GameAction::StartEncounter, &mut state, Some(&dictionary));
    let mut active = playing(EncounterConfig::default());
    act(GameAction::EnterSandbox, &mut active, None);
    assert!(active.encounter.is_none());
    let mut draft_state = create_game(1);
    act(
        GameAction::NewEncounter { config: None },
        &mut draft_state,
        None,
    );
    act(GameAction::EnterSandbox, &mut draft_state, None);
    act(GameAction::DraftReroll, &mut draft_state, None);
    assert_eq!(draft_state.draft.pick_index, 0);
}

#[test]
fn retry_restores_recipe_with_fresh_inventory_and_new_encounter_abandons_all_zones() {
    let mut state = playing(config(3.0, 2.0, 10_000.0));
    let dictionary = place_opening_word(&mut state);
    act(GameAction::Play, &mut state, Some(&dictionary));
    act(
        GameAction::RedrawSelected {
            tile_ids: vec![state.rack[0].as_ref().unwrap().id.clone()],
        },
        &mut state,
        None,
    );
    act(
        movement(
            &state.rack[1].as_ref().unwrap().id,
            board(4.0, 5.0),
            Some("A"),
        ),
        &mut state,
        None,
    );
    let active = state.clone();
    act(GameAction::ConcedeEncounter, &mut state, None);
    let ended = state.clone();
    let previous_ids: HashSet<_> = live_ids(&ended).into_iter().collect();
    let recipe = get_drafted_tiles(&ended);
    act(
        GameAction::RetryEncounter,
        &mut state,
        Some(&Dictionary::new()),
    );
    assert_eq!(state.total_score, 0.0);
    assert_eq!(encounter(&state).plays_remaining, 3.0);
    assert_eq!(encounter(&state).redraws_remaining, 2.0);
    assert!(state.board.iter().flatten().all(|cell| cell.tile.is_none()));
    assert!(state.discard.is_empty());
    assert!(state.placement_history.is_empty());
    assert!(
        state
            .stickers
            .iter()
            .flatten()
            .flatten()
            .all(|sticker| !sticker.consumed)
    );
    assert_eq!(
        values(state.bag.iter().chain(state.rack.iter().flatten())),
        values(&recipe)
    );
    assert_eq!(get_drafted_tiles(&state), recipe);
    assert_eq!(live_ids(&state).len(), 14);
    assert!(live_ids(&state).iter().all(|id| !previous_ids.contains(id)));
    assert_ne!(state.rng, ended.rng);
    for mut source in [active, ended, state] {
        act(GameAction::NewEncounter { config: None }, &mut source, None);
        assert_eq!(encounter(&source).status, EncounterStatus::Draft);
        assert_eq!(source.total_score, 0.0);
        assert!(live_ids(&source).is_empty());
        assert!(get_drafted_tiles(&source).is_empty());
        assert!(source.placement_history.is_empty());
        assert!(
            source
                .stickers
                .iter()
                .flatten()
                .flatten()
                .all(|sticker| !sticker.consumed)
        );
        assert_eq!(source.draft.pick_index, 0);
    }
}

#[test]
fn selected_redraw_spends_once_preserves_pending_tiles_and_rejects_invalid_ids() {
    let mut state = playing(config(4.0, 1.0, 100.0));
    let pending_id = state.rack[0].as_ref().unwrap().id.clone();
    act(
        movement(&pending_id, board(5.0, 5.0), Some("A")),
        &mut state,
        None,
    );
    let selected = vec![
        state.rack[2].as_ref().unwrap().id.clone(),
        state.rack[5].as_ref().unwrap().id.clone(),
    ];
    for tile_ids in [
        vec![],
        vec![selected[0].clone(), selected[0].clone()],
        vec![selected[0].clone(), "stale".into()],
        vec![selected[0].clone(), pending_id],
        vec![state.bag[0].id.clone()],
    ] {
        reject(GameAction::RedrawSelected { tile_ids }, &mut state, None);
    }
    let before = state.clone();
    act(
        GameAction::RedrawSelected {
            tile_ids: selected.clone(),
        },
        &mut state,
        None,
    );
    assert_eq!(state.rack[2].as_ref().unwrap().id, before.bag[0].id);
    assert_eq!(state.rack[5].as_ref().unwrap().id, before.bag[1].id);
    for index in [0, 1, 3, 4, 6] {
        assert_eq!(state.rack[index], before.rack[index]);
    }
    assert_eq!(state.board, before.board);
    assert_eq!(state.placement_history, before.placement_history);
    assert_eq!(state.total_score, before.total_score);
    assert_eq!(encounter(&state).plays_remaining, 4.0);
    assert_eq!(encounter(&state).redraws_remaining, 0.0);
    assert_eq!(
        state
            .discard
            .iter()
            .map(|tile| tile.id.clone())
            .collect::<HashSet<_>>(),
        selected.into_iter().collect()
    );
    conserved(&before, &state);
    reject(
        GameAction::RedrawSelected {
            tile_ids: vec![state.rack[2].as_ref().unwrap().id.clone()],
        },
        &mut state,
        None,
    );
}

#[test]
fn exhausted_bag_recycles_returned_blank_without_changing_identity_or_inventory() {
    let mut state = playing(config(4.0, 1.0, 100.0));
    let all_tiles: Vec<_> = state
        .bag
        .iter()
        .chain(state.rack.iter().flatten())
        .cloned()
        .collect();
    let blank = all_tiles
        .iter()
        .find(|tile| tile.value == "*")
        .unwrap()
        .clone();
    state.bag.clear();
    state.rack = vec![Some(blank.clone()), None, None, None, None, None, None];
    for (index, physical) in all_tiles
        .into_iter()
        .filter(|tile| tile.id != blank.id)
        .enumerate()
    {
        state.board[index / 11][index % 11].tile = Some(physical);
    }
    act(
        movement(&blank.id, board(5.0, 5.0), Some("Z")),
        &mut state,
        None,
    );
    act(GameAction::Recall, &mut state, None);
    let before = state.clone();
    act(
        GameAction::RedrawSelected {
            tile_ids: vec![blank.id.clone()],
        },
        &mut state,
        None,
    );
    assert_eq!(state.rack[0], Some(tile(&blank.id, "*")));
    assert!(state.rack[1..].iter().all(Option::is_none));
    assert_eq!(encounter(&state).redraws_remaining, 0.0);
    conserved(&before, &state);
}

#[test]
fn selected_redraw_replay_selection_order_and_cosmetic_shuffles_preserve_mechanics() {
    let run = || {
        let mut state = playing(EncounterConfig::default());
        act(
            GameAction::RedrawSelected {
                tile_ids: vec![
                    state.rack[6].as_ref().unwrap().id.clone(),
                    state.rack[1].as_ref().unwrap().id.clone(),
                ],
            },
            &mut state,
            None,
        );
        act(GameAction::ConcedeEncounter, &mut state, None);
        act(
            GameAction::RetryEncounter,
            &mut state,
            Some(&Dictionary::new()),
        );
        state
    };
    assert_eq!(run(), run());
    let mut plain = playing(EncounterConfig::default());
    let mut shuffled = plain.clone();
    act(GameAction::ShuffleRack, &mut shuffled, None);
    act(GameAction::ShuffleRack, &mut shuffled, None);
    for _ in 0..3 {
        let selection: Vec<_> = rack_ids(&plain).into_iter().take(4).collect();
        let reversed_ids: Vec<_> = selection.iter().rev().cloned().collect();
        let mut reversed = plain.clone();
        act(
            GameAction::RedrawSelected {
                tile_ids: reversed_ids.clone(),
            },
            &mut reversed,
            None,
        );
        act(
            GameAction::RedrawSelected {
                tile_ids: selection,
            },
            &mut plain,
            None,
        );
        assert_eq!(reversed, plain);
        act(
            GameAction::RedrawSelected {
                tile_ids: reversed_ids,
            },
            &mut shuffled,
            None,
        );
        assert_eq!(shuffled.rng, plain.rng);
        assert_eq!(shuffled.bag, plain.bag);
        assert_eq!(shuffled.discard, plain.discard);
        assert_eq!(rack_ids(&shuffled), rack_ids(&plain));
    }
    for state in [&mut plain, &mut shuffled] {
        act(GameAction::ConcedeEncounter, state, None);
        act(GameAction::RetryEncounter, state, Some(&Dictionary::new()));
    }
    assert_eq!(shuffled.rack, plain.rack);
    assert_eq!(shuffled.bag, plain.bag);
    assert_eq!(shuffled.rng, plain.rng);
}
