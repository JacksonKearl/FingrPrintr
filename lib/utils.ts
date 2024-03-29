export const selectRandom = <T>(list: T[]): T =>
	list[Math.floor(Math.random() * list.length)]

const capitalize = (s: string) =>
	s.replace(/(^| )\w/g, (s) => s.toLocaleUpperCase())

// From Kato Richardson via https://jsfiddle.net/katowulf/3gtDf/
export const randomName = () => {
	var adjectives = [
		'adamant',
		'adroit',
		'amatory',
		'animistic',
		'antic',
		'arcadian',
		'baleful',
		'bellicose',
		'bilious',
		'boorish',
		'calamitous',
		'caustic',
		'cerulean',
		'comely',
		'concomitant',
		'contumacious',
		'corpulent',
		'crapulous',
		'defamatory',
		'didactic',
		'dilatory',
		'dowdy',
		'efficacious',
		'effulgent',
		'egregious',
		'endemic',
		'equanimous',
		'execrable',
		'fastidious',
		'feckless',
		'fecund',
		'friable',
		'fulsome',
		'garrulous',
		'guileless',
		'gustatory',
		'heuristic',
		'histrionic',
		'hubristic',
		'incendiary',
		'insidious',
		'insolent',
		'intransigent',
		'inveterate',
		'invidious',
		'irksome',
		'jejune',
		'jocular',
		'judicious',
		'lachrymose',
		'limpid',
		'loquacious',
		'luminous',
		'mannered',
		'mendacious',
		'meretricious',
		'minatory',
		'mordant',
		'munificent',
		'nefarious',
		'noxious',
		'obtuse',
		'parsimonious',
		'pendulous',
		'pernicious',
		'pervasive',
		'petulant',
		'platitudinous',
		'precipitate',
		'propitious',
		'puckish',
		'querulous',
		'quiescent',
		'rebarbative',
		'recalcitant',
		'redolent',
		'rhadamanthine',
		'risible',
		'ruminative',
		'sagacious',
		'salubrious',
		'sartorial',
		'sclerotic',
		'serpentine',
		'spasmodic',
		'strident',
		'taciturn',
		'tenacious',
		'tremulous',
		'trenchant',
		'turbulent',
		'turgid',
		'ubiquitous',
		'uxorious',
		'verdant',
		'voluble',
		'voracious',
		'wheedling',
		'withering',
		'zealous',
	]
	var nouns = [
		'ninja',
		'chair',
		'pancake',
		'statue',
		'unicorn',
		'rainbows',
		'laser',
		'senor',
		'bunny',
		'captain',
		'nibblet',
		'cupcake',
		'carrot',
		'gnome',
		'glitter',
		'potato',
		'salad',
		'toejam',
		'curtain',
		'beet',
		'toilet',
		'exorcism',
		'stick figure',
		'mermaid',
		'sea barnacle',
		'dragon',
		'jellybean',
		'snake',
		'doll',
		'bushe',
		'cookie',
		'apple',
		'ice cream',
		'ukulele',
		'kazoo',
		'banjo',
		'opera singer',
		'circus',
		'trampoline',
		'carousel',
		'carnival',
		'locomotive',
		'hot air balloon',
		'praying mantis',
		'animator',
		'artisan',
		'artist',
		'colorist',
		'inker',
		'coppersmith',
		'director',
		'designer',
		'stylist',
		'make-up artist',
		'model',
		'musician',
		'producer',
		'scenographer',
		'set decorator',
		'silversmith',
		'teacher',
		'auto mechanic',
		'beader',
		'foreman',
		'maintenance engineer',
		'mechanic',
		'miller',
		'moldmaker',
		'panel beater',
		'patternmaker',
		'plant operator',
		'plumber',
		'sawfiler',
		'shop foreman',
		'soaper',
		'stationary engineer',
		'wheelwright',
		'woodworker',
	]

	return capitalize(selectRandom(adjectives) + ' ' + selectRandom(nouns))
}

export const cyrb128 = (str: string) => {
	let h1 = 1779033703,
		h2 = 3144134277,
		h3 = 1013904242,
		h4 = 2773480762
	for (let i = 0, k; i < str.length; i++) {
		k = str.charCodeAt(i)
		h1 = h2 ^ Math.imul(h1 ^ k, 597399067)
		h2 = h3 ^ Math.imul(h2 ^ k, 2869860233)
		h3 = h4 ^ Math.imul(h3 ^ k, 951274213)
		h4 = h1 ^ Math.imul(h4 ^ k, 2716044179)
	}
	h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067)
	h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233)
	h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213)
	h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179)
	const arr = [
		(h1 ^ h2 ^ h3 ^ h4) >>> 0,
		(h2 ^ h1) >>> 0,
		(h3 ^ h1) >>> 0,
		(h4 ^ h1) >>> 0,
	]

	return (
		('00000000' + (arr[0] >>> 0).toString(16)).slice(-8) +
		('00000000' + (arr[1] >>> 0).toString(16)).slice(-8) +
		('00000000' + (arr[2] >>> 0).toString(16)).slice(-8) +
		('00000000' + (arr[3] >>> 0).toString(16)).slice(-8)
	)
}

export const coalesce = <T>(arr: (T | undefined)[]): T[] =>
	arr.filter((v): v is T => v !== undefined)

export const ago = (d: number): string => {
	const time = [
		[1000, 's'],
		[60, 'm'],
		[60, 'h'],
		[24, 'd'],
		[7, 'w'],
		[52, 'y'],
	] as const

	let message = ''
	let delta = Date.now() - d
	for (const [frac, sym] of time) {
		delta /= frac
		if (delta < 1) {
			break
		}
		message = `${Math.round(delta)}${sym} ago`
	}
	return message
}
