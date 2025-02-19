const svg = d3.select("svg");

const margin = { top: 75, right: 75, bottom: 75, left: 85 };
const width = +svg.attr("width") - margin.left - margin.right;
const height = +svg.attr("height") - margin.top - margin.bottom;

const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

// Scales
const xScale = d3.scaleLinear().range([0, width]);
const yScale = d3.scaleLinear().range([height, 0]);

// Axes
const xAxis = g.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height})`);

const yAxis = g.append("g")
    .attr("class", "y-axis");

// Tooltip
const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

// Color and shape mapping
const diseaseStyles = {
    Control: { color: "hsl(0, 0.00%, 0.00%)", shape: "square" },
    Park: { color: "hsl(280, 86.00%, 77.60%)", shape: "circle" },
    Hunt: { color: "hsl(196, 71.80%, 54.10%)", shape: "circle" },
    ALS: { color: "hsl(0, 96.00%, 70.80%)", shape: "circle" }
};

// Load data
let allData = {};
Promise.all([
    d3.csv("Control_averaged_data.csv").then(data => { allData.Control = data; }),
    d3.csv("Park_averaged_data.csv").then(data => { allData.Park = data; }),
    d3.csv("Hunt_averaged_data.csv").then(data => { allData.Hunt = data; }),
    d3.csv("ALS_averaged_data.csv").then(data => { allData.ALS = data; })
]).then(() => {
    updateVisualization();
});

// Update visualization based on checkboxes and metric
d3.selectAll("input[type='checkbox']").on("change", updateVisualization);
d3.select("#metric-select").on("change", updateVisualization);

function updateVisualization() {
    const selectedDiseases = Array.from(d3.selectAll("input[type='checkbox']:checked"))
        .map(checkbox => checkbox.value);
    const metric = d3.select("#metric-select").property("value");

    // Clear existing points
    g.selectAll(".point").remove();
    g.selectAll(".line").remove();
    d3.select("svg").select(".x-axis-label").remove();
    d3.select("svg").select(".y-axis-label").remove();

    // Update scales
    const rightMetric = `Right ${metric === "stride" ? "Stride Interval (sec)" : metric === "swing" ? "Swing Interval (sec)" : "Stance Interval (sec)"}`;
    const leftMetric = `Left ${metric === "stride" ? "Stride Interval (sec)" : metric === "swing" ? "Swing Interval (sec)" : "Stance Interval (sec)"}`;

    // Add new labels with the current metric
    g.append("text")
        .attr("class", "x-axis-label")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 10)
        .text(`Average Right ${metric.charAt(0).toUpperCase() + metric.slice(1)} Interval (sec)`);

    g.append("text")
        .attr("class", "y-axis-label")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 20)
        .attr("x", -height / 2)
        .text(`Average Left ${metric.charAt(0).toUpperCase() + metric.slice(1)} Interval (sec)`);

    // Update axes
    const maxX = d3.max(selectedDiseases.flatMap(disease => allData[disease].map(d => +d[rightMetric])));
    const maxY = d3.max(selectedDiseases.flatMap(disease => allData[disease].map(d => +d[leftMetric])));
    xScale.domain([0, maxX]);
    yScale.domain([0, maxY]);
    xAxis.call(d3.axisBottom(xScale));
    yAxis.call(d3.axisLeft(yScale));

    // Render diseases first, then healthy control last
    const sortedDiseases = selectedDiseases.sort((a, b) => (a === "Control" ? 1 : -1));

    sortedDiseases.forEach(disease => {
        const points = g.selectAll(`.point-${disease}`)
            .data(allData[disease], d => d.Subject);

        const size = 8;
        points.enter()
            .append(diseaseStyles[disease].shape === "square" ? "rect" : "circle")
            .attr("class", `point point-${disease}`)
            .attr(diseaseStyles[disease].shape === "square" ? "x" : "cx", d => xScale(+d[rightMetric]) - (diseaseStyles[disease].shape === "square" ? 3 : 0))
            .attr(diseaseStyles[disease].shape === "square" ? "y" : "cy", d => yScale(+d[leftMetric]) - (diseaseStyles[disease].shape === "square" ? 3 : 0))
            .attr("width", size)
            .attr("height", size)
            .attr("r", size / 2)
            .attr("fill", diseaseStyles[disease].color)
            .style("opacity", 1)
            .on("mouseover", (event, d) => {
                tooltip.transition().duration(200).style("opacity", 0.9);
                tooltip.html(`
                    Ratio: ${(d[leftMetric] / d[rightMetric]).toFixed(5)}<br>
                    Avg. Left ${metric.charAt(0).toUpperCase() + metric.slice(1)} Interval: ${(+d[leftMetric]).toFixed(5)} sec<br>
                    Avg. Right ${metric.charAt(0).toUpperCase() + metric.slice(1)} Interval: ${(+d[rightMetric]).toFixed(5)} sec
                `)
                    .style('background-color', `color-mix(in srgb, ${diseaseStyles[disease].color} 10%, white)`)
                    .style("left", `${event.pageX + 5}px`)
                    .style("top", `${event.pageY - 28}px`);
            })
            .on("mouseout", () => {
                tooltip.transition().duration(500).style("opacity", 0);
            });

        const symmetryLine = g.append("line")
            .attr("class", "line")
            .attr("x1", 0)
            .attr("y1", height)
            .attr("x2", xScale(maxY))
            .attr("y2", yScale(maxY))
            .style("stroke-width", 0.5)
            .style("stroke-dasharray", "5,5");
        // points.exit().remove();
    });
    g.selectAll(".point").exit().remove();
}
