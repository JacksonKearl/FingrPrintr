import { Chat, cyrb128, Data, Env } from "../_middleware"

export const onRequestPost: PagesFunction<Env, any, Data> = async ({ request, env, next, data }) => {
    const form = await request.formData()
    const fingerprint = form.get('fingerprint') as string
    const username = form.get('username') as string
    const message = form.get('message') as string
    const roomId = cyrb128(fingerprint)

    if (message.length < 1000) {
        const chats = (await env.CHATS.get<Chat>('all_chats_' + roomId, "json")) ?? []
        chats.push({ author: username, text: message })
        if (chats.length > 100) { chats.shift(); }
        // not good, potential for race conditions. but Durable Objects are expensive.
        await env.CHATS.put('all_chats_' + roomId, JSON.stringify(chats))
    }

    const url = new URL(request.url)
    url.pathname = 'rooms/' + roomId
    return Response.redirect(url.toString())
}

export const onRequestGet: PagesFunction<Env, 'hash', Data> = async ({ request, env, data, params }) => {
    const url = new URL(request.url)

    if (!data.name || !data.fingerprint) {
        url.pathname = '/'
        return Response.redirect(url.toString())
    }

    const ourRoom = cyrb128(data.fingerprint)
    const roomId = params.hash

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
}
