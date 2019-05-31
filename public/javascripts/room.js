let codename;

doOnLoad(() => {
    if (!localStorage.getItem('code-name')) {
        localStorage.setItem('code-name', randomName())
    }
    codename = localStorage.getItem('code-name')
    $('codename').innerText = codename
})

const signGuestbook = () => {
    hashFingerprint(hash => {
        var xhr = new XMLHttpRequest();
        xhr.open("POST", window.location.href + '/guestbook', true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify({
            codename,
            fingerprint: hash
        }));

        xhr.onreadystatechange = () => {
            if (xhr.readyState == XMLHttpRequest.DONE) {
                if (xhr.status === 200) {
                    location.reload()
                    return;
                }
                alert(xhr.responseText);
            }
        }
    })
}

const postChat = () => {
    hashFingerprint(hash => {
        var xhr = new XMLHttpRequest();
        xhr.open("POST", window.location.href + '/chatroom', true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify({
            codename,
            // @ts-ignore
            post: (document.getElementById('chatbox')).value,
            fingerprint: hash
        }));

        xhr.onreadystatechange = () => {
            if (xhr.readyState == XMLHttpRequest.DONE) {
                if (xhr.status === 200) {
                    location.reload()
                    return;
                }
                alert(xhr.responseText);
            }
        }
    })
}