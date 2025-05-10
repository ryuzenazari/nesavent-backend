const Event = require('../models/Event');
const UserHistory = require('../models/UserHistory');
const mongoose = require('mongoose');

const getRecommendedEvents = async (userId, limit = 10) => {
  try {
    const userHistory = await UserHistory.findOne({ userId });
    
    if (!userHistory) {
      const upcomingEvents = await Event.find({ 
        eventDate: { $gte: new Date() },
        status: 'published'
      })
      .sort({ eventDate: 1 })
      .limit(limit);
      
      return upcomingEvents;
    }
    
    const interests = userHistory.interests || [];
    const favoriteCategory = userHistory.statistics.favoriteCategory;
    
    const userEvents = userHistory.events.map(event => event.eventId.toString());
    
    const categoryCounts = {};
    userHistory.categories.forEach((count, category) => {
      categoryCounts[category] = count;
    });
    
    const sortedCategories = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);
    
    let pipeline = [
      { 
        $match: { 
          eventDate: { $gte: new Date() },
          status: 'published',
          _id: { $nin: userEvents.map(id => mongoose.Types.ObjectId(id)) }
        } 
      },
      { $addFields: { score: 0 } }
    ];
    
    if (favoriteCategory) {
      pipeline.push({
        $addFields: {
          score: {
            $cond: [
              { $eq: ["$category", favoriteCategory] },
              10,
              "$score"
            ]
          }
        }
      });
    }
    
    if (sortedCategories.length > 0) {
      const categoryScores = {};
      sortedCategories.forEach((category, index) => {
        const scoreValue = 5 - (index * 0.5);
        if (scoreValue > 0) {
          categoryScores[category] = scoreValue;
        }
      });
      
      const categoryScoreStages = Object.entries(categoryScores).map(([category, score]) => {
        return {
          $addFields: {
            score: {
              $cond: [
                { $eq: ["$category", category] },
                { $add: ["$score", score] },
                "$score"
              ]
            }
          }
        };
      });
      
      pipeline = [...pipeline, ...categoryScoreStages];
    }
    
    if (interests.length > 0) {
      const interestFields = interests.map(interest => ({
        $cond: [
          {
            $regexMatch: {
              input: {
                $concat: [
                  { $ifNull: ["$title", ""] },
                  " ",
                  { $ifNull: ["$description", ""] },
                  " ",
                  { $ifNull: ["$tags", ""] }
                ]
              },
              regex: interest,
              options: "i"
            }
          },
          3,
          0
        ]
      }));
      
      pipeline.push({
        $addFields: {
          interestScore: { $sum: interestFields },
          score: { $add: ["$score", { $sum: interestFields }] }
        }
      });
    }
    
    pipeline = [
      ...pipeline,
      { $sort: { score: -1, eventDate: 1 } },
      { $limit: limit }
    ];
    
    const recommendedEvents = await Event.aggregate(pipeline);
    
    return recommendedEvents;
  } catch (error) {
    throw new Error(`Failed to get recommended events: ${error.message}`);
  }
};

const getPopularEvents = async (limit = 10) => {
  try {
    const popularEvents = await Event.find({
      eventDate: { $gte: new Date() },
      status: 'published'
    })
    .sort({ viewCount: -1, ticketsSold: -1 })
    .limit(limit);
    
    return popularEvents;
  } catch (error) {
    throw new Error(`Failed to get popular events: ${error.message}`);
  }
};

const getSimilarEvents = async (eventId, limit = 5) => {
  try {
    const event = await Event.findById(eventId);
    
    if (!event) {
      throw new Error('Event not found');
    }
    
    const similarEvents = await Event.find({
      _id: { $ne: eventId },
      category: event.category,
      eventDate: { $gte: new Date() },
      status: 'published'
    })
    .sort({ eventDate: 1 })
    .limit(limit);
    
    return similarEvents;
  } catch (error) {
    throw new Error(`Failed to get similar events: ${error.message}`);
  }
};

const getPersonalizedCategories = async (userId, limit = 5) => {
  try {
    const userHistory = await UserHistory.findOne({ userId });
    
    if (!userHistory || !userHistory.categories) {
      const topCategories = await Event.aggregate([
        { 
          $match: { 
            eventDate: { $gte: new Date() },
            status: 'published'
          } 
        },
        { 
          $group: { 
            _id: "$category", 
            count: { $sum: 1 } 
          } 
        },
        { $sort: { count: -1 } },
        { $limit: limit }
      ]);
      
      return topCategories.map(cat => cat._id);
    }
    
    const categoryCounts = {};
    userHistory.categories.forEach((count, category) => {
      categoryCounts[category] = count;
    });
    
    const sortedCategories = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(entry => entry[0]);
    
    return sortedCategories;
  } catch (error) {
    throw new Error(`Failed to get personalized categories: ${error.message}`);
  }
};

module.exports = {
  getRecommendedEvents,
  getPopularEvents,
  getSimilarEvents,
  getPersonalizedCategories
}; 