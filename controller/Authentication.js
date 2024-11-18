const bcrypt = require("bcryptjs");
const jwt = require('jsonwebtoken')
const userModel = require('../models/userModel')
const fs = require('fs')
const workShopModel = require('../models/workshopPostModel');
const { default: slugify } = require("slugify");
const { default: mongoose } = require("mongoose");
// below is the controller for registratiuon

const registerUserController = async (req, res) => {
    try {
        const { email, password } = req.body;


        if (!email || !password) {
            return res.status(400).send({
                success: false,
                message: 'Email and password are required',
            });
        }


        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            return res.status(200).send({
                success: false,
                message: 'User already exists',
            });
        }


        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);


        const newUser = new userModel({
            ...req.body,
            password: hashedPassword,
        });

        await newUser.save();

        return res.status(201).send({
            success: true,
            message: 'Registration successful',
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send({
            success: false,
            message: 'Something went wrong during registration',
            error,
        });
    }
};

// below is the contoller for user login
const userLoginController = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).send({ success: false, message: 'Email and password are required' });
        }


        const user = await userModel.findOne({ email });

        if (!user) {
            return res.status(404).send({ success: false, message: 'Invalid username' });
        }


        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).send({ success: false, message: 'Invalid username or password' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

        console.log('login token', token);
        res.status(200).send({ success: true, message: 'Login successful', token, user });

    } catch (error) {
        console.log(error);
        return res.status(500).send({
            success: false, message: 'Something went wrong in login'
        });
    }
};

// below is the controller for forgot password
const forgotPasswordController = async (req, res) => {
    try {
        const { email, newPassword, answer } = req.body;
        if (!email) {
            return res.status(400).send({ succes: false, message: 'email is required' });
        }
        if (!newPassword) {
            return res.status(400).send({ succes: false, message: 'newPassword is required' });
        }
        if (!answer) {
            return res.status(400).send({ succes: false, message: 'answer is required' });
        }

        const user = await userModel.find({ email, answer })
        if (!user) {
            return res.status(404).send({
                success: false,
                message: 'user not found'
            })
        }
        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(newPassword, salt);
        await userModel.findOneAndUpdate(user?._id, { password: hashed });
        return res.status(200).send({
            success: true,
            message: 'password changed successfully'
        })
    } catch (error) {
        console.log(error);
        return res.status(500).send({

        })
    }
}



module.exports = { registerUserController, userLoginController, forgotPasswordController }