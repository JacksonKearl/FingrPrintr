const runFingerprint = () => {
    $('loading').innerText = "Loading fingerprint..."
    setTimeout(() =>
        hashFingerprint(hashedFingerprint => {
            window.location.href = '/room/' + hash(hashedFingerprint)
        }), 15)
}