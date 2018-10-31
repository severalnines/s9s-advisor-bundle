#include "common/mysql_helper.js"

var REPLICATION_WINDOW_THRESHOLD = 4;
var LOOKBACK_LONGTERM = 24;
var LOOKBACK_SHORTTERM = 1;
var DESCRIPTION="This advisor determines the write load on the Galera cluster"
" and estimates if the Galera cache file is sufficient in"
" size to sustain " +REPLICATION_WINDOW_THRESHOLD + " hours.";

function main()
{
    var hosts     = cluster::mySqlNodes();
    var advisorMap = {};
    var endTime   = CmonDateTime::currentDateTime();
    var startTimeShort = endTime - LOOKBACK_SHORTTERM*3600;
    var startTimeLong = endTime - LOOKBACK_LONGTERM*3600;

    for (idx = 0; idx < hosts.size(); idx++)
    {
        host        = hosts[idx];
        map         = host.toMap();
        gStatus     = map["galera"]["galerastatus"];

        var msg ="";
        var advice = new CmonAdvice();
        advice.setTitle("Galera gcache");

        advice.setHost(host);
        justification = "";
        if(host.nodeType() != "galera")
            continue;
        var config = host.config();
        var list     = host.sqlStats(startTimeShort, endTime);
        var array1   = list.toArray("created");
        var array2   = list.toArray("WSREP_RECEIVED_BYTES");
        var array3   = list.toArray("WSREP_REPLICATED_BYTES");
        // Calculate the data rate of our host: delta of replicated and received
        // bytes, divided by the sampling time.
        var received_bytes_st = max(array2)-min(array2);
        var replicated_bytes_st = max(array3)-min(array3);
        var write_rate_st = ((received_bytes_st + replicated_bytes_st) / (LOOKBACK_SHORTTERM*3600)).toULongLong();

        list     = host.sqlStats(startTimeLong, endTime);
        array1   = list.toArray("created");
        array2   = list.toArray("WSREP_RECEIVED_BYTES");
        array3   = list.toArray("WSREP_REPLICATED_BYTES");
        // Calculate the data rate of our host: delta of replicated and received
        // bytes, divided by the sampling time.
        var received_bytes_lt = max(array2)-min(array2);
        var replicated_bytes_lt = max(array3)-min(array3);
        var write_rate_lt = ((received_bytes_lt + replicated_bytes_lt) / (LOOKBACK_LONGTERM*3600)).toULongLong();
        if (write_rate_lt < 1)
            write_rate_lt = 1;
        if (write_rate_st < 1)
            write_rate_st = 1;

        // Get the gcache size from the config of the host
        var gcache_size_bytes = 0;

        wsrep_provider_options = config.variable("wsrep_provider_options").split(";");
        for(i=0; i < wsrep_provider_options.size(); i++) {
            option = wsrep_provider_options[i].split("=");
            if(option[0].trim() == "gcache.size") {
                gcache_size = option[1].trim();
                // Convert setting into a value in bytes
                factor = (gcache_size.substr(gcache_size.length()-1, gcache_size.length()));
                if(factor == "M")
                    gcache_size_bytes = gcache_size.substr(0, gcache_size.length()-1).toInt()* 1024 * 1024;
                if(factor == "G")
                    gcache_size_bytes = gcache_size.substr(0, gcache_size.length()-1).toInt()* 1024 * 1024 * 1024;
            }
        }
        if(gcache_size_bytes > 0) {
            // Check if we can sustain our data rate with the current gcache.size
            // Calculate the replication window long and short term
            var replication_window_st = gcache_size_bytes / write_rate_st / 3600;
            var replication_window_lt = gcache_size_bytes / write_rate_lt / 3600;

            if (replication_window_st <= REPLICATION_WINDOW_THRESHOLD) {
                justification = "Predicted short term data rate can't be met with the"
                " current gcache.size (" + gcache_size_bytes + " bytes) and data"
                " rate (" + write_rate_st + " bytes per second). Current predicted"
                " gcache replication window is "+floor(replication_window_st) + " hours.";
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
                if (replication_window_lt <= REPLICATION_WINDOW_THRESHOLD) {
                    justification = "Predicted long term data rate can't be met with the"
                    " current gcache.size (" + gcache_size_bytes + " bytes) and data"
                    " rate (" + write_rate_lt + " bytes per second). Current predicted"
                    " gcache replication window is "+floor(replication_window_lt) + " hours.";
                    advice.setSeverity(Critical);
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
                    msg = "Gcache size is ok.";
                    advice.setSeverity(Ok);
                    justification = "Gcache size is sufficient to meet the current"
                    " data rate for more than "+REPLICATION_WINDOW_THRESHOLD+ " hours."
                    " Current predicted gcache replication window is "+floor(replication_window_lt) + " hours.";
                }
            }

        }
        advice.setAdvice(msg);
        advice.setJustification(justification);
        advisorMap[idx]= advice;
        print(advice.toString("%E"));

    }
    return advisorMap;
}
