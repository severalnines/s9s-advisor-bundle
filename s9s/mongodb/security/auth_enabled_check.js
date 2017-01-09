#include "common/helpers.js"
#include "cmon/io.h"
#include "cmon/alarms.h"

var TITLE="MongoDB authentication enabled";


function main(hostAndPort) {

    if (hostAndPort == #N/A)
        hostAndPort = "*";

    var hosts   = cluster::mongoNodes();
    var advisorMap = {};
    var result= [];
    var k = 0;
    var advice = new CmonAdvice();
    var msg = "";
    for (i = 0; i < hosts.size(); i++) {
        // Find the primary and execute the queries there
        host = hosts[i];
        var auth_cmdline_enabled = false;
        var auth_config_enabled = false;
        var auth_implicit_enabled = false;
        
        // First get the command line options, and see if it explicitly has been enabled
        res = host.executeMongoQuery("admin", "{getCmdLineOpts: 1}");
        for(o = 0; o < res["result"]["argv"].size(); o++) {
            if(res["result"]["argv"][o] == "--auth") {
                auth_enabled = true;
            }
        }
        parsed_keys = res["result"]["parsed"].keys();
        for(o = 0; o < parsed_keys.size(); o++) {
            if(parsed_keys[o] == "authorization") {
                auth_config_enabled = true;
            }
            else {
                if (parsed_keys[o] == "security") {

                    security_keys = res["result"]["parsed"][parsed_keys[o]].keys();
                    for(p = 0; p < security_keys.size(); p++) {
                        if (security_keys[p] == "keyFile") {
                            auth_implicit_enabled = true;
                        }
                    }
                }
            }
        }
        
        if(auth_cmdline_enabled == true) {
            advice.setSeverity(Ok);
            msg = "Authentication enabled commandline.";
        }
        else {
            if(auth_config_enabled == true) {
                advice.setSeverity(Ok);
                msg = "Authentication enabled via config.";
            }
            else {
                if(auth_implicit_enabled == true) {
                    advice.setSeverity(Ok);
                    msg = "Authentication enabled implicitly via security.keyFile.";
                }
                else {
                    advice.setSeverity(Warning);
                    msg = "Authentication has not been enabled. This imposes a big risk as anyone can connect to this database without any password. It is advised to enable authentication according to the MongoDB standards:<br/>https://docs.mongodb.com/manual/tutorial/enable-authentication/";
                }
            }
        }

        advice.setHost(host);
        advice.setTitle(TITLE);
        advice.setAdvice(msg);
        advisorMap[i]= advice;
    }
    return advisorMap;

}
