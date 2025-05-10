const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const upload = require('../middlewares/upload');
const { protect, authorize } = require('../middlewares/auth');
const validators = require('../utils/validators');  

router.use(protect);
router.use(authorize('admin'));

router.get('/', userController.getUsers);
router.get('/:id', validators.validateId, validators.validate, userController.getUser);
router.put('/:id', validators.validateId, userController.updateUser);
router.delete('/:id', validators.validateId, validators.validate, userController.deleteUser);

// Profile image upload (not admin restricted)
router.put('/me/image', protect, upload.single('image'), userController.uploadProfileImage);

module.exports = router;