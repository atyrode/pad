use crate::{Dictionary, engine, model::*, rules};
use serde::{Serialize, de::DeserializeOwned};
use wasm_bindgen::prelude::*;

fn decode<T: DeserializeOwned>(value: JsValue) -> Result<T, JsValue> {
    serde_wasm_bindgen::from_value(value).map_err(|error| JsValue::from_str(&error.to_string()))
}

fn encode<T: Serialize>(value: &T) -> Result<JsValue, JsValue> {
    value
        .serialize(&serde_wasm_bindgen::Serializer::json_compatible())
        .map_err(|error| JsValue::from_str(&error.to_string()))
}

/// A lexicon is transferred once, rather than once per action or evaluation.
#[wasm_bindgen]
pub struct Lexicon {
    words: Option<Dictionary>,
}

#[wasm_bindgen]
impl Lexicon {
    #[wasm_bindgen(constructor)]
    pub fn new(words: JsValue) -> Result<Lexicon, JsValue> {
        let words: Option<Vec<String>> = decode(words)?;
        Ok(Self {
            words: words.map(|values| values.into_iter().collect()),
        })
    }

    #[wasm_bindgen(js_name = fromText)]
    pub fn from_text(text: &str) -> Lexicon {
        Self {
            words: Some(
                text.lines()
                    .map(str::trim)
                    .filter(|word| !word.is_empty())
                    .map(str::to_uppercase)
                    .collect(),
            ),
        }
    }

    pub fn has(&self, word: &str) -> bool {
        self.words
            .as_ref()
            .is_some_and(|words| words.contains(word))
    }

    #[wasm_bindgen(getter)]
    pub fn size(&self) -> usize {
        self.words.as_ref().map_or(0, Dictionary::len)
    }
}

#[wasm_bindgen(js_name = createGame)]
pub fn create_game(seed: u32) -> Result<JsValue, JsValue> {
    encode(&engine::create_game(seed))
}

#[derive(Serialize)]
struct ActionResponse<'a> {
    ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    state: Option<&'a GameState>,
    #[serde(skip_serializing_if = "Option::is_none")]
    reason: Option<String>,
    #[serde(flatten)]
    effect: ActionEffect,
}

#[wasm_bindgen(js_name = applyAction)]
pub fn apply_action(
    state: JsValue,
    action: JsValue,
    lexicon: &Lexicon,
) -> Result<JsValue, JsValue> {
    let mut state: GameState = decode(state)?;
    let action: GameAction = decode(action)?;
    match engine::apply_action(&mut state, &action, lexicon.words.as_ref()) {
        Ok(effect) => encode(&ActionResponse {
            ok: true,
            state: Some(&state),
            reason: None,
            effect,
        }),
        Err(reason) => encode(&ActionResponse {
            ok: false,
            state: None,
            reason: Some(reason),
            effect: ActionEffect::default(),
        }),
    }
}

#[wasm_bindgen(js_name = evaluatePlay)]
pub fn evaluate_play(state: JsValue, lexicon: &Lexicon) -> Result<JsValue, JsValue> {
    encode(&rules::evaluate_play(
        &decode(state)?,
        lexicon.words.as_ref(),
    ))
}

#[wasm_bindgen(js_name = getDraftedTiles)]
pub fn get_drafted_tiles(state: JsValue) -> Result<JsValue, JsValue> {
    encode(&engine::get_drafted_tiles(&decode(state)?))
}

#[wasm_bindgen(js_name = isDraftPlacement)]
pub fn is_draft_placement(position: JsValue) -> Result<bool, JsValue> {
    Ok(rules::is_draft_placement(decode(position)?))
}

#[wasm_bindgen(js_name = areUnlockedTilesInSingleLine)]
pub fn are_unlocked_tiles_in_single_line(board: JsValue) -> Result<bool, JsValue> {
    Ok(rules::are_unlocked_tiles_in_single_line(&decode(board)?))
}
