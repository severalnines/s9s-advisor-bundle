
#include "common/helpers.js"
#include "cmon/io.h"
#include "cmon/alarms.h"

var TITLE="Collection sharding check";
var ADVICE_WARNING="Non-sharded collections found. ";
var ADVICE_OK="All collections have been sharded." ;
var JUSTIFICATION_WARNING="It is advisable to enable sharding on all databases and collections. You can enable sharding on the designated database(s) first, then shard the collection.";


function main(hostAndPort) {

    if (hostAndPort == #N/A)
        hostAndPort = "*";

    var hosts   = cluster::mongoNodes();
    var advisorMap = {};
    var result= [];
    var advice = new CmonAdvice();
    var msg = "";
    var dbname = "";
    var colname = "";
    var sharded_collections = {};
    var non_sharded_collections = {};
    for (i = 0; i < hosts.size(); i++) {

        host = hosts[i];

        // Find one of the mongo routers and query from there
        if (host.role() == "mongos" && sharded_collections.size() == 0) {
            // First get a list of all sharded collections
            shres = host.executeMongoQuery("config", '{ aggregate: "collections", pipeline: [{$group: {"_id": "$_id", "count": {$sum: 1}}}]}');
            for (o = 0; o < shres["result"]["result"].size(); o++) {
                sharded_collections[shres["result"]["result"][o]["_id"]] = shres["result"]["result"][o]["count"];
            }

            //Then get a list of all databases and its collections
            dbres = host.executeMongoQuery("admin", "{ listDatabases: 1 }");
            for (o = 0; o < dbres["result"]["databases"].size(); o++) {
                dbname = dbres["result"]["databases"][o]["name"];
                // Exclude the admin and config databases
                if(dbname != "admin" && dbname != "config") {
                    //Retrieve a list of all collections in this database
                    colres = host.executeMongoQuery(dbname, "{ listCollections: 1}");
                    for (c = 0; c < colres["result"]["cursor"]["firstBatch"].size(); c++) {
                        colname = colres["result"]["cursor"]["firstBatch"][c]["name"];
                        if (sharded_collections[dbname + "." + colname] != 1) {
                            //Keep all non-sharded databases
                            non_sharded_collections[non_sharded_collections.size()] = dbname + "." + colname;
                        }
                    }
                }
            }

            if (non_sharded_collections.size() > 0) {
                advice.setSeverity(Warning);
                msg = ADVICE_WARNING + " Non sharded collections are: ";
                for(c = 0; c < non_sharded_collections.size(); c++ ) {
                    if (c > 0)
                        msg += ", ";
                    msg += non_sharded_collections[c];
                }
                advice.setJustification(JUSTIFICATION_WARNING);            
       
            }
            else {
                advice.setSeverity(Ok);
                msg = ADVICE_OK;
                advice.setJustification("");
            }
    
            advice.setHost(host);
            advice.setTitle(TITLE);
            advice.setAdvice(msg);
            advisorMap[i]= advice;
        }
    }
    return advisorMap;
}

