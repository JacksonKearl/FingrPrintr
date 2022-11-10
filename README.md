# FingrPrintr: The Internet's Loneliest Social Network

https://fingrprintr.pages.dev/

FingrPrintr is a "social" network that places you in a chatroom with others sharing your same browser fingerprint.

Sites like [panopticlick](https://panopticlick.eff.org/results?aat=1#fingerprintTable) like to show you big scary results saying that your browser fingerprint is mega unique, but I just don't believe them. I think there have to be a decent number of other people like me, who use basically the same browser, hardware, plugins, fonts, etc. as a bunch of other people.

So I devised this application, which gives each fingerprint a unique "chatroom" that other sharers of the same fingerprint can communicate in. Perhaps my theory is totally wrong and everyone will be placed in a solitary room. But perhaps it isn't, in which case we might be able to be a bit less worried about the big scary world of fingerprinting.

Either way, see it in action at: https://fingrprintr.pages.dev/

## Previously Answered Questions

### What tech stack is used?

The site is served with Cloudflare Pages. All rendering happens server-side via Pages Functions in order to support environments without JavaScript. Chat data is stored in Cloudflare KV and Durable Objects are used for serialization.

### The same page is showing different chats on different browsers?

Access to your own page is serialized via Durable Objects for atomicity/consistency/durability. These Objects exist in only a single data center worldwide, and will write to their local KV deployment. On the other hand, access to pages besides your own reads from your nearest KV deployment, which may be temporarily behind the one where the Object is located. This is done for increased rendering speed and reduced load on the Durable Objects.

The deployments should become consistent ["eventually"](https://en.wikipedia.org/wiki/Eventual_consistency).

### How does fingerprinting with JS work?

The [`public/fingrprintr.js`](public/fingrprintr.js) script is derived from [fingerprintjs](https://github.com/fingerprintjs/fingerprintjs) (formerly Valve's `fingerprintjs2`), with care taken to remove noisy information like timezone and browser version. I've added portions to the script that seem to have been removed since it's Valve days, such as webgl and user agent fingerprinting.

### How does fingerprinting without JS work?

The `accept`, `accept-encoding`, and `user-agent` strings are hashed, with care taken to remove noisy version information from the user agent. See [`functions/index.ts`](functions/index.ts) for more info.

## Third Party Contributions

Favicon comes from [Material Design Icons](https://materialdesignicons.com/):

```md
## Pictogrammers Free License

This icon collection is released as free, open source, and GPL friendly by
the [Pictogrammers](http://pictogrammers.com/) icon group. You may use it
for commercial projects, open source projects, or anything really.

# Icons: Apache 2.0 (https://www.apache.org/licenses/LICENSE-2.0)

Some of the icons are redistributed under the Apache 2.0 license. All other
icons are either redistributed under their respective licenses or are
distributed under the Apache 2.0 license.

# Fonts: Apache 2.0 (https://www.apache.org/licenses/LICENSE-2.0)

All web and desktop fonts are distributed under the Apache 2.0 license. Web
and desktop fonts contain some icons that are redistributed under the Apache
2.0 license. All other icons are either redistributed under their respective
licenses or are distributed under the Apache 2.0 license.

# Code: MIT (https://opensource.org/licenses/MIT)

The MIT license applies to all non-font and non-icon files.
```

Username generator comes from [Kato Richardson](https://github.com/katowulf) via https://jsfiddle.net/katowulf/3gtDf/:

```
All code belongs to the poster and no license is enforced. JSFiddle or its authors are not responsible or liable for any loss or damage of any kind during the usage of provided code.
```

Fingerprinting script comes from: [fingerprintjs](https://github.com/fingerprintjs/fingerprintjs)

```
/**
 * FingerprintJS v3.3.6 - Copyright (c) FingerprintJS, Inc, 2022 (https://fingerprint.com)
 * Licensed under the MIT (http://www.opensource.org/licenses/mit-license.php) license.
 *
 * This software contains code from open-source projects:
 * MurmurHash3 by Karan Lyons (https://github.com/karanlyons/murmurHash3.js)
 */
```
