function copyObject<T extends Object>(object: T) {
    return Object.assign({}, object)
}