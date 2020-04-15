class UndoManager {
  // ui update for buttons
  // onAction eventlistener? actions in undo, actions in redo, safe state?

  // best practices:
  // check if sth changed before registering action
  // objects should be used as a copy, think about how deleting / recreating them

  public onAction = new EventHandler<ReturnType<UndoManager['getState']>>()

  private _actions: { undo: () => any; redo: () => any }[] = []
  private _latestActionIndex = -1 // the current action state
  private _savedIndex = -1

  public add(action: UndoManager['_actions'][number]) {
    // Remove potential redo actions
    this._actions.splice(this._latestActionIndex + 1)

    this._actions.push(action)
    this._latestActionIndex = this._actions.length - 1
    if (this._savedIndex >= this._latestActionIndex) {
      this._savedIndex = -1
    }

    this._onAction('add')
  }

  public undo() {
    // Undo current action
    this._actions[this._latestActionIndex].undo()

    // Move index to previous action
    this._latestActionIndex--

    this._onAction('undo')
  }

  public redo() {
    // Redo following action
    this._actions[this._latestActionIndex + 1].redo()

    // Move index to following action
    this._latestActionIndex++

    this._onAction('redo')
  }

  public clear() {
    this._actions = []
    this._latestActionIndex = -1
    this._savedIndex = -1
    this._onAction('clear')
  }

  public save() {
    this._savedIndex = this._latestActionIndex
  }

  public getState() {
    return {
      canUndo: this._latestActionIndex >= 0,
      canRedo: this._latestActionIndex < this._actions.length - 1,
      saved: this._savedIndex == this._latestActionIndex,
    }
  }

  private _onAction(reason: 'add' | 'undo' | 'redo' | 'safe' | 'clear') {
    this.onAction.fireEvent(this.getState())
  }
}
