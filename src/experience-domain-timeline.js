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

    function assignLanes(segments) {
        var laneEnds = [];

        segments.slice().sort(function(a, b) {
            return a.start - b.start;
        }).forEach(function(segment) {
            var lane = 0;

            while (lane < laneEnds.length && segment.start.getTime() <= laneEnds[lane]) {
                lane += 1;
            }

            segment.lane = lane;
            laneEnds[lane] = segment.end.getTime();
        });

        return Math.max(laneEnds.length, 1);
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
        var allSegments = [];

        items.forEach(function(item) {
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

            item.domains.forEach(function(domain) {
                var segment = {
                    domain: domain,
                    start: start,
                    end: end,
                    title: item.title || item.label || domain,
                    current: !item.end
                };

                if (!domains[domain]) {
                    domains[domain] = [];
                }

                domains[domain].push(segment);
                allSegments.push(segment);
            });
        });

        if (invalidItems.length > 0) {
            console.error("Domain timeline skipped experiences with invalid dates:", invalidItems);
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

                segments.forEach(function(segment) {
                    segment.left = clampPercent(
                        (segment.start.getTime() - axisStart.getTime()) / axisDuration * 100
                    );
                    segment.width = clampPercent(
                        (segment.end.getTime() + DAY_MS - segment.start.getTime()) / axisDuration * 100
                    );
                });

                return {
                    label: domain,
                    segments: segments,
                    lanes: assignLanes(segments),
                    years: totalYears(mergeIntervals(segments))
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
        var axis;

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

        var scroll = createElement("div", "domain-timeline-scroll");
        scroll.tabIndex = 0;
        scroll.setAttribute("aria-label", "Career domains timeline from " + model.startYear + " to " + model.endYear);

        chart = createElement("div", "domain-timeline-chart");
        chart.style.setProperty("--domain-year-count", model.years.length);

        axis = createElement("div", "domain-timeline-axis");
        axis.appendChild(createElement("span", "domain-timeline-axis-spacer"));
        var axisTrack = createElement("div", "domain-timeline-axis-track");
        model.years.forEach(function(year) {
            axisTrack.appendChild(createElement("span", "", String(year)));
        });
        axis.appendChild(axisTrack);
        axis.appendChild(createElement("span", "domain-timeline-axis-total", "TOTAL"));
        chart.appendChild(axis);

        model.domains.forEach(function(domain) {
            var row = createElement("div", "domain-timeline-row");
            var track = createElement("div", "domain-timeline-track");

            row.appendChild(createElement("div", "domain-timeline-name", domain.label));
            track.style.setProperty("--domain-lanes", domain.lanes);

            domain.segments.forEach(function(segment) {
                var segmentElement = createElement("span", "domain-timeline-segment");
                var dateRange = formatDate(segment.start) + " to " + (segment.current ? "today" : formatDate(segment.end));
                var description = segment.title + ", " + dateRange;

                segmentElement.style.setProperty("--segment-left", segment.left + "%");
                segmentElement.style.setProperty("--segment-width", segment.width + "%");
                segmentElement.style.setProperty("--segment-lane", segment.lane);
                segmentElement.title = description;
                segmentElement.setAttribute("role", "img");
                segmentElement.setAttribute("aria-label", description);
                track.appendChild(segmentElement);
            });

            row.appendChild(track);
            row.appendChild(createElement("div", "domain-timeline-total", domain.years + "Y"));
            chart.appendChild(row);
        });

        scroll.appendChild(chart);
        container.appendChild(scroll);
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
