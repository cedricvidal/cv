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

CV.expertiseRecencyWeights = {
    ongoing: 1,
    withinThreeYears: 0.75,
    withinSevenYears: 0.5,
    older: 0.25
};

CV.expertiseMaxFontSize = 125;

CV.getExpertiseRecencyWeight = function(endValue, now) {
    var endDate, threeYearsAgo, sevenYearsAgo;

    if (endValue === null || typeof endValue === "undefined") {
        return CV.expertiseRecencyWeights.ongoing;
    }

    endDate = endValue instanceof Date ? endValue : new Date(endValue);
    if (isNaN(endDate.getTime())) {
        Exhibit.Debug.warn("Invalid experience end date: " + endValue);
        return CV.expertiseRecencyWeights.older;
    }

    if (endDate >= now) {
        return CV.expertiseRecencyWeights.ongoing;
    }

    threeYearsAgo = new Date(now.getTime());
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
    if (endDate >= threeYearsAgo) {
        return CV.expertiseRecencyWeights.withinThreeYears;
    }

    sevenYearsAgo = new Date(now.getTime());
    sevenYearsAgo.setFullYear(sevenYearsAgo.getFullYear() - 7);
    if (endDate >= sevenYearsAgo) {
        return CV.expertiseRecencyWeights.withinSevenYears;
    }

    return CV.expertiseRecencyWeights.older;
};

CV.registerRecencyCloudFacet = function() {
    Exhibit.RecencyCloudFacet = function(containerElmt, uiContext) {
        Exhibit.CloudFacet.call(this, containerElmt, uiContext);
    };

    Exhibit.RecencyCloudFacet.prototype = new Exhibit.CloudFacet();

    Exhibit.RecencyCloudFacet.createFromDOM = function(configElmt, containerElmt, uiContext) {
        return Exhibit.EnumeratedFacet.createFromDOM(
            Exhibit.RecencyCloudFacet,
            configElmt,
            containerElmt,
            uiContext
        );
    };

    Exhibit.RecencyCloudFacet.create = function(configObj, containerElmt, uiContext) {
        return Exhibit.EnumeratedFacet.createFromObj(
            Exhibit.RecencyCloudFacet,
            configObj,
            containerElmt,
            uiContext
        );
    };

    Exhibit.RecencyCloudFacet.prototype._constructBody = function(entries) {
        Exhibit.CloudFacet.prototype._constructBody.call(this, entries);
        Exhibit.jQuery(this.getContainer())
            .find(".exhibit-cloudFacet-value")
            .each(function() {
                var fontSize = parseFloat(this.style.fontSize);
                if (fontSize > CV.expertiseMaxFontSize) {
                    this.style.fontSize = CV.expertiseMaxFontSize + "%";
                }
            });
    };

    Exhibit.RecencyCloudFacet.prototype.update = function(items) {
        var entries, database, now, i, entry, values, matchingItems, score;

        entries = this._computeFacet(items);
        database = this.getUIContext().getDatabase();
        now = new Date();

        for (i = 0; i < entries.length; i++) {
            entry = entries[i];
            values = new Exhibit.Set();
            values.add(entry.value);
            matchingItems = this._cache.getItemsFromValues(values, items);
            score = 0;

            matchingItems.visit(function(item) {
                score += CV.getExpertiseRecencyWeight(
                    database.getObject(item, "end"),
                    now
                );
            });

            entry.occurrenceCount = entry.count;
            entry.count = score;
            entry.weightedScore = score;
        }

        entries.sort(function(a, b) {
            var scoreDifference = b.weightedScore - a.weightedScore;
            return scoreDifference !== 0 ?
                scoreDifference :
                a.actionLabel.localeCompare(b.actionLabel);
        });

        this._constructBody(entries);
    };
};

Exhibit.wait(CV.registerRecencyCloudFacet);
