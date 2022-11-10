import { coalesce, cyrb128 } from '../../lib/utils'
import { Env, Data, Chat, ChatMetadata } from '../_middleware'

const TTL = 300

export const onRequestGet: PagesFunction<Env, any, Data> = async ({
	request,
	env,
	data,
}) => {
	const url = new URL(request.url)
	if (!data.name || !data.fingerprint) {
		url.pathname = '/'
		return Response.redirect(url.toString())
	}
	const ourRoom = cyrb128(data.fingerprint)

	let list = await env.CHATS.get<{
		update: number
		data: { name: string; sortKey: number }[]
	}>('chat_list_cache', 'json')

	if (!list) {
		const { keys } = await env.CHATS.list({ prefix: 'chat_metadata_' })
		list = {
			update: Date.now(),
			data: coalesce(
				await Promise.all(
					keys.map((key) =>
						env.CHATS.get<ChatMetadata>(key.name, 'json')
							.then((chat) => {
								if (!chat) return undefined
								return {
									name: key.name,
									sortKey:
										chat.lastUpdate / (1000 * 60 * 60) +
										chat.numMessages +
										chat.numAuthors * 5,
								}
							})
							.catch(() => undefined),
					),
				),
			),
		}

		list.data.sort((a, b) => b.sortKey - a.sortKey)
		env.CHATS.put('chat_list', JSON.stringify(list), { expirationTtl: TTL })
	}

	const rewriter = new HTMLRewriter()
		.on('span#lastUpdate', {
			element(element) {
				element.setInnerContent(
					'Last updated: ' +
						Math.round((Date.now() - list!.update) / 1000) +
						' seconds ago',
				)
			},
		})
		.on('main#list', {
			element(element) {
				for (const key of list!.data) {
					const roomName = key.name.slice('all_chats_'.length)
					element.append(
						`<div class="chat ${
							roomName === ourRoom ? 'ours' : 'theirs'
						}"><a href="/rooms/${roomName}">`,
						{ html: true },
					)
					element.append(roomName, { html: false })
					element.append('</a></div>', { html: true })
				}
			},
		})

	return rewriter.transform(await env.ASSETS.fetch(request.url))
}
