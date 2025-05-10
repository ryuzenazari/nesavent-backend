const mongoose = require('mongoose');
const errorTracker = require('./errorTrackingService');

const TIMEOUT_MS = 5000;

const checkConnection = async () => {
  try {
    const admin = mongoose.connection.db.admin();
    
    const pingResult = await Promise.race([
      admin.ping(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database ping timeout')), TIMEOUT_MS)
      )
    ]);
    
    const serverStatus = await admin.serverStatus();
    const connections = serverStatus.connections;
    
    return {
      connected: true,
      ping: pingResult.ok === 1,
      connections: {
        current: connections.current,
        available: connections.available,
        totalCreated: connections.totalCreated
      },
      uptime: serverStatus.uptime,
      version: serverStatus.version,
      ok: serverStatus.ok
    };
  } catch (error) {
    await errorTracker.trackError(error, { 
      source: 'dbHealthService.checkConnection' 
    });
    
    return {
      connected: false,
      error: error.message
    };
  }
};

const getCollectionStats = async (collectionName) => {
  try {
    const stats = await mongoose.connection.db.collection(collectionName).stats();
    
    return {
      name: stats.ns,
      count: stats.count,
      size: stats.size,
      avgObjSize: stats.avgObjSize,
      storageSize: stats.storageSize,
      capped: stats.capped,
      nindexes: stats.nindexes,
      totalIndexSize: stats.totalIndexSize,
      indexSizes: stats.indexSizes
    };
  } catch (error) {
    await errorTracker.trackError(error, { 
      source: 'dbHealthService.getCollectionStats', 
      collectionName 
    });
    
    throw error;
  }
};

const runDiagnostics = async () => {
  try {
    const connection = await checkConnection();
    
    if (!connection.connected) {
      return {
        status: 'error',
        message: 'Could not connect to database',
        error: connection.error
      };
    }
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionsStats = [];
    
    for (const collection of collections) {
      try {
        const stats = await getCollectionStats(collection.name);
        collectionsStats.push(stats);
      } catch (error) {
        collectionsStats.push({
          name: collection.name,
          error: error.message
        });
      }
    }
    
    return {
      status: 'ok',
      connection,
      collections: collectionsStats
    };
  } catch (error) {
    await errorTracker.trackError(error, { 
      source: 'dbHealthService.runDiagnostics' 
    });
    
    return {
      status: 'error',
      message: 'Failed to run diagnostics',
      error: error.message
    };
  }
};

module.exports = {
  checkConnection,
  getCollectionStats,
  runDiagnostics
}; 