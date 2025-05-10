const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const validators = require('../utils/validators');
const { protect } = require('../middlewares/auth');

router.post('/register', validators.register, validators.validate, authController.register);
router.post('/login', validators.login, validators.validate, authController.login);
router.get('/me', protect, authController.getMe);
router.put('/updatedetails', protect, authController.updateDetails);
router.put('/updatepassword', protect, authController.updatePassword);
router.get('/logout', protect, authController.logout);

module.exports = router;