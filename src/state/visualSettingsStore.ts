// A minimal global store for visual settings using the
// useSyncExternalStore-compatible pattern.

type VisualSettingsState = {
  showTileIds: boolean;
};

type Listener = () => void;

class VisualSettingsStore {
  private state: VisualSettingsState = {
    showTileIds: false,
  };

  private listeners: Set<Listener> = new Set();

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): VisualSettingsState => {
    return this.state;
  };

  setShowTileIds = (value: boolean) => {
    if (this.state.showTileIds === value) return;
    this.state = { ...this.state, showTileIds: value };
    this.emit();
  };

  private emit() {
    this.listeners.forEach((l) => l());
  }
}

export const visualSettingsStore = new VisualSettingsStore();


