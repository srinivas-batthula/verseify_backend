const router = require('express').Router()
const asyncHandler = require('../utils/asyncHandler')
const UserController = require('../controllers/UserController')
const {Authorization_Middleware} = require('../controllers/AuthController')


router.route('/users')
    .get(asyncHandler(UserController.getAll));

router.route('/users/:id')
    .get(asyncHandler(UserController.get))
    .patch(Authorization_Middleware, asyncHandler(UserController.update))
    .delete(Authorization_Middleware, asyncHandler(UserController.remove));


module.exports = router
