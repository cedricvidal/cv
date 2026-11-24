/**
 *  ExhibitYAML
 *
 *  Exhibit doesn't support importing YAML files by
 *  default. This code adds support for YAML import
 *  using the yamljs library.
 * 
 * @fileOverview
 * @author Cedric Vidal
 */

/**
 * @namespace
 */
ExhibitYAML = {
    _importer: null
};

/**
 * @param {String} url
 * @param {String} s
 * @param {Function} callback
 * @depends JSON
 */
ExhibitYAML.parse = function(url, s, callback) {
    var o = null;

    try {
        o = YAML.parse(s);
        if (o !== null && o.items instanceof Array) {
            o.items.forEach(function(item) {
                if (typeof item.tech === "string") {
                    item.techFacet = item.tech.split(";").map(function(tech) {
                        return tech.trim();
                    }).filter(function(tech) {
                        return tech.length > 0;
                    });
                }

                if (typeof item.domains === "string") {
                    item.domains = item.domains.split(";");
                }

                if (item.domains instanceof Array) {
                    item.domains = item.domains.map(function(domain) {
                        return domain.trim();
                    }).filter(function(domain) {
                        return domain.length > 0;
                    });
                }
            });

            var experienceItems = o.items.filter(function(item) {
                return item.type === "Experience";
            });

            if (experienceItems.length > 0 && window.ExperienceDomainTimeline) {
                window.ExperienceDomainTimeline.setExperiences(experienceItems);
            }
        }
    } catch(e) {
        Exhibit.UI.showJsonFileValidation(Exhibit._("%general.badJsonMessage", url, e.message), url);
    }

    if (typeof callback === "function") {
        callback(o);
    }
};

/**
 * @private
 */
ExhibitYAML._register = function() {
    ExhibitYAML._importer = new Exhibit.Importer(
        "application/yaml",
        "get",
        ExhibitYAML.parse
    );
};

$(document).one("registerImporters.exhibit",
                ExhibitYAML._register);
