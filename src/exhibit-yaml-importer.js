/*==================================================
 *  ExhibitYAMLImporter
 *
 *  Exhibit doesn't support importing YAML files by
 *  default. This code adds support for YAML import
 *  using the yamljs library.
 * 
 *  @author Cedric Vidal
 *==================================================
 */

ExhibitYAMLImporter = {}; 
Exhibit.importers["application/yaml"] = ExhibitYAMLImporter;

ExhibitYAMLImporter.parse= function(content, link, url) {
    var o = null;
    try {
        o = YAML.parse(content);
    } catch (e) {
        Exhibit.UI.showJsonFileValidation(Exhibit.l10n.badJsonMessage(url, e), url);
    }
    return o;
}

ExhibitYAMLImporter.load = function(link, database, cont) {
    var url = typeof link == "string" ? link : link.href;
    url = Exhibit.Persistence.resolveURL(url);

    var fError = function(statusText, status, xmlhttp) {
        Exhibit.UI.hideBusyIndicator();
        Exhibit.UI.showHelp(Exhibit.l10n.failedToLoadDataFileMessage(url));
        if (cont) cont();
    };
    
    var fDone = function(xmlhttp) {
        Exhibit.UI.hideBusyIndicator();
	var o = ExhibitYAMLImporter.parse(xmlhttp.responseText, link, url);
	if (o != null) {
	    try {
		database.loadData(o, Exhibit.Persistence.getBaseURL(url));
 	    } catch (e) {
		SimileAjax.Debug.exception(e, "Error loading Exhibit YAML data from " + url);
	    }
	}

        if (cont) cont();
    };

    Exhibit.UI.showBusyIndicator();
    SimileAjax.XmlHttp.get(url, fError, fDone);
};
