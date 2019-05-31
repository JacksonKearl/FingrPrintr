var express = require('express');
var utils = require('./utils')
var router = express.Router();

/* GET users listing. */
router.get('/:roomName', async function (req, res, next) {
  let room = req.params.roomName
  let data = await utils.readClubInfo(room)
  res.render('room', { title: room, numEntries: data.count, chatroom: data.chat });
});

router.post('/:roomName/guestbook', async function (req, res, next) {
  let { codename, fingerprint } = req.body
  let { roomName } = req.params

  if (utils.hash(fingerprint) !== roomName) {
    return res.status(401).end('You do not have permission to sign into this club\'s guestbook.')
  }
  try {
    await utils.signGuestbook(roomName, codename)
  } catch (err) {
    return res.status(403).end('You have already signed into this club\'s guestbook.\n(If this isn\'t the case, try clearing your localStorage to get a new codename.)')
  }
  return res.end('success')
});

router.post('/:roomName/chatroom', async function (req, res, next) {
  let { codename, fingerprint, post } = req.body
  let { roomName } = req.params

  post = post.trim()
  if (post === '') { return res.status(400).end('Post body empty') }
  if (post.length > 2000) { return res.status(400).end('Post body too long') }

  if (utils.hash(fingerprint) !== roomName) {
    return res.status(401).end('You do not have permission to speak in this club\'s chatroom.')
  }

  try {
    await utils.postComment(roomName, codename, post)
  } finally {
    return res.end('success')
  }
});

module.exports = router;
