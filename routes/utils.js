const { Pool } = require('pg')

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: true,
    max: 10
})

let hashCache = {}
module.exports = {
    // A 53-bit string hashing function.
    // From StackOverflow user bryc, via https://stackoverflow.com/a/52171480/1710742
    hash: (val) => {
        if (!hashCache[val]) {
            const seed = 0
            let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
            for (let i = 0, ch; i < val.length; i++) {
                ch = val.charCodeAt(i);
                h1 = Math.imul(h1 ^ ch, 2654435761);
                h2 = Math.imul(h2 ^ ch, 1597334677);
            }
            h1 = Math.imul(h1 ^ h1 >>> 16, 2246822507) ^ Math.imul(h2 ^ h2 >>> 13, 3266489909);
            h2 = Math.imul(h2 ^ h2 >>> 16, 2246822507) ^ Math.imul(h1 ^ h1 >>> 13, 3266489909);
            hashCache[val] = '0x' + (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
        }
        return hashCache[val]
    },
    readClubInfo: async (clubname) => {
        const count = await pool.query('SELECT COUNT(*) FROM guestbook WHERE clubname = $1', [clubname])
        const chat = await pool.query('SELECT * FROM chatroom WHERE clubname = $1', [clubname])
        return { count: count.rows[0].count, chat: chat.rows }
    },
    signGuestbook: async (clubname, codename) => {
        await pool.query('INSERT INTO guestbook (clubname, codename) VALUES ($1, $2)', [clubname, codename])
    },
    postComment: async (clubname, codename, comment) => {
        await pool.query('INSERT INTO chatroom (clubname, codename, comment) VALUES ($1, $2, $3)', [clubname, codename, comment])
    },
    cleanSlate: async () => {
        // await pool.query(`DROP TABLE IF EXISTS guestbook`)
        // await pool.query(`DROP TABLE IF EXISTS chatroom`)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS guestbook(
                clubname VARCHAR(255) NOT NULL,
                codename VARCHAR(255) NOT NULL,
                UNIQUE (clubname, codename))`)

        await pool.query(`
            CREATE TABLE IF NOT EXISTS chatroom(
                clubname VARCHAR(255) NOT NULL,
                codename VARCHAR(255) NOT NULL,
                comment text NOT NULL,
                UNIQUE (clubname, codename, comment))`)
    }
}
