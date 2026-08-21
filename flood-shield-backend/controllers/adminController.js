const dbStore = require('../utils/dbStore');

// GET /api/admin/platform-registry  [Government]
const getPlatformRegistry = async (req, res) => {
  try {
    const registry = await dbStore.getPlatformRegistry();
    res.json(registry);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// DELETE /api/admin/users/:uid  [Government]
const removePlatformUser = async (req, res) => {
  try {
    const result = await dbStore.deleteUserByUid(req.params.uid);
    if (result.error) return res.status(400).json({ message: result.error });
    res.json({ message: `${result.removed.name} (${result.removed.role}) removed from the platform`, removed: result.removed });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

const removeRepresentativeInvite = async (req, res) => {
  try {
    const result = await dbStore.deleteRepresentativeInvite(req.params.inviteId);
    if (result.error) return res.status(400).json({ message: result.error });
    res.json({ message: `Representative invite ${req.params.inviteId} removed`, removed: result.removed });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

module.exports = { getPlatformRegistry, removePlatformUser, removeRepresentativeInvite };
