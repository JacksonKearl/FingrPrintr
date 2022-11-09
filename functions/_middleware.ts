export const usernameCookie = 'name'
export const fingerprintCookie = 'fingerprint'

export type Chat = { author: string; text: string; date: number }[]
export type Env = { CHATS: KVNamespace }
export type Data = {
	name: string
	fingerprint: string
	headers: [string, string][]
}

const addHtml = (e: Element, ...html: string[]) =>
	e.append(html.join('\n'), { html: true })

const rewriter = (name: string, fingerprint: string, signedIn: boolean) =>
	new HTMLRewriter()
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
			},
		})
		.onDocument({
			text(t) {
				if (t.text.includes('%USERNAME%')) {
					t.replace(t.text.replace(/\%USERNAME\%/g, name))
				}
			},
		})
		.on('body', {
			element(e) {
				addHtml(e, '<div class="gap"></div>', '<footer>')
				if (signedIn) {
					addHtml(e, '<a href="/rooms">All Rooms</a> | ')
				}
				addHtml(
					e,
					'<a href="https://github.com/JacksonKearl/fingrprintr">View Source</a> | ',
					'<a href="/legal">Legal</a>',
					'</footer>',
				)
			},
		})
		.on('head', {
			element(e) {
				addHtml(
					e,
					'<meta charset="UTF-8">',
					'<meta http-equiv="X-UA-Compatible" content="IE=edge">',
					'<meta name="viewport" content="width=device-width, initial-scale=1.0">',
					'<link rel="stylesheet" type="text/css" href="/index.css" />',
					'<link rel="shortcut icon" type="image/x-icon" href="/favicon.ico"/>',
					'<title>FingrPrintr</title>',
				)
			},
		})

const middleware: PagesFunction<Env, any, Data> = async ({
	request,
	next,
	data,
}) => {
	const cookie = Object.fromEntries(
		(request.headers.get('cookie') ?? '')
			.split('; ')
			.map((e) => e.split('=')),
	)
	data.name = cookie[usernameCookie]
	data.fingerprint = cookie[fingerprintCookie]
	data.headers = []

	const response = next()
	const rewritten = rewriter(
		data.name ?? '',
		data.fingerprint ?? '',
		cookie[fingerprintCookie],
	).transform(await response)
	const copy = new Response(rewritten.body, rewritten)
	data.headers.forEach(([k, v]) => copy.headers.append(k, v))
	return copy
}

export const onRequest = [middleware]
