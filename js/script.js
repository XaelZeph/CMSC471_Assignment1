const margin = {
    top: 55,
    right: 20,
    bottom: 45,
    left: 50
  };
  
  const width = 500;
  const height = 450;
  
  const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width)
    .attr("height", height);
  
  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
  
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  
  
  // Load data, convert all data to numeric
  
  d3.csv("data/national_percentile_outcomes.csv").then(data => {
  
    data.forEach(d => {
        d.percentile = +d.par_pctile;
    });
  
  
    // ========================================================
    // CHOOSE RACE
    // ========================================================
  
    // For now we are only looking at pooled race
  
    // Options: asian, black, hisp, white, natam, other, pooled
  
    const race = "pooled";
  
  
    // Automatically find the correct columns
    const maleColumn = `coll_${race}_male`;
    const femaleColumn = `coll_${race}_female`;
  
    console.log("Male column:", maleColumn);
    console.log("Female column:", femaleColumn);
  
    data.forEach(d => {
        d.male = +d[maleColumn];
        d.female = +d[femaleColumn];
    });
  
    // Remove rows where the college outcome (column value) is missing
    data = data.filter(d =>
        Number.isFinite(d.male) &&
        Number.isFinite(d.female)
    );
  
  
    // Find upper end of the range for college outcomes
    // Find largest value across both genders
    const maxValue = d3.max(data, d =>
        Math.max(d.male, d.female)
    );
  
    // Male values will be negative so they extend LEFT
    // Female values stay positive so they extend RIGHT
    const x = d3.scaleLinear()
        .domain([-maxValue, maxValue])
        .nice()
        .range([0, innerWidth]);
  
  
    // Y-scale range is just 1-100 for the percentiles
  
    const y = d3.scaleLinear()
        .domain([1, 100])
        .range([innerHeight, 0]);
  
  
    // Set bar height? Revisit to understand
    // This ensures that bars aren't touching (so we add vertical space)
  
    const barHeight = innerHeight / data.length * 0.85;
  
  
    // Clip bars so they cannot extend outside the graph area
  
    const clip = svg.append("defs")
        .append("clipPath")
        .attr("id", "chart-clip");
  
    clip.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", innerWidth)
        .attr("height", innerHeight);
  
  
    // Create center line for the male vs. female sections
  
    g.append("line")
        .attr("x1", x(0))
        .attr("x2", x(0))
        .attr("y1", 0)
        .attr("y2", innerHeight)
        .attr("stroke", "#333")
        .attr("stroke-width", 2);
  
  
    // Put bars inside the clipped graph area
  
    const bars = g.append("g")
        .attr("clip-path", "url(#chart-clip)");
  
  
    // MALE BARS
  
    bars.selectAll(".male-bar")
        .data(data)
        .join("rect")
        .attr("class", "male-bar")
  
        // Move left from zero
        .attr("x", d => x(-d.male))
  
        .attr("y", d =>
            y(d.percentile) - barHeight / 2
        )
  
        // Width from male value to zero
        .attr("width", d =>
            x(0) - x(-d.male)
        )
  
        .attr("height", barHeight)
  
        .attr("fill", "#4A90E2");
  
  
    // FEMALE BARS
  
    bars.selectAll(".female-bar")
        .data(data)
        .join("rect")
        .attr("class", "female-bar")
  
        // Start at zero
        .attr("x", x(0))
  
        .attr("y", d =>
            y(d.percentile) - barHeight / 2
        )
  
        // Width from zero to female value
        .attr("width", d =>
            x(d.female) - x(0)
        )
  
        .attr("height", barHeight)
  
        .attr("fill", "#E88AA8");
  
  
    // X AXIS
  
    g.append("g")
        .attr(
            "transform",
            `translate(0,${innerHeight})`
        )
        .call(
            d3.axisBottom(x)
                .ticks(10)
                .tickFormat(d => Math.abs(d))
        );
  
  
    // Y AXIS
  
    g.append("g")
        .call(
            d3.axisLeft(y)
                .ticks(10)
                .tickFormat(d => `${d}th`)
        );
  
  
    // X AXIS name
  
    g.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 35)
        .attr("text-anchor", "middle")
        .attr("fill", "black")
        .style("font-size", "12px")
        .text("College outcome");
  
  
    // Y AXIS name
  
    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -38)
        .attr("text-anchor", "middle")
        .attr("fill", "black")
        .style("font-size", "12px")
        .text("Parent income percentile");
  
  
    // Graph title
  
    g.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", -12)
        .attr("text-anchor", "middle")
        .style("font-size", "15px")
        .style("font-weight", "bold")
        .text(`College outcome by percentile (${race})`);
  
  
    // Legend showing blue = male and pink = female
    // Place the legend above the graph so it does not overlap with the data

    const legend = g.append("g")
    .attr(
        "transform",
        `translate(${innerWidth - 120}, -35)`
    );

    // Male
    legend.append("rect")
    .attr("width", 12)
    .attr("height", 12)
    .attr("fill", "#4A90E2");

    legend.append("text")
    .attr("x", 17)
    .attr("y", 10)
    .style("font-size", "10px")
    .text("Male");

    // Female
    legend.append("rect")
    .attr("x", 60)
    .attr("width", 12)
    .attr("height", 12)
    .attr("fill", "#E88AA8");

    legend.append("text")
    .attr("x", 77)
    .attr("y", 10)
    .style("font-size", "10px")
    .text("Female");
  
  });