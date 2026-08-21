const express = require('express');
const router = express.Router();
const { 
  registerUser, 
  loginUser, 
  googleSignIn, 
  demoLogin,
  logoutUser, 
  getUserProfile 
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Public authentication routes (expect Firebase authorization headers)
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google', googleSignIn);
router.post('/demo-login', demoLogin);

// Private session routes (expect Backend custom JWT)
router.post('/logout', protect, logoutUser);
router.get('/profile', protect, getUserProfile);

module.exports = router;
