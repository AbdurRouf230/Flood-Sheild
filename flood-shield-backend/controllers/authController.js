const jwt = require('jsonwebtoken');
const {
  findUserByUid,
  findUserByEmailOrUid,
  createUser,
  updateUserProfile,
  findRepresentativeInviteByInviteId,
  markRepresentativeInviteRegistered,
  findNGOInviteByInviteId,
  markNGOInviteRegistered
} = require('../utils/dbStore');
const { verifyFirebaseToken } = require('../utils/firebaseVerifier');

// Helper to generate a backend session JWT
const generateToken = (user) => {
  return jwt.sign(
    { uid: user.uid, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'super_secret_jwt_token_for_flood_shield_platform',
    { expiresIn: '7d' }
  );
};

/**
 * @desc    Register a new user in MongoDB (or fallback in-memory cache) synced with Firebase Auth
 * @route   POST /api/auth/register
 * @access  Public (Requires Firebase token)
 */
const registerUser = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Missing or invalid authentication headers' });
    }

    const idToken = authHeader.split(' ')[1];

    // 1. Verify the Firebase token
    const decodedToken = await verifyFirebaseToken(idToken);
    const { sub: uid, email: firebaseEmail } = decodedToken;

    const { name, email, role, district, representativeId, ngoInviteId } = req.body;

    // Prefer body email over fallback email from decoded token (dev/mock tokens use sub-derived email)
    const resolvedEmail = email || (firebaseEmail && !firebaseEmail.includes('@floodshield.bd') ? firebaseEmail : email) || firebaseEmail;

    // 2. Validate input and role
    if (!name || !role) {
      return res.status(400).json({ message: 'Full Name and Role selection are required parameters' });
    }

    const validRoles = ['Government', 'NGO', 'Volunteer', 'Citizen', 'GovRepresentative', 'NGORepresentative'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role selection' });
    }

    if (role === 'Government') {
      const emailNorm = (resolvedEmail || '').toLowerCase();
      const testGovEmail = 'floodshield.gov@test.com';
      if (emailNorm !== testGovEmail) {
        return res.status(403).json({
          message: 'Government accounts cannot be self-registered. Contact the system administrator for official credentials.'
        });
      }
    }

    let userPayload = {
      uid,
      name,
      email: resolvedEmail,
      role,
      district: district || 'Dhaka',
      allocatedArea: req.body.allocatedArea || district || 'Dhaka',
      orgName: req.body.orgName || ''
    };

    if (role === 'GovRepresentative') {
      if (!representativeId || !representativeId.trim()) {
        return res.status(400).json({ message: 'Representative ID is required for Government Representative registration.' });
      }
      const invite = await findRepresentativeInviteByInviteId(representativeId.trim());
      if (!invite) {
        return res.status(400).json({ message: 'Invalid Representative ID. Ask your Government admin for a valid ID from the Shelter Registry.' });
      }
      if (invite.status === 'Registered' && invite.registeredUid && invite.registeredUid !== uid) {
        return res.status(400).json({ message: 'This Representative ID has already been used by another user.' });
      }
      userPayload = {
        ...userPayload,
        name: invite.name || name,
        district: invite.district,
        representativeId: invite.inviteId,
        shelterId: invite.shelterId || '',
        shelterName: invite.shelterName || '',
        assignedHub: invite.assignedHub || ''
      };
    } else if (role === 'NGORepresentative') {
      const tokenToUse = (ngoInviteId || representativeId || '').trim();
      if (!tokenToUse) {
        return res.status(400).json({ message: 'NGO Representative Invite Token is required.' });
      }
      const invite = await findNGOInviteByInviteId(tokenToUse);
      if (!invite) {
        return res.status(400).json({ message: 'Invalid NGO Representative Invite Token. Please check token spelling or generate a new token in Campaign Hub.' });
      }
      if (invite.status === 'Registered' && invite.registeredUid && invite.registeredUid !== uid) {
        return res.status(400).json({ message: 'This NGO Invite Token has already been used by another account.' });
      }
      userPayload = {
        ...userPayload,
        name: invite.name || name,
        district: (invite.district === 'Multiple' || !invite.district) ? (district || 'Sylhet') : invite.district,
        campaignId: invite.campaignId || '',
        campaignName: invite.campaignName || '',
        assignedHub: invite.assignedHub || '',
        ngoId: invite.ngoId || '',
        ngoInviteId: invite.inviteId,
        orgName: invite.ngoName || ''
      };
    }

    // 3. Check if user already exists
    let user = await findUserByEmailOrUid(firebaseEmail || email, uid);
    if (user) {
      if (user.uid === uid || (user.email && user.email.toLowerCase() === (firebaseEmail || email).toLowerCase())) {
        user = await updateUserProfile(user.uid || uid, userPayload);
      } else {
        return res.status(400).json({ message: 'User profile with this email address already exists.' });
      }
    } else {
      // 4. Create new user record
      user = await createUser(userPayload);
    }

    if (role === 'GovRepresentative') {
      await markRepresentativeInviteRegistered(representativeId.trim(), uid);
    } else if (role === 'NGORepresentative') {
      await markNGOInviteRegistered((ngoInviteId || representativeId).trim(), uid);
    }

    // 5. Generate session token
    const token = generateToken(user);

    res.status(201).json({
      token,
      user: {
        uid: user.uid,
        name: user.name,
        email: user.email,
        role: user.role,
        district: user.district,
        representativeId: user.representativeId || '',
        shelterId: user.shelterId || '',
        shelterName: user.shelterName || '',
        campaignId: user.campaignId || '',
        campaignName: user.campaignName || '',
        assignedHub: user.assignedHub || '',
        ngoId: user.ngoId || '',
        ngoInviteId: user.ngoInviteId || '',
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Registration controller error:', error.message);
    res.status(500).json({ message: error.message || 'Server error occurred during onboarding' });
  }
};

/**
 * @desc    Log in an existing user and sync session
 * @route   POST /api/auth/login
 * @access  Public (Requires Firebase token)
 */
const loginUser = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Missing or invalid authentication headers' });
    }

    const idToken = authHeader.split(' ')[1];

    // 1. Verify the Firebase token
    const decodedToken = await verifyFirebaseToken(idToken);
    const { sub: uid, email: firebaseEmail } = decodedToken;

    // Prefer body email over fallback email from decoded token (dev/mock tokens may use sub-derived email)
    const bodyEmail = req.body.email;
    const resolvedEmail = bodyEmail || (firebaseEmail && !firebaseEmail.includes('@floodshield.bd') ? firebaseEmail : bodyEmail) || firebaseEmail;

    // 2. Locate user profile by email or UID
    let user = await findUserByEmailOrUid(resolvedEmail || firebaseEmail, uid);
    if (!user) {
      return res.status(404).json({ message: 'User profile not found. Please complete registration onboarding.' });
    }

    // Sync UID if needed
    if (user.uid !== uid) {
      user = await updateUserProfile(user.uid, { uid }) || user;
    }

    // 3. Generate session token
    const token = generateToken(user);

    res.json({
      token,
      user: {
        uid: user.uid,
        name: user.name,
        email: user.email,
        role: user.role,
        district: user.district,
        representativeId: user.representativeId || '',
        shelterId: user.shelterId || '',
        shelterName: user.shelterName || '',
        campaignId: user.campaignId || '',
        campaignName: user.campaignName || '',
        assignedHub: user.assignedHub || '',
        ngoId: user.ngoId || '',
        ngoInviteId: user.ngoInviteId || '',
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Login controller error:', error.message);
    res.status(500).json({ message: error.message || 'Server error occurred during login verification' });
  }
};

/**
 * @desc    Authenticate/Register user via Google Sign-In
 * @route   POST /api/auth/google
 * @access  Public (Requires Firebase token)
 */
const googleSignIn = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Missing or invalid authentication headers' });
    }

    const idToken = authHeader.split(' ')[1];

    // 1. Verify the Google Firebase ID token
    const decodedToken = await verifyFirebaseToken(idToken);
    const { sub: uid, email, name: googleName } = decodedToken;

    const { role, name, district } = req.body;

    // 2. Find or create user
    let user = await findUserByUid(uid);

    if (!user) {
      // First-time sign up with Google
      const targetRole = role || 'Citizen';
      const validRoles = ['NGO', 'Volunteer', 'Citizen'];

      if (targetRole === 'Government' || targetRole === 'GovRepresentative') {
        return res.status(403).json({
          message: 'Government and Representative accounts must register with email and a valid Representative ID.'
        });
      }

      user = await createUser({
        uid,
        name: googleName || name || 'Google User',
        email,
        role: validRoles.includes(targetRole) ? targetRole : 'Citizen',
        district: district || 'Dhaka'
      });
      console.log(`New Google user registered: ${user.email} as ${user.role}`);
    }

    // 3. Generate session token
    const token = generateToken(user);

    res.json({
      token,
      user: {
        uid: user.uid,
        name: user.name,
        email: user.email,
        role: user.role,
        district: user.district,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Google Sign-In controller error:', error.message);
    res.status(500).json({ message: error.message || 'Server error occurred during Google sign-in sync' });
  }
};

/**
 * @desc    Invalidate user session
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logoutUser = async (req, res) => {
  res.json({ message: 'Session logged out successfully' });
};

/**
 * @desc    Get current user profile details
 * @route   GET /api/auth/profile
 * @access  Private
 */
const getUserProfile = async (req, res) => {
  try {
    res.json({
      uid: req.user.uid,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      district: req.user.district,
      representativeId: req.user.representativeId || '',
      shelterId: req.user.shelterId || '',
      shelterName: req.user.shelterName || '',
      createdAt: req.user.createdAt
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
/**
 * @desc    Quick demo login for any of the 6 test user roles
 * @route   POST /api/auth/demo-login
 * @access  Public
 */
const demoLogin = async (req, res) => {
  try {
    const { role, email } = req.body;
    let targetEmail = email;

    if (!targetEmail && role) {
      const emailMap = {
        'Citizen': 'citizen.test@floodshield.bd',
        'Volunteer': 'volunteer.gov.test@floodshield.bd',       // GOV Fatema (matches what GOV admin assigns)
        'VolunteerGOV': 'volunteer.gov.test@floodshield.bd',    // explicit GOV volunteer
        'VolunteerNGO': 'volunteer.test@floodshield.bd',        // NGO volunteer (Sunamganj)
        'Volunteer2': 'mitu.test@floodshield.bd',
        'NGO': 'ngo.test@floodshield.bd',
        'NGORepresentative': 'ngorep.test@floodshield.bd',
        'NGORepLogistics': 'ngorep.logistics@floodshield.bd',
        'GovRepresentative': 'govrep.test@floodshield.bd',
        'GovRep_Sylhet': 'govrep.test@floodshield.bd',
        'GovRep_Sunamganj': 'govrep.sunamganj@floodshield.bd',
        'GovRep_Moulvibazar': 'govrep.moulvibazar@floodshield.bd',
        'GovRepLogistics': 'govrep.logistics@floodshield.bd',
        'GovLog_Sylhet': 'govrep.logistics@floodshield.bd',
        'GovLog_Sunamganj': 'govlog.sunamganj@floodshield.bd',
        'GovLog_Moulvibazar': 'govlog.moulvibazar@floodshield.bd',
        'Government': 'floodshield.gov@test.com'
      };
      targetEmail = emailMap[role] || 'citizen.test@floodshield.bd';
    }

    if (!targetEmail) {
      return res.status(400).json({ message: 'Role or email is required for demo login' });
    }

    let user = await findUserByEmailOrUid(targetEmail, targetEmail);
    if (!user) {
      return res.status(404).json({ message: `Test user profile not found for ${targetEmail}` });
    }

    const token = generateToken(user);
    res.json({
      token,
      user: {
        uid: user.uid,
        name: user.name,
        email: user.email,
        role: user.role,
        district: user.district,
        allocatedArea: user.allocatedArea || user.district || '',
        orgName: user.orgName || '',
        representativeId: user.representativeId || '',
        shelterId: user.shelterId || '',
        shelterName: user.shelterName || '',
        campaignId: user.campaignId || '',
        campaignName: user.campaignName || '',
        assignedHub: user.assignedHub || '',
        ngoId: user.ngoId || '',
        ngoInviteId: user.ngoInviteId || '',
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Demo login error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  googleSignIn,
  demoLogin,
  logoutUser,
  getUserProfile
};
