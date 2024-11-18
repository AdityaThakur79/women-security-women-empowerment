const bcrypt = require("bcryptjs");
const jwt = require('jsonwebtoken')
const userModel = require('../models/userModel')
const fs = require('fs')
const twilio = require('twilio')
const workShopModel = require('../models/workshopPostModel');
const { default: slugify } = require("slugify");
const { default: mongoose } = require("mongoose");
const dotenv = require('dotenv')
dotenv.config()

// below is the controller for getting the userId from jwtToken
const decodeUserJwtController = async (req, res) => {
    try {
        const { token } = req.params
        // console.log(token)
        const user = jwt.decode(token)
        const userId = user?.id
        return res.status(200).send({
            userId
        })

    } catch (error) {
        console.log('something went wrong in decodeUserJwtController');
        res.status(500).send({
            success: false,
            message: 'something went wrong in decodeUserJwtController'
        })
    }
}
// below is the controller for getting the user using the id
const getSingleUserById = async (req, res) => {
    try {
        const { userId } = req.params;
        console.log(userId)
        const user = await userModel.findById(userId)
        return res.status(200).send({
            success: true,
            message: "successfully found the user",
            user,
        })
    } catch (error) {
        console.log('something went wrong in getSingleUserController');
        res.status(500).send({
            success: false,
            message: 'something went wrong in getSingleUserController'
        })
    }
}
const createWorkshopPostController = async (req, res) => {
    try {
        const { name, address, organizerName, date, time, description } = req.fields;
        const { photo } = req.files;
        switch (true) {
            case !name: {
                return res.status(500).send({ error: 'name is required' })
            }
            case !address: {
                return res.status(500).send({ error: 'address is required' })
            }
            case !organizerName: {
                return res.status(500).send({ error: 'organizerName is required' })
            }
            case !date: {
                return res.status(500).send({ error: 'date is required' })
            }
            case !description: {
                return res.status(500).send({ error: 'description is required' })
            }
            // case !time: {
            //     return res.status(500).send({ error: 'name is required' })
            // }
        }
        const { userId } = req.params;
        const workshopPost = new workShopModel({ ...req.fields, keyword: slugify(name), user: userId });
        if (photo) {
            workshopPost.photo.data = fs.readFileSync(photo.path);
            workshopPost.photo.contentType = photo.type
        }

        const existingUser = await userModel.findById(userId)
        if (!existingUser) {
            return res.status(404).send({
                success: false,
                message: 'user is not available'
            })
        }

        // below we are starting the mongoose transaction
        const session = await mongoose.startSession()
        session.startTransaction()
        existingUser.post.push(workshopPost);
        await existingUser.save({ session });
        await session.commitTransaction();
        await workshopPost.save()
        res.status(201).send({
            success: true,
            message: 'Workshop post has been created successfully',
            // post  
        })
    } catch (error) {
        console.log(error);
        res.status(500).send({
            success: false,
            message: "error while creating the post"
        })
    }
}

// below is the controller for getting all post
const getAllWorkshopPost = async (req, res) => {
    try {
        const allPost = await workShopModel.find({}).select('-photo')

        const modifiedPosts = allPost.map(post => ({
            ...post.toObject(),
            approvedStatus: post.approved === 1 ? 'approved' : 'disapproved'
        }));
        return res.status(201).send({
            success: true,
            message: "successfully fetched all post",
            postCount: allPost.length,
            modifiedPosts
        })
    } catch (error) {
        console.log(error)
        return res.status(500).send({
            success: false,
            message: 'something went wrong while fetching all the post',
            error
        })
    }
}


// below is the controller for getting the post photo
const getPostPhoto = async (req, res) => {
    try {
        const { postId } = req.params;
        const post = await workShopModel.findById(postId).select('photo');
        if (post?.photo?.data) {
            res.set("Content-type", post.photo.contentType)
            res.status(200).send(post.photo.data)
        }
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            success: false,
            message: 'something went wrong in getting post photo'
        })
    }
}

// below is the sos controller

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const executeSosController = async (req, res) => {
    try {
        const { sender, receivers, message, latitude, longitude } = req.body; // Fixed destructuring

        const fullMessage = `${message}. Location: https://www.google.com/maps?q=${latitude},${longitude}`;
        const successfulMessages = [];
        const failedMessages = [];

        for (let receiver of receivers) {
            try {
                // Format the receiver's phone number for WhatsApp
                const formattedReceiver = `whatsapp:+91${receiver}`;

                const response = await client.messages.create({
                    from: process.env.TWILIO_WHATSAPP_NUMBER,
                    to: formattedReceiver,
                    body: `SOS from ${sender}: ${fullMessage}`,
                });

                successfulMessages.push(receiver);
                console.log(`Message sent to ${receiver}: ${response.sid}`);
            } catch (error) {
                failedMessages.push({
                    receiver,
                    error: error.message,
                    moreInfo: error.moreInfo,
                });
                console.error(`Failed to send message to ${receiver}: ${error.message}`);
            }
        }

        if (failedMessages.length > 0) {
            return res.status(400).json({
                message: "Some messages failed to send.",
                failedMessages,
                successfulMessages,
            });
        }

        res.status(200).json({
            message: "SOS sent successfully to all receivers",
            successfulMessages,
        });
    } catch (error) {
        console.error('Error in SOS controller:', error);
        return res.status(500).json({
            message: 'Something went wrong in SOS controller',
            success: false,
        });
    }
};

// below is the function for validating the mobile number
const validatePhoneNumber = async (mobile) => {
    const mobileRegex = /^[0-9]{10}$/;
    return mobileRegex.test(mobile);
}

// below is the controller for adding the emergency number in the schema
const addEmergencyNumber = async (req, res) => {
    try {
        const { emergencyNumber, userId } = req.body;
        if (!validatePhoneNumber) {
            return res.status(400).send({
                message: "invalid mobile number"
            })
        }
        const user = await userModel.findById(userId);
        if (user?.emergencyNumber.length > 4) {
            return res.status(400).send({
                success: false,
                message: "You can only add up to 4 emergency numbers"
            });
        }
        if (user?.emergencyNumber.includes(emergencyNumber)) {
            return res.status(400).send({
                success: false,
                message: `Number ${emergencyNumber} already included`
            });
        }
        user?.emergencyNumber.push(emergencyNumber);
        await user?.save();
        return res.status(200).send({
            success: true,
            message: `emergency number ${emergencyNumber} added successfully`,
            user
        })
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            success: false,
            message: "something went wrong in the addEmergencyNumber controller",
            error
        })
    }
}
// below is the controller for removing the emergency number from the schema
const removeEmergencyNumber = async (req, res) => {
    try {
        const { emergencyNumber, userId } = req.body;
        const user = await userModel.findById(userId);
        user.emergencyNumber = user?.emergencyNumber?.filter(num => num !== emergencyNumber);
        await user.save();
        return res.status(200).send({
            success: true,
            message: `emergency number ${emergencyNumber} removed successfully`,
            user
        })

    } catch (error) {
        console.log(error);
        return res.status(500).send({
            success: false,
            message: "something went wrong in the removeEmergencyNumber controller",
            error
        })
    }
}
// below is the controller for getting the emergency numbers
const getEmergencyNumber = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await userModel.findById(userId);
        const emergencyNumber = user?.emergencyNumber
        return res.status(200).send({
            emergencyNumber,
            success: true,
            message: 'emergency number fetched successfully',
        })
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            success: false,
            message: "something went wrong in getting emergency number controller",
            error
        })
    }
}

module.exports = { getSingleUserById, createWorkshopPostController, getAllWorkshopPost, getPostPhoto, executeSosController, decodeUserJwtController, addEmergencyNumber, removeEmergencyNumber, getEmergencyNumber }
