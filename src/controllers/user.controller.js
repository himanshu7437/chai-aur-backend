import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import { uploadOnCLoudinary } from "../utils/cloudinary.js"

const registerUser = asyncHandler(async (req, res,) => {
    // get user details
    // validation - not empty
    // check if user is already exists: username, email
    // check if images, or avatar is there or not
    // upload them on cloudinary, avatar
    // create user objects - creation entry on db
    // remove password and refresh token filed from response
    // check for user creation
    // return response
    // if not return error


    const {fullName, email, username, password } = req.body
    console.log("email:" , email);

    if (
        [fullName, email, username, password].
        some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser =  User.findOne({
        $or: [
            { username },
            { email }
        ]
    })

    if(existedUser) {
        throw new ApiError(409, "User with email or Username already exists")
    }


    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLOcalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCLoudinary(avatarLocalPath);
    const coverImage = await uploadOnCLoudinary(coverImageLOcalPath);

    if(!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }

    User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

})

export {registerUser}