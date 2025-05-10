const EventTemplate = require('../models/EventTemplate');
const Event = require('../models/Event');
const mongoose = require('mongoose');

const createTemplate = async (creatorId, templateData) => {
  try {
    const template = new EventTemplate({
      creatorId,
      name: templateData.name,
      description: templateData.description,
      isPublic: templateData.isPublic || false,
      category: templateData.category,
      duration: templateData.duration,
      defaultLocation: templateData.defaultLocation,
      defaultBanner: templateData.defaultBanner,
      ticketTypes: templateData.ticketTypes || [],
      schedule: templateData.schedule || [],
      formFields: templateData.formFields || [],
      emailTemplates: templateData.emailTemplates || {},
      socialShare: templateData.socialShare || {},
      settings: templateData.settings || {}
    });
    
    await template.save();
    return template;
  } catch (error) {
    throw new Error(`Failed to create event template: ${error.message}`);
  }
};

const getTemplates = async (creatorId, filter = {}) => {
  try {
    const query = { creatorId };
    
    if (filter.category) {
      query.category = filter.category;
    }
    
    if (filter.isPublic !== undefined) {
      query.isPublic = filter.isPublic;
    }
    
    const templates = await EventTemplate.find(query)
      .sort({ useCount: -1, updatedAt: -1 });
      
    return templates;
  } catch (error) {
    throw new Error(`Failed to get event templates: ${error.message}`);
  }
};

const getTemplateById = async (creatorId, templateId) => {
  try {
    const template = await EventTemplate.findOne({
      _id: templateId,
      $or: [
        { creatorId },
        { isPublic: true }
      ]
    });
    
    if (!template) {
      throw new Error('Template not found or not accessible');
    }
    
    return template;
  } catch (error) {
    throw new Error(`Failed to get template: ${error.message}`);
  }
};

const updateTemplate = async (creatorId, templateId, updateData) => {
  try {
    const template = await EventTemplate.findOne({ _id: templateId, creatorId });
    
    if (!template) {
      throw new Error('Template not found or not owned by this creator');
    }
    
    const fieldsToUpdate = [
      'name', 'description', 'isPublic', 'category', 'duration',
      'defaultLocation', 'defaultBanner', 'ticketTypes', 'schedule',
      'formFields', 'emailTemplates', 'socialShare', 'settings'
    ];
    
    for (const field of fieldsToUpdate) {
      if (updateData[field] !== undefined) {
        template[field] = updateData[field];
      }
    }
    
    await template.save();
    return template;
  } catch (error) {
    throw new Error(`Failed to update template: ${error.message}`);
  }
};

const deleteTemplate = async (creatorId, templateId) => {
  try {
    const result = await EventTemplate.deleteOne({ _id: templateId, creatorId });
    
    if (result.deletedCount === 0) {
      throw new Error('Template not found or not owned by this creator');
    }
    
    return { success: true };
  } catch (error) {
    throw new Error(`Failed to delete template: ${error.message}`);
  }
};

const createEventFromTemplate = async (creatorId, templateId, eventData) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const template = await EventTemplate.findOne({
      _id: templateId,
      $or: [
        { creatorId },
        { isPublic: true }
      ]
    }).session(session);
    
    if (!template) {
      throw new Error('Template not found or not accessible');
    }
    
    const newEvent = new Event({
      creatorId,
      title: eventData.title || `New Event from ${template.name}`,
      description: eventData.description || template.description,
      category: eventData.category || template.category,
      eventDate: eventData.eventDate,
      endDate: eventData.endDate,
      location: eventData.location || template.defaultLocation,
      bannerImage: eventData.bannerImage || template.defaultBanner,
      ticketTypes: template.ticketTypes.map(type => ({
        name: type.name,
        description: type.description,
        price: type.defaultPrice,
        quantity: type.defaultQuantity,
        benefits: type.benefits,
        color: type.color
      })),
      schedule: template.schedule.map(item => ({
        name: item.name,
        durationMinutes: item.durationMinutes,
        description: item.description
      })),
      settings: template.settings,
      status: 'draft'
    });
    
    await newEvent.save({ session });
    
    template.useCount += 1;
    template.lastUsed = new Date();
    await template.save({ session });
    
    await session.commitTransaction();
    return newEvent;
  } catch (error) {
    await session.abortTransaction();
    throw new Error(`Failed to create event from template: ${error.message}`);
  } finally {
    session.endSession();
  }
};

const getPublicTemplates = async (category = null, limit = 10) => {
  try {
    const query = { isPublic: true };
    
    if (category) {
      query.category = category;
    }
    
    const templates = await EventTemplate.find(query)
      .sort({ useCount: -1 })
      .limit(limit)
      .populate('creatorId', 'name profileImage myPage.organization');
      
    return templates;
  } catch (error) {
    throw new Error(`Failed to get public templates: ${error.message}`);
  }
};

module.exports = {
  createTemplate,
  getTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
  createEventFromTemplate,
  getPublicTemplates
}; 