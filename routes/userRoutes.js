const express = require('express')
const formidable = require('express-formidable')
const router = express.Router();
const Authentication = require('../controller/Authentication');
const userController = require('../controller/userController')
const ExpressFormidable = require('express-formidable');
router.post('/userRegistration', Authentication.registerUserController)
router.post('/userLogin', Authentication.userLoginController)
router.post('/createWorkshopPost/:userId', formidable(), userController.createWorkshopPostController)
router.put('/forgotPasswrod', Authentication.forgotPasswordController);
router.get('/getAllWorkshopPost', userController.getAllWorkshopPost);
router.get('/postPhoto/:postId', userController.getPostPhoto)
router.get('/getSingleUserById/:userId', userController.getSingleUserById)
router.get('/DecodeUserIdFromJwt/:token', userController.decodeUserJwtController)
router.post('/addEmergencyNumber', userController.addEmergencyNumber)
router.put('/removeEmergencyNumber', userController.removeEmergencyNumber)
router.get('/getEmergencyNumber/:userId', userController.getEmergencyNumber)
// below is the route for executing the sos controller
router.post('/send-sos', userController.executeSosController)
module.exports = router