function urlRemoveHash() {
    history.replaceState(null, null, ' ');
}

function urlGetHash() {
    return window.location.hash.substring(1)
}
