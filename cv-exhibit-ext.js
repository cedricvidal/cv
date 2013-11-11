CV = new function() {}

CV.lookupLatLng = function(set, addressExpressionString, outputProperty, handler, database, accuracy) {
    if (accuracy == undefined) {
        accuracy = 4;
    }
    
    var expression = Exhibit.ExpressionParser.parse(addressExpressionString);
    var jobs = [];
    set.visit(function(item) {
        var address = expression.evaluateSingle(
            { "value" : item },
            { "value" : "item" },
            "value",
            database
        ).value
        if (address != null) {
            jobs.push({ item: item, address: address });
        }
    });
    
    var results = [];
    var geocoder = new GClientGeocoder();
    var cont = function() {
        if (jobs.length > 0) {
            var job = jobs.shift();
            geocoder.getLocations(
                job.address,
                function(json) {
                    if ("Placemark" in json) {
                        json.Placemark.sort(function(p1, p2) {
                            return p2.AddressDetails.Accuracy - p1.AddressDetails.Accuracy;
                        });
                    }
                    
                    if ("Placemark" in json && 
                        json.Placemark.length > 0 && 
                        json.Placemark[0].AddressDetails.Accuracy >= accuracy) {
                        
                        var coords = json.Placemark[0].Point.coordinates;
                        var lat = coords[1];
                        var lng = coords[0];
                        var result = {id: job.item};
                        result[outputProperty] = lat + "," + lng;
                        results.push(result);
//                        results.push("\t{ id: '" + job.item + "', " + outputProperty + ": '" + lat + "," + lng + "' }");
                    } else {
                        var segments = job.address.split(",");
                        if (segments.length == 1) {
                            results.push("\t{ id: '" + job.item + "' }");
                        } else {
                            job.address = segments.slice(1).join(",").replace(/^\s+/, "");
                            jobs.unshift(job); // do it again
                        }
                    }
                    cont();
                }
            );
        } else {
            handler(results);
        }
    };
    cont();
};
