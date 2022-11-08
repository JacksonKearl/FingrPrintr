const usernameCookie = "name"
const fingerprintCookie = "fingerprint"

const cyrb128 = (str: string) => {
    let h1 = 1779033703, h2 = 3144134277,
        h3 = 1013904242, h4 = 2773480762
    for (let i = 0, k; i < str.length; i++) {
        k = str.charCodeAt(i);
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

type Chat = { author: string, text: string }[]
type Env = { CHATS: KVNamespace }
type Data = { name: string | undefined, fingerprint: string | undefined, headers: [string, string][] }

const rewriter = (name: string, fingerprint: string) => new HTMLRewriter()
    .on('input', {
        element(e) {
            if (e.hasAttribute('value')) {
                const old = e.getAttribute('value');
                if (old === '%USERNAME%') {
                    e.setAttribute('value', name);
                }
                if (old === '%FINGERPRINT%') {
                    e.setAttribute('value', fingerprint);
                }
            }
        }
    })
    .onDocument({
        text(t) {
            if (t.text.includes('%USERNAME%')) {
                t.replace(t.text.replace(/\%USERNAME\%/g, name));
            }
        }
    })

const indexMiddleware: PagesFunction<Env, any, Data> = async ({ request, next, env, data }) => {
    if (data.name && data.fingerprint) {
        const url = new URL(request.url)
        url.pathname = 'room/' + cyrb128(data.fingerprint)
        return Response.redirect(url.toString())
    }

    data.fingerprint ??= cyrb128([
        request.headers.get('accept'),
        request.headers.get('accept-encoding'),
        request.headers.get('user-agent'),
    ].join(';'))

    if (!data.name) {
        // From Kato Richardson via https://jsfiddle.net/katowulf/3gtDf/
        function randomEl(list: string[]) {
            var i = Math.floor(Math.random() * list.length);
            return list[i];
        }

        var adjectives = ["adamant", "adroit", "amatory", "animistic", "antic", "arcadian", "baleful", "bellicose", "bilious", "boorish", "calamitous", "caustic", "cerulean", "comely", "concomitant", "contumacious", "corpulent", "crapulous", "defamatory", "didactic", "dilatory", "dowdy", "efficacious", "effulgent", "egregious", "endemic", "equanimous", "execrable", "fastidious", "feckless", "fecund", "friable", "fulsome", "garrulous", "guileless", "gustatory", "heuristic", "histrionic", "hubristic", "incendiary", "insidious", "insolent", "intransigent", "inveterate", "invidious", "irksome", "jejune", "jocular", "judicious", "lachrymose", "limpid", "loquacious", "luminous", "mannered", "mendacious", "meretricious", "minatory", "mordant", "munificent", "nefarious", "noxious", "obtuse", "parsimonious", "pendulous", "pernicious", "pervasive", "petulant", "platitudinous", "precipitate", "propitious", "puckish", "querulous", "quiescent", "rebarbative", "recalcitant", "redolent", "rhadamanthine", "risible", "ruminative", "sagacious", "salubrious", "sartorial", "sclerotic", "serpentine", "spasmodic", "strident", "taciturn", "tenacious", "tremulous", "trenchant", "turbulent", "turgid", "ubiquitous", "uxorious", "verdant", "voluble", "voracious", "wheedling", "withering", "zealous"];
        var nouns = ["ninja", "chair", "pancake", "statue", "unicorn", "rainbows", "laser", "senor", "bunny", "captain", "nibblet", "cupcake", "carrot", "gnome", "glitter", "potato", "salad", "toejam", "curtain", "beet", "toilet", "exorcism", "stick figure", "mermaid", "sea barnacle", "dragon", "jellybean", "snake", "doll", "bushe", "cookie", "apple", "ice cream", "ukulele", "kazoo", "banjo", "opera singer", "circus", "trampoline", "carousel", "carnival", "locomotive", "hot air balloon", "praying mantis", "animator", "artisan", "artist", "colorist", "inker", "coppersmith", "director", "designer", "stylist", "make-up artist", "model", "musician", "producer", "scenographer", "set decorator", "silversmith", "teacher", "auto mechanic", "beader", "foreman", "maintenance engineer", "mechanic", "miller", "moldmaker", "panel beater", "patternmaker", "plant operator", "plumber", "sawfiler", "shop foreman", "soaper", "stationary engineer", "wheelwright", "woodworker"];
        // end Kato Richardson's contribution

        data.name = (randomEl(adjectives) + ' ' + randomEl(nouns))
        data.headers.push(["Set-Cookie", `${usernameCookie}=${data.name}; path=/`])
    }

    return env.ASSETS.fetch(request.url)
}

const chatMiddleware: PagesFunction<Env, any, Data> = async ({ request, env, next, data }) => {
    if (request.method === 'POST') {
        const form = await request.formData()
        const fingerprint = form.get('fingerprint') as string
        const username = form.get('username') as string
        const message = form.get('message') as string
        const roomId = cyrb128(fingerprint)

        if (message.length < 1000) {
            const chats = (await env.CHATS.get<Chat>('all_chats_' + roomId, "json")) ?? []
            chats.push({ author: username, text: message })
            if (chats.length > 100) { chats.shift() }
            // not good, potential for race conditions. but Durable Objects are expensive.
            await env.CHATS.put('all_chats_' + roomId, JSON.stringify(chats))
        }

        const url = new URL(request.url)
        url.pathname = 'room/' + roomId
        return Response.redirect(url.toString())
    }

    return next()
}

const roomMiddleware: PagesFunction<Env, any, Data> = async ({ request, env, data }) => {
    if (request.method === 'POST') {
        const form = await request.formData()
        const fingerprint = form.get('fingerprint') as string
        const username = form.get('username') as string

        const room = request.url + '/' + cyrb128(fingerprint)
        const response = Response.redirect(room)
        data.headers.push(["Set-Cookie", `${usernameCookie}=${username}; path=/`])
        data.headers.push(["Set-Cookie", `${fingerprintCookie}=${fingerprint}; path=/`])
        return response
    }

    const url = new URL(request.url)
    if (!data.name || !data.fingerprint) {
        url.pathname = '/'
        return Response.redirect(url.toString())
    }

    const parsed = /room\/([a-f0-9]*)/.exec(url.pathname)
    const ourRoom = cyrb128(data.fingerprint)
    if (parsed) {
        const roomId = parsed[1]
        const isOurRoom = roomId === ourRoom

        const rewriter = new HTMLRewriter().on('div#chats', {
            async element(element) {
                try {
                    const chats = (await env.CHATS.get<Chat>('all_chats_' + roomId, "json")) ?? []
                    if (isOurRoom) {
                        const welcomeText = 'Welcome ' + data.name + '!'
                        if (!chats.some(c => c.text === welcomeText)) {
                            chats.push({ author: 'root', text: welcomeText })

                            // not good, potential for race conditions. but Durable Objects are expensive.
                            env.CHATS.put('all_chats_' + roomId, JSON.stringify(chats))
                        }
                    }
                    if (chats.length) {
                        for (const chat of chats.reverse()) {
                            element.append('<div class="chat">', { html: true })
                            element.append('<span class="author">', { html: true })
                            element.append(chat.author, { html: false })
                            element.append('</span>', { html: true })
                            element.append(': ', { html: false })
                            element.append('<span class="message">', { html: true })
                            element.append(chat.text, { html: false })
                            element.append('</span>', { html: true })
                            element.append('</div>', { html: true })
                        }
                    } else {
                        element.append('<div class="chat">', { html: true })
                        element.append('Nothing here yet!')
                        element.append('</div>', { html: true })
                    }
                } catch (e) {
                    element.setInnerContent('error loading chats: ' + (e as any).message)
                }
            },
        })
        url.pathname = isOurRoom ? 'ourRoom' : 'otherRoom'

        return rewriter.transform(await env.ASSETS.fetch(url.toString()))
    } else {
        // redirect to our room
        const room = request.url + '/' + cyrb128(data.fingerprint)

        const response = Response.redirect(room)
        return response
    }
}

const listMiddleware: PagesFunction<Env, any, Data> = async ({ request, env, data }) => {
    let list = await env.CHATS.get<{ update: number, data: { name: string, authorCount: number }[] }>('chat_list', "json")
    if (!list) {
        const { keys } = await env.CHATS.list({ prefix: 'all_chats_' })
        list = {
            update: Date.now(),
            data:
                (await Promise.all(keys.map(key =>
                    env.CHATS.get<Chat>(key.name, "json")
                        .then(chat => {
                            if (!chat) return undefined
                            const authorSet = new Set()
                            chat.forEach(message => authorSet.add(message.author))
                            return ({ name: key.name, authorCount: authorSet.size });
                        })
                        .catch(v => undefined)
                ))).filter((x => x) as (x: any) => x is { name: string, authorCount: number })
        }
        list.data.sort((a, b) => b.authorCount - a.authorCount)

        env.CHATS.put('chat_list', JSON.stringify(list), { expirationTtl: 600 })
    }

    const rewriter = new HTMLRewriter()
        .on('span#lastUpdate', {
            element(element) {
                element.setInnerContent('Last updated: ' + Math.round((Date.now() - list!.update) / 1000) + ' seconds ago')
            },
        })
        .on('div#list', {
            element(element) {
                for (const key of list!.data) {
                    const roomName = key.name.slice('all_chats_'.length)
                    element.append(`<div class="chat"><a href="/room/${roomName}">`, { html: true })
                    element.append(roomName + ' (' + key.authorCount + ')', { html: false })
                    element.append('</a></div>', { html: true })
                }
            },
        })

    return rewriter.transform(await env.ASSETS.fetch(request.url))
}

const middleware: PagesFunction<Env, any, Data> = async (ctx) => {
    try {


        const { request, next, env, data } = ctx

        const url = new URL(request.url)

        const cookie = Object.fromEntries((request.headers.get("cookie") ?? '').split('; ').map(e => e.split('=')))
        data.name = cookie[usernameCookie]
        data.fingerprint = cookie[fingerprintCookie]

        data.headers = []

        let response: Response | Promise<Response>

        if (url.pathname === '/') {
            response = indexMiddleware(ctx)
        } else if (url.pathname.startsWith('/room')) {
            response = roomMiddleware(ctx)
        } else if (url.pathname.startsWith('/chat')) {
            response = chatMiddleware(ctx)
        } else if (url.pathname.startsWith('/list')) {
            response = listMiddleware(ctx)
        } else {
            return next()
        }

        const rewritten = rewriter(data.name ?? '', data.fingerprint ?? '').transform(await response)
        data.headers.forEach(([k, v]) => rewritten.headers.append(k, v))
        return rewritten
    } catch (e) {
        return new Response((e as any).message, { status: 500 })
    }
};

export const onRequest = [middleware]