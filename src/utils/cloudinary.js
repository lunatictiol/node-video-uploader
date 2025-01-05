import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret:process.env.CLOUDINARY_SECRET
});

const uploadOnCloud = async (localFilePath) =>{
 try {
   if(!localFilePath) return null
   const response = await cloudinary.uploader.upload(
     localFilePath,{
       resource_type: 'auto'
     }
   )
   console.log("file uploaded at " + response.url)
   fs.unlinkSync(localFilePath)

   return response

 }catch (e){
   fs.unlinkSync(localFilePath)
   return null
 }
}

const deleteFromCLoud = async (publicId) => {
  try {
    const response = await cloudinary.uploader.destroy(publicId)
    console.log("file deleted at " + response.url)
    return response
  }catch (e){
    return null
  }
}

export {uploadOnCloud,deleteFromCLoud}