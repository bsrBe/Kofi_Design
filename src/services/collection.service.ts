import { Collection } from '../models/index.js';
import { CloudinaryService } from './cloudinary.service.js';
import type { ICollection } from '../models/types.js';

export const createCollectionItem = async (title: string, photo: Buffer, tags: string[]): Promise<ICollection> => {
    // 1. Upload photo to Cloudinary
    const { url, publicId } = await CloudinaryService.uploadImage(photo, 'collections');
    
    // 2. Create collection item in DB
    const item = new Collection({
        title,
        image: url, // Using the Cloudinary Secure URL
        cloudinaryPublicId: publicId,
        tags
    });
    
    await item.save();
    return item.toObject();
};

export const getAllCollections = async (): Promise<ICollection[]> => {
    return await Collection.find().sort({ createdAt: -1 }).lean();
};

export const updateCollectionItem = async (id: string, updates: { title?: string; tags?: string[] }, photo?: Buffer): Promise<ICollection | null> => {
    const item = await Collection.findById(id);
    if (!item) return null;

    if (updates.title) item.title = updates.title;
    if (updates.tags) item.tags = updates.tags;

    if (photo) {
        // 1. Delete old image if it exists
        if (item.cloudinaryPublicId) {
            await CloudinaryService.deleteImage(item.cloudinaryPublicId);
        }

        // 2. Upload new image
        const { url, publicId } = await CloudinaryService.uploadImage(photo, 'collections');
        item.image = url;
        item.cloudinaryPublicId = publicId;
    }

    await item.save();
    return item.toObject();
};

export const deleteCollectionItem = async (id: string): Promise<boolean> => {
    const item = await Collection.findById(id);
    if (item && item.cloudinaryPublicId) {
        // Delete from Cloudinary as well
        await CloudinaryService.deleteImage(item.cloudinaryPublicId);
    }
    const result = await Collection.findByIdAndDelete(id);
    return !!result;
};
