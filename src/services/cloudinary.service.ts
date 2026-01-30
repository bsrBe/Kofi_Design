import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME as string,
  api_key: process.env.API_KEY as string,
  api_secret: process.env.API_SECRET as string
});

export class CloudinaryService {
  /**
   * Upload an image buffer to Cloudinary
   * @param buffer The image buffer
   * @param folder The folder to store the image in
   * @returns The secure URL and public ID
   */
  static async uploadImage(buffer: Buffer, folder: string = 'kofi_design'): Promise<{ url: string; publicId: string }> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto'
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            return reject(new Error('Failed to upload image to Cloudinary'));
          }
          if (!result) {
            return reject(new Error('Cloudinary upload result is empty'));
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id
          });
        }
      );

      uploadStream.end(buffer);
    });
  }

  /**
   * Delete an image from Cloudinary
   * @param publicId The public ID of the image
   */
  static async deleteImage(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      // We don't necessarily want to fail the whole operation if deletion fails
    }
  }
}
