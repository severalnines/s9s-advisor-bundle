#include "cmon/io.h"
#include "common/mysql_helper.js"

/*
 * Converts bytes to GBytes in a human readable format. 
 */
function toGigaBytes(value)
{
    var number = value/(1024*1024*1024);
    
    return 
        number.toString(TwoDecimalNumber) + 
        "GB ";
}

/*
 *
 */
var LOOKBACK_DAYS=30;
var LOOKAHEAD_DAYS=2;

function main()
{
    var hosts     = cluster::hosts();
    var advisorMap = {};

    var lookBack = LOOKBACK_DAYS*24*3600; // lookback days
    var lookAhead = LOOKAHEAD_DAYS*24*3600; // lockahead days

    var endTime   = CmonDateTime::currentDateTime();
    var startTime = endTime - lookBack;
    var futureTime = endTime + lookAhead;
    print("Estimated free disk space in ",LOOKAHEAD_DAYS, " days." );
    print("                           FREE                 TOTAL");
    print("HOST                 CURRENT    FORECAST  ");
    
    for (idx = 0; idx < hosts.size(); ++idx)
    {
        host         = hosts[idx];
        //map          = host.toMap();
        var list     = host.diskStats(startTime, endTime);
        var array3   = list.toArray("total");
        var array1   = list.toArray("free");
        var array2   = list.toArray("created");
        var expected = forecast(futureTime.toInt(), array1, array2);
        
        // Linear regression might say we are going to have less than zero
        // bytes of free space, and we say zero then.
        expected = expected < 0 ? 0 : expected;
        print(host.hostName(), ":      ",
              toGigaBytes(array1[array1.size()-1]), "   ",
              toGigaBytes(expected), "         ",
              toGigaBytes(max(array3)));
    }
    return true;
}
