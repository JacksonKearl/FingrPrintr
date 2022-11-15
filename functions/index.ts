import { Env, Data, usernameCookie, fingerprintCookie } from './_middleware'
import { randomName, cyrb128 } from '../lib/utils'

const cookieSuffix = `; path=/; Max-Age=${60 * 60 * 24 * 360}; Secure`

export const onRequestGet: PagesFunction<Env, any, Data> = async ({
	request,
	env,
	data,
}) => {
	if (data.name && data.fingerprint) {
		const url = new URL(request.url)
		url.pathname = 'rooms/' + cyrb128(data.fingerprint)
		return Response.redirect(url.toString())
	}

	data.fingerprint ??= cyrb128(
		[
			request.headers.get('accept'),
			request.headers.get('accept-encoding'),
			(request.headers.get('user-agent') ?? '').replace(
				/\/([.\d])[.\d]+/g,
				'',
			),
		].join(';'),
	)

	if (!data.name) {
		data.name = randomName()
		data.headers.push([
			'Set-Cookie',
			`${usernameCookie}=${data.name}${cookieSuffix}`,
		])
	}

	return env.ASSETS.fetch(request.url)
}

export const onRequestPost: PagesFunction<Env, any, Data> = async ({
	request,
	data,
}) => {
	const form = await request.formData()
	const fingerprint = form.get('fingerprint') as string
	const username = form.get('username') as string

	data.headers.push([
		'Set-Cookie',
		`${usernameCookie}=${username}${cookieSuffix}`,
	])
	data.headers.push([
		'Set-Cookie',
		`${fingerprintCookie}=${fingerprint}${cookieSuffix}`,
	])

	const url = new URL(request.url)
	url.pathname = 'rooms/' + cyrb128(fingerprint)
	return Response.redirect(url.toString())
}
