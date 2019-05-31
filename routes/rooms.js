var express = require('express');
var utils = require('./utils')
var router = express.Router();

let guestbooks = {}
let chatrooms = {}

/* GET users listing. */
router.get('/:roomName', function (req, res, next) {
  let room = req.params.roomName
  let numEntries = guestbooks[room] ? guestbooks[room].size : 0
  res.render('room', { title: room, numEntries, chatroom: chatrooms[room] || [] });
});

router.post('/:roomName/guestbook', function (req, res, next) {
  let { codename, fingerprint } = req.body
  let { roomName } = req.params

  if (utils.hash(fingerprint) !== roomName) {
    return res.status(401).end('You do not have permission to sign into this club\'s guestbook.')
  }
  if (!guestbooks[roomName]) {
    guestbooks[roomName] = new Set()
  }
  if (guestbooks[roomName].has(codename)) {
    return res.status(403).end('You have already signed into this club\'s guestbook.\n(If this isn\'t the case, try clearing your localStorage to get a new codename.)')
  }
  guestbooks[roomName].add(codename)

  return res.end('success')
});

router.post('/:roomName/chatroom', function (req, res, next) {
  let { codename, fingerprint, post } = req.body
  let { roomName } = req.params

  if (utils.hash(fingerprint) !== roomName) {
    return res.status(401).end('You do not have permission to speak in this club\'s chatroom.')
  }
  if (!chatrooms[roomName]) {
    chatrooms[roomName] = []
  }

  chatrooms[roomName].push({ codename, post })

  return res.end('success')
});

module.exports = router;
