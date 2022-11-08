import { Env, Data, Chat, cyrb128 } from "../_middleware"

const TTL = 300

export const onRequestGet: PagesFunction<Env, any, Data> = async ({ request, env, data }) => {
    const url = new URL(request.url)
    if (!data.name || !data.fingerprint) {
        url.pathname = '/'
        return Response.redirect(url.toString())
    }
    const ourRoom = cyrb128(data.fingerprint)

    let list = false && await env.CHATS.get<{ update: number; data: { name: string; authorCount: number; }[]; }>('chat_list', "json")
    if (!list) {
        const { keys } = await env.CHATS.list({ prefix: 'all_chats_' })
        list = {
            update: Date.now(),
            data: (await Promise.all(keys.map(key => env.CHATS.get<Chat>(key.name, "json")
                .then(chat => {
                    if (!chat)
                        return undefined
                    const authorSet = new Set()
                    chat.forEach(message => authorSet.add(message.author))
                    return ({ name: key.name, authorCount: authorSet.size })
                })
                .catch(v => undefined)
            ))).filter((x => x) as (x: any) => x is { name: string; authorCount: number; })
        }
        list.data.sort((a, b) => b.authorCount - a.authorCount)
        env.CHATS.put('chat_list', JSON.stringify(list), { expirationTtl: TTL })
    }

    const rewriter = new HTMLRewriter()
        .on('span#lastUpdate', {
            element(element) {
                element.setInnerContent('Last updated: ' + Math.round((Date.now() - list!.update) / 1000) + ' seconds ago')
            },
        })
        .on('main#list', {
            element(element) {
                for (const key of list!.data) {
                    const roomName = key.name.slice('all_chats_'.length)
                    element.append(`<div class="chat ${roomName === ourRoom ? 'ours' : 'theirs'}"><a href="/rooms/${roomName}">`, { html: true })
                    element.append(roomName, { html: false })
                    element.append('</a></div>', { html: true })
                }
            },
        })

    return rewriter.transform(await env.ASSETS.fetch(request.url))
}
