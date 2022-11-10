export default {
	async fetch(request, env) {
		return await handleRequest(request, env)
	},
}

async function handleRequest(request, env) {
	try {
		if (request.headers.get('token') !== env.ACCESS_TOKEN) {
			return new Response('provide token pls', { status: 401 })
		}
		const url = new URL(request.url)
		const room = url.pathname.slice(1)
		if (!room) {
			throw Error('need room')
		}
		const partitionKey = room.slice(0, 2)
		const id = env.CHATTERER.idFromName(partitionKey)
		const obj = env.CHATTERER.get(id)
		return obj.fetch(request.url, request)
	} catch (e) {
		return new Response(e, { status: 500 })
	}
}

export class Chatterer {
	constructor(state, env) {
		this.state = state
		this.env = env
	}

	async fetch(request) {
		const url = new URL(request.url)
		const roomKey = 'chat_contents' + url.pathname

		const dataStore = this.env.CHATS
		// const dataStore = this.state.storage
		let value = []

		try {
			const existing = await dataStore.get(roomKey)
			if (existing) {
				value = JSON.parse(existing)
			}
		} catch (e) {
			console.error(e)
			await dataStore.delete(roomKey)
		}

		if (request.method === 'GET') {
			return new Response(JSON.stringify(value))
		}
		if (request.method === 'POST') {
			const raw = Object.fromEntries((await request.formData()).entries())
			if (
				!raw.author ||
				!raw.message ||
				raw.author.length > 30 ||
				raw.message.length > 1000
			) {
				return new Response('bad request.', { status: 400 })
			}

			const clean = {
				author: raw.author,
				message: raw.message,
				date: Date.now(),
			}

			value.push(clean)
			if (value.length > 100) {
				value.shift()
			}

			const string = JSON.stringify(value)
			await dataStore.put(roomKey, string)
			return new Response()
		}
		if (request.method === 'DELETE') {
			dataStore.delete(roomKey)
			return new Response('done')
		}
	}
}
