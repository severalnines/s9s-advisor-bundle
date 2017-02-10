#include "common/helpers.js"
#include "cmon/io.h"
#include "cmon/alarms.h"

/* This advisor will look at the errors counters in MongoDB
The advisor will forecast the expected metric for each of them based upon 
a window of a week and compare that against the value we get for the past hour */

var TITLE = "MongoDB error trends check";

var MINUTE = 60;
var HOUR   = MINUTE * 60;
var DAY    = HOUR * 24;
var WEEK   = DAY * 7;

function main(hostAndPort) {

    if (hostAndPort == #N/A)
        hostAndPort = "*";

    var hosts   = cluster::mongoNodes();
    var advisorMap = {};
    var result= [];
    for (i = 0; i < hosts.size(); i++)
    {
        host = hosts[i];
        var msg = "";
        var jst = "";
        var advice = new CmonAdvice();
        advice.setSeverity(Ok);

        // Fetch the statistics for the past hour
        var endTime   = CmonDateTime::currentDateTime();
        var startTime = endTime - HOUR;
        var list_st     = host.mongoStats(startTime, endTime);

        // Fetch the statistics for the past week up to an hour ago
        endTime   = startTime;
        startTime = endTime - WEEK /*seconds*/;
        var lookAhead = endTime + HOUR;
        var list_lt     = host.mongoStats(startTime, endTime);

        var assert_types = ["msg", "user", "warning", "regular"];
        for(a=0; a < assert_types.size(); a++) {
            var result = forecastAsserts("asserts."+assert_types[a], list_st, list_lt, lookAhead);
            if(result[0] == false) {
                advice.setSeverity(Warning);
                jst += result[1] + "<br/>";
                if(assert_types[a] == "msg") {
                    advice.setSeverity(Critical);
                    msg += "The amount of system errors has increased in the past hour. Please check the MongoDB error log for system errror!<br/>";
                }
                if(assert_types[a] == "user")
                    msg += "The amount of user errors has increased in the past hour. Please check your clients to see which errors they return.<br/>";
                if(assert_types[a] == "warning")
                    msg += "The amount of warnings has increased in the past hour. Please check the MongoDB error log what they are.<br/>";
                if(assert_types[a] == "regular")
                    msg += "The amount of regular errors has increased in the past hour. Please check the MongoDB error log what they are.<br/>";
            }
        }

        advice.setJustification(jst);

        advice.setHost(host);
        advice.setTitle(TITLE);
        advice.setAdvice(msg);
        advisorMap[i]= advice;
        advice.setJustification(jst);
    }
    return advisorMap;
}

function forecastAsserts(assert_key, st, lt, lookAhead) {
    var assert_st = st.toArray(assert_key);
    var assert_lt = lt.toArray(assert_key);
    var created_lt = lt.toArray("created");
    var value_st = max(assert_st);
    var stdev_st = stdev(assert_st);
    var fc = forecast(lookAhead.toInt(), assert_lt, created_lt);
    var ret_val = [];

    // Check if the expected value is within the 2n deviation
    if (value_st < ((2* stdev_st) + fc)) {
        ret_val[0] = false;
        ret_val[1] = "current value value of " + assert_key + " (" + value_st + ") larger than the forcasted (" + fc + ").";
    }
    else {
        ret_val[0] = true;
    }
    return ret_val;

}
