const margin = {top: 80, right: 45, bottom: 60, left: 45};

// in order to accomodate the long race checkbox list, we made the overall width to 1000, 
// BUT svg width (width) is still 800
const totalWidth = 1000;

const width = 800;
const height = 600;

const innerWidth = width - margin.left - margin.right;
const innerHeight = height - margin.top - margin.bottom;

let allData = [];
let graphs = [];
let xVar = 'coll', yVar = 'par_pctile' // note, yVar is ALWAYS percentile

// note this is just the default, graph.race is used to control what race the graph has
let initialRace = 'pooled' 

// xScale and yScale index is the same as graphs index
let xScales = [];
let yScales = [];

const gender = ['male', 'female']
const colorScale = ['#4A90E2', '#E88AA8']

// we have elected to not include 'other'
const races = ['pooled', 'white', 'black', 'hisp', 'asian', 'natam']
const readableRaces = ['Pooled Races', 'White', 'Black', 'Hispanic', 'Asian', 'Native American']

const outcomes = ['coll', 'grad', 'has_dad', 'has_mom', 'hours_wk', 'hs', 'jail', 'kir_top01', 'lpov_nbh', 'married', 'teenbrth']
const readableOutcomes = ['Graduated College', 'Has Graduate Degree', 'Has Father', 'Has Mother', 'Hours Child Labor', 'Graduated Highschool', 'Incarcerated', 'Reached 1%' , 'Moved to Rich Neighborhood', 'Married', 'Teen Birth']

const t = 1000; // time for transitions

// SVG created (no groups yet, created and saved within graphs)
const svg = d3.select("#chart")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .call(zoom)

const barClip = svg.append("defs")
  .append("clipPath")
    .attr("id", "bar-height-clip")
  .append("rect")
    .attr("width", width)
    .attr("height", innerHeight)
    .attr("x", 0)
    .attr("y", 0);

const axisClip = svg.append("defs")
  .append("clipPath")
    .attr("id", "axis-height-clip")
  .append("rect")
    .attr("width", width)
    .attr("height", innerHeight + 10)
    .attr("x", -38)
    .attr("y", -10);

function zoom(svg) {
  const extent = [[margin.left, margin.top], [width - margin.right, height - margin.top]];

  svg.call(d3.zoom()
      .scaleExtent([1, 8])
      .translateExtent(extent)
      .extent(extent)
      .on("zoom", zoomed));

  function zoomed(event) {
    graphs.forEach((g, i) => {
      yScales[i].range([g.height, 0].map(d => event.transform.applyY(d)));
      
      const zoomAmount = event.transform.k > 0 ? event.transform.k : 1;
      const barHeight = Math.max(1, (g.height / (allData.length / zoomAmount)) * 0.85);

      g.selectAll(".male-bar").attr("y", d => yScales[i](d.par_pctile) - barHeight).attr("height", barHeight);
      g.selectAll(".female-bar").attr("y", d => yScales[i](d.par_pctile) - barHeight).attr("height", barHeight);

      const yAxis = d3.axisLeft(yScales[i])
      .ticks(10)
      .tickFormat(d => {
        label = ''
        if (d == 1) {
          label=`${d}st`
        }
        else if (d == 2) {
          label=`${d}nd`
        }
        else if (d == 3) {
          label=`${d}rd`
        }
        else {
          label=`${d}th`
        }
        return label
      }
      )
      svg.selectAll(".y-axis").call(yAxis);
    })
  }
}

function init() {
  d3.csv("data/national_percentile_outcomes.csv")
  .then(
    
    // loop through percentiles in order to fix str into numbers
    data => {
      // get query
      console.log(data)
            
      data.forEach(d => {
        d.par_pctile = +d.par_pctile;

        // loop through outcome options, then loop through races
        outcomes.forEach(outcome => {
          races.forEach(race => {
            const query_male = `${outcome}_${race}_male`
            const query_female = `${outcome}_${race}_female`

            d[query_male] = +d[query_male];
            d[query_female] = +d[query_female];
            }
          )
          // NOTE: currently there are ways to create a new mapping, but let's ask prof if it's worht it to do, or just keep as this
        })
    });

    allData = data

    // these are the intial (init) calls to set up dropdown and checkboxes + create initial graph
    // inside of DropDown and checkBox code is where actual updates are handled with .on('change', ...)
    setupDropDown()
    setupCheckBox()

    createGraph(initialRace)
    // these are called inside of createGraph
    // updateVis()
    addLegend()

  })
  .catch(error => console.error('Error loading data:', error));
}


window.addEventListener('load', init);

function setupDropDown() {
  d3.selectAll('.variable')
    // loop over each dropdown button
    .each(function() {
      d3.select(this).selectAll('option')
      .data(outcomes) // .data loops through options
      .enter() 
      .append('option') 
      .text((d, i) => readableOutcomes[i]) // The displayed text
      .attr("value",d => d) // The actual value used in the code
    })
    // add 'change' in order for it to do anything after intial setting
    // note onchange is for when element val is altered, while change looks at EVENT changing (drop down change)
    // so previous inputs val, this one inputs event
    .on('change', function (event) {
      xVar = d3.select(this).property("value")
      // update chart
      graphs.forEach(g => g.selectAll('.x-axis, .y-axis, .label, .title').remove())
      updateAxes(); 
      updateVis();

      console.log("graph properly deletec, new length: " + graphs.length)
    })

    // without these, it will take all "myOptions" (aka dropdown) class and apply myOptions (WHICH IS GOOD)
    // BUT, it will apply the initial selection as options[0], instead of xVar/yVar/sizeVar initial
    d3.select('#xVariable').property('value', xVar)
}

function setupCheckBox() {
  d3.selectAll('.race')
    // add 'change' in order for it to do anything after intial setting
    // note onchange is for when element val is altered, while change looks at EVENT changing (drop down change)
    // so previous inputs val, this one inputs event
    .on('change', function (event) {
      if(this.checked) {
        console.log('You checked the checkbox:');
        console.log(this.value);

        createGraph(this.value)

      } else {
        console.log('You unchecked the checkbox:');
        console.log(this.value);
        
        // index is here just in case javascript acts similarly to python, 
        // where unexpecte behaviors happen when deleting inside of a foreach loop
        let index = -1
        // go through graph list, find list with checkbox's race, and delete it
        graphs.forEach((g, i) => {
          if (g.race == this.value) {
            index = i
          }
        })

        if (index !== -1) {
          // remove from array
          graphs.splice(index, 1)
        }

        // now actually remove from svg
        // grab using index (which is set in createGraph), then .remove
        d3.select(`#graph_${this.value}`).remove()
        
        // clean up sub-elements from remaining graphs before recalculating
        graphs.forEach(g => g.selectAll('.x-axis, .y-axis, .label, .title').remove())

        // TODO: currently not working
        recalcSizes()
        updateAxes()
        updateVis()
      }
        
    })
}

function recalcSizes() {
  if (graphs.length === 0) return;

  const count = graphs.length;

  // Scale padding down as graph count increases to keep everything inside innerWidth
  let padding = 45;
  if (count === 4) padding = 38;
  if (count === 5) padding = 32;
  if (count === 6) padding = 28;

  const chartWidth = (innerWidth - padding * (count - 1)) / count;
  const height = innerHeight;

  // update all parameters
  graphs.forEach((g, i) => {
    xStart = margin.left + i * (padding + chartWidth);
    
    // store attributes directly on graph object
    g.width = chartWidth;
    g.height = height;
    g.x = xStart;

    // set new center, new innerWidth, new innerHeight, new translate(x, )
    g.attr('transform', `translate(${xStart}, ${margin.top})`);

    console.log('id: ' + g.attr('id'));
    console.log('race: ' + g.race);
    console.log('width: ' + g.width);
    console.log('height: ' + g.height);
    console.log('x: ' + g.x);
  });
}

function createGraph(race) {

  // new graph is being added, make sure to remove all previous axis + labels + data
  graphs.forEach(g => g.selectAll('.x-axis, .y-axis, .label, .title').remove())
  
  const g = svg.append("g")
    .attr('id', `graph_${race}`)

  g.race = race;

  graphs.push(g)

  // Put bars inside the clipped graph area
  const bars = g.append("g").attr('id', `graph_${race}_bars`)
    .attr("clip-path", "url(#bar-height-clip)");

  recalcSizes()

  updateAxes()
  updateVis()

}

function updateAxes() {
  maxValue = -Infinity

  graphs.forEach(g => {
    // remove previous axis/labels attached specifically to this graph
    g.selectAll('.x-axis, .y-axis, .label, .title').remove()

    const query_male = `${xVar}_${g.race}_male`
    const query_female = `${xVar}_${g.race}_female`
    
    // Find upper end of the range for selected outcomes
    // Find largest value across both genders + all graphs
    const mv = d3.max(allData, d =>
        Math.max(d[query_male] || 0, d[query_female] || 0)
    );

    if (mv > maxValue) {
      maxValue = mv
    }
  })

  if (maxValue === -Infinity || maxValue === 0) maxValue = 1;

  console.log("maxValue Calculated for all graphs: " + maxValue)

  graphs.forEach((g, i) => {

    // Male values will be negative so they extend LEFT
    // Female values stay positive so they extend RIGHT
    const xScale = d3.scaleLinear()
      .domain([-maxValue, maxValue])
      .nice()
      .range([0, g.width]);

    xScales[i] = xScale

    // Y-scale range is just 1-100 for the percentiles
    const yScale = d3.scaleLinear()
      .domain([1, 100])
      .range([g.height, 0]);

    yScales[i] = yScale

    // X AXIS
    const xAxis = d3.axisBottom(xScale)
      .ticks(Math.max(2, Math.floor(g.width / 35)))
      .tickFormat(d => Math.abs(d))

    // Y AXIS
    const yAxis = d3.axisLeft(yScale)
      .ticks(10)
      .tickFormat(d => {
        label = ''
        if (d == 1) {
          label=`${d}st`
        }
        else if (d == 2) {
          label=`${d}nd`
        }
        else if (d == 3) {
          label=`${d}rd`
        }
        else {
          label=`${d}th`
        }
        return label
      }
    )

    g.append("g")
      .attr(
          "transform",
          `translate(0,${g.height})`
      )
      .attr('class', 'x-axis')
      .call(xAxis);

    // Render Y-axis on every graph
    g.append("g")
      .attr("clip-path", "url(#axis-height-clip)")
      .attr("transform", "translate(0, 0)")
      .call(yAxis)
      .attr('class', 'y-axis');

    // Dynamic label offset and font sizes based on chart density
    const yLabelOffset = graphs.length > 4 ? -35 : -38;
    const labelFontSize = graphs.length > 4 ? "8px" : "10px";
    const titleFontSize = graphs.length > 4 ? "10px" : (graphs.length > 2 ? "12px" : "14px");

    // Y AXIS name
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -g.height / 2)
      .attr("y", yLabelOffset)
      .attr("text-anchor", "middle")
      .attr("fill", "black")
      .style("font-size", labelFontSize)
      .text("Parent income percentile")
      .attr('class', 'label');

    // X AXIS name
    g.append("text")
      .attr("x", g.width / 2)
      .attr("y", g.height + 35)
      .attr("text-anchor", "middle")
      .attr("fill", "black")
      .style("font-size", "11px")
      .text(`${readableOutcomes[outcomes.indexOf(xVar)]} Rate`)
      .attr('class', 'label');

    // Graph title
    g.append("text")
      .attr("x", g.width / 2)
      .attr("y", -12)
      .attr("text-anchor", "middle")
      .style("font-size", titleFontSize)
      .style("font-weight", "bold")
      .text(`${readableOutcomes[outcomes.indexOf(xVar)]} (${g.race})`)
      .attr('class', 'title');
  })
}

function updateVis() {
  graphs.forEach((g, i) => {
    // Set bar height? Revisit to understand
    // This ensures that bars aren't touching (so we add vertical space)
    const barHeight = Math.max(1, (g.height / allData.length) * 0.85);

    console.log("barHeight for " + i + 'th graph:' + barHeight)

    const query_male = `${xVar}_${g.race}_male`
    const query_female = `${xVar}_${g.race}_female`

    console.log("Selected outcome:", xVar);
    console.log("Race:", g.race);
    console.log("Scale domain:", xScales[i].domain());
    console.log("Scale range:", xScales[i].range());

    console.log("First male value:", allData[0][query_male]);
    console.log("First female value:", allData[0][query_female]);

    // Remove rows where the outcome (column value) is missing
    filteredMaleData = allData.filter(d =>
      Number.isFinite(d[query_male]) 
    )
    filteredFemaleData = allData.filter(d =>
        Number.isFinite(d[query_female])
    );

    console.log("male data: " + filteredMaleData)
    console.log("female data: " + filteredFemaleData)

    bars = g.select(`#graph_${g.race}_bars`)

    bars.selectAll('.male-bar')
      .data(filteredMaleData)
      .join(
        // When we have new data points
        function(enter){
          console.log("enter")
          return enter
          // create male-bar rectangle
          .append("rect")
          .attr("class", "male-bar")
          // moves from left to zero
          .attr("x", d => xScales[i](-d[query_male]))
          .attr("y", d => yScales[i](d.par_pctile) - barHeight)
          .attr("width", d => xScales[i](0) - xScales[i](-d[query_male]))
          .attr("height", barHeight)
          .attr('fill', '#4A90E2')

          // THIS IS MOUSEOVER/TOOLTIP STUFF
          .on('mouseover', function (event, d) {
            console.log(d) // for debugging
            console.log(event.pageX + 28) // for debugging
            
            const value = d[`${xVar}_${g.race}_male`];

            percentile = d.par_pctile + "th"

            if (d.par_pctile == 1) {
              percentile = d.par_pctile + "st"
            }
            else if (d.par_pctile == 2) {
              percentile = d.par_pctile + "nd"
            }
            else if (d.par_pctile == 3) {
              percentile = d.par_pctile + "rd"
            }

            d3.select('#tooltip')
              .style("display", 'block') // Make the tooltip visible

              // strong = bolded p
              .html( // display ex: 1st ["pooled" : 0.83]
              `<strong>${percentile + " Percentile"}</strong><br/>
              ${readableOutcomes[outcomes.indexOf(xVar)]}: ${value.toFixed(4)}
              (${(value * 100).toFixed(2)}%)`)
              
              // event.pageX and event.pageY returns event (in this case mouse) X and Y
              // this is male bars, so have it on the left side (uses "right")
              // places it juuuuust slightly left and below th emouse
              .style("right", (-event.pageX + window.innerWidth + 25) + "px")
              // resetting (for when left is set for female-bars)
              .style("left", "auto")
              .style("top", (event.pageY - 28) + "px");

            // this highlights the hovered bar
            d3.select(this) 
              .style('stroke', '#004696')
              .style('stroke-width', '2px')
          })
          .on("mouseout", function (event, d) {
            d3.select('#tooltip')
            // sets it to be invisible
            .style('display', 'none')
            
            // unhighlights the hovered bar
            d3.select(this) 
              .style('stroke', 'None')
              .style('stroke-width', '0px')
          })
        },
        // Update existing points when data changes
        function(update){
          console.log("update")
          return update
          // Smoothly move to new positions/sizes
          .transition().duration(t)

          // update data points (x, y, and size)
          .attr('x', d => xScales[i](-d[query_male]))
          .attr('y', d => yScales[i](d.par_pctile) - barHeight)
          .attr("width", d => xScales[i](0) - xScales[i](-d[query_male]))
        },
        // Remove points that no longer exist in the filtered data 
        function(exit){
          return exit
          .remove()
        }
      )

    bars.selectAll('.female-bar')
      .data(filteredFemaleData)
      .join(
        // When we have new data points
        function(enter){
          return enter
          // create male-bar rectangle
          .append("rect")
          .attr("class", "female-bar")
          // moves from left to zero
          .attr("x", xScales[i](0))
          .attr("y", d => yScales[i](d.par_pctile) - barHeight)
          .attr("width", d => xScales[i](d[query_female]) - xScales[i](0))
          .attr("height", barHeight)
          .attr('fill', colorScale[1])

                      // THIS IS MOUSEOVER/TOOLTIP STUFF
          .on('mouseover', function (event, d) {
            console.log(d) // for debugging
            console.log(event.pageX + 28) // for debugging
            
            const value = d[`${xVar}_${g.race}_female`];

            percentile = d.par_pctile + "th"

            if (d.par_pctile == 1) {
              percentile = d.par_pctile + "st"
            }
            else if (d.par_pctile == 2) {
              percentile = d.par_pctile + "nd"
            }
            else if (d.par_pctile == 3) {
              percentile = d.par_pctile + "rd"
            }

            d3.select('#tooltip')
              .style("display", 'block') // Make the tooltip visible

              // strong = bolded p
              .html( // display ex: 1st ["pooled" : 0.83]
              `<strong>${percentile + " Percentile"}</strong><br/>
              ${readableOutcomes[outcomes.indexOf(xVar)]}: ${value.toFixed(4)}
              (${(value * 100).toFixed(2)}%)`)
              
              // event.pageX and event.pageY returns event (in this case mouse) X and Y
              // this is female bars, so have it on the right side (uses "left")
              .style("left", (event.pageX + 25) + "px")
              // resetting (for when right is set for male-bars)
              .style("right", "auto")
              .style("top", (event.pageY - 28) + "px");

            // this highlights the hovered bar
            d3.select(this) 
              .style('stroke', '#d4245c')
              .style('stroke-width', '2px')
          })
          .on("mouseout", function (event, d) {
            d3.select('#tooltip')
            // sets it to be invisible
            .style('display', 'none')
            
            // unhighlights the hovered bar
            d3.select(this) 
              .style('stroke', 'None')
              .style('stroke-width', '0px')
          })
        },
        // Update existing points when data changes
        function(update){
          return update
          // Smoothly move to new positions/sizes
          .transition().duration(t)

          // update data points (x, y, and size)
          .attr("x", xScales[i](0))
          .attr("y", d => yScales[i](d.par_pctile) - barHeight)
          .attr("width", d => xScales[i](d[query_female]) - xScales[i](0))
        },
        // Remove points that no longer exist in the filtered data 
        function(exit){
          return exit
          .remove()
        }
      )
    // initZoom(g)
  })

}

function addLegend() {
  console.log("legend created")
  // Legend showing blue = male and pink = female
  // Positioned top right within margin bounds

  const legend = svg.append("g")
  .attr(
      "transform",
      `translate(${width - margin.right - 120}, 20)`
  );

  // Male
  legend.append("rect")
  .attr("width", 12)
  .attr("height", 12)
  .attr("fill", colorScale[0]);

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
  .attr("fill", colorScale[1]);

  legend.append("text")
  .attr("x", 77)
  .attr("y", 10)
  .style("font-size", "10px")
  .text("Female");
}