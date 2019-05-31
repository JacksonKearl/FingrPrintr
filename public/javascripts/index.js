const runFingerprint = () => {
    $('loading').innerText = "Loading fingerprint..."
    setTimeout(() =>
        hashFingerprint(hashedFingerprint => {
            $('loading').innerText = ""
            window.location.href = '/room/' + hash(hashedFingerprint)
        }), 15)
}