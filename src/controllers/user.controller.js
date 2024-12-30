import { asyncHandler } from "../utils/asyncHandler.js";
import Joi from 'joi';
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloud } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerSchema = Joi.object({
  fullname: Joi.string().min(3).max(30).required(),
  email: Joi.string().email({ minDomainSegments: 2 }).required(),
  username: Joi.string().alphanum().min(3).max(30).required(),
  password: Joi.string().required(),
});

 const register = asyncHandler(async (req, res) => {
   const {fullname,email,username,password}=req.body
   const { error } = registerSchema.validate({
     fullname,
     email,
     username,
     password
   });
   if (error) {
     throw new ApiError(400, error.details[0].message);
   }
   const existingUser = await User.findOne({ $or:[{email},{username}] })
   if(existingUser){
     throw new ApiError(409, "User with email or username already exists");
   }
   const pfpLocalPath = req.files.profilePicture?.[0]?.path

   const coverPhotoLocalPath = req.files?.coverPhoto?.[0]?.path

   if (!pfpLocalPath){
     throw new ApiError(409, "Profile image cant be empty")

   }
   // const pfp = await uploadOnCloud(pfpLocalPath)
   //
   // let coverPhoto = ""
   // if (coverPhotoLocalPath) {
   // coverPhoto = await uploadOnCloud(coverPhotoLocalPath)
   // }

   let pfp
   try {
     pfp = await uploadOnCloud(pfpLocalPath)

   }catch (e) {
     throw new ApiError(500,"failed to upload pfp")

   }

   let coverPhoto
   if(coverPhotoLocalPath) {
     try {
       coverPhoto = await uploadOnCloud(coverPhotoLocalPath)

     } catch (e) {
       throw new ApiError(500, "failed to upload cover image")

     }
   }

   const user = await User.create({
     fullname: fullname,
     email: email,
     username:username,
     password:password,
     profilePicture:pfp.url,
     coverPhoto:coverPhoto?.url || ""
   })

   const created = await User.findById(user._id).select("-password -refreshToken" )
   if(!created){
     throw new ApiError(500, "something went wrong")

   }

 return res.status(200).json(
   new ApiResponse(200,created,"user registered successfully")
 )



});

export {
  register
}