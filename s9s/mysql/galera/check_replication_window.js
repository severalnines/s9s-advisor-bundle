#include "common/mysql_helper.js"

var DESCRIPTION="This advisor determines the write load on the Galera cluster"
                " and estimates if the Galera cache file is sufficient in"
                " size to sustain X amount of days";
var LOOKBACK = 24;
var REPLICATION_WINDOW_THRESHOLD = 2 * 24 * 60 * 60;

function main()
{
    var lookBack = LOOKBACK * 3600; // lookback hours
    var hosts     = cluster::mySqlNodes();
    var advisorMap = {};
    var endTime   = CmonDateTime::currentDateTime();
    var startTime = endTime - lookBack;

    for (idx = 0; idx < hosts.size(); idx++)
    {
        host        = hosts[idx];
        map         = host.toMap();
        gStatus     = map["galera"]["galerastatus"];
        
        var msg ="";
        var advice = new CmonAdvice();
        advice.setTitle("Galera cache");

        advice.setHost(host);
        justification = "";
        if(host.nodeType() != "galera")
            continue;
        var config = host.config();

        var list     = host.sqlStats(startTime, endTime);
        var array1   = list.toArray("created");
        var array2   = list.toArray("WSREP_RECEIVED_BYTES");
        var array3   = list.toArray("WSREP_REPLICATED_BYTES");
        
        // Calculate the data rate of our host: delta of replicated and received
        // bytes, divided by the sampling time.
        var received_bytes = max(array2)-min(array2);
        var replicated_bytes = max(array3)-min(array3);
        var write_rate = ((received_bytes + replicated_bytes) / lookBack).toULongLong();       
        
        // Get the gcache size from the config of the host
        var gcache_size_bytes = 0;
        wsrep_provider_options = config.variable("wsrep_provider_options").split(";");
        for(i=0; i < wsrep_provider_options.size(); i++) {
            option = wsrep_provider_options[i].split("=");
            if(option[0].trim() == "gcache.size") {
                gcache_size = option[1].trim();
                factor = (gcache_size.substr(gcache_size.length()-1, gcache_size.length()));
                if(factor == "M") 
                    gcache_size_bytes = gcache_size.substr(0, gcache_size.length()-1).toInt()* 1024 * 1024;
                if(factor == "G")
                    gcache_size_bytes = gcache_size.substr(0, gcache_size.length()-1).toInt()* 1024 * 1024 * 1024;
            }
        }

        // Check if we can sustain our data rate with the current gcache.size
        if(gcache_size_bytes > 0) {
            write_rate_threshold = (write_rate * REPLICATION_WINDOW_THRESHOLD).toULongLong();
            if (gcache_size_bytes <= write_rate * REPLICATION_WINDOW_THRESHOLD) {
            justification = "Data rate can't be met with the current gcache.size (" +
               gcache_size_bytes + " bytes) and data rate (" + write_rate_threshold + ")"
               " for the duration of " + REPLICATION_WINDOW_THRESHOLD + " seconds.";
            advice.setSeverity(Warning);
            msg = "The Galera gcache is a ringbuffer to keep transactions available"
                " for incremental state transfers (IST) to other nodes that join the"
                " cluster. If the write rate of MySQL is too high and the gcache"
                " is too small, the gcache will evict transactions too soon. Any"
                " joining node may then fail to receive an IST and then reverts"
                " back to a full state transfer (SST). As a SST is an expensive"
                " operation that requires a donor node to copy all its data, it"
                " is advised to keep the gcache size large enough to contain the"
                " transactions for the period you wish nodes to still receive IST";
                }
    
            else {
                msg = "";
                advice.setSeverity(Ok);
                justification = "Gcache size is sufficient to meet the current data rate..";
            }
        }
        advice.setAdvice(msg);
        advice.setJustification(justification);
        advisorMap[idx]= advice;
    }
    return advisorMap;
}


