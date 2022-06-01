#include "common/mysql_helper.js"
#include "common/helpers.js"
#include "cmon/alarms.h"

/**
* grant the user on hostname with privs on db.
* Format:  'user' 'hostname' privs db xtraOpts
* All args except xtraOpts are required.
* xtraOpts: e.g WITH GRANT OPTION or REQUIRE SSL.. free text string.
*          should be set to ''
* hostAndPort : GRANT on particular host/port
*/
function main(user, hostname, privs, db, xtraOpts, hostAndPort)
{
    var result = {};

    if (user.toString() == "" || user.toString() == "#N/A" || user.empty()) {
        result["error_msg"] = "Argument 'user' not specified";
        print(result["error_msg"]);
        exit(result);
    }

    if (hostname.toString() == "" || hostname.toString() == "#N/A" || hostname.empty()) {
        result["error_msg"] = "Argument 'hostname' not specified";
        print(result["error_msg"]);
        exit(result);
    }

    if (privs.toString() == "" || privs.toString() == "#N/A" || privs.empty()) {
        result["error_msg"] = "Argument 'privs' not specified";
        print(result["error_msg"]);
        exit(result);
    }

    if (db.toString() == "" || db.toString() == "#N/A" || db.empty()) {
        result["error_msg"] = "Argument 'db' not specified";
        print(result["error_msg"]);
        exit(result);
    }

    if (xtraOpts.toString() == "" || xtraOpts.toString() == "#N/A" || xtraOpts.empty()) {
        xtraOpts = "";
    }

    var hosts = cluster::mySqlNodes();
    var retval2;
    var host;
    var map ;
    var connected;
    var isGalera;
    for (idx = 0; idx < hosts.size(); ++idx)
    {

        host = hosts[idx];
        //        if(!hostMatchesFilter(host,hostAndPort)){
        //            continue;
        //        }

        map = host.toMap();
        connected = map["connected"];

        if (!connected) {
            continue;
        }

        isGalera  = map["isgalera"];
        if (isGalera) {
            localState = map["galera"]["localstatusstr"];
            if (localState != "Synced")
                continue;
            query = "SET WSREP_ON=ON;SET SQL_LOG_BIN=ON;";
            retval2 = executeSqlCommand2(host, query);
        }
        else
        {
            isReadOnly = map["readonly"].toBoolean();
            if (isReadOnly)
            {
                //     print(host, "is not a master");
                continue;
            }
            query = "SET SQL_LOG_BIN=ON;";
            retval2 = executeSqlCommand2(host, query);
        }

        xtraOpts = xtraOpts.toString().trim();

        // For MySQL 5.7 only
        if(isMySql57Host(host) || isMySql80Host(host)) {
            var doAlter = false;

            query = "GRANT " + privs + " ON " + db
                + " TO '" + user + "'@'"
                + hostname + "'";

            if(xtraOpts.length() > 0) {
                if(xtraOpts == 'WITH GRANT OPTION') {
                    query += ' ' + xtraOpts;
                } else if(xtraOpts.indexOf('WITH GRANT OPTION') != -1) {
                    query += ' WITH GRANT OPTION';
                    doAlter = true;
                } else {
                    doAlter = true;
                }
            }

            retval2 = executeSqlCommand2(host, query);

            if(doAlter) {
                var alterQuery = "ALTER USER '" + user + "'@'" + hostname + "' " + xtraOpts.replace('WITH GRANT OPTION', 'WITH');
                var alterResult = executeSqlCommand2(host, alterQuery);
                if(!alterResult['success']) {
                    result['error_msg'] = alterResult['errorMessage'];
                    exit(result);
                }
            }
        }
        // For other MySQL versions
        else {
            query = "GRANT " + privs + " ON " + db
                + " TO '" + user + "'@'"
                + hostname + "' "+ xtraOpts;
            print("query: ",query);
            retval2 = executeSqlCommand2(host, query);
        }

        if (!retval["success"]) {
            result["error_msg"] = retval2["errorMessage"];
        } else {
            result["error_msg"] = "Successfully created: '" + user + "'@'" + hostname + "'";
        }

        if (isGalera)
        {
            query = "SET WSREP_ON=OFF;SET SQL_LOG_BIN=OFF;";
        }
        else
        {
            query = "SET SQL_LOG_BIN=OFF;";
        }

        break;
    }
    exit(result);
}
