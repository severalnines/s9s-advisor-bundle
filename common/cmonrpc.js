var CMONRPC_TOKEN = ["test12345", "someothertoken"];
var FREE_HOSTS = ["10.10.11.14", "10.10.11.15", "10.10.11.16"];

function setCmonrpcToken(json, clusterid) 
{
    if (CMONRPC_TOKEN.size() > clusterid)
        json["token"] = CMONRPC_TOKEN[clusterid];
    return json;
}

function getCmonController()
{
    var hosts   = cluster::hosts();
    for (idx = 0; idx < hosts.size(); ++idx)
    {
        if (hosts[idx].role() == 'controller') 
        {
            return hosts[idx];
        }
    }
    return false;
}

function JSONToMap(input_string)
{
    return JSON::parse(input_string);
}

function mapToJSON(input_map)
{
    var outputJSON = "{";
    keys = input_map.keys();
    for(i = 0; i < keys.size(); ++i)
    {
        value = input_map[keys[i]];
        if (i > 0)
            outputJSON = concatenate(outputJSON, ",");
        if (value.isMap())
            outputJSON = concatenate(outputJSON, '"', keys[i], '":', mapToJSON(value));
        else
        {
            if (value.isNumber())
                outputJSON = concatenate(outputJSON, '"', keys[i], '":', value);
            else
                outputJSON = concatenate(outputJSON, '"', keys[i], '":"', value,'"');
        }
    }
    outputJSON = concatenate(outputJSON, "}");
    return outputJSON;
}

function curl(controller, path, json)
{
    controller_map = controller.toMap();
    /* See if the CMONRPC token has been defined */
    json = mapToJSON(setCmonrpcToken(json, controller_map['clusterid']));
    print (json);
    if (controller != false) {
        
        var retval = controller.system(concatenate("curl  -XPOST -d '", json,"' http://localhost:9500/", controller_map['clusterid'],"/", path));
        if (!retval["success"])
            error("ERROR: ", retval["errorMessage"]);
        return retval["result"].replace('\n', ''); 
    }
}


function addNode(node)
{
    controller = getCmonController();    
    var json = {};
    json["operation"] = "createJob";
    var job_data = {};
    job_data["hostname"] = node;
    job_data["software_package"] = "";
    job_data["config_template"] = "my.cnf";
    job_data["install_software"] =true;
    job_data["disable_selinux"] = 1;
    job_data["disable_firewall"]=1;
    job_data["update_lb"] = true;
    var job = {};
    job["command"] = "addnode";
    job["job_data"] = job_data;
    json["job"] = job;
    var output = curl(controller, "job", json);
    print(JSONToMap(output));
    
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

function findUnusedHost()
{
    var hosts   = cluster::mySqlNodes();
    var ipaddresses = [];
    for (idx = 0; idx < hosts.size(); ++idx)
    {
        ipaddresses[idx] = hosts[idx].ipAddress();
    }
    for (idx = 0; idx < FREE_HOSTS.size(); ++idx)
    {
        if (match(FREE_HOSTS[idx], ipaddresses) == false)
        {
            return FREE_HOSTS[idx];
        }
    }
    return false;
    
}

function main()
{
    /* find unused node */
    node = findUnusedHost();
    addNode(node);

    
   /*addNode();*/
}