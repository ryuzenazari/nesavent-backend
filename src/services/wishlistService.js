const Wishlist = require('../models/Wishlist');
const Event = require('../models/Event');
const mongoose = require('mongoose');

const addToWishlist = async (userId, eventId, notificationSettings = {}, notes = '') => {
  try {
    const result = await Wishlist.addToWishlist(userId, eventId, notificationSettings, notes);
    return result;
  } catch (error) {
    throw new Error(`Failed to add event to wishlist: ${error.message}`);
  }
};

const removeFromWishlist = async (userId, eventId) => {
  try {
    const result = await Wishlist.removeFromWishlist(userId, eventId);
    return { success: true, message: 'Event removed from wishlist' };
  } catch (error) {
    throw new Error(`Failed to remove event from wishlist: ${error.message}`);
  }
};

const getUserWishlist = async (userId, populate = false) => {
  try {
    let query = Wishlist.findOne({ userId });
    
    if (populate) {
      query = query.populate({
        path: 'events.eventId',
        select: 'title description bannerImage eventDate location category status ticketTypes'
      });
    }
    
    const wishlist = await query.exec();
    
    if (!wishlist) {
      return { events: [], collections: [] };
    }
    
    return wishlist;
  } catch (error) {
    throw new Error(`Failed to get user wishlist: ${error.message}`);
  }
};

const createCollection = async (userId, name, description = '', isPrivate = false) => {
  try {
    await Wishlist.createCollection(userId, name, description, isPrivate);
    return { success: true, message: 'Collection created successfully' };
  } catch (error) {
    throw new Error(`Failed to create collection: ${error.message}`);
  }
};

const updateCollection = async (userId, collectionId, updateData) => {
  try {
    const wishlist = await Wishlist.findOne({ userId });
    
    if (!wishlist) {
      throw new Error('Wishlist not found');
    }
    
    const collectionIndex = wishlist.collections.findIndex(
      c => c._id.toString() === collectionId
    );
    
    if (collectionIndex === -1) {
      throw new Error('Collection not found');
    }
    
    if (updateData.name) {
      wishlist.collections[collectionIndex].name = updateData.name;
    }
    
    if (updateData.description !== undefined) {
      wishlist.collections[collectionIndex].description = updateData.description;
    }
    
    if (updateData.isPrivate !== undefined) {
      wishlist.collections[collectionIndex].isPrivate = updateData.isPrivate;
    }
    
    await wishlist.save();
    return { success: true, message: 'Collection updated successfully' };
  } catch (error) {
    throw new Error(`Failed to update collection: ${error.message}`);
  }
};

const deleteCollection = async (userId, collectionId) => {
  try {
    const result = await Wishlist.updateOne(
      { userId },
      { $pull: { collections: { _id: collectionId } } }
    );
    
    if (result.nModified === 0) {
      throw new Error('Collection not found or not owned by this user');
    }
    
    return { success: true, message: 'Collection deleted successfully' };
  } catch (error) {
    throw new Error(`Failed to delete collection: ${error.message}`);
  }
};

const addEventToCollection = async (userId, collectionId, eventId) => {
  try {
    const wishlist = await Wishlist.findOne({ userId });
    
    if (!wishlist) {
      throw new Error('Wishlist not found');
    }
    
    const collectionIndex = wishlist.collections.findIndex(
      c => c._id.toString() === collectionId
    );
    
    if (collectionIndex === -1) {
      throw new Error('Collection not found');
    }
    
    const eventExists = wishlist.collections[collectionIndex].events.some(
      e => e.eventId.toString() === eventId
    );
    
    if (eventExists) {
      return { success: true, message: 'Event already in collection' };
    }
    
    wishlist.collections[collectionIndex].events.push({
      eventId,
      addedAt: new Date()
    });
    
    await wishlist.save();
    return { success: true, message: 'Event added to collection' };
  } catch (error) {
    throw new Error(`Failed to add event to collection: ${error.message}`);
  }
};

const removeEventFromCollection = async (userId, collectionId, eventId) => {
  try {
    const result = await Wishlist.updateOne(
      { userId, 'collections._id': collectionId },
      { $pull: { 'collections.$.events': { eventId } } }
    );
    
    if (result.nModified === 0) {
      throw new Error('Event not found in collection or collection not owned by this user');
    }
    
    return { success: true, message: 'Event removed from collection' };
  } catch (error) {
    throw new Error(`Failed to remove event from collection: ${error.message}`);
  }
};

const updateWishlistSettings = async (userId, settings) => {
  try {
    const wishlist = await Wishlist.findOne({ userId });
    
    if (!wishlist) {
      const newWishlist = new Wishlist({
        userId,
        events: [],
        collections: [],
        settings
      });
      
      await newWishlist.save();
      return { success: true, message: 'Wishlist settings created' };
    }
    
    if (settings.defaultNotifications) {
      wishlist.settings.defaultNotifications = {
        ...wishlist.settings.defaultNotifications,
        ...settings.defaultNotifications
      };
    }
    
    if (settings.autoRemove) {
      wishlist.settings.autoRemove = {
        ...wishlist.settings.autoRemove,
        ...settings.autoRemove
      };
    }
    
    await wishlist.save();
    return { success: true, message: 'Wishlist settings updated' };
  } catch (error) {
    throw new Error(`Failed to update wishlist settings: ${error.message}`);
  }
};

module.exports = {
  addToWishlist,
  removeFromWishlist,
  getUserWishlist,
  createCollection,
  updateCollection,
  deleteCollection,
  addEventToCollection,
  removeEventFromCollection,
  updateWishlistSettings
}; 