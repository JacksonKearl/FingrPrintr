import { Env, Data, cyrb128, usernameCookie, fingerprintCookie } from "./_middleware"

export const onRequestGet: PagesFunction<Env, any, Data> = async ({ request, env, data }) => {
    if (data.name && data.fingerprint) {
        const url = new URL(request.url)
        url.pathname = 'rooms/' + cyrb128(data.fingerprint)
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
            var i = Math.floor(Math.random() * list.length)
            return list[i]
        }

        var adjectives = ["adamant", "adroit", "amatory", "animistic", "antic", "arcadian", "baleful", "bellicose", "bilious", "boorish", "calamitous", "caustic", "cerulean", "comely", "concomitant", "contumacious", "corpulent", "crapulous", "defamatory", "didactic", "dilatory", "dowdy", "efficacious", "effulgent", "egregious", "endemic", "equanimous", "execrable", "fastidious", "feckless", "fecund", "friable", "fulsome", "garrulous", "guileless", "gustatory", "heuristic", "histrionic", "hubristic", "incendiary", "insidious", "insolent", "intransigent", "inveterate", "invidious", "irksome", "jejune", "jocular", "judicious", "lachrymose", "limpid", "loquacious", "luminous", "mannered", "mendacious", "meretricious", "minatory", "mordant", "munificent", "nefarious", "noxious", "obtuse", "parsimonious", "pendulous", "pernicious", "pervasive", "petulant", "platitudinous", "precipitate", "propitious", "puckish", "querulous", "quiescent", "rebarbative", "recalcitant", "redolent", "rhadamanthine", "risible", "ruminative", "sagacious", "salubrious", "sartorial", "sclerotic", "serpentine", "spasmodic", "strident", "taciturn", "tenacious", "tremulous", "trenchant", "turbulent", "turgid", "ubiquitous", "uxorious", "verdant", "voluble", "voracious", "wheedling", "withering", "zealous"]
        var nouns = ["ninja", "chair", "pancake", "statue", "unicorn", "rainbows", "laser", "senor", "bunny", "captain", "nibblet", "cupcake", "carrot", "gnome", "glitter", "potato", "salad", "toejam", "curtain", "beet", "toilet", "exorcism", "stick figure", "mermaid", "sea barnacle", "dragon", "jellybean", "snake", "doll", "bushe", "cookie", "apple", "ice cream", "ukulele", "kazoo", "banjo", "opera singer", "circus", "trampoline", "carousel", "carnival", "locomotive", "hot air balloon", "praying mantis", "animator", "artisan", "artist", "colorist", "inker", "coppersmith", "director", "designer", "stylist", "make-up artist", "model", "musician", "producer", "scenographer", "set decorator", "silversmith", "teacher", "auto mechanic", "beader", "foreman", "maintenance engineer", "mechanic", "miller", "moldmaker", "panel beater", "patternmaker", "plant operator", "plumber", "sawfiler", "shop foreman", "soaper", "stationary engineer", "wheelwright", "woodworker"]
        // end Kato Richardson's contribution
        data.name = (randomEl(adjectives) + ' ' + randomEl(nouns)).replace(/(^| )\w/g, s => s.toLocaleUpperCase())
        data.headers.push(["Set-Cookie", `${usernameCookie}=${data.name}; path=/`])
    }

    return env.ASSETS.fetch(request.url)
}

export const onRequestPost: PagesFunction<Env, any, Data> = async ({ request, data }) => {
    const form = await request.formData()
    const fingerprint = form.get('fingerprint') as string
    const username = form.get('username') as string

    data.headers.push(["Set-Cookie", `${usernameCookie}=${username}; path=/`])
    data.headers.push(["Set-Cookie", `${fingerprintCookie}=${fingerprint}; path=/`])

    const url = new URL(request.url)
    url.pathname = 'rooms/' + cyrb128(fingerprint)
    return Response.redirect(url.toString())
}