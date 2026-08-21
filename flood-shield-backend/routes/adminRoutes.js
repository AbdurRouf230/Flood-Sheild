const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { getPlatformRegistry, removePlatformUser, removeRepresentativeInvite } = require('../controllers/adminController');

router.get('/platform-registry', protect, authorize(['Government']), getPlatformRegistry);
router.delete('/users/:uid', protect, authorize(['Government']), removePlatformUser);
router.delete('/invites/:inviteId', protect, authorize(['Government']), removeRepresentativeInvite);

module.exports = router;
