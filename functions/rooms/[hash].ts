import { cyrb128, selectRandom } from '../../lib/utils'
import { Chat, ChatMetadata, Data, Env } from '../_middleware'

const KVChat = (room: string, env: Env) => ({
	async get() {
		return (await env.CHATS.get<Chat>('all_chats_' + room, 'json')) || []
	},
	async post(author: string, message: string) {
		const chats = await this.get()
		chats.push({ author, message, date: Date.now() })
		if (chats.length > 100) {
			chats.shift()
		}
		await env.CHATS.put('all_chats_' + room, JSON.stringify(chats))
	},
})

const DurableObjectChat = (room: string, env: Env) => ({
	async get() {
		const partitionKey = room.slice(0, 2)
		const id = env.CHATTERER.idFromName(partitionKey)
		const obj = env.CHATTERER.get(id)
		const response = await obj.fetch('https://example.com/' + room)
		return (await response.json()) as Chat
	},
	async post(author: string, message: string) {
		const partitionKey = room.slice(0, 2)
		const id = env.CHATTERER.idFromName(partitionKey)
		const obj = env.CHATTERER.get(id)

		const response = await obj.fetch('https://example.com/' + room, {
			method: 'POST',
			body: new URLSearchParams({ author, message }),
			headers: new Headers({
				'Content-Type': 'application/x-www-form-urlencoded',
			}),
		})
		const data = await response.json<Chat>()
		const metadata: ChatMetadata = {
			lastUpdate: data[data.length - 1].date,
			numMessages: data.length,
			numAuthors: data.reduce((p, c) => p.add(c.author), new Set()).size,
		}
		await env.CHATS.put('chat_metadata/' + room, JSON.stringify(metadata))
	},
})

const chatter = DurableObjectChat

export const onRequestPost: PagesFunction<Env, any, Data> = async ({
	request,
	env,
}) => {
	const form = await request.formData()
	const fingerprint = form.get('fingerprint') as string
	const username = form.get('username') as string
	const message = form.get('message') as string
	const roomId = cyrb128(fingerprint)

	if (message.length && message.length < 1000) {
		await chatter(roomId, env).post(username, message)
	}

	const url = new URL(request.url)
	url.pathname = 'rooms/' + roomId
	return Response.redirect(url.toString())
}

export const onRequestGet: PagesFunction<Env, 'hash', Data> = async ({
	request,
	env,
	data,
	params,
}) => {
	const url = new URL(request.url)

	if (!data.name || !data.fingerprint) {
		url.pathname = '/'
		return Response.redirect(url.toString())
	}

	const ourRoom = cyrb128(data.fingerprint)
	const roomId = params.hash.toString()

	const isOurRoom = roomId === ourRoom

	const rewriter = new HTMLRewriter().on('main#chats', {
		async element(element) {
			try {
				const chats = await chatter(roomId, env).get()

				if (isOurRoom) {
					const welcomePhrase = [
						'Welcome',
						'Hello',
						'Greetings',
						'Bonjour',
						'Hola',
						'Ciao',
						'Howdy',
						'Konnichiwa',
						'Look what the cat dragged in...',
						'Hiya',
						'Aloha',
						'Salam',
					]

					const welcomeText =
						selectRandom(welcomePhrase) + ' ' + data.name + '!'

					if (
						chats.length < 20 &&
						!chats.some(
							(c) =>
								c.author === 'root' &&
								c.message?.includes(data.name),
						)
					) {
						chats.push({
							author: 'root',
							date: Date.now(),
							message: welcomeText,
						})

						await chatter(roomId, env).post('root', welcomeText)
					}
				}
				if (chats.length) {
					let lastAuthor: string | undefined
					for (const chat of chats) {
						const isOurChat = chat.author === data.name && isOurRoom
						const dateStamp = new Date(chat.date).toLocaleString()
						const creator = isOurChat ? 'ours' : 'theirs'

						element.append(
							`<div title="${dateStamp}" class="chat ${creator}">`,
							{ html: true },
						)
						if (lastAuthor !== chat.author) {
							lastAuthor = chat.author
							element.append('<span class="author">', {
								html: true,
							})
							element.append(chat.author, { html: false })
							element.append('</span>', { html: true })
						}
						element.append('<span class="message">', { html: true })
						element.append(chat.message, { html: false })
						element.append('</span>', { html: true })
						element.append('</div>', { html: true })
					}
				} else {
					element.append('<div class="chat">', { html: true })
					element.append('No one here yet!')
					element.append('</div>', { html: true })
				}
			} catch (e) {
				element.append((e as any).message)
			}
		},
	})

	url.pathname = isOurRoom ? 'ourRoom' : 'otherRoom'
	return rewriter.transform(await env.ASSETS.fetch(url.toString()))
}
