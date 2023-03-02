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
