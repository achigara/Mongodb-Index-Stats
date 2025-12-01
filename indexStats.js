const { MongoClient } = require('mongodb');
const INDEX_STATS_DB = process.env.DB_NAME || 'indexStats';
const excludedDbs = ['admin', 'local', 'config', INDEX_STATS_DB]; // Exclude system databases and the indexStats database

async function main() {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const client = new MongoClient(uri);
    
    try {
        await client.connect();
        console.log("Connected to MongoDB");
        
        await client.connect();

        const currentDate = new Date();

        const adminDb = client.db().admin();
        const dbs = await adminDb.listDatabases();
        
        const dbInfo = dbs.databases.map(db => {
            return {
                time: currentDate,
                name: db.name,
                sizeOnDisk: db.sizeOnDisk,
                indexStats: [],
            };
        }).filter(db => !excludedDbs.includes(db.name));
        
        for (let i=0; i < dbInfo.length; i++) {
            dbName = dbInfo[i].name;
            
            const dbStats = await client.db(dbName).stats();
            dbInfo[i].numberOfCollections = dbStats.collections;
            dbInfo[i].numberOfIndexes = dbStats.indexes;

            const collections = await client.db(dbName).listCollections({ type: 'collection' }).toArray();
            let formattedIndexStats = [];
            
            for (const coll of collections) {
                // Skip system collections
                if(coll.name.includes("system.")) {
                    continue;
                }

                const indexStats = await client.db(dbName).collection(coll.name).aggregate([{ $indexStats: {} }]).toArray();

                formattedIndexStat = {
                    collection: coll.name,
                    indexStats: indexStats.map(stat => ({
                        name: stat.name,
                        key: stat.key,
                        usageCount: stat.accesses.ops,
                        lastUsed: stat.accesses.since,
                    })),
                }
                formattedIndexStats.push(formattedIndexStat);
            }
            dbInfo[i].indexStats = formattedIndexStats;
        }

        const result = await client.db(INDEX_STATS_DB).collection(INDEX_STATS_DB).insertMany(dbInfo);
        console.log(result);
    } finally {
        await client.close();
        console.log("Disconnected from MongoDB");
    }
}

main().catch(console.error);
