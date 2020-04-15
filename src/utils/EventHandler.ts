class EventHandler<D> {

    private _eventListeners: ((data: D) => void)[] = []

    public listen(listener: EventHandler<D>['_eventListeners'][number]) {
        this._eventListeners.push(listener)
    }

    public fireEvent(data: D) {
        for (const listener of this._eventListeners) {
            listener(data)
        }
    }

}