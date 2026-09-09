pub mod engine;
pub mod model;
pub mod rules;

pub type Dictionary = std::collections::HashSet<String>;

#[cfg(target_arch = "wasm32")]
mod wasm;
