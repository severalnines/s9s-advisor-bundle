#include "common/helpers.js"
#include "cmon/io.h"
#include "cmon/alarms.h"

// It is advised to have a replication window of at least 24 hours, critical is 1 hour
var WARNING_COLL_LOCK_PERC = 1;
var CRITICAL_COLL_LOCK_PERC = 5;
var TITLE="Collection lock percentage";

function main(hostAndPort) {

    if (hostAndPort == #N/A)
        hostAndPort = "*";

    var hosts   = cluster::mongoNodes();
    var advisorMap = {};
    var result= [];
    var k = 0;
    var advice = new CmonAdvice();
    var msg = "";
    var jst = "";
    var coll_lock_aq_read = 0;
    var coll_lock_aq_write = 0;
    var coll_lock_wait_read = 0;
    var coll_lock_wait_write = 0;
    var lock_percentage_read = 0;
    var lock_percentage_write = 0;
    for (i = 0; i < hosts.size(); i++)
    {
        // Find the primary and execute the queries there
        host = hosts[i];
        host_id = host.hostName() + ":" + host.port();
        res = host.executeMongoQuery("admin", "{serverStatus: 1, network: 0, metrics: 0, wiredTiger: 0, tcmalloc: 0, repl: 0, opcountersRepl: 0, extra_info: 0}");
        if(res["result"]["storageEngine"]['name'] == "mmapv1") {
            coll_lock_aq_read = int(res["result"]["locks"]["Collection"]["acquireCount"]["r"]["$numberLong"]) + int(res["result"]["locks"]["Collection"]["acquireCount"]["R"]["$numberLong"]);
            coll_lock_aq_write = int(res["result"]["locks"]["Collection"]["acquireCount"]["w"]["$numberLong"]) + int(res["result"]["locks"]["Collection"]["acquireCount"]["W"]["$numberLong"]);
            coll_lock_wait_read = int(res["result"]["locks"]["Collection"]["acquireWaitCount"]["r"]["$numberLong"]) + int(res["result"]["locks"]["Collection"]["acquireWaitCount"]["R"]["$numberLong"]);
            coll_lock_wait_write = int(res["result"]["locks"]["Collection"]["acquireWaitCount"]["w"]["$numberLong"]) + int(res["result"]["locks"]["Collection"]["acquireWaitCount"]["W"]["$numberLong"]);
            lock_percentage_read = (coll_lock_wait_read / (coll_lock_wait_read + coll_lock_aq_read)) * 100;
            lock_percentage_write = (coll_lock_wait_write / (coll_lock_wait_write + coll_lock_aq_write)) * 100;

            if (lock_percentage_read > WARNING_COLL_LOCK_PERC) {
                if (lock_percentage_read > CRITICAL_COLL_LOCK_PERC) {
                    msg = concatenate(msg, "Node " + host_id + " has a collection read lock percentage over " + CRITICAL_COLL_LOCK_PERC + " percent ( " + lock_percentage_read + " ).");
                    advice.setSeverity(Critical);
                    jst = concatenate(jst, "Collection read locking means the collection was locked for reads by another (write) thread during a read operation. Try to decrease the concurrency on the collection or consider sharding or migrating from MMAP to another storage engine without collection level locking.");

                }
                else {
                    msg = concatenate(msg, "Node " + host_id + " has a collection read lock percentage over " + WARNING_COLL_LOCK_PERC + " percent ( " + lock_percentage_read + " ).");
                    advice.setSeverity(Warning);
                    jst = concatenate(jst, "Collection read locking means the collection was locked for reads by another (write) thread during a read operation. Try to decrease the concurrency on the collection.");
                }
            }
            if (lock_percentage_write > WARNING_COLL_LOCK_PERC) {
                if (lock_percentage_write > CRITICAL_COLL_LOCK_PERC) {
                    msg = concatenate(msg, "Node " + host_id + " has a collection write lock percentage over " + CRITICAL_COLL_LOCK_PERC + " percent ( " + lock_percentage_write + " ).");
                    advice.setSeverity(Critical);
                    jst = concatenate(jst, "Collection write locking means the collection was locked for write by another (write) thread during a write operation. Try to decrease the concurrency on the collection or consider sharding or migrating from MMAP to another storage engine without collection level locking.");

                }
                else {
                    msg = concatenate(msg, "Node " + host_id + " has a collection write lock percentage over " + WARNING_COLL_LOCK_PERC + " percent ( " + lock_percentage_write + " ).");
                    advice.setSeverity(Warning);
                    jst = concatenate(jst, "Collection write locking means the collection was locked for write by another (write) thread during a write operation. Try to decrease the concurrency on the collection.");
                }

            }
            if(len(msg) == 0) {
                msg = "Node " + host_id + " has a no issue with collection read and write locks.";
                advice.setSeverity(Ok);
                jst = "";
            }
        }
        else {
            msg = "Node " + host_id + " is not running the MMAP storage system.";
            advice.setSeverity(Ok);
            jst = "";
        }

        advice.setHost(host);
        advice.setTitle(TITLE);
        advice.setAdvice(msg);
        advisorMap[i]= advice;
        advice.setJustification(jst);
    }
    return advisorMap;
}
