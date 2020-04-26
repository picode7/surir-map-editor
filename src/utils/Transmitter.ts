class Transmitter<T> {
  private _signalReceiverList = new Map<T, Set<() => void>>()

  send(signal: T) {
    const receivers = this._signalReceiverList.get(signal)
    if (typeof receivers === 'undefined') return

    for (const listener of receivers) {
      listener()
    }
  }

  sub(signals: T | T[], receiver: () => void) {
    signals = Array.isArray(signals) ? signals : [signals]

    for (const signal of signals) {
      let receiverList = this._signalReceiverList.get(signal)
      if (typeof receiverList === 'undefined') {
        receiverList = new Set()
        this._signalReceiverList.set(signal, receiverList)
      }
      receiverList.add(receiver)
    }
  }

  unsub(signals: T | T[], receiver: () => void) {
    signals = Array.isArray(signals) ? signals : [signals]

    for (const signal of signals) {
      const receiverList = this._signalReceiverList.get(signal)
      if (typeof receiverList === 'undefined') return

      receiverList.delete(receiver)
      if (receiverList.size == 0) this._signalReceiverList.delete(signal)
    }
  }
}
