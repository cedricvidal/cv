(function(window, document) {
    "use strict";

    var DAY_MS = 24 * 60 * 60 * 1000;
    var YEAR_MS = 365.2425 * DAY_MS;
    var DOMAIN_ORDER = [
        "Enterprise Systems",
        "Expert Systems AI",
        "Workflow Systems",
        "Autonomous Driving AI & Labeling Pipelines",
        "Generative AI",
        "Agentic AI",
        "Developer Relations"
    ];
    var experiences = [];
    var renderScheduled = false;

    function parseDate(value) {
        var date;

        if (typeof value !== "string" || value.length === 0) {
            return null;
        }

        date = new Date(value + "T00:00:00Z");
        return isNaN(date.getTime()) ? null : date;
    }

    function utcToday() {
        var now = new Date();
        return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    }

    function formatDate(date) {
        return date.toISOString().slice(0, 7);
    }

    function clampPercent(value) {
        return Math.max(0, Math.min(100, value));
    }

    function mergeIntervals(segments) {
        var merged = [];

        segments.slice().sort(function(a, b) {
            return a.start - b.start;
        }).forEach(function(segment) {
            var current = merged[merged.length - 1];

            if (!current || segment.start.getTime() > current.end.getTime() + DAY_MS) {
                merged.push({
                    start: new Date(segment.start.getTime()),
                    end: new Date(segment.end.getTime())
                });
                return;
            }

            if (segment.end > current.end) {
                current.end = new Date(segment.end.getTime());
            }
        });

        return merged;
    }

    function totalYears(intervals) {
        var duration = intervals.reduce(function(total, interval) {
            return total + interval.end.getTime() - interval.start.getTime() + DAY_MS;
        }, 0);

        return Math.round(duration / YEAR_MS);
    }

    function buildModel(items) {
        var today = utcToday();
        var domains = {};
        var invalidItems = [];
        var invalidDomains = [];
        var allSegments = [];

        items.forEach(function(item) {
            var domainTimeline;
            var start;
            var end;

            if (!(item.domains instanceof Array) || item.domains.length === 0) {
                return;
            }

            start = parseDate(item.start);
            end = item.end ? parseDate(item.end) : today;

            if (!start || !end || end < start) {
                invalidItems.push(item.label || item.title || "Unlabeled experience");
                return;
            }

            domainTimeline = item.domainTimeline instanceof Array ? item.domainTimeline : item.domains.map(function(domain) {
                return {
                    label: domain
                };
            });

            domainTimeline.forEach(function(domain) {
                var domainStart = domain.start ? parseDate(domain.start) : start;
                var domainEnd = domain.end ? parseDate(domain.end) : end;
                var domainLabel = domain.label;

                if (
                    typeof domainLabel !== "string" ||
                    !domainStart ||
                    !domainEnd ||
                    domainStart < start ||
                    domainEnd > end ||
                    domainEnd < domainStart
                ) {
                    invalidDomains.push((item.label || item.title || "Unlabeled experience") + ": " + (domainLabel || "Unlabeled domain"));
                    return;
                }

                var segment = {
                    domain: domainLabel,
                    start: domainStart,
                    end: domainEnd,
                    title: item.title || item.label || domainLabel,
                    current: !domain.end && !item.end
                };

                if (!domains[domainLabel]) {
                    domains[domainLabel] = [];
                }

                domains[domainLabel].push(segment);
                allSegments.push(segment);
            });
        });

        if (invalidItems.length > 0) {
            console.error("Domain timeline skipped experiences with invalid dates:", invalidItems);
        }
        if (invalidDomains.length > 0) {
            console.error("Domain timeline skipped domains with invalid dates:", invalidDomains);
        }

        if (allSegments.length === 0) {
            return null;
        }

        var axisStartYear = allSegments.reduce(function(year, segment) {
            return Math.min(year, segment.start.getUTCFullYear());
        }, today.getUTCFullYear());
        var axisEndYear = Math.max(today.getUTCFullYear(), allSegments.reduce(function(year, segment) {
            return Math.max(year, segment.end.getUTCFullYear());
        }, today.getUTCFullYear()));
        var axisStart = new Date(Date.UTC(axisStartYear, 0, 1));
        var axisEnd = new Date(Date.UTC(axisEndYear + 1, 0, 1));
        var axisDuration = axisEnd.getTime() - axisStart.getTime();
        var orderedDomains = DOMAIN_ORDER.filter(function(domain) {
            return domains[domain];
        }).concat(Object.keys(domains).filter(function(domain) {
            return DOMAIN_ORDER.indexOf(domain) === -1;
        }).sort());

        return {
            startYear: axisStartYear,
            endYear: axisEndYear,
            years: Array.from({ length: axisEndYear - axisStartYear + 1 }, function(_, index) {
                return axisStartYear + index;
            }),
            domains: orderedDomains.map(function(domain) {
                var segments = domains[domain].sort(function(a, b) {
                    return a.start - b.start;
                });
                var mergedIntervals = mergeIntervals(segments);
                var aggregateSegments = mergedIntervals.map(function(interval) {
                    return {
                        start: interval.start,
                        end: interval.end,
                        current: interval.end.getTime() === today.getTime(),
                        left: clampPercent(
                            (interval.start.getTime() - axisStart.getTime()) / axisDuration * 100
                        ),
                        width: clampPercent(
                            (interval.end.getTime() + DAY_MS - interval.start.getTime()) / axisDuration * 100
                        )
                    };
                });

                return {
                    label: domain,
                    segments: aggregateSegments,
                    years: totalYears(mergedIntervals)
                };
            })
        };
    }

    function createElement(tag, className, text) {
        var element = document.createElement(tag);

        if (className) {
            element.className = className;
        }
        if (typeof text === "string") {
            element.textContent = text;
        }

        return element;
    }

    function render() {
        var container = document.getElementById("domain-timeline");
        var model = buildModel(experiences);
        var chart;
        var grid;
        var labels;
        var totals;

        renderScheduled = false;

        if (!container) {
            console.error("Domain timeline container was not found.");
            return;
        }

        container.textContent = "";

        if (!model) {
            container.hidden = true;
            return;
        }

        container.hidden = false;
        container.appendChild(createElement("div", "domain-timeline-label", "DOMAIN_TIMELINE"));

        var command = createElement("p", "domain-timeline-command");
        command.appendChild(createElement("span", "prompt", "cedric.ai $"));
        command.appendChild(document.createTextNode(" domains --timeline --aggregate union"));
        container.appendChild(command);

        grid = createElement("div", "domain-timeline-grid");
        labels = createElement("div", "domain-timeline-labels");
        totals = createElement("div", "domain-timeline-totals");
        labels.appendChild(createElement("div", "domain-timeline-column-header", "DOMAIN"));
        totals.appendChild(createElement("div", "domain-timeline-column-header domain-timeline-total-header", "TOTAL"));

        var scroll = createElement("div", "domain-timeline-scroll");
        scroll.tabIndex = 0;
        scroll.setAttribute("aria-label", "Career domains timeline from " + model.startYear + " to " + model.endYear);

        chart = createElement("div", "domain-timeline-chart");
        chart.style.setProperty("--domain-year-count", model.years.length);
        chart.style.setProperty("--domain-year-width", 100 / model.years.length + "%");

        var axisTrack = createElement("div", "domain-timeline-axis-track");
        model.years.forEach(function(year) {
            axisTrack.appendChild(createElement("span", "", String(year)));
        });
        chart.appendChild(axisTrack);

        model.domains.forEach(function(domain) {
            var row = createElement("div", "domain-timeline-track-row");
            var track = createElement("div", "domain-timeline-track");

            labels.appendChild(createElement("div", "domain-timeline-name", domain.label));

            domain.segments.forEach(function(segment) {
                var segmentElement = createElement("span", "domain-timeline-segment");
                var dateRange = formatDate(segment.start) + " to " + (segment.current ? "today" : formatDate(segment.end));
                var description = domain.label + ", active " + dateRange;

                segmentElement.style.setProperty("--segment-left", segment.left + "%");
                segmentElement.style.setProperty("--segment-width", segment.width + "%");
                segmentElement.title = description;
                segmentElement.setAttribute("role", "img");
                segmentElement.setAttribute("aria-label", description);
                track.appendChild(segmentElement);
            });

            row.appendChild(track);
            chart.appendChild(row);
            totals.appendChild(createElement("div", "domain-timeline-total", domain.years + "Y"));
        });

        scroll.appendChild(chart);
        grid.appendChild(labels);
        grid.appendChild(scroll);
        grid.appendChild(totals);
        container.appendChild(grid);

        window.requestAnimationFrame(function() {
            if (scroll.scrollWidth > scroll.clientWidth) {
                scroll.scrollLeft = scroll.scrollWidth;
            }
        });
    }

    function scheduleRender() {
        if (renderScheduled) {
            return;
        }

        renderScheduled = true;

        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", render, { once: true });
        } else {
            window.requestAnimationFrame(render);
        }
    }

    window.ExperienceDomainTimeline = {
        setExperiences: function(items) {
            experiences = items.slice();
            scheduleRender();
        }
    };
}(window, document));
