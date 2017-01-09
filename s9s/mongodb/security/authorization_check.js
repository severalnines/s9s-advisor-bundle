#include "common/helpers.js"
#include "cmon/io.h"
#include "cmon/alarms.h"

var TITLE="Authentication/Authorization check";
var adminRoles = "root,userAdminAnyDatabase,dbAdminAnyDatabase".split(",");
var tooPermissiveRoles = "readWriteAnyDatabase,readAnyDatabase".split(",");

function main(hostAndPort) {

    if (hostAndPort == #N/A)
        hostAndPort = "*";

    var hosts   = cluster::mongoNodes();
    var advisorMap = {};
    var result= [];
    var k = 0;
    var advice = new CmonAdvice();
    var msg = "";
    var justification = "";
    var critical = false;
    for (i = 0; i < hosts.size(); i++) {
        // Find the primary and execute the queries there
        host = hosts[i];
        
        res = host.executeMongoQuery("admin", "{isMaster: 1}");
        if (res["result"]["ismaster"] == true) {
            // Get all the databases
            db_res = host.executeMongoQuery("admin", "{ listDatabases: 1 }");
            for (db=0; db < db_res["result"]["databases"].size(); db++) {
                //get all the users per database
                cur_db = db_res["result"]["databases"][db]["name"];
                user_res= host.executeMongoQuery(cur_db, "{usersInfo: 1}");
                for(user=0; user < user_res["result"]["users"].size(); user++) {
                    var user_pass_same = false;
                    id = user_res["result"]["users"][user]["_id"].split(".");
                    username = id[1];
                    database = id[0];
                    //Test if we can login to MongoDB using the username as password
                    var retval = host.system("echo 'db.stats();' | mongo -u " + username + " -p " + username + " --authenticationDatabase '" + database + "'");
                    if(retval["success"] == true) {
                        msg += "Password for user '" + username + "' for database '" + database+ "' is too easy to guess.<br/>";
                        justification += "Consider changing the password for user "+username + "<br/>";
                        user_pass_same = true;
                    }
                    
                    //Iterate over the roles and see if anthing excessive is set here
                    for(role=0; role < user_res["result"]["users"][user]["roles"].size(); role++) {
                        role_info = user_res["result"]["users"][user]["roles"][role];
                        // If our current database isn't admin, but role database is admin
                        // this should ring some alarmbells. You could potentially abuse this
                        // by authenticating against this database, and receive admin rights over
                        // the whole server/cluster
                        if(role_info["db"] != cur_db && role_info["db"] == "admin") {
                            if(match(role_info["role"], adminRoles) !== false) {
                                msg += "User '" + username + "' has an administrative role '"+role_info["role"] + "' on the 'admin' database when '" + cur_db + "' is used for authentication!<br/>";
                                // If someone with an admin role has a password vulnerability, increase to critical
                                justification += "The database could be compromised if someone manages to use this database for authentication. Remove the '"+role_info["role"] + "'  role for '"+username + "' from database " + cur_db + "<br/>";
                                //If the user also has an easy password to guess, increase level to critical!
                                if (user_pass_same == true) {
                                        critical = true;
                                        msg += "<b>Administrative user '" + username + "' has a weak password</b><br/>";
                                        justification += "<b>Password for user '" + username + "' must be changed!</b><br/>";
                                }
                            }
                            
                        }

                        // If the role database isn't the admin database and the user
                        // has too permissive rights, this could mean this user could
                        // potentially alter data
                        if(role_info["db"] != "admin") {
                            if(match(role_info["role"], tooPermissiveRoles) !== false) {
                                msg += "User " + username + " has a too permissive role! ('"+role_info["role"] + "')<br/>";
                                justification += "If someone manages to use this database for authentication, the account could potentially alter data it shouldn't be able to. Remove the '"+role_info["role"] + "'  role for '"+username + "' or make it only available for the intended databases.<br/>";
                            }
                        }
                    }
                    
                }
               
            }
            if(msg != "") {
                if(critical) {
                    advice.setSeverity(Critical);
                }
                else {
                    advice.setSeverity(Warning);
                }
            }
            else {
                advice.setSeverity(Ok);
                msg = "No authentication/authorization issues found.";
            }
    
            advice.setHost(host);
            advice.setTitle(TITLE);
            advice.setAdvice(msg);
            advice.setJustification(justification);
            advisorMap[i]= advice;

        }
        

    }
    return advisorMap;

}

function match(needle, haystack)
{
    for (idx = 0; idx < haystack.size(); ++idx)
    {
        if(needle == haystack[idx])
            return idx;
    }
    return false;
}
