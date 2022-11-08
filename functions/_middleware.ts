export const usernameCookie = "name"
export const fingerprintCookie = "fingerprint"

export const cyrb128 = (str: string) => {
    let h1 = 1779033703, h2 = 3144134277,
        h3 = 1013904242, h4 = 2773480762
    for (let i = 0, k; i < str.length; i++) {
        k = str.charCodeAt(i)
        h1 = h2 ^ Math.imul(h1 ^ k, 597399067)
        h2 = h3 ^ Math.imul(h2 ^ k, 2869860233)
        h3 = h4 ^ Math.imul(h3 ^ k, 951274213)
        h4 = h1 ^ Math.imul(h4 ^ k, 2716044179)
    }
    h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067)
    h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233)
    h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213)
    h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179)
    const arr = [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0]

    return (
        ('00000000' + (arr[0] >>> 0).toString(16)).slice(-8) +
        ('00000000' + (arr[1] >>> 0).toString(16)).slice(-8) +
        ('00000000' + (arr[2] >>> 0).toString(16)).slice(-8) +
        ('00000000' + (arr[3] >>> 0).toString(16)).slice(-8))
}

export type Chat = { author: string, text: string, date: number }[]
export type Env = { CHATS: KVNamespace }
export type Data = { name: string, fingerprint: string, headers: [string, string][] }

const rewriter = (name: string, fingerprint: string, signedIn: boolean) => new HTMLRewriter()
    .on('input', {
        element(e) {
            if (e.hasAttribute('value')) {
                const old = e.getAttribute('value')
                if (old === '%USERNAME%') {
                    e.setAttribute('value', name)
                }
                if (old === '%FINGERPRINT%') {
                    e.setAttribute('value', fingerprint)
                }
            }
        }
    })
    .onDocument({
        text(t) {
            if (t.text.includes('%USERNAME%')) {
                t.replace(t.text.replace(/\%USERNAME\%/g, name))
            }
        }
    })
    .on('body', {
        element(element) {
            element.append('<div class="gap"></div>', { html: true })
            element.append('<footer>', { html: true })
            if (signedIn) {
                element.append('<a href="/rooms">All Rooms</a>', { html: true })
                element.append(' | ', { html: true })
            }
            element.append('<a href="https://github.com/JacksonKearl/fingrprintr">View Source</a>', { html: true })
            element.append(' | ', { html: true })
            element.append('<a href="/legal">Legal</a>', { html: true })
            element.append('</footer>', { html: true })
        },
    })
    .on('head', {
        element(element) {
            element.append('<meta charset="UTF-8">', { html: true })
            element.append('<meta http-equiv="X-UA-Compatible" content="IE=edge">', { html: true })
            element.append('<meta name="viewport" content="width=device-width, initial-scale=1.0">', { html: true })
            element.append('<title>FingrPrintr</title>', { html: true })
            element.append('<link rel="stylesheet" type="text/css" href="/index.css" />', { html: true })
        },
    })

const middleware: PagesFunction<Env, any, Data> = async ({ request, next, data }) => {
    const cookie = Object.fromEntries((request.headers.get("cookie") ?? '').split('; ').map(e => e.split('=')))
    data.name = cookie[usernameCookie]
    data.fingerprint = cookie[fingerprintCookie]
    data.headers = []

    const response = next()
    const rewritten = rewriter(data.name ?? '', data.fingerprint ?? '', cookie[fingerprintCookie]).transform(await response)
    const copy = new Response(rewritten.body, rewritten)
    data.headers.forEach(([k, v]) => copy.headers.append(k, v))
    return copy
}

export const onRequest = [middleware]