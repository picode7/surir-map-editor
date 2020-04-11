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

// On Hash Changed
// window.addEventListener("hashchange", funcRef, false);

// On Before Leave
// // https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event
// window.addEventListener('beforeunload', (event: BeforeUnloadEvent) => {
//     event.preventDefault()
//     event.returnValue = ''
// })