/**
 * Removes hash without saving to history
 */
function urlRemoveHash() {
    history.replaceState(null, null, ' ');
}

/**
 * Returns url hash without # in the beginning
 */
function urlGetHash() {
    return window.location.hash.substring(1)
}

// window.addEventListener("hashchange", funcRef, false);