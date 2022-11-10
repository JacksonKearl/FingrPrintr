import { ago, cyrb128, selectRandom } from '../../lib/utils'
import { Chat, ChatMetadata, Data, Env } from '../_middleware'

// Pure KV doesn't have consistency guarantees,
// this means theres potential to lose chats if two writes requests interleave or
// hit different data centers. use durable object chat instead if that matters.

// but, durable objects are slow and expensive. use kv directly when not writing
const KVChat = (room: string, env: Env) => ({
	async get() {
		return (
			(await env.CHATS.get<Chat>('chat_contents/' + room, 'json')) || []
		)
	},
	async post(author: string, message: string) {
		const chats = await this.get()
		chats.push({ author, message, date: Date.now() })
		if (chats.length > 100) {
			chats.shift()
		}
		await env.CHATS.put('chat_contents/' + room, JSON.stringify(chats))
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
		async element(e) {
			try {
				// don't touch durable object store
				const chats = isOurRoom
					? await chatter(roomId, env).get()
					: await KVChat(roomId, env).get()

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
						const dateStamp = ago(chat.date)
						const creatorClass = isOurChat ? 'ours' : 'theirs'
						const isSameAuthor = chat.author === lastAuthor
						const sameAuthorClass = isSameAuthor ? 'joined' : ''
						if (!isSameAuthor) {
							lastAuthor = chat.author
						}

						const classes = `chat ${creatorClass} ${sameAuthorClass}`
						e.append(
							`<div title="${dateStamp}" class="${classes}">`,
							{ html: true },
						)
						if (!isSameAuthor) {
							e.append('<span class="author">', { html: true })
							e.append(chat.author, { html: false })
							e.append('</span>', { html: true })
						}
						e.append('<span class="message">', { html: true })
						e.append(chat.message, { html: false })
						e.append('</span>', { html: true })
						e.append('</div>', { html: true })
					}
				} else {
					e.append('<div class="chat">', { html: true })
					e.append('No one here yet!')
					e.append('</div>', { html: true })
				}
			} catch (err) {
				e.append((err as any).message)
			}
		},
	})

	url.pathname = isOurRoom ? 'ourRoom' : 'otherRoom'
	return rewriter.transform(await env.ASSETS.fetch(url.toString()))
}
