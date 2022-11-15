import { coalesce, cyrb128 } from '../../lib/utils'
import { Env, Data, ChatMetadata } from '../_middleware'

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

	const listPromise = (async () => {
		let list = await env.CHATS.get<{
			update: number
			data: { name: string; sortKey: number }[]
		}>('chat_list_cache', 'json')

		if (list && list.update + TTL * 1000 > Date.now()) {
			return list
		}

		if (!list) {
			list = { data: [], update: Date.now() }
		}

		const { keys } = await env.CHATS.list({ prefix: 'chat_metadata/' })
		const updates = coalesce(
			await Promise.all(
				keys.map(async (key) => {
					try {
						const chat = await env.CHATS.get<ChatMetadata>(
							key.name,
							'json',
						)
						await env.CHATS.delete(key.name)
						if (!chat) return undefined
						return {
							name: key.name,
							sortKey:
								chat.lastUpdate / (1000 * 60 * 60) +
								chat.numMessages +
								chat.numAuthors * 5,
						}
					} catch (e) {
						return undefined
					}
				}),
			),
		)

		list.data = [...list.data, ...updates]
		list.update = Date.now()
		list.data.sort((a, b) => b.sortKey - a.sortKey)
		await env.CHATS.put('chat_list_cache', JSON.stringify(list))
		return list
	})()

	const rewriter = new HTMLRewriter()
		.on('span#lastUpdate', {
			async element(element) {
				const list = await listPromise
				element.setInnerContent(
					'Last updated: ' +
						Math.round((Date.now() - list.update) / 1000) +
						' seconds ago',
				)
			},
		})
		.on('main#list', {
			async element(element) {
				const list = await listPromise
				for (const key of list.data) {
					const roomName = key.name.slice('chat_metadata/'.length)
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
