const jwt = require('jsonwebtoken')
const userModel = require('../models/userModel')
//below is the controller code for checking wheather signin or not
const signIn = (req, res, next) => {
    try {
        console.log(req.headers.authorization)
        const decode = jwt.verify(req.headers.authorization, process.env.JWT_SECRET)
        req.user = decode;
        console.log('decode is', decode);
        next()
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            success: false,
            message: 'ever while checking signed in or not'
        })
    }
}
// below is the controller code for checking wheather admin or not
const isAdmin = async (req, res, next) => {
    try {
        const user = await userModel.findById(req.user.id)
        console.log('user is', user)
        if (user?.role !== 1) {
            return res.status(401).send({
                success: 'false',
                message: 'admin validation failed not an admin'
            })
        } else {
            console.log('next executed')
            next();
        }
    } catch (error) {
        console.log(error)
    }
}

module.exports = { signIn, isAdmin }
