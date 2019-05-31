const runFingerprint = () => {
    $('loading').innerText = "Loading fingerprint..."
    setTimeout(() =>
        hashFingerprint(hashedFingerprint => {
            $('loading').innerText = "Enter Your Chatroom"
            window.location.href = '/room/' + hash(hashedFingerprint)
        }), 30)
}