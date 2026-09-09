use serde::Deserialize;
use serde_json::{Value, json};
use skrabble_engine::{Dictionary, engine, model::*, rules};
use std::io::{self, BufRead, Write};

#[derive(Deserialize)]
#[serde(tag = "op", rename_all = "kebab-case")]
enum Request {
    Create {
        seed: u32,
    },
    Apply {
        state: GameState,
        action: GameAction,
        dictionary: Option<Vec<String>>,
    },
    Evaluate {
        state: GameState,
        dictionary: Option<Vec<String>>,
    },
    Trace {
        seed: u32,
        actions: Vec<GameAction>,
        dictionary: Option<Vec<String>>,
    },
}

fn dictionary(words: Option<Vec<String>>) -> Option<Dictionary> {
    words.map(|words| words.into_iter().collect())
}

fn action_result(
    state: &mut GameState,
    action: &GameAction,
    dictionary: Option<&Dictionary>,
) -> Value {
    match engine::apply_action(state, action, dictionary) {
        Ok(effect) => {
            let mut result = serde_json::to_value(effect).expect("finite action metadata");
            let object = result.as_object_mut().expect("action metadata object");
            object.insert("ok".into(), true.into());
            object.insert(
                "state".into(),
                serde_json::to_value(state).expect("finite game state"),
            );
            result
        }
        Err(reason) => json!({ "ok": false, "state": state, "reason": reason }),
    }
}

fn execute(request: Request) -> Value {
    match request {
        Request::Create { seed } => json!(engine::create_game(seed)),
        Request::Apply {
            mut state,
            action,
            dictionary: words,
        } => action_result(&mut state, &action, dictionary(words).as_ref()),
        Request::Evaluate {
            state,
            dictionary: words,
        } => {
            json!(rules::evaluate_play(&state, dictionary(words).as_ref()))
        }
        Request::Trace {
            seed,
            actions,
            dictionary: words,
        } => {
            let dictionary = dictionary(words);
            let mut state = engine::create_game(seed);
            let initial = state.clone();
            let steps: Vec<Value> = actions.iter().map(|action| {
                let result = action_result(&mut state, action, dictionary.as_ref());
                json!({ "result": result, "evaluation": rules::evaluate_play(&state, dictionary.as_ref()) })
            }).collect();
            json!({ "initial": initial, "steps": steps })
        }
    }
}

fn main() -> io::Result<()> {
    if std::env::args().any(|argument| argument == "--help") {
        println!(
            "Read one JSON request per line; write one JSON result per line.\nOperations: create {{seed}}, apply {{state,action,dictionary}}, evaluate {{state,dictionary}}, trace {{seed,actions,dictionary}}.\nDictionary is an array of uppercase words or null. Use the Rust library directly for allocation-sensitive simulations."
        );
        return Ok(());
    }
    let stdin = io::stdin();
    let mut stdout = io::BufWriter::new(io::stdout().lock());
    for line in stdin.lock().lines() {
        let line = line?;
        if line.trim().is_empty() {
            continue;
        }
        let result = match serde_json::from_str::<Request>(&line) {
            Ok(request) => execute(request),
            Err(error) => json!({ "error": error.to_string() }),
        };
        serde_json::to_writer(&mut stdout, &result)?;
        writeln!(&mut stdout)?;
        stdout.flush()?;
    }
    Ok(())
}
